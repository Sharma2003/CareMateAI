import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api/client';
import MicButton from '../components/MicButton';
import useMic from '../hooks/useMic';
import { IconCareMate } from '../components/Icons';
import illustration from '../assets/login-illustration.png';
import './Auth.css';

export default function Register() {
    const [form, setForm] = useState({
        userid: '', email: '', password: '', role: 'patient',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Mic for username field only
    const micUsername = useMic({
        mode: 'form',
        onTranscript: useCallback((text) => {
            // Strip spaces — usernames can't have them
            setForm((prev) => ({ ...prev, userid: text.replace(/\s+/g, '').toLowerCase() }));
        }, []),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            await authAPI.register(form);
            setSuccess('Account created! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-image-panel">
                <img src={illustration} alt="Doctor and Patient Interaction" />
            </div>
            <div className="auth-form-panel">
                <div className="auth-card">
                    <div className="auth-header">
                        <span className="auth-logo" style={{ display: 'flex', justifyContent: 'center' }}>
                            <IconCareMate size={52} />
                        </span>
                        <h1>Create Account</h1>
                        <p>Join CareMate as a patient or doctor</p>
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* Username with mic */}
                        <div className="form-group">
                            <label>Username</label>
                            <div className="input-mic-row">
                                <input
                                    className="form-input" type="text"
                                    placeholder="Choose a username (min 5 chars)"
                                    value={form.userid} minLength={5} maxLength={20}
                                    onChange={(e) => setForm({ ...form, userid: e.target.value })}
                                    required
                                />
                                <MicButton
                                    recording={micUsername.recording}
                                    loading={micUsername.loading}
                                    error={micUsername.error}
                                    onStart={micUsername.startRecording}
                                    onStop={micUsername.stopRecording}
                                    onClear={micUsername.clearError}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                className="form-input" type="email" placeholder="your@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                className="form-input" type="password" placeholder="Create a password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>I am a</label>
                            <div className="role-select">
                                {['patient', 'doctor', 'admin'].map((r) => (
                                    <button
                                        key={r} type="button"
                                        className={`role-btn ${form.role === r ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, role: r })}
                                    >
                                        {r === 'patient' ? '🧑‍⚕️ Patient' : r === 'doctor' ? '👨‍⚕️ Doctor' : '🛡️ Admin'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
