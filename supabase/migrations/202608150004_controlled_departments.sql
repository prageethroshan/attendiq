-- Controlled department list for student imports and maintenance.

create table if not exists public.departments (
  name text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.departments (name)
select distinct trim(department)
from public.students
where nullif(trim(department), '') is not null
on conflict (name) do nothing;

insert into public.departments (name)
select distinct trim(department)
from public.profiles
where nullif(trim(department), '') is not null
on conflict (name) do nothing;

insert into public.departments (name)
select distinct trim(target_department)
from public.sessions
where nullif(trim(target_department), '') is not null
on conflict (name) do nothing;

update public.students
set department = trim(department)
where department is not null;

update public.profiles
set department = nullif(trim(department), '')
where department is not null;

alter table public.departments enable row level security;

drop policy if exists "authenticated read active departments" on public.departments;
create policy "authenticated read active departments"
on public.departments for select to authenticated
using (is_active = true);

create index if not exists departments_active_name
  on public.departments (is_active, name);

alter table public.students drop constraint if exists students_department_known;
alter table public.students add constraint students_department_known
  foreign key (department) references public.departments(name)
  on update cascade on delete restrict;

alter table public.profiles drop constraint if exists profiles_department_known;
alter table public.profiles add constraint profiles_department_known
  foreign key (department) references public.departments(name)
  on update cascade on delete restrict;

create or replace function public.import_students(p_students jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  imported_count integer;
begin
  if exists (
    select 1
    from jsonb_to_recordset(p_students) as incoming(
      student_id text, name text, year text, department text, academic_year integer
    )
    left join public.departments d on d.name = incoming.department and d.is_active = true
    where d.name is null
  ) then
    raise exception 'Unknown or inactive department';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_students) as incoming(
      student_id text, name text, year text, department text, academic_year integer
    )
    join public.students existing on existing.student_id = incoming.student_id
    where existing.name is distinct from incoming.name
       or existing.year::text is distinct from incoming.year
       or coalesce(existing.department, '') is distinct from coalesce(incoming.department, '')
       or existing.academic_year is distinct from incoming.academic_year
  ) then
    raise exception 'Student identity conflict';
  end if;

  insert into public.students (student_id, name, year, department, academic_year)
  select student_id, name, year, department, academic_year
  from jsonb_to_recordset(p_students) as incoming(
    student_id text, name text, year text, department text, academic_year integer
  )
  on conflict (student_id) do nothing;

  get diagnostics imported_count = row_count;
  return imported_count;
end;
$$;

revoke all on function public.import_students(jsonb) from public;
grant execute on function public.import_students(jsonb) to service_role;
