-- Fix two student_login flaws (found in review of PR #1):
-- 1. A NULL p_pin made `crypt(p_pin, hash) <> hash` evaluate to NULL, skipping the rejection branch and
--    returning the student's token without a PIN.
-- 2. RAISE EXCEPTION after counting a failure rolled back that update, so the 8-try lockout never engaged.
--    Wrong PINs now RETURN {"error":"wrong_pin"} so the counter commits; the client turns it into an error.
-- Also: lock the student row while checking so parallel guesses are counted one by one, and reject NULL PINs
-- explicitly in student_join and teacher_reset_pin.

create or replace function public.student_login(p_code text, p_index text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s public.students;
begin
  select st.* into s from public.students st join public.classes c on c.id = st.class_id
   where c.code = upper(trim(p_code)) and st.index_no = trim(p_index)
   for update of st;
  if not found then
    perform crypt(coalesce(p_pin, ''), gen_salt('bf'));
    return json_build_object('error', 'wrong_pin');
  end if;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'locked' using errcode = 'P0001'; end if;
  if p_pin is null or s.pin_hash is distinct from crypt(p_pin, s.pin_hash) then
    update public.students set fails = fails + 1,
      locked_until = case when fails + 1 >= 8 then now() + interval '15 minutes' else locked_until end
      where id = s.id;
    return json_build_object('error', 'wrong_pin');
  end if;
  update public.students set fails = 0, locked_until = null, last_seen = now() where id = s.id returning * into s;
  return public._student_payload(s);
end $$;

create or replace function public.student_join(p_code text, p_name text, p_index text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c public.classes; s public.students;
begin
  select * into c from public.classes where code = upper(trim(p_code)) and not archived;
  if not found then raise exception 'class_not_found' using errcode = 'P0001'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'bad_pin' using errcode = 'P0001'; end if;
  if coalesce(length(trim(p_name)), 0) < 2 or coalesce(length(trim(p_index)), 0) < 1 then raise exception 'bad_details' using errcode = 'P0001'; end if;
  if exists (select 1 from public.students where class_id = c.id and index_no = trim(p_index)) then
    raise exception 'already_joined' using errcode = 'P0001'; end if;
  if (select count(*) from public.students where class_id = c.id) >= 300 then raise exception 'class_full' using errcode = 'P0001'; end if;
  insert into public.students(class_id, name, index_no, pin_hash)
    values (c.id, trim(p_name), trim(p_index), crypt(p_pin, gen_salt('bf'))) returning * into s;
  return public._student_payload(s);
end $$;

create or replace function public.teacher_reset_pin(p_student uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then raise exception 'bad_pin' using errcode = 'P0001'; end if;
  update public.students set pin_hash = crypt(p_pin, gen_salt('bf')), fails = 0, locked_until = null, token = gen_random_uuid()
   where id = p_student and public.is_class_teacher(class_id);
  if not found then raise exception 'not_allowed' using errcode = 'P0001'; end if;
end $$;
