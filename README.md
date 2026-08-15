# AttendIQ

AttendIQ is a Next.js and Supabase attendance application for teacher-managed sessions, rotating QR codes, cohort-based attendance, manual marking, analytics, exports, and administration.

## Security model

- Admin access is derived only from the server-controlled `profiles.role` column.
- Teachers can access only their own sessions and attendance; admin APIs perform a database-backed role check before using the service-role client.
- Students are uploaded once to the student database. Each new session snapshots all students matching its academic year and department.
- Student identity fields come from that cohort snapshot. Public attendance requests cannot change the student master record.
- Public lookup remains ID-only by product decision. Its response is intentionally minimized and rate-limited, but it is not strong identity verification.
- Geolocation is a risk signal. Missing or out-of-range location is flagged but does not reject attendance.
- The signed device cookie is a duplicate-submission signal, not proof of a physical device or student identity.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and provide the Supabase values plus a long random `RATE_LIMIT_SECRET`.
3. Link the Supabase CLI to the intended project.
4. Apply migrations with `supabase db push`.
5. Start development with `npm run dev`.

The migrations under `supabase/migrations/` must be applied before deploying matching application code. They normalize session enrollment, protect profile roles, add cohort targeting, archive legacy duplicate attendance records, add uniqueness constraints, install atomic rate limiting, and add database-side aggregation for cohort counts and analytics.

The historical-attendance backfill links existing attendance records to the normalized session enrollment table. It is safe to run repeatedly because duplicate links are ignored.

To bootstrap the first administrator, set that user's `profiles.role` to `admin` directly through a trusted database administration channel. Never place authorization roles in user-editable metadata.

## Student CSV format

Upload the student list once from the dashboard. Student IDs must contain the academic intake year (for example, `MGT/2025/001`), and every row must include a department. When creating a session, choose an academic year and department; all matching students become that session's expected attendance list automatically.

```csv
Student ID,Full Name,Year,Department
MGT/2025/001,Kasun Perera,1,Business Management
```

Uploads are all-or-nothing. Existing student identity fields are immutable through teacher uploads; conflicting details are reported for administrator review.

Administrators can maintain student records from `/admin/students`. Deactivating a student excludes them from future cohort sessions while preserving historical attendance.

## Verification

```bash
npm run check
npm run build
```

`npm run check` runs ESLint, TypeScript, and Vitest. Critical deployment testing should also exercise migrations and RLS against a disposable Supabase project.

## Main routes

- `/dashboard`: teacher sessions, analytics, logs, student database, and QR panels
- `/admin`: administrator monitoring and account management
- `/session/[token]`: public cohort-based check-in
- `/lookup`: public, rate-limited ID-only attendance summary
- `/manual`: enter a short session code

## Deployment notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` and `RATE_LIMIT_SECRET` server-only.
- Set `NEXT_PUBLIC_BASE_URL` to the deployed HTTPS origin.
- Run migrations before switching application traffic.
- Review `attendance_record_duplicate_archive` after migration; it preserves duplicate records removed from the active log before unique indexes are created.
- Monitor `429`, `503`, failed geolocation, and duplicate constraint rates after rollout.
