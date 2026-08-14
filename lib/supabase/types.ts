export type Session = {
  id: string
  token: string
  short_code: string
  subject_code: string
  subject_name: string
  teacher_id: string
  teacher_name: string
  is_active: boolean
  expires_at: string
  enrolled_count?: number
  geo_lat: number | null
  geo_lng: number | null
  geo_radius_m: number | null
  created_at: string
}

export type AttendanceRecord = {
  id: string
  session_id: string
  student_id: string
  student_name: string
  year: string
  department: string | null
  status: 'Present' | 'Late' | 'Absent'
  device_fp: string | null
  geo_verified: boolean | null
  dist_metres: number | null
  manual_entry: boolean
  marked_by: string | null
  marked_at: string
}

export type Student = {
  student_id: string
  name: string
  year: string
  department: string
  created_at: string
}

export type GeoConfig = {
  lat: number
  lng: number
  radiusM: number
}

// Session with geo config as a typed object (used in client components)
export type SessionWithGeo = Session & {
  geoConfig: GeoConfig | null
}
