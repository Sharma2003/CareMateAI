import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, userAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from '../context/jwtDecode';
import { IconCareMate } from '../components/Icons';
import illustration from '../assets/login-illustration.png';
import './Auth.css';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authAPI.login(form);
            const token = res.data.access_token;
            localStorage.setItem('access_token', token);
            const decoded = jwtDecode(token);
            const canonicalUsername = decoded?.sub || form.username;
            const userRes = await userAPI.getMe(canonicalUsername);
            const role = userRes.data.role;
            login(token, role);
            navigate('/dashboard');
        } catch (err) {
            localStorage.removeItem('access_token');
            setError(err.response?.data?.detail || 'Login failed');
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
                        <h1>CareMate</h1>
                        <p>AI-Powered Pre-Consultation System</p>
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Enter your username"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>
                        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                    <p className="auth-footer">
                        Don't have an account? <Link to="/register">Register here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
