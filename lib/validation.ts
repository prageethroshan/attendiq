import { z } from 'zod'

export const studentIdSchema = z.string()
  .trim()
  .transform(value => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2,6}\/\d{4}\/\d{2,4}$/, 'Use the format MGT/2025/001.'))

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(250).default(50),
})

const latitude = z.number().finite().min(-90).max(90)
const longitude = z.number().finite().min(-180).max(180)

export const createSessionSchema = z.object({
  subject_code: z.string().trim().min(1).max(20).transform(value => value.toUpperCase()),
  subject_name: z.string().trim().min(1).max(160),
  duration_minutes: z.number().int().min(5).max(480),
  academic_year: z.number().int().min(2000).max(2100),
  target_department: z.string().trim().min(1).max(160),
  geo_lat: latitude.nullable().default(null),
  geo_lng: longitude.nullable().default(null),
  geo_radius_m: z.number().int().min(10).max(5000).nullable().default(null),
}).superRefine((value, ctx) => {
  const geoValues = [value.geo_lat, value.geo_lng, value.geo_radius_m]
  const configured = geoValues.some(item => item !== null)
  if (configured && geoValues.some(item => item === null)) {
    ctx.addIssue({ code: 'custom', message: 'Latitude, longitude, and radius must be provided together.' })
  }
})

export const attendanceSchema = z.object({
  token: z.string().trim().min(16).max(128),
  sessionId: z.string().uuid(),
  studentId: studentIdSchema,
  geo: z.object({ lat: latitude, lng: longitude }).nullable().optional(),
})

export const subjectSchema = z.object({
  code: z.string().trim().min(1).max(20).transform(value => value.toUpperCase()),
  name: z.string().trim().min(1).max(160),
  year: z.coerce.number().int().min(1).max(10).nullable().optional(),
  semester: z.coerce.number().int().min(1).max(4).nullable().optional(),
})

export const rosterStudentSchema = z.object({
  student_id: studentIdSchema,
  name: z.string().trim().min(1).max(160),
  year: z.coerce.string().trim().regex(/^\d{1,2}$/, 'Year must be numeric.'),
  department: z.string().trim().min(1, 'Department is required.').max(160),
})

export function academicYearFromStudentId(studentId: string): number | null {
  const match = studentId.match(/^[A-Z]{2,6}\/(\d{4})\/\d{2,4}$/)
  return match ? Number(match[1]) : null
}

export function validationError(error: z.ZodError) {
  return error.issues[0]?.message ?? 'Invalid request.'
}
