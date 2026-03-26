import { useEffect, useState } from 'react';
import { prescriptionAPI } from '../api/client';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function exportPDF(rx) {
  const meds = (rx.medicines || []).map(m =>
    `<tr><td>${m.name}</td><td>${m.dosage||'—'}</td><td>${m.schedule||'—'}</td><td>${m.duration||'—'}</td><td>${m.instructions||'—'}</td></tr>`
  ).join('');
  const labs = (rx.lab_tests || []).map(t => `<li><strong>${t.test_name}</strong>${t.instructions?' — '+t.instructions:''}</li>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prescription</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:13px}.header{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;padding:28px 36px}.header h1{margin:0;font-size:22px}.header p{margin:4px 0 0;opacity:.85;font-size:12px}.body{padding:28px 36px}.card{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px}.card-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#2563eb;margin-bottom:8px;border-bottom:1px solid #dbeafe;padding-bottom:6px}.row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b}td{padding:7px 10px;border-bottom:1px solid #f1f5f9}.referral{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:16px}.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;color:rgba(37,99,235,.04);font-weight:900;pointer-events:none}</style>
</head><body>
<div class="watermark">CareMate</div>
<div class="header"><h1>🏥 Medical Prescription — CareMate</h1><p>Generated ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</p></div>
<div class="body">
<div class="row2">
  <div class="card"><div class="card-title">Patient</div><strong>${rx.patient_name||'—'}</strong><br/>${rx.patient_phone||''}</div>
  <div class="card"><div class="card-title">Consulting Doctor</div><strong>${rx.doctor_name||'—'}</strong><br/>${rx.doctor_specialization||''}</div>
</div>
${rx.facility_name?`<div class="card"><div class="card-title">Facility</div>${rx.facility_name}</div>`:''}
${rx.diagnosis?`<div class="card"><div class="card-title">Diagnosis</div>${rx.diagnosis}</div>`:''}
${rx.doctor_notes?`<div class="card"><div class="card-title">Doctor's Notes</div><div style="white-space:pre-wrap">${rx.doctor_notes}</div></div>`:''}
${(rx.medicines||[]).length>0?`<div class="card"><div class="card-title">Prescription</div><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Schedule</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${meds}</tbody></table></div>`:''}
${labs?`<div class="card"><div class="card-title">Investigations Requested</div><ul style="margin:4px 0;padding-left:20px;line-height:2">${labs}</ul></div>`:''}
${rx.referral_to_specialist?`<div class="referral"><strong>⚕️ Referral to ${rx.referral_to_specialist}</strong>${rx.referral_doctor_name?' — Dr. '+rx.referral_doctor_name:''}${rx.referral_notes?'<br><em>'+rx.referral_notes+'</em>':''}</div>`:''}
</div></body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
}

function PrescriptionCard({ rx }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      {/* Header row */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer', background: expanded ? '#f8fafc' : '#fff', transition: 'background 0.2s' }} onClick={() => setExpanded(v => !v)}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: '1.3rem' }}>💊</span>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{rx.diagnosis || 'Prescription'}</span>
            {rx.referral_to_specialist && <span style={{ background: '#fff7ed', color: '#d97706', padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>↗ Referral</span>}
            {(rx.lab_tests || []).length > 0 && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>🔬 Tests</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span>👨‍⚕️ {rx.doctor_name || '—'} {rx.doctor_specialization ? `(${rx.doctor_specialization})` : ''}</span>
            {rx.facility_name && <span>🏥 {rx.facility_name}</span>}
            <span>📅 {fmtDate(rx.created_at)}</span>
            <span>💊 {(rx.medicines || []).length} medicine{rx.medicines?.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); exportPDF(rx); }}
            style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🖨️ Print
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f1f5f9' }}>
          {rx.doctor_notes && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '.06em', marginBottom: 6, borderBottom: '1px solid #dbeafe', paddingBottom: 4 }}>📝 Doctor's Notes</div>
              <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rx.doctor_notes}</div>
            </div>
          )}

          {(rx.medicines || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '.06em', marginBottom: 8, borderBottom: '1px solid #dbeafe', paddingBottom: 4 }}>💊 Prescription</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(rx.medicines || []).map((m, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💊 {m.name}</div>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                      {m.dosage && <span>Dosage: <strong style={{ color: '#1e293b' }}>{m.dosage}</strong></span>}
                      {m.schedule && <span>Schedule: <strong style={{ color: '#1e293b' }}>{m.schedule}</strong></span>}
                      {m.duration && <span>Duration: <strong style={{ color: '#1e293b' }}>{m.duration}</strong></span>}
                      {m.instructions && <span style={{ color: '#d97706' }}>⚠ {m.instructions}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(rx.lab_tests || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#059669', letterSpacing: '.06em', marginBottom: 8, borderBottom: '1px solid #d1fae5', paddingBottom: 4 }}>🔬 Tests Requested</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {(rx.lab_tests || []).map((t, i) => (
                  <div key={i} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#059669' }}>•</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.test_name}</span>
                    {t.instructions && <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>— {t.instructions}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rx.referral_to_specialist && (
            <div style={{ marginTop: 14, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#d97706', letterSpacing: '.06em', marginBottom: 6 }}>↗️ Referral</div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>Specialist: {rx.referral_to_specialist}</div>
              {rx.referral_doctor_name && <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 3 }}>Doctor: {rx.referral_doctor_name}</div>}
              {rx.referral_notes && <div style={{ fontSize: '0.84rem', color: '#92400e', marginTop: 4, lineHeight: 1.6 }}>{rx.referral_notes}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionAPI.patientAll()
      .then(r => setPrescriptions(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Prescriptions</h1>
        <p>View all prescriptions issued by your doctors</p>
      </div>

      {prescriptions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💊</div>
          <h3 style={{ margin: '0 0 6px', color: '#64748b' }}>No prescriptions yet</h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Prescriptions will appear here after your doctor completes a consultation</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {prescriptions.map(rx => <PrescriptionCard key={rx.id} rx={rx} />)}
        </div>
      )}
    </div>
  );
}
