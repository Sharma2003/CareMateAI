import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { patientAPI, doctorAPI, documentAPI, avatarAPI } from '../api/client';
import MicButton from '../components/MicButton';
import useMic from '../hooks/useMic';

import { IconUser, IconCalendar, IconPhone, IconDrop, IconRing, IconAlert, IconBriefcase, IconFacility, IconCap, IconAward, IconActivity } from '../components/Icons';

const PATIENT_FIELDS = [
    { key: 'first_name', label: 'First Name', type: 'text', icon: <IconUser size={15} />, color: '#3b82f6', bg: '#eff6ff' },
    { key: 'last_name', label: 'Last Name', type: 'text', icon: <IconUser size={15} />, color: '#3b82f6', bg: '#eff6ff' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'others'], icon: <IconActivity size={15} />, color: '#8b5cf6', bg: '#f3e8ff' },
    { key: 'DOB', label: 'Date of Birth', type: 'date', icon: <IconCalendar size={15} />, color: '#0ea5e9', bg: '#e0f2fe' },
    { key: 'phoneNo', label: 'Phone Number', type: 'text', icon: <IconPhone size={15} />, color: '#10b981', bg: '#d1fae5' },
    { key: 'bloodGroup', label: 'Blood Group', type: 'text', icon: <IconDrop size={15} />, color: '#ef4444', bg: '#fee2e2' },
    { key: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['married', 'unmarried'], icon: <IconRing size={15} />, color: '#f59e0b', bg: '#fef3c7' },
    { key: 'emergencyContactName', label: 'Emergency Contact', type: 'text', icon: <IconAlert size={15} />, color: '#f43f5e', bg: '#ffe4e6' },
    { key: 'emergencyContactPhone', label: 'Emergency Phone', type: 'text', icon: <IconPhone size={15} />, color: '#f43f5e', bg: '#ffe4e6' },
];

const DOCTOR_FIELDS = [
    { key: 'first_name', label: 'First Name', type: 'text', icon: <IconUser size={15} />, color: '#3b82f6', bg: '#eff6ff', group: 'personal' },
    { key: 'last_name', label: 'Last Name', type: 'text', icon: <IconUser size={15} />, color: '#3b82f6', bg: '#eff6ff', group: 'personal' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'others'], icon: <IconActivity size={15} />, color: '#8b5cf6', bg: '#f3e8ff', group: 'personal' },
    { key: 'DOB', label: 'Date of Birth', type: 'date', icon: <IconCalendar size={15} />, color: '#0ea5e9', bg: '#e0f2fe', group: 'personal' },
    { key: 'phoneNo', label: 'Phone Number', type: 'text', icon: <IconPhone size={15} />, color: '#10b981', bg: '#d1fae5', group: 'personal' },
    { key: 'YOE', label: 'Years of Experience', type: 'number', icon: <IconBriefcase size={15} />, color: '#f59e0b', bg: '#fef3c7', group: 'professional' },
    { key: 'specialization', label: 'Specialization', type: 'select', icon: <IconFacility size={15} />, color: '#0ea5e9', bg: '#e0f2fe', group: 'professional', options: ['General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics', 'Neurology', 'Gynecology', 'Ophthalmology', 'ENT', 'Psychiatry', 'Radiology', 'Pathology', 'Anesthesiology', 'Surgery', 'Oncology', 'Nephrology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Rheumatology', 'Other'] },
    { key: 'degree', label: 'Medical Degree(s)', type: 'text', icon: <IconCap size={15} />, color: '#10b981', bg: '#d1fae5', group: 'professional', placeholder: 'e.g. MBBS, MD, MS' },
    { key: 'certificate_number', label: 'Medical Council Reg. No.', type: 'text', icon: <IconAward size={15} />, color: '#8b5cf6', bg: '#f3e8ff', group: 'professional', placeholder: 'e.g. MH-123456' },
];

const DOCTOR_GROUPS = [
    { key: 'personal', label: '👤 Personal Information' },
    { key: 'professional', label: '🏥 Professional Details' },
];

export default function Profile() {
    const { user } = useAuth();
    const isAdmin  = user?.role === 'admin';
    const isDoctor = user?.role === 'doctor';
    // Admin: no patient/doctor profile API — show basic account info only
    const fields = isDoctor ? DOCTOR_FIELDS : PATIENT_FIELDS;
    const apiObj = isDoctor ? doctorAPI : patientAPI;

    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({});
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);

    const loadAvatar = () => {
        if (!user?.id) return;
        // Set URL directly - let img onError handle missing avatars
        setAvatarUrl(avatarAPI.getUrl(user.id) + '?t=' + Date.now());
    };

    const handleAvatarChange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setAvatarUploading(true);
        const fd = new FormData();
        fd.append('file', f);
        try {
            await avatarAPI.upload(fd);
            const newUrl = avatarAPI.getUrl(user.id) + '?t=' + Date.now();
            setAvatarUrl(newUrl);
            // Tell sidebar to refresh avatar
            window.dispatchEvent(new Event('avatar-updated'));
        } catch (err) { setError('Photo upload failed: ' + (err.response?.data?.detail || err.message)); }
        setAvatarUploading(false);
    };

    useEffect(() => { loadProfile(); loadAvatar(); }, []);

    const loadProfile = async () => {
        if (isAdmin) { setLoading(false); return; }   // Admin has no patient/doctor profile
        try { const res = await apiObj.getProfile(); setProfile(res.data); setForm(res.data); }
        catch { setProfile(null); }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true); setError(''); setSuccess('');
        try {
            const data = {};
            fields.forEach((f) => {
                if (form[f.key] !== undefined && form[f.key] !== '') {
                    data[f.key] = f.type === 'number' ? Number(form[f.key]) : form[f.key];
                }
            });
            if (profile) await apiObj.updateProfile(data);
            else await apiObj.createProfile(data);
            setSuccess('Profile saved!');
            setEditing(false);
            loadProfile();
        } catch (err) { setError(err.response?.data?.detail || 'Failed to save'); }
        setSaving(false);
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    /* ── View Mode ── */
    const renderViewMode = () => {
        if (!isDoctor) {
            return (
                <div className="grid grid-2">
                    {fields.map((f) => (
                        <div key={f.key} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8 }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '6px', background: f.bg, color: f.color }}>{f.icon}</span> {f.label}
                            </div>
                            <div style={{ fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: profile[f.key] ? '#0f172a' : '#cbd5e1', paddingLeft: '34px' }}>
                                {profile[f.key] || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return DOCTOR_GROUPS.map(group => {
            const groupFields = fields.filter(f => f.group === group.key);
            return (
                <div key={group.key} style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4f46e5', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #e0e7ff' }}>
                        {group.label}
                    </div>
                    <div className="grid grid-2">
                        {groupFields.map((f) => (
                            <div key={f.key} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '6px', background: f.bg, color: f.color }}>{f.icon}</span> {f.label}
                                </div>
                                <div style={{ fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: profile[f.key] ? '#0f172a' : '#cbd5e1', paddingLeft: '34px' }}>
                                    {f.key === 'certificate_number' && profile[f.key] ? (
                                        <span style={{ fontFamily: 'monospace', background: '#f3e8ff', padding: '4px 10px', borderRadius: 6, fontSize: '1rem', color: '#7c3aed' }}>
                                            {profile[f.key]}
                                        </span>
                                    ) : f.key === 'degree' && profile[f.key] ? (
                                        <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 6, fontSize: '1rem', fontWeight: 700 }}>
                                            {profile[f.key]}
                                        </span>
                                    ) : profile[f.key] || '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    };

    /* ── Edit Mode with per-field mic buttons ── */
    const renderEditMode = () => {
        // FieldWithMic: renders one text input + a mic button that fills it
        const FieldWithMic = ({ f }) => {
            const mic = useMic({
                mode: 'form',
                onTranscript: useCallback((text) => {
                    setForm((prev) => ({ ...prev, [f.key]: text }));
                }, [f.key]),
            });

            if (f.type === 'select') {
                return (
                    <div key={f.key} className="form-group">
                        <label>{f.icon} {f.label}</label>
                        <select className="form-select" value={form[f.key] || ''}
                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                            <option value="">Select…</option>
                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                );
            }

            return (
                <div key={f.key} className="form-group">
                    <label>{f.icon} {f.label}</label>
                    <div className="input-mic-row">
                        <input
                            className="form-input"
                            type={f.type}
                            value={form[f.key] || ''}
                            placeholder={f.placeholder || ''}
                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                            required={!profile && ['first_name', 'last_name', 'phoneNo', 'DOB', 'YOE'].includes(f.key)}
                        />
                        {/* Only show mic on text fields — not date/number */}
                        {f.type === 'text' && (
                            <MicButton
                                recording={mic.recording}
                                loading={mic.loading}
                                error={mic.error}
                                onStart={mic.startRecording}
                                onStop={mic.stopRecording}
                                onClear={mic.clearError}
                            />
                        )}
                    </div>
                </div>
            );
        };

        if (!isDoctor) {
            return (
                <div className="grid grid-2">
                    {fields.map((f) => <FieldWithMic key={f.key} f={f} />)}
                </div>
            );
        }

        return DOCTOR_GROUPS.map(group => {
            const groupFields = fields.filter(f => f.group === group.key);
            return (
                <div key={group.key} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366f1', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #e0e7ff' }}>
                        {group.label}
                    </div>
                    <div className="grid grid-2">
                        {groupFields.map((f) => <FieldWithMic key={f.key} f={f} />)}
                    </div>
                </div>
            );
        });
    };

    return (
        <div>
            <div className="page-header">
                <h1>{isAdmin ? 'Admin' : isDoctor ? 'Doctor' : 'Patient'} Profile</h1>
                <p>{isAdmin ? 'Your account information' : 'Manage your personal and professional information'}</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Admin: show read-only account card */}
            {isAdmin && (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 0 20px' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '3px solid #f59e0b' }}>
                            🛡️
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>{user?.username}</div>
                            <span style={{ background: '#fef3c722', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 20, padding: '2px 12px', fontSize: '0.78rem', fontWeight: 700 }}>Administrator</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[['👤 Username', user?.username], ['🔑 Role', 'Administrator'], ['📧 Access', 'Full system access'], ['🛡️ Status', 'Active']].map(([label, value]) => (
                            <div key={label} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Patient/Doctor sections — hidden for admin */}
            {!isAdmin && (
            <>

            {/* Avatar Upload (Patient) */}
            {!isDoctor && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 14, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.06)', border: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden', border: '3px solid #c4b5fd' }}>
                            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl(null)} /> : '👤'}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} title="Change photo"
                            style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '2px solid #6366f1', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            {avatarUploading ? '⏳' : '📷'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{user?.username}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Patient Profile</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Click 📷 to upload or change your photo</div>
                    </div>
                </div>
            )}

            {/* Doctor Profile Header Card */}
            {isDoctor && profile && (
                <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.4)' }}>
                            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl(null)} /> : '👨‍⚕️'}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} title="Change photo"
                            style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '2px solid #6366f1', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            {avatarUploading ? '⏳' : '📷'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Dr. {profile.first_name} {profile.last_name}</h2>
                        <div style={{ opacity: 0.85, marginTop: 4, fontSize: '0.9rem' }}>
                            {profile.specialization && <span>{profile.specialization}</span>}
                            {profile.degree && <span> • {profile.degree}</span>}
                            {profile.YOE && <span> • {profile.YOE} yrs exp</span>}
                        </div>
                        {profile.certificate_number && (
                            <div style={{ marginTop: 6, fontSize: '0.78rem', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>
                                Reg. No: {profile.certificate_number}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="card">
                {!profile && !editing ? (
                    <div className="empty-state">
                        <h3>No profile yet</h3>
                        <p>Create your profile to get started</p>
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setEditing(true)}>Create Profile</button>
                    </div>
                ) : !editing ? (
                    <>
                        {renderViewMode()}
                        <div style={{ marginTop: 20 }}>
                            <button className="btn btn-primary" onClick={() => { setEditing(true); setForm(profile); }}>Edit Profile</button>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleSave}>
                        {renderEditMode()}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </form>
                )}
            </div>
            {isDoctor && <DoctorDocumentsSection />}
            </>
            )}
        </div>
    );
}



/* ─── Doctor Documents Section ─── */
export function DoctorDocumentsSection() {
    const [docs, setDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('certificate');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [msg, setMsg] = useState('');

    const load = async () => {
        try { const r = await documentAPI.doctorList(); setDocs(r.data || []); } catch { }
    };
    useEffect(() => { load(); }, []);

    const upload = async () => {
        if (!file || !title.trim()) { setMsg('Please select a file and enter a title'); return; }
        setUploading(true); setMsg('');
        const fd = new FormData();
        fd.append('file', file); fd.append('title', title); fd.append('category', category); fd.append('description', description);
        try {
            await documentAPI.doctorUpload(fd);
            setMsg('✅ Uploaded successfully!');
            setTitle(''); setDescription(''); setFile(null); setCategory('certificate');
            load();
        } catch (e) { setMsg('❌ ' + (e.response?.data?.detail || 'Upload failed')); }
        setUploading(false);
    };

    const del = async (id) => {
        if (!window.confirm('Delete this document?')) return;
        try { await documentAPI.delete(id); load(); } catch { }
    };

    const catLabels = { certificate: '🏅 Certificate', degree: '🎓 Degree', license: '📜 License', other_doctor: '📁 Other' };
    const catIcon = { 'application/pdf': '📄', 'image/jpeg': '🖼', 'image/png': '🖼', 'image/jpg': '🖼' };

    return (
        <div style={{ marginTop: 32, padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: '#111', fontSize: 16 }}>📁 My Documents & Credentials</h3>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 12, fontSize: 13 }}>Upload New Document</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Title *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MBBS Degree" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 }}>
                            {Object.entries(catLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Description (optional)</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>File (PDF, JPG, PNG — max 10MB)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={upload} disabled={uploading} style={{ padding: '8px 20px', background: uploading ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 7, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>{uploading ? 'Uploading…' : '⬆ Upload'}</button>
                    {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
                </div>
            </div>
            {docs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No documents uploaded yet</div>
            ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                    {docs.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
                            <span style={{ fontSize: 24 }}>{catIcon[doc.mime_type] || '📁'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: '#111', fontSize: 13 }}>{doc.title}</div>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>{catLabels[doc.category] || doc.category} · {doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</div>
                                {doc.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{doc.description}</div>}
                            </div>
                            <a href={`http://localhost:8000/documents/view/${doc.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>View</a>
                            <button onClick={() => del(doc.id)} style={{ padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
