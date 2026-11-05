create extension if not exists pgcrypto with schema extensions;

create table public.teachers(
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 80),
  school text check (length(school) <= 120),
  created_at timestamptz not null default now()
);

create table public.classes(
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null check (length(name) between 1 and 80),
  school text check (length(school) <= 120),
  teacher_id uuid not null default auth.uid() references auth.users on delete cascade,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.gen_class_code() returns text
language plpgsql set search_path = public as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..6 loop c := c || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
    exit when not exists (select 1 from public.classes where code = c);
  end loop;
  return c;
end $$;
alter table public.classes alter column code set default public.gen_class_code();

create table public.students(
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  name text not null check (length(name) between 2 and 80),
  index_no text not null check (length(index_no) between 1 and 30),
  pin_hash text not null,
  token uuid not null unique default gen_random_uuid(),
  fails int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (class_id, index_no)
);
create index students_class_idx on public.students(class_id);

create table public.attempts(
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students on delete cascade,
  class_id uuid not null references public.classes on delete cascade,
  kind text not null check (kind in ('exam','mission')),
  mission_id text not null check (length(mission_id) <= 40),
  title text check (length(title) <= 160),
  score numeric not null,
  max_score numeric not null check (max_score > 0),
  grade text check (length(grade) <= 4),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index attempts_class_idx on public.attempts(class_id, created_at desc);
create index attempts_student_idx on public.attempts(student_id);

create table public.assignments(
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  mission_id text not null check (length(mission_id) <= 40),
  title text not null check (length(title) <= 160),
  note text check (length(note) <= 500),
  due date,
  created_at timestamptz not null default now()
);
create index assignments_class_idx on public.assignments(class_id);

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.attempts enable row level security;
alter table public.assignments enable row level security;

create or replace function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = cid and c.teacher_id = auth.uid());
$$;
revoke all on function public.is_class_teacher(uuid) from public, anon;
grant execute on function public.is_class_teacher(uuid) to authenticated;

create policy teachers_own_select on public.teachers for select to authenticated using (id = (select auth.uid()));
create policy teachers_own_insert on public.teachers for insert to authenticated with check (id = (select auth.uid()));
create policy teachers_own_update on public.teachers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy classes_teacher_select on public.classes for select to authenticated using (teacher_id = (select auth.uid()));
create policy classes_teacher_insert on public.classes for insert to authenticated with check (teacher_id = (select auth.uid()));
create policy classes_teacher_update on public.classes for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy classes_teacher_delete on public.classes for delete to authenticated using (teacher_id = (select auth.uid()));

create policy students_teacher_select on public.students for select to authenticated using (public.is_class_teacher(class_id));
create policy students_teacher_update on public.students for update to authenticated using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy students_teacher_delete on public.students for delete to authenticated using (public.is_class_teacher(class_id));

create policy attempts_teacher_select on public.attempts for select to authenticated using (public.is_class_teacher(class_id));
create policy attempts_teacher_delete on public.attempts for delete to authenticated using (public.is_class_teacher(class_id));

create policy assignments_teacher_all on public.assignments for all to authenticated using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- hide the pin hash and token from teachers' direct reads
revoke select on public.students from anon, authenticated;
grant select (id, class_id, name, index_no, created_at, last_seen, fails, locked_until) on public.students to authenticated;
grant update (name, index_no, fails, locked_until) on public.students to authenticated;
grant delete on public.students to authenticated;
