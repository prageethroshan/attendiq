-- Link legacy attendance records to the normalized session roster.
-- This makes historical attendance visible in student lookup and analytics.

insert into public.session_enrollments (session_id, student_id)
select distinct attendance.session_id, students.student_id
from public.attendance_records attendance
join public.students students
  on students.student_id = attendance.student_id
join public.sessions sessions
  on sessions.id = attendance.session_id
on conflict (session_id, student_id) do nothing;
