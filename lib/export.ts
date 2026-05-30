import * as XLSX from 'xlsx'

export function exportAttendanceXLSX(
  records: any[],
  filename = 'AttendIQ-Attendance'
) {
  const wb = XLSX.utils.book_new()

  const logRows = records.map(record => ({
    'Student ID': record.student_id,
    'Full Name': record.student_name,
    'Year': `Year ${record.year}`,
    'Department': record.department ?? '',
    'Subject Code': record.sessions?.subject_code ?? '',
    'Subject Name': record.sessions?.subject_name ?? '',
    'Status': record.status,
    'Geo Verified': record.geo_verified === null ? 'N/A' : record.geo_verified ? 'Yes' : 'No',
    'Distance (m)': record.dist_metres ?? '',
    'Marked At': new Date(record.marked_at).toLocaleString('en-LK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    'Date': record.marked_at.slice(0, 10),
  }))

  const logSheet = XLSX.utils.json_to_sheet(logRows)
  logSheet['!cols'] = [
    { wch: 18 },
    { wch: 24 },
    { wch: 8 },
    { wch: 26 },
    { wch: 14 },
    { wch: 44 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, logSheet, 'Attendance Log')

  const studentMap = new Map<string, {
    student_id: string
    student_name: string
    year: string
    department: string
    present: number
    total: number
  }>()

  for (const record of records) {
    const key = record.student_id
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        student_id: record.student_id,
        student_name: record.student_name,
        year: record.year,
        department: record.department ?? '',
        present: 0,
        total: 0,
      })
    }

    const student = studentMap.get(key)!
    student.total++
    if (record.status === 'Present') student.present++
  }

  const summaryRows = Array.from(studentMap.values())
    .map(student => ({
      'Student ID': student.student_id,
      'Full Name': student.student_name,
      'Year': `Year ${student.year}`,
      'Department': student.department,
      'Sessions Present': student.present,
      'Sessions Total': student.total,
      'Attendance Rate': `${Math.round((student.present / student.total) * 100)}%`,
    }))
    .sort((a, b) => a['Student ID'].localeCompare(b['Student ID']))

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  summarySheet['!cols'] = [
    { wch: 18 },
    { wch: 24 },
    { wch: 8 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Student Summary')

  const flagged = records.filter(record => record.geo_verified === false)
  if (flagged.length > 0) {
    const flaggedRows = flagged.map(record => ({
      'Student ID': record.student_id,
      'Full Name': record.student_name,
      'Subject': record.sessions?.subject_code ?? '',
      'Reason': 'Geo verification failed',
      'Distance (m)': record.dist_metres ?? 'Unknown',
      'Marked At': new Date(record.marked_at).toLocaleString('en-LK'),
    }))

    const flaggedSheet = XLSX.utils.json_to_sheet(flaggedRows)
    flaggedSheet['!cols'] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, flaggedSheet, 'Flagged Records')
  }

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${filename}-${date}.xlsx`)
}

export function exportAnalyticsXLSX(data: any) {
  const wb = XLSX.utils.book_new()
  const date = new Date().toISOString().slice(0, 10)

  const subjectRows = (data.bySubject ?? []).map((subject: any) => ({
    'Subject Code': subject.subject_code ?? subject.code,
    'Subject Name': subject.subject_name ?? subject.name,
    'Sessions Run': subject.sessionCount ?? subject.count ?? '',
    'Total Scans': subject.totalCount ?? subject.scans ?? '',
    'Present': subject.presentCount ?? '',
    'Attendance Rate': subject.attendanceRate !== undefined ? `${subject.attendanceRate}%` : '',
  }))

  const subjectSheet = XLSX.utils.json_to_sheet(subjectRows)
  subjectSheet['!cols'] = [
    { wch: 14 },
    { wch: 44 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, subjectSheet, 'By Subject')

  const sessionRows = (data.recentSessions ?? []).map((session: any) => ({
    'Subject Code': session.subject_code,
    'Subject Name': session.subject_name,
    'Date': new Date(session.created_at).toLocaleDateString('en-LK'),
    'Scanned': session.scanned,
    'Enrolled': session.enrolled || 'Open',
    'Rate': session.rate !== null ? `${session.rate}%` : 'N/A',
    'Status': session.is_active ? 'Active' : 'Ended',
  }))

  const sessionSheet = XLSX.utils.json_to_sheet(sessionRows)
  sessionSheet['!cols'] = [
    { wch: 14 },
    { wch: 44 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, sessionSheet, 'Recent Sessions')

  const dailyRows = (data.dailyActivity ?? []).map((day: any) => ({
    'Date': day.date,
    'Scans': day.count,
  }))

  if (dailyRows.length > 0) {
    const dailySheet = XLSX.utils.json_to_sheet(dailyRows)
    dailySheet['!cols'] = [{ wch: 14 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily Activity')
  }

  if (data.deviceFlags?.length > 0) {
    const flagRows = data.deviceFlags.flatMap((flag: any) =>
      flag.studentIds.map((studentId: string) => ({
        'Device Fingerprint': flag.device_fp,
        'Student ID': studentId,
        'IDs on Same Device': flag.count,
      }))
    )
    const flagSheet = XLSX.utils.json_to_sheet(flagRows)
    flagSheet['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, flagSheet, 'Suspicious Submissions')
  }

  XLSX.writeFile(wb, `AttendIQ-Analytics-${date}.xlsx`)
}

export async function exportSubjectRegisterXLSX(endpoint = '/api/attendance') {
  const res = await fetch(`${endpoint}?page=1&pageSize=10000`)
  const data = await res.json()
  const records: any[] = data.records ?? []

  if (records.length === 0) {
    alert('No attendance records found to export.')
    return
  }

  const wb = XLSX.utils.book_new()

  const subjectMap = new Map<string, {
    subject_code: string
    subject_name: string
    sessions: Map<string, { session_id: string; date: string; sortValue: string }>
    students: Map<string, { student_id: string; student_name: string; year: string; department: string }>
    records: Map<string, string>
  }>()

  for (const record of records) {
    const code = record.sessions?.subject_code ?? 'Unknown'
    const name = record.sessions?.subject_name ?? ''

    if (!subjectMap.has(code)) {
      subjectMap.set(code, {
        subject_code: code,
        subject_name: name,
        sessions: new Map(),
        students: new Map(),
        records: new Map(),
      })
    }

    const subject = subjectMap.get(code)!

    if (!subject.sessions.has(record.session_id)) {
      subject.sessions.set(record.session_id, {
        session_id: record.session_id,
        date: new Date(record.marked_at).toLocaleDateString('en-LK', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        sortValue: record.marked_at,
      })
    }

    if (!subject.students.has(record.student_id)) {
      subject.students.set(record.student_id, {
        student_id: record.student_id,
        student_name: record.student_name,
        year: record.year,
        department: record.department ?? '',
      })
    }

    subject.records.set(`${record.student_id}__${record.session_id}`, record.status)
  }

  for (const subject of subjectMap.values()) {
    const sessions = Array.from(subject.sessions.values())
      .sort((a, b) => a.sortValue.localeCompare(b.sortValue))

    const students = Array.from(subject.students.values())
      .sort((a, b) => a.student_id.localeCompare(b.student_id))

    if (sessions.length === 0 || students.length === 0) continue

    const rows = students.map(student => {
      const row: Record<string, any> = {
        'Student ID': student.student_id,
        'Full Name': student.student_name,
        'Year': `Year ${student.year}`,
        'Department': student.department,
      }

      let presentCount = 0

      for (const session of sessions) {
        const status = subject.records.get(`${student.student_id}__${session.session_id}`)
        row[session.date] = status === 'Present' ? 'Yes' : status === 'Late' ? 'Late' : '-'
        if (status === 'Present') presentCount++
      }

      row['Present'] = presentCount
      row['Total'] = sessions.length
      row['Rate'] = `${Math.round((presentCount / sessions.length) * 100)}%`

      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 18 },
      { wch: 26 },
      { wch: 8 },
      { wch: 24 },
      ...sessions.map(() => ({ wch: 12 })),
      { wch: 9 },
      { wch: 7 },
      { wch: 7 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, subject.subject_code.slice(0, 31))
  }

  if (wb.SheetNames.length === 0) {
    alert('No data available to export.')
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `AttendIQ-Register-${date}.xlsx`)
}
