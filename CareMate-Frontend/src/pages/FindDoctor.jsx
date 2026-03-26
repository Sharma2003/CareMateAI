import { useState, useEffect } from 'react';
import { finderAPI, bookingAPI } from '../api/client';
import './FindDoctor.css';

export default function FindDoctor() {
    const [step, setStep] = useState(1);
    const [facilities, setFacilities] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [slots, setSlots] = useState([]);
    const [selected, setSelected] = useState({ facility: null, doctor: null, date: '' });
    const [loading, setLoading] = useState(false);
    const [bookingSlotIdx, setBookingSlotIdx] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => { loadFacilities(); }, []);

    const loadFacilities = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await finderAPI.listFacilities();
            setFacilities(res.data);
        } catch (err) {
            setError(parseError(err));
        }
        setLoading(false);
    };

    const loadDoctors = async (facility) => {
        setSelected((s) => ({ ...s, facility }));
        setLoading(true);
        setError('');
        try {
            const res = await finderAPI.listDoctors(facility.id);
            setDoctors(res.data);
            setStep(2);
        } catch (err) {
            setError(parseError(err));
        }
        setLoading(false);
    };

    const selectDoctor = (doctor) => {
        setSelected((s) => ({ ...s, doctor, date: '' }));
        setSlots([]);
        setStep(3);
    };

    const fetchSlots = async (date) => {
        setSelected((s) => ({ ...s, date }));
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await finderAPI.listSlots(
                selected.doctor.id,
                date,
                selected.facility.id
            );
            setSlots(res.data);
        } catch (err) {
            setError(parseError(err));
            setSlots([]);
        }
        setLoading(false);
    };

    const bookSlot = async (slot, idx) => {
        if (!slot.is_available) return;

        // Block booking if the slot is in the past
        const slotStart = new Date(`${selected.date}T${slot.start_time}`);
        if (slotStart <= new Date()) {
            setError('Cannot book a slot in the past. Please choose a future time.');
            return;
        }

        setBookingSlotIdx(idx);
        setError('');
        setSuccess('');
        try {
            const payload = {
                booking_date: selected.date,
                start_ts: slot.start_time,
                end_ts: slot.end_time,
            };
            await bookingAPI.create(
                selected.doctor.id,
                selected.facility.id,
                payload
            );
            setSuccess(
                `✅ Booked: ${selected.date} at ${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`
            );
            // Refresh slots to show updated availability
            fetchSlots(selected.date);
        } catch (err) {
            setError(parseError(err));
        }
        setBookingSlotIdx(null);
    };

    /** Extract meaningful error from axios error */
    const parseError = (err) => {
        const data = err?.response?.data;
        if (!data) return err.message || 'Network error';
        // FastAPI 422 returns { detail: [ { msg, loc, type } ] }
        if (Array.isArray(data.detail)) {
            return data.detail.map((d) => `${d.loc?.join(' → ')}: ${d.msg}`).join('; ');
        }
        return data.detail || JSON.stringify(data);
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div>
            <div className="page-header">
                <h1>Find a Doctor</h1>
                <p>Select a facility, choose a doctor, and book your appointment</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Step Indicators */}
            <div className="finder-steps">
                <div
                    className={`finder-step ${step >= 1 ? 'active' : ''}`}
                    onClick={() => { setStep(1); setError(''); setSuccess(''); }}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="step-num">1</span> Select Facility
                </div>
                <div className={`finder-step ${step >= 2 ? 'active' : ''}`}>
                    <span className="step-num">2</span> Choose Doctor
                </div>
                <div className={`finder-step ${step >= 3 ? 'active' : ''}`}>
                    <span className="step-num">3</span> Book Slot
                </div>
            </div>

            {/* STEP 1 — Facilities */}
            {step === 1 && (
                <div className="grid grid-2">
                    {loading ? (
                        <div className="loading-page"><div className="spinner" /></div>
                    ) : facilities.length === 0 ? (
                        <div className="empty-state"><h3>No facilities found</h3></div>
                    ) : (
                        facilities.map((f) => (
                            <div key={f.id} className="card facility-card" onClick={() => loadDoctors(f)}>
                                <h3>{f.facilityName}</h3>
                                <span className="facility-type">{f.facilityType}</span>
                                <p className="facility-addr">{f.city}</p>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* STEP 2 — Doctors */}
            {step === 2 && (
                <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)} style={{ marginBottom: 16 }}>
                        ← Back to Facilities
                    </button>
                    <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
                        Facility: <strong>{selected.facility?.facilityName}</strong>
                    </p>
                    {loading ? (
                        <div className="loading-page"><div className="spinner" /></div>
                    ) : (
                        <div className="grid grid-2">
                            {doctors.map((d) => (
                                <div key={d.id} className="card doctor-card" onClick={() => selectDoctor(d)}>
                                    <h3>Dr. {d.first_name} {d.last_name}</h3>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3 — Date + Slots */}
            {step === 3 && (
                <div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)} style={{ marginBottom: 16 }}>
                        ← Back to Doctors
                    </button>

                    <div className="card" style={{ marginBottom: 20 }}>
                        <p style={{ marginBottom: 12, fontWeight: 600 }}>
                            Dr. {selected.doctor?.first_name} {selected.doctor?.last_name} — {selected.facility?.facilityName}
                        </p>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Select Date</label>
                            <input
                                type="date"
                                className="form-input"
                                min={today}
                                value={selected.date}
                                onChange={(e) => fetchSlots(e.target.value)}
                                style={{ maxWidth: 260 }}
                            />
                        </div>
                    </div>

                    {selected.date && (
                        <>
                            {loading ? (
                                <div className="loading-page"><div className="spinner" /></div>
                            ) : slots.length === 0 ? (
                                <div className="card empty-state">
                                    <h3>No slots available</h3>
                                    <p>This doctor has no availability on the selected date. Try another date.</p>
                                </div>
                            ) : (
                                <>
                                    <p style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {slots.filter((s) => s.is_available).length} of {slots.length} slots available — click to book
                                    </p>
                                    <div className="slots-grid">
                                        {slots.map((s, i) => {
                                            const isPast = new Date(`${selected.date}T${s.start_time}`) <= new Date();
                                            const isUnavailable = !s.is_available || isPast;
                                            return (
                                            <button
                                                key={i}
                                                className={`slot-btn ${isPast ? 'past' : s.is_available ? 'available' : 'booked'}`}
                                                onClick={() => bookSlot(s, i)}
                                                disabled={isUnavailable || bookingSlotIdx !== null}
                                                title={isPast ? 'This slot has already passed' : undefined}
                                            >
                                                {bookingSlotIdx === i ? (
                                                    'Booking...'
                                                ) : (
                                                    <>
                                                        {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                                                        {!s.is_available && <span className="slot-tag">Booked</span>}
                                                        {s.is_available && isPast && <span className="slot-tag" style={{background:'#fef3c7',color:'#92400e'}}>Past</span>}
                                                    </>
                                                )}
                                            </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
