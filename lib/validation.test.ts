import { describe, expect, it } from 'vitest'
import {
  attendanceSchema,
  academicYearFromStudentId,
  createSessionSchema,
  paginationSchema,
  rosterStudentSchema,
  studentIdSchema,
  subjectSchema,
} from './validation'

describe('studentIdSchema', () => {
  it('normalises a valid student ID', () => {
    expect(studentIdSchema.parse(' mgt/2025/001 ')).toBe('MGT/2025/001')
  })

  it('rejects malformed and trivially enumerable fragments', () => {
    expect(studentIdSchema.safeParse('MGT').success).toBe(false)
    expect(studentIdSchema.safeParse('MGT-2025-001').success).toBe(false)
  })

  it('extracts the academic year from a valid student ID', () => {
    expect(academicYearFromStudentId('MGT/2025/001')).toBe(2025)
    expect(academicYearFromStudentId('invalid')).toBeNull()
  })
})

describe('request validation', () => {
  it('requires complete geolocation configuration', () => {
    const result = createSessionSchema.safeParse({
      subject_code: 'is-101', subject_name: 'Information Systems', duration_minutes: 60,
      academic_year: 2025, target_department: 'Management',
      geo_lat: 6.9271,
    })
    expect(result.success).toBe(false)
  })

  it('requires a target academic year and department', () => {
    expect(createSessionSchema.safeParse({
      subject_code: 'IS-101', subject_name: 'Information Systems', duration_minutes: 60,
    }).success).toBe(false)

    expect(createSessionSchema.safeParse({
      subject_code: 'IS-101', subject_name: 'Information Systems', duration_minutes: 60,
      academic_year: 2025, target_department: 'Management',
    }).success).toBe(true)
  })

  it('rejects invalid coordinates and pagination', () => {
    expect(attendanceSchema.safeParse({
      token: '1234567890123456', sessionId: crypto.randomUUID(),
      studentId: 'MGT/2025/001', geo: { lat: 91, lng: 80 },
    }).success).toBe(false)
    expect(paginationSchema.safeParse({ page: -1, pageSize: 10000 }).success).toBe(false)
  })

  it('accepts valid roster and subject rows', () => {
    expect(rosterStudentSchema.safeParse({
      student_id: 'MGT/2025/001', name: 'Test Student', year: '1', department: 'Management',
    }).success).toBe(true)
    expect(subjectSchema.parse({ code: ' is101 ', name: 'Information Systems', year: '1' }).code)
      .toBe('IS101')
  })
})
