import { useEffect, useState, useRef } from 'react';
import { documentAPI } from '../api/client';

import { IconFile, IconImage, IconPdf, IconDrop, IconBriefcase, IconAward, IconActivity, IconSearch } from '../components/Icons';

const CATEGORIES = [
  { value: 'lab_report', label: 'Lab Reports', icon: <IconDrop size={15} />, color: '#059669', bg: '#dcfce7', desc: 'CBC, LFT, KFT, etc.' },
  { value: 'imaging', label: 'Imaging / Radiology', icon: <IconActivity size={15} />, color: '#7c3aed', bg: '#ede9fe', desc: 'X-Ray, MRI, CT Scan, USG' },
  { value: 'prescription', label: 'Prescription', icon: <IconFile size={15} />, color: '#d97706', bg: '#fef3c7', desc: 'Medication prescriptions' },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: <IconBriefcase size={15} />, color: '#e11d48', bg: '#ffe4e6', desc: 'Hospital discharge notes' },
  { value: 'referral_test', label: 'Referral Test', icon: <IconAward size={15} />, color: '#2563eb', bg: '#dbeafe', desc: 'Test result requested by doctor' },
  { value: 'other_patient', label: 'Other', icon: <IconSearch size={15} />, color: '#475569', bg: '#f1f5f9', desc: 'Any other medical document' },
];

const BACKEND = 'http://localhost:8000';

function fmtBytes(b) {
  if (!b) return '';
  const n = parseInt(b);
  if (n > 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
function iconFor(mime) {
  if (!mime) return { el: <IconFile size={26} />, color: '#64748b', bg: '#f1f5f9' };
  if (mime.includes('pdf')) return { el: <IconPdf size={26} />, color: '#e11d48', bg: '#ffe4e6' };
  if (mime.includes('image')) return { el: <IconImage size={26} />, color: '#059669', bg: '#dcfce7' };
  if (mime.includes('word') || mime.includes('document')) return { el: <IconFile size={26} />, color: '#2563eb', bg: '#dbeafe' };
  return { el: <IconFile size={26} />, color: '#64748b', bg: '#f1f5f9' };
}

export default function MyDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  // Upload form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('lab_report');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await documentAPI.patientList(); setDocs(r.data || []); }
    catch { }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setUploadErr('Please select a file.'); return; }
    if (!title.trim()) { setUploadErr('Please enter a document title.'); return; }
    setUploading(true); setUploadErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      fd.append('category', category);
      fd.append('description', description.trim());
      await documentAPI.patientUpload(fd);
      setShowUpload(false); setFile(null); setTitle(''); setDescription(''); setCategory('lab_report');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setUploadErr(err.response?.data?.detail || 'Upload failed. Check file type (PDF, JPG, PNG, DOCX) and size (max 10 MB).');
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeleting(id);
    try { await documentAPI.delete(id); await load(); }
    catch { alert('Failed to delete.'); }
    setDeleting(null);
  };

  const filtered = filter === 'all' ? docs : docs.filter(d => d.category === filter);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Documents</h1>
        <p>Upload and manage your medical records, lab reports, X-rays and more</p>
      </div>

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ value: 'all', label: 'All Documents', icon: <IconFile size={15} />, color: '#4f46e5', bg: '#e0e7ff' }, ...CATEGORIES].map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 24, border: 'none',
              background: filter === c.value ? c.color : '#f8fafc',
              color: filter === c.value ? '#ffffff' : '#64748b',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: filter === c.value ? `0 4px 12px ${c.color}50` : 'inset 0 0 0 1px #e2e8f0'
            }}>
            <span style={{ color: filter === c.value ? '#ffffff' : c.color, display: 'flex' }}>{c.icon}</span> {c.label}
          </button>
        ))}
        <button onClick={() => setShowUpload(true)} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 24, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
          ⬆ Upload Document
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Documents', value: docs.length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Lab Reports', value: docs.filter(d => d.category === 'lab_report').length, color: '#059669', bg: '#dcfce7' },
          { label: 'Imaging', value: docs.filter(d => d.category === 'imaging').length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Referral Tests', value: docs.filter(d => d.category === 'referral_test').length, color: '#d97706', bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <div style={{ color: '#cbd5e1', marginBottom: 16, display: 'flex', justifyContent: 'center' }}><IconFile size={60} /></div>
          <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '1.2rem' }}>No documents {filter !== 'all' ? 'in this category' : 'yet'}</h3>
          <p style={{ margin: '0 0 24px', fontSize: '0.95rem' }}>Upload your medical records, lab reports and test results</p>
          <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 24 }}>⬆ Upload First Document</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(doc => {
            const cat = CATEGORIES.find(c => c.value === doc.category);
            const iconData = iconFor(doc.mime_type);
            return (
              <div key={doc.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,.03)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,.1)'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.03)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: iconData.bg, color: iconData.color, flexShrink: 0 }}>
                  {iconData.el}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#0f172a', fontSize: '1.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{doc.title}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: cat?.bg || '#f1f5f9', color: cat?.color || '#475569', padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>{cat?.label || doc.category}</span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{doc.file_name}</span>
                    {doc.file_size_bytes && <span style={{ fontSize: '0.85rem', color: '#94a3b8', borderLeft: '1px solid #e2e8f0', paddingLeft: 10 }}>{fmtBytes(doc.file_size_bytes)}</span>}
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', borderLeft: '1px solid #e2e8f0', paddingLeft: 10 }}>📅 {fmtDate(doc.uploaded_at)}</span>
                  </div>
                  {doc.description && <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: 8 }}>{doc.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <a href={`${BACKEND}/documents/view/${doc.id}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#2563eb', padding: '8px 16px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#dbeafe'} onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}>
                    View
                  </a>
                  <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#dc2626', border: 'none', width: 36, height: 36, borderRadius: 10, cursor: deleting === doc.id ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: deleting === doc.id ? 0.5 : 1 }}
                    title="Delete Document"
                    onMouseOver={e => e.currentTarget.style.background = '#fee2e2'} onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}>
                    {deleting === doc.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.7)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Upload Medical Document</h3>
                <p style={{ margin: '3px 0 0', opacity: .8, fontSize: '0.78rem' }}>PDF, JPG, PNG, DOCX · Max 10 MB</p>
              </div>
              <button onClick={() => setShowUpload(false)} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <form onSubmit={handleUpload} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {uploadErr && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 600 }}>{uploadErr}</div>}

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6, fontSize: '0.85rem' }}>Document Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CBC Report June 2025" required />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6, fontSize: '0.85rem' }}>Category *</label>
                <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6, fontSize: '0.85rem' }}>Description (optional)</label>
                <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Fasting blood test, referred by Dr. Sharma" />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6, fontSize: '0.85rem' }}>Select File *</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ width: '100%', padding: '10px', border: '2px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', fontSize: '0.88rem', background: '#f8fafc' }} />
                {file && <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: 5, fontWeight: 600 }}>✓ {file.name} ({fmtBytes(String(file.size))})</div>}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowUpload(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ minWidth: 120 }}>
                  {uploading ? 'Uploading…' : '⬆ Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
