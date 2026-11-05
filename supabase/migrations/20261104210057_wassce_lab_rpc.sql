create or replace function public.class_lookup(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('name', c.name, 'school', c.school)
  from public.classes c where c.code = upper(trim(p_code)) and not c.archived;
$$;

create or replace function public._student_payload(s public.students) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('token', s.token, 'student_id', s.id, 'name', s.name, 'index_no', s.index_no,
    'class_name', c.name, 'school', c.school, 'code', c.code)
  from public.classes c where c.id = s.class_id;
$$;

create or replace function public.student_join(p_code text, p_name text, p_index text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare c public.classes; s public.students;
begin
  select * into c from public.classes where code = upper(trim(p_code)) and not archived;
  if not found then raise exception 'class_not_found' using errcode = 'P0001'; end if;
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'bad_pin' using errcode = 'P0001'; end if;
  if length(trim(p_name)) < 2 or length(trim(p_index)) < 1 then raise exception 'bad_details' using errcode = 'P0001'; end if;
  if exists (select 1 from public.students where class_id = c.id and index_no = trim(p_index)) then
    raise exception 'already_joined' using errcode = 'P0001'; end if;
  if (select count(*) from public.students where class_id = c.id) >= 300 then raise exception 'class_full' using errcode = 'P0001'; end if;
  insert into public.students(class_id, name, index_no, pin_hash)
    values (c.id, trim(p_name), trim(p_index), crypt(p_pin, gen_salt('bf'))) returning * into s;
  return public._student_payload(s);
end $$;

create or replace function public.student_login(p_code text, p_index text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s public.students;
begin
  select st.* into s from public.students st join public.classes c on c.id = st.class_id
   where c.code = upper(trim(p_code)) and st.index_no = trim(p_index);
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if s.locked_until is not null and s.locked_until > now() then raise exception 'locked' using errcode = 'P0001'; end if;
  if crypt(p_pin, s.pin_hash) <> s.pin_hash then
    update public.students set fails = fails + 1,
      locked_until = case when fails + 1 >= 8 then now() + interval '15 minutes' else locked_until end
      where id = s.id;
    raise exception 'wrong_pin' using errcode = 'P0001';
  end if;
  update public.students set fails = 0, locked_until = null, last_seen = now() where id = s.id returning * into s;
  return public._student_payload(s);
end $$;

create or replace function public.student_me(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare s public.students; res json;
begin
  update public.students set last_seen = now() where token = p_token returning * into s;
  if not found then raise exception 'bad_token' using errcode = 'P0001'; end if;
  select json_build_object(
    'me', public._student_payload(s),
    'assignments', coalesce((select json_agg(json_build_object('id', a.id, 'mission_id', a.mission_id, 'title', a.title, 'note', a.note, 'due', a.due) order by a.due nulls last, a.created_at)
        from public.assignments a where a.class_id = s.class_id), '[]'::json),
    'attempts', coalesce((select json_agg(json_build_object('kind', t.kind, 'mission_id', t.mission_id, 'title', t.title, 'score', t.score, 'max', t.max_score, 'grade', t.grade, 'at', t.created_at) order by t.created_at desc)
        from (select * from public.attempts where student_id = s.id order by created_at desc limit 100) t), '[]'::json)
  ) into res;
  return res;
end $$;

create or replace function public.submit_attempt(p_token uuid, p_kind text, p_mission text, p_title text, p_score numeric, p_max numeric, p_grade text, p_detail jsonb, p_at timestamptz default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare s public.students; new_id bigint;
begin
  select * into s from public.students where token = p_token;
  if not found then raise exception 'bad_token' using errcode = 'P0001'; end if;
  if (select count(*) from public.attempts where student_id = s.id and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if p_detail is not null and pg_column_size(p_detail) > 24000 then p_detail := '{}'::jsonb; end if;
  insert into public.attempts(student_id, class_id, kind, mission_id, title, score, max_score, grade, detail, created_at)
  values (s.id, s.class_id, p_kind, left(p_mission, 40), left(p_title, 160), greatest(0, least(p_score, p_max)), p_max, left(p_grade, 4),
          coalesce(p_detail, '{}'::jsonb), coalesce(least(p_at, now()), now()))
  returning id into new_id;
  update public.students set last_seen = now() where id = s.id;
  return new_id;
end $$;

create or replace function public.teacher_reset_pin(p_student uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'bad_pin' using errcode = 'P0001'; end if;
  update public.students set pin_hash = crypt(p_pin, gen_salt('bf')), fails = 0, locked_until = null
   where id = p_student and public.is_class_teacher(class_id);
  if not found then raise exception 'not_allowed' using errcode = 'P0001'; end if;
end $$;

revoke all on function public.class_lookup(text), public._student_payload(public.students), public.student_join(text,text,text,text),
  public.student_login(text,text,text), public.student_me(uuid), public.submit_attempt(uuid,text,text,text,numeric,numeric,text,jsonb,timestamptz),
  public.teacher_reset_pin(uuid,text), public.gen_class_code() from public;
grant execute on function public.class_lookup(text), public.student_join(text,text,text,text), public.student_login(text,text,text),
  public.student_me(uuid), public.submit_attempt(uuid,text,text,text,numeric,numeric,text,jsonb,timestamptz) to anon, authenticated;
grant execute on function public.teacher_reset_pin(uuid,text) to authenticated;
grant execute on function public.gen_class_code() to authenticated;
