-- Scale analytics/cohort calculations and support admin student maintenance.

alter table public.students
  add column if not exists is_active boolean not null default true;

create index if not exists students_active_cohort_lookup
  on public.students (academic_year, department)
  where is_active = true;

create or replace function public.close_expired_sessions(p_teacher_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer;
begin
  update public.sessions
  set is_active = false
  where is_active = true
    and expires_at <= now()
    and (p_teacher_id is null or teacher_id = p_teacher_id);

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function public.close_expired_sessions(uuid) from public;
grant execute on function public.close_expired_sessions(uuid) to service_role;

create or replace function public.get_student_cohorts()
returns table (
  academic_year integer,
  department text,
  student_count bigint
)
language sql
security definer
set search_path = public
as $$
  select s.academic_year, trim(s.department) as department, count(*) as student_count
  from public.students s
  where s.is_active = true
    and s.academic_year is not null
    and nullif(trim(s.department), '') is not null
  group by s.academic_year, trim(s.department)
  order by s.academic_year desc, trim(s.department) asc;
$$;

revoke all on function public.get_student_cohorts() from public;
grant execute on function public.get_student_cohorts() to service_role;

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
  perform public.close_expired_sessions(p_teacher_id);

  if exists (
    select 1
    from public.sessions
    where teacher_id = p_teacher_id
      and is_active = true
      and expires_at > now()
  ) then
    raise exception 'Teacher already has an active session'
      using constraint = 'sessions_one_active_per_teacher';
  end if;

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
  where is_active = true
    and academic_year = p_academic_year
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

create or replace function public.get_teacher_analytics(p_teacher_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.close_expired_sessions(p_teacher_id);

  with teacher_sessions as (
    select id, subject_code, subject_name, created_at, is_active
    from public.sessions
    where teacher_id = p_teacher_id
  ),
  enrollment_counts as (
    select session_id, count(*)::integer as enrolled
    from public.session_enrollments
    where session_id in (select id from teacher_sessions)
    group by session_id
  ),
  scoped_records as (
    select ar.*
    from public.attendance_records ar
    join teacher_sessions s on s.id = ar.session_id
  ),
  record_counts_by_session as (
    select
      session_id,
      count(*) filter (where status = 'Present')::integer as present_count
    from scoped_records
    group by session_id
  ),
  subject_stats as (
    select
      s.subject_code,
      max(s.subject_name) as subject_name,
      count(distinct s.id)::integer as session_count,
      coalesce(sum(rc.present_count), 0)::integer as present_count,
      coalesce(sum(ec.enrolled), 0)::integer as enrolled_total
    from teacher_sessions s
    left join enrollment_counts ec on ec.session_id = s.id
    left join record_counts_by_session rc on rc.session_id = s.id
    group by s.subject_code
  ),
  recent_sessions as (
    select
      s.id,
      s.subject_code,
      s.subject_name,
      s.created_at,
      s.is_active,
      count(r.id)::integer as scanned,
      coalesce(ec.enrolled, 0)::integer as enrolled
    from teacher_sessions s
    left join enrollment_counts ec on ec.session_id = s.id
    left join scoped_records r on r.session_id = s.id
    group by s.id, s.subject_code, s.subject_name, s.created_at, s.is_active, ec.enrolled
    order by s.created_at desc
    limit 10
  ),
  daily_activity as (
    select ar.marked_at::date as day, count(*)::integer as scan_count
    from scoped_records ar
    where ar.marked_at >= now() - interval '30 days'
    group by ar.marked_at::date
  ),
  device_flags as (
    select
      device_fp,
      array_agg(distinct student_id order by student_id) as student_ids,
      count(distinct student_id)::integer as student_count
    from scoped_records
    where device_fp is not null
    group by device_fp
    having count(distinct student_id) > 1
    order by count(distinct student_id) desc
    limit 10
  ),
  geo_fail_rate as (
    select
      s.subject_code,
      max(s.subject_name) as subject_name,
      count(r.id)::integer as total,
      count(r.id) filter (where r.geo_verified = false)::integer as failed
    from teacher_sessions s
    join scoped_records r on r.session_id = s.id
    where r.geo_verified is not null
    group by s.subject_code
  ),
  totals as (
    select
      (select count(*)::integer from teacher_sessions) as total_sessions,
      (select count(*)::integer from scoped_records) as total_records,
      (select count(*)::integer from scoped_records where geo_verified = false) as flagged_count,
      coalesce((select sum(present_count) from subject_stats), 0)::integer as total_present,
      coalesce((select sum(enrolled_total) from subject_stats), 0)::integer as total_expected
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'totalSessions', totals.total_sessions,
      'totalRecords', totals.total_records,
      'avgRate', case when totals.total_expected > 0 then round((totals.total_present::numeric / totals.total_expected) * 100)::integer else 0 end,
      'flaggedCount', totals.flagged_count
    ),
    'bySubject', coalesce((
      select jsonb_agg(jsonb_build_object(
        'subject_code', subject_code,
        'subject_name', subject_name,
        'sessionCount', session_count,
        'presentCount', present_count,
        'totalCount', enrolled_total,
        'enrolledTotal', enrolled_total,
        'attendanceRate', case when enrolled_total > 0 then round((present_count::numeric / enrolled_total) * 100)::integer else 0 end
      ) order by session_count desc)
      from subject_stats
    ), '[]'::jsonb),
    'recentSessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'subject_code', subject_code,
        'subject_name', subject_name,
        'created_at', created_at,
        'is_active', is_active,
        'scanned', scanned,
        'enrolled', enrolled,
        'rate', case when enrolled > 0 then round((scanned::numeric / enrolled) * 100)::integer else null end
      ) order by created_at desc)
      from recent_sessions
    ), '[]'::jsonb),
    'dailyActivity', coalesce((
      select jsonb_agg(jsonb_build_object('date', day::text, 'count', scan_count) order by day)
      from daily_activity
    ), '[]'::jsonb),
    'deviceFlags', coalesce((
      select jsonb_agg(jsonb_build_object('device_fp', device_fp, 'studentIds', student_ids, 'count', student_count) order by student_count desc)
      from device_flags
    ), '[]'::jsonb),
    'geoFailRate', coalesce((
      select jsonb_agg(jsonb_build_object(
        'subject_code', subject_code,
        'subject_name', subject_name,
        'total', total,
        'failed', failed,
        'failRate', case when total > 0 then round((failed::numeric / total) * 100)::integer else 0 end
      ) order by failed desc)
      from geo_fail_rate
      where total > 0
    ), '[]'::jsonb)
  )
  into result
  from totals;

  return result;
end;
$$;

revoke all on function public.get_teacher_analytics(uuid) from public;
grant execute on function public.get_teacher_analytics(uuid) to service_role;

create or replace function public.get_admin_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.close_expired_sessions(null);

  with session_counts as (
    select s.id, s.subject_code, s.subject_name, s.teacher_id, s.is_active, count(ar.id)::integer as scan_count
    from public.sessions s
    left join public.attendance_records ar on ar.session_id = s.id
    group by s.id, s.subject_code, s.subject_name, s.teacher_id, s.is_active
  ),
  teacher_stats as (
    select
      p.id,
      p.full_name,
      p.email,
      p.department,
      count(sc.id)::integer as session_count,
      count(sc.id) filter (where sc.is_active = true)::integer as active_count,
      coalesce(sum(sc.scan_count), 0)::integer as scan_count
    from public.profiles p
    left join session_counts sc on sc.teacher_id = p.id
    group by p.id, p.full_name, p.email, p.department
  ),
  subject_stats as (
    select
      subject_code,
      max(subject_name) as subject_name,
      count(*)::integer as session_count,
      coalesce(sum(scan_count), 0)::integer as scan_count
    from session_counts
    group by subject_code
    order by coalesce(sum(scan_count), 0) desc
    limit 10
  ),
  daily_activity as (
    select marked_at::date as day, count(*)::integer as scan_count
    from public.attendance_records
    where marked_at >= now() - interval '30 days'
    group by marked_at::date
  ),
  totals as (
    select
      (select count(*)::integer from public.sessions) as total_sessions,
      (select count(*)::integer from public.sessions where is_active = true) as active_sessions,
      (select count(*)::integer from public.attendance_records) as total_records,
      (select count(*)::integer from public.attendance_records where geo_verified = false) as flagged_records,
      (select count(*)::integer from public.profiles) as total_teachers
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'totalSessions', totals.total_sessions,
      'activeSessions', totals.active_sessions,
      'totalRecords', totals.total_records,
      'flaggedRecords', totals.flagged_records,
      'totalTeachers', totals.total_teachers
    ),
    'byTeacher', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profile', jsonb_build_object('id', id, 'full_name', full_name, 'email', email, 'department', department),
        'sessionCount', session_count,
        'activeCount', active_count,
        'scanCount', scan_count
      ) order by scan_count desc)
      from teacher_stats
      where session_count > 0
    ), '[]'::jsonb),
    'bySubject', coalesce((
      select jsonb_agg(jsonb_build_object('code', subject_code, 'name', subject_name, 'count', session_count, 'scans', scan_count) order by scan_count desc)
      from subject_stats
    ), '[]'::jsonb),
    'dailyActivity', coalesce((
      select jsonb_agg(jsonb_build_object('date', day::text, 'count', scan_count) order by day)
      from daily_activity
    ), '[]'::jsonb)
  )
  into result
  from totals;

  return result;
end;
$$;

revoke all on function public.get_admin_analytics() from public;
grant execute on function public.get_admin_analytics() to service_role;

create or replace function public.get_student_record_counts(p_student_ids text[])
returns table (
  student_id text,
  attendance_count bigint,
  enrollment_count bigint
)
language sql
security definer
set search_path = public
as $$
  with requested_students as (
    select unnest(p_student_ids) as student_id
  ),
  attendance_counts as (
    select ar.student_id, count(*) as attendance_count
    from public.attendance_records ar
    where ar.student_id = any(p_student_ids)
    group by ar.student_id
  ),
  enrollment_counts as (
    select se.student_id, count(*) as enrollment_count
    from public.session_enrollments se
    where se.student_id = any(p_student_ids)
    group by se.student_id
  )
  select
    rs.student_id,
    coalesce(ac.attendance_count, 0) as attendance_count,
    coalesce(ec.enrollment_count, 0) as enrollment_count
  from requested_students rs
  left join attendance_counts ac on ac.student_id = rs.student_id
  left join enrollment_counts ec on ec.student_id = rs.student_id;
$$;

revoke all on function public.get_student_record_counts(text[]) from public;
grant execute on function public.get_student_record_counts(text[]) to service_role;

create or replace function public.merge_students(p_source_student_id text, p_target_student_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  moved_count integer := 0;
  changed_count integer;
begin
  if p_source_student_id = p_target_student_id then
    raise exception 'Source and target student IDs must be different';
  end if;

  if not exists (select 1 from public.students where student_id = p_source_student_id) then
    raise exception 'Source student was not found';
  end if;

  if not exists (select 1 from public.students where student_id = p_target_student_id) then
    raise exception 'Target student was not found';
  end if;

  update public.attendance_records
  set
    student_id = p_target_student_id,
    student_name = (select name from public.students where student_id = p_target_student_id)
  where student_id = p_source_student_id
    and not exists (
      select 1
      from public.attendance_records existing
      where existing.session_id = attendance_records.session_id
        and existing.student_id = p_target_student_id
    );
  get diagnostics changed_count = row_count;
  moved_count := moved_count + changed_count;

  insert into public.attendance_record_duplicate_archive
  select *
  from public.attendance_records ar
  where ar.student_id = p_source_student_id
    and exists (
      select 1
      from public.attendance_records existing
      where existing.session_id = ar.session_id
        and existing.student_id = p_target_student_id
    )
  on conflict do nothing;

  delete from public.attendance_records
  where student_id = p_source_student_id
    and exists (
      select 1
      from public.attendance_records existing
      where existing.session_id = attendance_records.session_id
        and existing.student_id = p_target_student_id
        and existing.id <> attendance_records.id
    );

  update public.session_enrollments
  set student_id = p_target_student_id
  where student_id = p_source_student_id
    and not exists (
      select 1
      from public.session_enrollments existing
      where existing.session_id = session_enrollments.session_id
        and existing.student_id = p_target_student_id
    );
  get diagnostics changed_count = row_count;
  moved_count := moved_count + changed_count;

  delete from public.session_enrollments
  where student_id = p_source_student_id
    and exists (
      select 1
      from public.session_enrollments existing
      where existing.session_id = session_enrollments.session_id
        and existing.student_id = p_target_student_id
    );

  update public.students
  set is_active = false
  where student_id = p_source_student_id;

  return moved_count;
end;
$$;

revoke all on function public.merge_students(text, text) from public;
grant execute on function public.merge_students(text, text) to service_role;
