import { useEffect, useState } from 'react';
import { adminAPI } from '../api/client';

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const STATUS_COLOR = {
  completed: { bg: '#dcfce7', c: '#16a34a' },
  booked: { bg: '#dbeafe', c: '#1d4ed8' },
  in_progress: { bg: '#fef9c3', c: '#a16207' },
  cancelled: { bg: '#fee2e2', c: '#dc2626' },
  no_show: { bg: '#f3f4f6', c: '#6b7280' },
};

function StatCard({ icon, value, label, color = '#4f46e5' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function PatientProfileModal({ patientId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminAPI.getPatientProfile(patientId)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load patient profile'))
      .finally(() => setLoading(false));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [patientId]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', padding: '20px 24px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Patient Profile</div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{data ? `${data.first_name} ${data.last_name}` : 'Loading…'}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {data && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[['👤 Name', `${data.first_name} ${data.last_name}`], ['🏷️ Username', data.username], ['📧 Email', data.email], ['📞 Phone', data.phone || '—'], ['⚥ Gender', data.gender || '—'], ['🗓️ DOB', data.dob || '—'], ['🩸 Blood Group', data.blood_group || '—'], ['💍 Marital Status', data.marital_status || '—'], ['🆘 Emergency Contact', data.emergency_contact || '—'], ['📲 Emergency Phone', data.emergency_phone || '—']].map(([label, value]) => (
                  <div key={label} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{value}</div>
                  </div>
                ))}
              </div>
              {data.bookings && data.bookings.length > 0 ? (
                <div>
                  <h4 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: '0.9rem', fontWeight: 700 }}>📅 Appointment History ({data.bookings.length})</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>{['Doctor', 'Date & Time', 'Status'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.bookings.map(b => {
                        const sc = STATUS_COLOR[b.status] || STATUS_COLOR.booked;
                        return (<tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 12px', fontWeight: 600 }}>{b.doctor}</td><td style={{ padding: '8px 12px', color: '#64748b' }}>{fmtDT(b.start_ts)}</td><td style={{ padding: '8px 12px' }}><span style={{ background: sc.bg, color: sc.c, padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{b.status?.replace('_', ' ')}</span></td></tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>No appointments yet</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchDoc, setSearchDoc] = useState('');
  const [searchPat, setSearchPat] = useState('');
  const [viewingPatientId, setViewingPatientId] = useState(null);

  useEffect(() => {
    adminAPI.dashboard()
      .then(r => setData(r.data))
      .catch(e => {
        const status = e.response?.status;
        const detail = e.response?.data?.detail;
        if (status === 403) setError(`Access denied: ${detail || 'You are not authorized as admin'}`);
        else if (status === 500) setError(`Server error: ${detail || 'Internal server error — check backend logs'}`);
        else if (!e.response) setError('Cannot connect to backend — ensure the server is running on port 8000');
        else setError(detail || `Failed to load admin data (HTTP ${status})`);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (error) return (
    <div>
      <div className="page-header"><h1>🛡️ Admin Dashboard</h1></div>
      <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      <div className="card" style={{ color: '#64748b', fontSize: '0.9rem' }}><p>Ensure you are logged in as Admin and the backend is running.</p></div>
    </div>
  );

  const s = data.stats;
  const tabs = [{ id: 'overview', label: '📊 Overview' }, { id: 'doctors', label: '👨‍⚕️ Doctors' }, { id: 'patients', label: '🧑‍⚕️ Patients' }, { id: 'bookings', label: '📅 Recent Bookings' }];
  const filteredDocs = (data.doctors || []).filter(d => !searchDoc || d.name.toLowerCase().includes(searchDoc.toLowerCase()) || d.email.toLowerCase().includes(searchDoc.toLowerCase()));
  const filteredPats = (data.patients || []).filter(p => !searchPat || p.name.toLowerCase().includes(searchPat.toLowerCase()) || p.email.toLowerCase().includes(searchPat.toLowerCase()));

  return (
    <div>
      <div className="page-header"><h1>🛡️ Admin Dashboard</h1><p>Platform-wide overview — CareMate</p></div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f8fafc', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {tabs.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === t.id ? 700 : 500, background: activeTab === t.id ? '#4f46e5' : 'transparent', color: activeTab === t.id ? '#fff' : '#64748b', transition: 'all .15s' }}>{t.label}</button>)}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon="👨‍⚕️" value={s.total_doctors} label="Doctors Enrolled" color="#4f46e5" />
            <StatCard icon="🧑‍⚕️" value={s.total_patients} label="Patients Registered" color="#0ea5e9" />
            <StatCard icon="📅" value={s.total_bookings} label="Total Appointments" color="#8b5cf6" />
            <StatCard icon="✅" value={s.completed_consultations} label="Consultations Completed" color="#10b981" />
            <StatCard icon="⏳" value={s.upcoming} label="Upcoming Appointments" color="#f59e0b" />
            <StatCard icon="🔄" value={s.in_progress} label="In Progress" color="#f97316" />
            <StatCard icon="❌" value={s.cancelled} label="Cancelled" color="#ef4444" />
            <StatCard icon="💊" value={s.total_prescriptions} label="Prescriptions Written" color="#06b6d4" />
          </div>
          {s.total_bookings > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>📈 Consultation Completion Rate</h3>
              <div style={{ height: 12, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(s.completed_consultations / s.total_bookings * 100)}%`, background: 'linear-gradient(90deg, #4f46e5, #10b981)', borderRadius: 999, transition: 'width 1s ease' }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 6 }}>{Math.round(s.completed_consultations / s.total_bookings * 100)}% of {s.total_bookings} appointments completed</div>
            </div>
          )}
          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>📅 Recent Activity</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Patient</th><th>Doctor</th><th>Date & Time</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.recent_bookings || []).slice(0, 5).map(b => { const sc = STATUS_COLOR[b.status] || STATUS_COLOR.booked; return (<tr key={b.id}><td style={{ fontWeight: 600 }}>{b.patient}</td><td>{b.doctor}</td><td style={{ color: '#64748b', fontSize: '0.85rem' }}>{fmtDT(b.start_ts)}</td><td><span style={{ background: sc.bg, color: sc.c, padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{b.status?.replace('_', ' ')}</span></td></tr>); })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'doctors' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>👨‍⚕️ All Doctors ({filteredDocs.length})</h3>
            <input value={searchDoc} onChange={e => setSearchDoc(e.target.value)} placeholder="Search doctors…" className="form-input" style={{ maxWidth: 240, fontSize: '0.85rem' }} />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Specialization</th><th>Username</th><th>Email</th></tr></thead>
              <tbody>
                {filteredDocs.map((d, i) => (<tr key={d.id}><td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td><td style={{ fontWeight: 700, color: '#1e293b' }}>{d.name}</td><td><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{d.specialization}</span></td><td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{d.username}</td><td style={{ color: '#64748b', fontSize: '0.85rem' }}>{d.email}</td></tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>🧑‍⚕️ All Patients ({filteredPats.length})</h3>
            <input value={searchPat} onChange={e => setSearchPat(e.target.value)} placeholder="Search patients…" className="form-input" style={{ maxWidth: 240, fontSize: '0.85rem' }} />
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredPats.map((p, i) => (<tr key={p.id}><td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{i + 1}</td><td style={{ fontWeight: 600, color: '#1e293b' }}>{p.name}</td><td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.username}</td><td style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.email}</td><td style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.phone}</td><td><button onClick={() => setViewingPatientId(p.id)} style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>👁 View Profile</button></td></tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontWeight: 700 }}>📅 Recent 10 Bookings</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Patient</th><th>Doctor</th><th>Date & Time</th><th>Status</th></tr></thead>
              <tbody>
                {(data.recent_bookings || []).map(b => { const sc = STATUS_COLOR[b.status] || STATUS_COLOR.booked; return (<tr key={b.id}><td style={{ fontWeight: 600 }}>{b.patient}</td><td>{b.doctor}</td><td style={{ color: '#64748b', fontSize: '0.85rem' }}>{fmtDT(b.start_ts)}</td><td><span style={{ background: sc.bg, color: sc.c, padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{b.status?.replace('_', ' ')}</span></td></tr>); })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingPatientId && <PatientProfileModal patientId={viewingPatientId} onClose={() => setViewingPatientId(null)} />}
    </div>
  );
}
