-- Harden the student-facing functions (see supabase/README.md, "Known limitations").
-- 1. Rate limit and backdating: count submissions by server receive time and bound the client's claimed time.
-- 2. Token revocation: signing out or a teacher PIN reset issues a new token, so old copies stop working.
-- 3. Login enumeration: unknown index numbers and wrong PINs get the same error and similar timing.

-- 1. Server-side receive time. Backfill before adding the default so existing rows keep their own time.
alter table public.attempts add column received_at timestamptz;
update public.attempts set received_at = created_at where received_at is null;
alter table public.attempts alter column received_at set default now();
alter table public.attempts alter column received_at set not null;
create index attempts_student_received_idx on public.attempts(student_id, received_at desc);

create or replace function public.submit_attempt(p_token uuid, p_kind text, p_mission text, p_title text, p_score numeric, p_max numeric, p_grade text, p_detail jsonb, p_at timestamptz default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare s public.students; new_id bigint;
begin
  select * into s from public.students where token = p_token;
  if not found then raise exception 'bad_token' using errcode = 'P0001'; end if;
  -- received_at is set by the server, so a backdated p_at cannot dodge the hourly cap.
  if (select count(*) from public.attempts where student_id = s.id and received_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001'; end if;
  if p_detail is not null and pg_column_size(p_detail) > 24000 then p_detail := '{}'::jsonb; end if;
  insert into public.attempts(student_id, class_id, kind, mission_id, title, score, max_score, grade, detail, created_at, received_at)
  values (s.id, s.class_id, p_kind, left(p_mission, 40), left(p_title, 160), greatest(0, least(p_score, p_max)), p_max, left(p_grade, 4),
          coalesce(p_detail, '{}'::jsonb),
          -- The device's claimed time (results are queued offline), but never in the future,
          -- never older than 14 days, and never before the student joined the class.
          greatest(coalesce(least(p_at, now()), now()), now() - interval '14 days', s.created_at),
          now())
  returning id into new_id;
  update public.students set last_seen = now() where id = s.id;
  return new_id;
end $$;

-- 2. Sign out everywhere: replace the token. The device keeps nothing usable.
create or replace function public.student_logout(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.students set token = gen_random_uuid() where token = p_token;
end $$;
revoke all on function public.student_logout(uuid) from public;
grant execute on function public.student_logout(uuid) to anon, authenticated;

-- A PIN reset means the old PIN may be known to someone else: sign the student out everywhere too.
create or replace function public.teacher_reset_pin(p_student uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then raise exception 'bad_pin' using errcode = 'P0001'; end if;
  update public.students set pin_hash = crypt(p_pin, gen_salt('bf')), fails = 0, locked_until = null, token = gen_random_uuid()
   where id = p_student and public.is_class_teacher(class_id);
  if not found then raise exception 'not_allowed' using errcode = 'P0001'; end if;
end $$;

-- 3. Same error for "no such index number" and "wrong PIN", with a bcrypt run on both paths.
-- 'wrong_pin' is kept as the code so lab pages already open in browsers still show a sensible message.
create or replace function public.student_login(p_code text, p_index text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s public.students;
begin
  select st.* into s from public.students st join public.classes c on c.id = st.class_id
   where c.code = upper(trim(p_code)) and st.index_no = trim(p_index);
  if not found then
    perform crypt(coalesce(p_pin, ''), gen_salt('bf'));
    raise exception 'wrong_pin' using errcode = 'P0001';
  end if;
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
