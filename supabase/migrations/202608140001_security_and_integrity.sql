-- AttendIQ security and integrity baseline.
-- Apply through the Supabase CLI before deploying the matching application code.

create table if not exists public.session_enrollments (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id text not null references public.students(student_id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

insert into public.session_enrollments (session_id, student_id)
select s.id, ids.student_id
from public.sessions s
cross join lateral unnest(coalesce(s.enrolled_ids, array[]::text[])) as ids(student_id)
join public.students st on st.student_id = ids.student_id
on conflict do nothing;

alter table public.session_enrollments enable row level security;

create policy "teachers read owned session enrollments"
on public.session_enrollments for select to authenticated
using (exists (
  select 1 from public.sessions s
  where s.id = session_id and s.teacher_id = auth.uid()
));

alter table public.subjects enable row level security;
create policy "teachers read shared and owned subjects"
on public.subjects for select to authenticated
using (is_custom = false or created_by = auth.uid());
create policy "teachers create owned custom subjects"
on public.subjects for insert to authenticated
with check (is_custom = true and created_by = auth.uid());

create or replace function public.import_session_roster(
  p_session_id uuid,
  p_teacher_id uuid,
  p_students jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  imported_count integer;
begin
  if not exists (
    select 1 from public.sessions
    where id = p_session_id and teacher_id = p_teacher_id
  ) then
    raise exception 'Session not found or forbidden';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_students) as incoming(
      student_id text, name text, year text, department text
    )
    join public.students existing on existing.student_id = incoming.student_id
    where existing.name is distinct from incoming.name
       or existing.year::text is distinct from incoming.year
       or coalesce(existing.department, '') is distinct from coalesce(incoming.department, '')
  ) then
    raise exception 'Student identity conflict';
  end if;

  insert into public.students (student_id, name, year, department)
  select student_id, name, year, department
  from jsonb_to_recordset(p_students) as incoming(
    student_id text, name text, year text, department text
  )
  on conflict (student_id) do nothing;

  insert into public.session_enrollments (session_id, student_id)
  select p_session_id, student_id
  from jsonb_to_recordset(p_students) as incoming(student_id text)
  on conflict do nothing;

  get diagnostics imported_count = row_count;
  return imported_count;
end;
$$;

revoke all on function public.import_session_roster(uuid, uuid, jsonb) from public;
grant execute on function public.import_session_roster(uuid, uuid, jsonb) to service_role;

revoke update (role, is_active) on public.profiles from authenticated;

-- Preserve duplicate records before adding uniqueness guarantees.
create table if not exists public.attendance_record_duplicate_archive
(like public.attendance_records including defaults including constraints);

with ranked as (
  select id,
    row_number() over (partition by session_id, student_id order by marked_at, id) as student_rank,
    case when device_fp is null then 1 else
      row_number() over (partition by session_id, device_fp order by marked_at, id)
    end as device_rank
  from public.attendance_records
)
insert into public.attendance_record_duplicate_archive
select ar.* from public.attendance_records ar
join ranked r on r.id = ar.id
where r.student_rank > 1 or r.device_rank > 1
on conflict do nothing;

delete from public.attendance_records ar
using public.attendance_record_duplicate_archive archive
where archive.id = ar.id;

create unique index if not exists attendance_one_record_per_student
  on public.attendance_records (session_id, student_id);
create unique index if not exists attendance_one_record_per_device
  on public.attendance_records (session_id, device_fp)
  where device_fp is not null;

-- Preserve the newest active session if legacy data contains concurrent sessions.
with ranked as (
  select id, row_number() over (
    partition by teacher_id order by created_at desc, id desc
  ) as active_rank
  from public.sessions where is_active = true
)
update public.sessions s set is_active = false
from ranked r where r.id = s.id and r.active_rank > 1;

create unique index if not exists sessions_one_active_per_teacher
  on public.sessions (teacher_id) where is_active = true;
create unique index if not exists sessions_token_unique on public.sessions (token);
create unique index if not exists sessions_short_code_unique on public.sessions (short_code);

alter table public.sessions drop constraint if exists sessions_geo_lat_check;
alter table public.sessions add constraint sessions_geo_lat_check
  check (geo_lat is null or geo_lat between -90 and 90);
alter table public.sessions drop constraint if exists sessions_geo_lng_check;
alter table public.sessions add constraint sessions_geo_lng_check
  check (geo_lng is null or geo_lng between -180 and 180);
alter table public.sessions drop constraint if exists sessions_geo_radius_check;
alter table public.sessions add constraint sessions_geo_radius_check
  check (geo_radius_m is null or geo_radius_m between 10 and 5000);

create table if not exists public.api_rate_limits (
  key text not null,
  route text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (key, route)
);
alter table public.api_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_route text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.api_rate_limits (key, route, window_started_at, request_count)
  values (p_key, p_route, now(), 1)
  on conflict (key, route) do update set
    window_started_at = case
      when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then now() else api_rate_limits.window_started_at end,
    request_count = case
      when api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then 1 else api_rate_limits.request_count + 1 end
  returning request_count into current_count;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;
revoke all on public.api_rate_limits from anon, authenticated;

alter table public.sessions drop column if exists enrolled_ids;

comment on table public.attendance_record_duplicate_archive is
  'Records archived by the 20260814 integrity migration before unique indexes were added.';
