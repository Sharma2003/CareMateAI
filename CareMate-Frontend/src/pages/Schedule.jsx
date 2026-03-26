import { useEffect, useState } from 'react';
import { scheduleAPI, facilityAPI } from '../api/client';
import Modal from '../components/Modal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Schedule() {
    const [schedules, setSchedules] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        day_of_week: 0,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
        is_active: true,
    });
    const [selectedFacility, setSelectedFacility] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sRes, fRes] = await Promise.allSettled([
                scheduleAPI.get(),
                facilityAPI.list(),
            ]);
            // Schedules: could be 404 if none exist yet
            if (sRes.status === 'fulfilled') {
                const data = sRes.value.data;
                setSchedules(Array.isArray(data) ? data : [data]);
            } else {
                setSchedules([]);
            }
            // Facilities: could be 404 if none created yet
            if (fRes.status === 'fulfilled') {
                const data = fRes.value.data;
                setFacilities(Array.isArray(data) ? data : [data]);
            } else {
                setFacilities([]);
            }
        } catch {
            /* both already handled via allSettled */
        }
        setLoading(false);
    };

    const parseError = (err) => {
        const data = err?.response?.data;
        if (!data) return err.message || 'Network error';
        if (Array.isArray(data.detail)) {
            return data.detail.map((d) => `${d.loc?.join(' → ')}: ${d.msg}`).join('; ');
        }
        return typeof data.detail === 'string' ? data.detail : JSON.stringify(data);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!selectedFacility) { setError('Please select a facility'); return; }
        setSaving(true);
        setError('');
        try {
            await scheduleAPI.create(selectedFacility, {
                day_of_week: Number(form.day_of_week),
                start_time: form.start_time,
                end_time: form.end_time,
                slot_duration_minutes: Number(form.slot_duration_minutes),
                is_active: form.is_active,
            });
            setSuccess('Schedule created!');
            setShowModal(false);
            loadData();
        } catch (err) {
            setError(parseError(err));
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this schedule?')) return;
        setError('');
        try {
            await scheduleAPI.delete(id);
            setSuccess('Schedule deleted');
            loadData();
        } catch (err) {
            setError(parseError(err));
        }
    };

    const openModal = () => {
        setForm({
            day_of_week: 0,
            start_time: '09:00',
            end_time: '17:00',
            slot_duration_minutes: 30,
            is_active: true,
        });
        setSelectedFacility('');
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Schedule</h1>
                    <p>Manage your availability at each facility</p>
                </div>
                <button className="btn btn-primary" onClick={openModal} disabled={facilities.length === 0}>
                    + Add Schedule
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {facilities.length === 0 && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                    You need to <a href="/facilities" style={{ color: 'inherit', fontWeight: 700, textDecoration: 'underline' }}>add a facility</a> first before creating schedules.
                </div>
            )}

            {schedules.length === 0 ? (
                <div className="card empty-state">
                    <h3>No schedules yet</h3>
                    <p>Create availability slots for your facilities so patients can book appointments</p>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Facility</th>
                                    <th>Day</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Slot (min)</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((s) => {
                                    const fac = facilities.find((f) => f.id === s.facility_id);
                                    return (
                                        <tr key={s.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {fac?.facilityName || '—'}
                                                </div>
                                                {fac?.facilityType && (
                                                    <span className="badge badge-info" style={{ marginTop: 4, display: 'inline-block' }}>
                                                        {fac.facilityType}
                                                    </span>
                                                )}
                                                {fac?.facilityAddress && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                        {fac.facilityAddress}{fac.city ? `, ${fac.city}` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{DAYS[s.day_of_week] || s.day_of_week}</td>
                                            <td>{s.start_time?.slice(0, 5)}</td>
                                            <td>{s.end_time?.slice(0, 5)}</td>
                                            <td>{s.slot_duration_minutes} min</td>
                                            <td>
                                                <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <Modal title="Add Schedule" onClose={() => setShowModal(false)}>
                    <form onSubmit={handleCreate}>
                        {error && <div className="alert alert-error">{error}</div>}
                        <div className="form-group">
                            <label>Facility</label>
                            <select className="form-select" value={selectedFacility} required
                                onChange={(e) => setSelectedFacility(e.target.value)}>
                                <option value="">Select facility...</option>
                                {facilities.map((f) => (
                                    <option key={f.id} value={f.id}>{f.facilityName} ({f.facilityType})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Day of Week</label>
                            <select className="form-select" value={form.day_of_week}
                                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}>
                                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label>Start Time</label>
                                <input className="form-input" type="time" value={form.start_time} required
                                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input className="form-input" type="time" value={form.end_time} required
                                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Slot Duration (minutes)</label>
                            <input className="form-input" type="number" min={5} max={120}
                                value={form.slot_duration_minutes} required
                                placeholder="e.g. 30"
                                onChange={(e) => setForm({ ...form, slot_duration_minutes: e.target.value })} />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Schedule'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
