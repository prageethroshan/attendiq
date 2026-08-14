-- Target sessions by academic-year and department cohorts.

alter table public.students
  add column if not exists academic_year integer;

update public.students
set academic_year = substring(student_id from '/([0-9]{4})/')::integer
where academic_year is null
  and student_id ~ '^[A-Z]{2,6}/[0-9]{4}/[0-9]{2,4}$';

alter table public.students drop constraint if exists students_academic_year_check;
alter table public.students add constraint students_academic_year_check
  check (academic_year is null or academic_year between 2000 and 2100);

alter table public.sessions
  add column if not exists academic_year integer,
  add column if not exists target_department text;

alter table public.sessions drop constraint if exists sessions_academic_year_check;
alter table public.sessions add constraint sessions_academic_year_check
  check (academic_year is null or academic_year between 2000 and 2100);

create index if not exists students_cohort_lookup
  on public.students (academic_year, department);

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

create or replace function public.create_cohort_session(
  p_token text,
  p_short_code text,
  p_subject_code text,
  p_subject_name text,
  p_teacher_id uuid,
  p_teacher_name text,
  p_expires_at timestamptz,
  p_academic_year integer,
  p_target_department text,
  p_geo_lat double precision,
  p_geo_lng double precision,
  p_geo_radius_m integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_session_id uuid;
  expected_count integer;
begin
  insert into public.sessions (
    token, short_code, subject_code, subject_name, teacher_id, teacher_name,
    is_active, expires_at, academic_year, target_department,
    geo_lat, geo_lng, geo_radius_m
  ) values (
    p_token, p_short_code, p_subject_code, p_subject_name, p_teacher_id, p_teacher_name,
    true, p_expires_at, p_academic_year, p_target_department,
    p_geo_lat, p_geo_lng, p_geo_radius_m
  ) returning id into new_session_id;

  insert into public.session_enrollments (session_id, student_id)
  select new_session_id, student_id
  from public.students
  where academic_year = p_academic_year
    and department = p_target_department;

  get diagnostics expected_count = row_count;
  if expected_count = 0 then
    raise exception 'No registered students match this academic year and department';
  end if;

  return new_session_id;
end;
$$;

revoke all on function public.create_cohort_session(
  text, text, text, text, uuid, text, timestamptz, integer, text,
  double precision, double precision, integer
) from public;
grant execute on function public.create_cohort_session(
  text, text, text, text, uuid, text, timestamptz, integer, text,
  double precision, double precision, integer
) to service_role;
