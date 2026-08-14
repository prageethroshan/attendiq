import ExcelJS from 'exceljs'

interface ExportAttendanceRecord {
  session_id: string
  student_id: string
  student_name: string
  year: string
  department: string | null
  status: string
  geo_verified: boolean | null
  dist_metres: number | null
  marked_at: string
  sessions?: { subject_code?: string; subject_name?: string }
}

interface AnalyticsSubject {
  subject_code?: string; code?: string; subject_name?: string; name?: string
  sessionCount?: number; count?: number; totalCount?: number; scans?: number
  presentCount?: number; attendanceRate?: number
}
interface AnalyticsSession {
  subject_code: string; subject_name: string; created_at: string
  scanned: number; enrolled: number; rate: number | null; is_active: boolean
}
interface AnalyticsData {
  bySubject?: AnalyticsSubject[]
  recentSessions?: AnalyticsSession[]
  dailyActivity?: Array<{ date: string; count: number }>
  deviceFlags?: Array<{ device_fp: string; studentIds: string[]; count: number }>
}

type ExportRow = Record<string, string | number>

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: ExportRow[],
  widths: number[]
) {
  const sheet = workbook.addWorksheet(name.slice(0, 31))
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  sheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: widths[index] ?? 14,
  }))
  sheet.addRows(rows)
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = headers.length > 0
    ? { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
    : undefined
}

async function download(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportAttendanceXLSX(
  records: ExportAttendanceRecord[],
  filename = 'AttendIQ-Attendance'
) {
  const workbook = new ExcelJS.Workbook()
  addSheet(workbook, 'Attendance Log', records.map(record => ({
    'Student ID': record.student_id,
    'Full Name': record.student_name,
    'Year': `Year ${record.year}`,
    'Department': record.department ?? '',
    'Subject Code': record.sessions?.subject_code ?? '',
    'Subject Name': record.sessions?.subject_name ?? '',
    'Status': record.status,
    'Location Signal': record.geo_verified === null ? 'N/A' : record.geo_verified ? 'Verified' : 'Flagged',
    'Distance (m)': record.dist_metres ?? '',
    'Marked At': new Date(record.marked_at).toLocaleString('en-LK'),
  })), [18, 24, 8, 26, 14, 44, 10, 16, 14, 20])

  const students = new Map<string, {
    id: string; name: string; year: string; department: string; present: number; total: number
  }>()
  for (const record of records) {
    const student = students.get(record.student_id) ?? {
      id: record.student_id, name: record.student_name, year: record.year,
      department: record.department ?? '', present: 0, total: 0,
    }
    student.total++
    if (record.status === 'Present') student.present++
    students.set(record.student_id, student)
  }
  addSheet(workbook, 'Student Summary', Array.from(students.values()).map(student => ({
    'Student ID': student.id,
    'Full Name': student.name,
    'Year': `Year ${student.year}`,
    'Department': student.department,
    'Sessions Present': student.present,
    'Sessions Recorded': student.total,
    'Recorded Rate': `${Math.round((student.present / student.total) * 100)}%`,
  })), [18, 24, 8, 26, 18, 18, 16])

  const flagged = records.filter(record => record.geo_verified === false)
  if (flagged.length > 0) {
    addSheet(workbook, 'Flagged Records', flagged.map(record => ({
      'Student ID': record.student_id,
      'Full Name': record.student_name,
      'Subject': record.sessions?.subject_code ?? '',
      'Reason': 'Location signal failed',
      'Distance (m)': record.dist_metres ?? 'Unknown',
      'Marked At': new Date(record.marked_at).toLocaleString('en-LK'),
    })), [18, 24, 14, 26, 14, 20])
  }

  await download(workbook, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportAnalyticsXLSX(data: AnalyticsData) {
  const workbook = new ExcelJS.Workbook()
  addSheet(workbook, 'By Subject', (data.bySubject ?? []).map(subject => ({
    'Subject Code': subject.subject_code ?? subject.code ?? '',
    'Subject Name': subject.subject_name ?? subject.name ?? '',
    'Sessions Run': subject.sessionCount ?? subject.count ?? '',
    'Expected Attendance': subject.totalCount ?? '',
    'Scans': subject.scans ?? subject.presentCount ?? '',
    'Attendance Rate': subject.attendanceRate === undefined ? '' : `${subject.attendanceRate}%`,
  })), [14, 44, 14, 20, 10, 18])

  if ((data.recentSessions ?? []).length > 0) {
    addSheet(workbook, 'Recent Sessions', (data.recentSessions ?? []).map(session => ({
      'Subject Code': session.subject_code,
      'Subject Name': session.subject_name,
      'Date': new Date(session.created_at).toLocaleDateString('en-LK'),
      'Scanned': session.scanned,
      'Enrolled': session.enrolled,
      'Rate': session.rate === null ? 'N/A' : `${session.rate}%`,
      'Status': session.is_active ? 'Active' : 'Ended',
    })), [14, 44, 14, 10, 10, 8, 10])
  }

  if ((data.dailyActivity ?? []).length > 0) {
    addSheet(workbook, 'Daily Activity', (data.dailyActivity ?? []).map(day => ({
      'Date': day.date, 'Scans': day.count,
    })), [14, 10])
  }

  const flags = data.deviceFlags ?? []
  if (flags.length > 0) {
    addSheet(workbook, 'Suspicious Submissions', flags.flatMap(flag =>
      flag.studentIds.map(studentId => ({
        'Device Signal': flag.device_fp,
        'Student ID': studentId,
        'IDs on Same Device': flag.count,
      }))
    ), [22, 18, 20])
  }

  await download(workbook, `AttendIQ-Analytics-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportSubjectRegisterXLSX(endpoint = '/api/attendance') {
  const records: ExportAttendanceRecord[] = []
  let page = 1
  let totalPages = 1
  do {
    const response = await fetch(`${endpoint}?page=${page}&pageSize=250`)
    if (!response.ok) throw new Error('Failed to export attendance records.')
    const data = await response.json()
    records.push(...(data.records ?? []))
    totalPages = data.totalPages ?? 1
    page++
  } while (page <= totalPages)

  if (records.length === 0) {
    alert('No attendance records found to export.')
    return
  }

  const workbook = new ExcelJS.Workbook()
  const subjects = new Map<string, ExportAttendanceRecord[]>()
  for (const record of records) {
    const code = record.sessions?.subject_code ?? 'Unknown'
    subjects.set(code, [...(subjects.get(code) ?? []), record])
  }

  for (const [code, subjectRecords] of subjects) {
    const sessions = Array.from(new Map(subjectRecords.map(record => [record.session_id, {
      id: record.session_id,
      date: new Date(record.marked_at).toLocaleDateString('en-LK'),
      sort: record.marked_at,
    }])).values()).sort((a, b) => a.sort.localeCompare(b.sort))
    const students = Array.from(new Map(subjectRecords.map(record => [record.student_id, record])).values())
      .sort((a, b) => a.student_id.localeCompare(b.student_id))
    const statusMap = new Map(subjectRecords.map(record => [
      `${record.student_id}:${record.session_id}`, record.status,
    ]))

    const rows: ExportRow[] = students.map(student => {
      const row: ExportRow = {
        'Student ID': student.student_id,
        'Full Name': student.student_name,
        'Year': `Year ${student.year}`,
        'Department': student.department ?? '',
      }
      let present = 0
      for (const session of sessions) {
        const status = statusMap.get(`${student.student_id}:${session.id}`)
        row[session.date] = status === 'Present' ? 'Yes' : status === 'Late' ? 'Late' : '-'
        if (status === 'Present') present++
      }
      row.Present = present
      row.Total = sessions.length
      row.Rate = `${Math.round((present / sessions.length) * 100)}%`
      return row
    })
    addSheet(workbook, code, rows, [18, 26, 8, 24, ...sessions.map(() => 12), 9, 7, 8])
  }

  await download(workbook, `AttendIQ-Register-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
