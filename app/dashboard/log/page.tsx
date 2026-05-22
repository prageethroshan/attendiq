export default function LogPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Attendance Log
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Full record of all student submissions across your sessions
        </p>
      </div>
      <div className="glass" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Attendance log builds in Phase 6.
        </p>
      </div>
    </div>
  )
}
