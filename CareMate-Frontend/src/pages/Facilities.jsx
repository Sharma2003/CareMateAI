import { useEffect, useState } from 'react';
import { facilityAPI, doctorAPI } from '../api/client';
import Modal from '../components/Modal';

const FACILITY_TYPES = [
    { value: 'clinics', label: 'Clinic' },
    { value: 'hospital', label: 'Hospital' },
    { value: 'diagnostic_center', label: 'Diagnostic Center' },
    { value: 'pathology_lab', label: 'Pathology Lab' },
    { value: 'radiology_center', label: 'Radiology Center' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'nursing_home', label: 'Nursing Home' },
    { value: 'rehabilitation_center', label: 'Rehabilitation Center' },
    { value: 'telemedicine', label: 'Telemedicine' },
    { value: 'polyclinic', label: 'Polyclinic' },
    { value: 'eye_care_center', label: 'Eye Care Center' },
    { value: 'dental_clinic', label: 'Dental Clinic' },
    { value: 'physiotherapy_center', label: 'Physiotherapy Center' },
    { value: 'maternity_center', label: 'Maternity Center' },
    { value: 'blood_bank', label: 'Blood Bank' },
    { value: 'other', label: 'Other' },
];

const TYPE_ICON = {
    clinics: '🏥', hospital: '🏨', diagnostic_center: '🔬', pathology_lab: '🧪',
    radiology_center: '📡', pharmacy: '💊', nursing_home: '🛏️', rehabilitation_center: '♿',
    telemedicine: '💻', polyclinic: '🏢', eye_care_center: '👁️', dental_clinic: '🦷',
    physiotherapy_center: '🤸', maternity_center: '👶', blood_bank: '🩸', other: '📍',
};

const EMPTY_FORM = {
    facilityName: '', facilityType: 'clinics',
    facilityAddress: '', city: '', state: '', postalCode: '',
    contactNumber: '', website: '', registrationNumber: '', operatingHours: '',
};

export default function Facilities() {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasProfile, setHasProfile] = useState(true);
    const [filterType, setFilterType] = useState('');

    useEffect(() => { checkProfile(); loadFacilities(); }, []);

    const checkProfile = async () => {
        try { await doctorAPI.getProfile(); setHasProfile(true); }
        catch { setHasProfile(false); }
    };

    const loadFacilities = async () => {
        setLoading(true);
        try {
            const res = await facilityAPI.list();
            setFacilities(res.data);
            setError('');
        } catch (err) {
            if (err.response?.status === 404) setFacilities([]);
            else { setError(parseError(err)); setFacilities([]); }
        }
        setLoading(false);
    };

    const parseError = (err) => {
        const data = err?.response?.data;
        if (!data) return err.message || 'Network error';
        if (Array.isArray(data.detail)) return data.detail.map((d) => `${d.loc?.join(' → ')}: ${d.msg}`).join('; ');
        return typeof data.detail === 'string' ? data.detail : JSON.stringify(data);
    };

    const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); setError(''); setSuccess(''); };

    const openEdit = (f) => {
        setForm({
            facilityName: f.facilityName || '', facilityType: f.facilityType || 'clinics',
            facilityAddress: f.facilityAddress || '', city: f.city || '', state: f.state || '',
            postalCode: f.postalCode || '', contactNumber: f.contactNumber || '',
            website: f.website || '', registrationNumber: f.registrationNumber || '',
            operatingHours: f.operatingHours || '',
        });
        setEditId(f.id); setShowModal(true); setError(''); setSuccess('');
    };

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const data = { ...form, postalCode: Number(form.postalCode) };
            if (editId) { await facilityAPI.update(editId, data); setSuccess('Facility updated!'); }
            else { await facilityAPI.create(data); setSuccess('Facility created!'); }
            setShowModal(false); loadFacilities();
        } catch (err) { setError(parseError(err)); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this facility?')) return;
        setError('');
        try { await facilityAPI.delete(id); setSuccess('Facility deleted'); loadFacilities(); }
        catch (err) { setError(parseError(err)); }
    };

    const filtered = filterType ? facilities.filter(f => f.facilityType === filterType) : facilities;
    const typeLabel = (type) => FACILITY_TYPES.find(t => t.value === type)?.label || type;

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Facilities</h1>
                    <p>Manage your clinics, hospitals, diagnostics and other provider locations</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate} disabled={!hasProfile}>+ Add Facility</button>
            </div>

            {!hasProfile && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                    ⚠️ You need to <a href="/profile" style={{ color: 'inherit', fontWeight: 'bold', textDecoration: 'underline' }}>create your doctor profile</a> before adding facilities.
                </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Filter bar */}
            {facilities.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <button onClick={() => setFilterType('')} style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: filterType === '' ? '#6366f1' : '#fff', color: filterType === '' ? '#fff' : '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                        All ({facilities.length})
                    </button>
                    {[...new Set(facilities.map(f => f.facilityType))].map(type => (
                        <button key={type} onClick={() => setFilterType(type)} style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid #e2e8f0', background: filterType === type ? '#6366f1' : '#fff', color: filterType === type ? '#fff' : '#64748b', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                            {TYPE_ICON[type]} {typeLabel(type)} ({facilities.filter(f => f.facilityType === type).length})
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="card empty-state">
                    <h3>No facilities yet</h3>
                    <p>Add your first clinic, hospital, diagnostic center or other facility</p>
                    <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate} disabled={!hasProfile}>+ Add Your First Facility</button>
                </div>
            ) : (
                <div className="grid grid-2">
                    {filtered.map((f) => (
                        <div key={f.id} className="card" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: '1.4rem' }}>{TYPE_ICON[f.facilityType] || '🏥'}</span>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{f.facilityName}</h3>
                                    </div>
                                    <span className="badge badge-info">{typeLabel(f.facilityType)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(f)}>Edit</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>Delete</button>
                                </div>
                            </div>
                            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    📍 {f.facilityAddress}, {f.city}, {f.state} — {f.postalCode}
                                </div>
                                {f.contactNumber && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>📞 {f.contactNumber}</div>}
                                {f.operatingHours && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>🕐 {f.operatingHours}</div>}
                                {f.registrationNumber && <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 4 }}>Reg. No: {f.registrationNumber}</div>}
                                {f.website && <div style={{ fontSize: '0.78rem', marginTop: 2 }}><a href={f.website} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>🔗 {f.website}</a></div>}
                            </div>
                            <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-light)' }}>ID: {f.id}</p>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <Modal title={editId ? 'Edit Facility' : 'Add Facility'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSave}>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-group">
                            <label>Facility Name *</label>
                            <input className="form-input" value={form.facilityName} required minLength={2} maxLength={60}
                                placeholder="e.g. City Health Clinic"
                                onChange={(e) => setForm({ ...form, facilityName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Provider Type *</label>
                            <select className="form-select" value={form.facilityType} onChange={(e) => setForm({ ...form, facilityType: e.target.value })}>
                                {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{TYPE_ICON[t.value]} {t.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Address *</label>
                            <input className="form-input" value={form.facilityAddress} required minLength={10} maxLength={100}
                                placeholder="e.g. 123 Main Street, Floor 2"
                                onChange={(e) => setForm({ ...form, facilityAddress: e.target.value })} />
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>City *</label>
                                <input className="form-input" value={form.city} required minLength={2} maxLength={40} placeholder="e.g. Mumbai"
                                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>State *</label>
                                <input className="form-input" value={form.state} required minLength={2} maxLength={40} placeholder="e.g. Maharashtra"
                                    onChange={(e) => setForm({ ...form, state: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Postal Code *</label>
                                <input className="form-input" type="number" value={form.postalCode} required placeholder="e.g. 400001"
                                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Contact Number</label>
                                <input className="form-input" value={form.contactNumber} placeholder="e.g. 022-12345678"
                                    onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Registration Number</label>
                                <input className="form-input" value={form.registrationNumber} placeholder="e.g. MH/HOS/2024/001"
                                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Operating Hours</label>
                                <input className="form-input" value={form.operatingHours} placeholder="e.g. Mon–Sat, 9AM–6PM"
                                    onChange={(e) => setForm({ ...form, operatingHours: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Website</label>
                            <input className="form-input" value={form.website} placeholder="e.g. https://myhospital.com"
                                onChange={(e) => setForm({ ...form, website: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

