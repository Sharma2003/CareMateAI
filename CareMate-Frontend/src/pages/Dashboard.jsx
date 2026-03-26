import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingAPI, patientAPI, doctorAPI, facilityAPI, scheduleAPI } from '../api/client';
import { IconCalendar, IconFacility, IconActivity } from '../components/Icons';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isDoctor = user?.role === 'doctor';
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    // Redirect admin to admin dashboard (inside useEffect — no hooks after this)
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/admin', { replace: true });
        }
    }, [user?.role]);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            if (isDoctor) {
                const [appts, facs] = await Promise.allSettled([
                    bookingAPI.doctorAppointments(),
                    facilityAPI.list(),
                ]);
                setStats({
                    appointments: appts.status === 'fulfilled' ? appts.value.data.length : 0,
                    facilities: facs.status === 'fulfilled' ? facs.value.data.length : 0,
                });
            } else {
                const [appts] = await Promise.allSettled([
                    bookingAPI.patientAppointments(),
                ]);
                setStats({
                    appointments: appts.status === 'fulfilled' ? appts.value.data.length : 0,
                });
            }
        } catch { /* silent */ }
        setLoading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>Welcome back, {user?.username} <span style={{ fontSize: '2rem', animation: 'bounce-slight 2.5s infinite ease-in-out' }}>👋</span></h1>
                <p>{isDoctor ? 'Manage your practice and appointments' : 'Your health dashboard'}</p>
            </div>

            <div className="grid grid-3">
                <div className="card stat-card stat-card-interactive" onClick={() => navigate('/appointments')}>
                    <div className="stat-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        <IconCalendar size={28} />
                    </div>
                    <div>
                        <div className="stat-value">{loading ? '–' : stats.appointments || 0}</div>
                        <div className="stat-label">{isDoctor ? 'Patient Appointments' : 'My Appointments'}</div>
                    </div>
                </div>
                {isDoctor && (
                    <div className="card stat-card stat-card-interactive" onClick={() => navigate('/facilities')}>
                        <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                            <IconFacility size={28} />
                        </div>
                        <div>
                            <div className="stat-value">{loading ? '–' : stats.facilities || 0}</div>
                            <div className="stat-label">Facilities</div>
                        </div>
                    </div>
                )}
                <div className="card stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--secondary)' }}>
                        <IconActivity size={28} />
                    </div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>Active</div>
                        <div className="stat-label">Account Status</div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h2>Quick Actions</h2>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {isDoctor ? (
                        <>
                            <a href="/facilities" className="btn btn-primary">Manage Facilities</a>
                            <a href="/schedule" className="btn btn-secondary">View Schedule</a>
                            <a href="/appointments" className="btn btn-secondary">Appointments</a>
                        </>
                    ) : (
                        <>
                            <a href="/find-doctor" className="btn btn-primary">Find a Doctor</a>
                            <a href="/chat" className="btn btn-secondary">Start AI Consultation</a>
                            <a href="/appointments" className="btn btn-secondary">My Appointments</a>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
