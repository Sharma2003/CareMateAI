import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n, LANGUAGES } from '../context/I18nContext';
import { avatarAPI, patientAPI, doctorAPI } from '../api/client';
import {
    IconDashboard, IconUser, IconSearch, IconCalendar, IconMessage,
    IconReport, IconPill, IconFile, IconFacility, IconShield,
    IconGlobe, IconLogout, IconDoctor, IconSchedule
} from './Icons';
import './Sidebar.css';

const patientLinks = (t) => [
    { to: '/dashboard', icon: <IconDashboard size={18} />, label: t('dashboard') },
    { to: '/profile', icon: <IconUser size={18} />, label: t('myProfile') },
    { to: '/find-doctor', icon: <IconSearch size={18} />, label: t('findDoctor') },
    { to: '/appointments', icon: <IconCalendar size={18} />, label: t('appointments') },
    { to: '/reports', icon: <IconReport size={18} />, label: t('reports') },
    { to: '/my-prescriptions', icon: <IconPill size={18} />, label: t('prescriptions') },
    { to: '/my-documents', icon: <IconFile size={18} />, label: t('myDocuments') },
];

const doctorLinks = (t) => [
    { to: '/dashboard', icon: <IconDashboard size={18} />, label: t('dashboard') },
    { to: '/profile', icon: <IconUser size={18} />, label: t('myProfile') },
    { to: '/facilities', icon: <IconFacility size={18} />, label: t('facilities') },
    { to: '/schedule', icon: <IconSchedule size={18} />, label: t('schedule') },
    { to: '/appointments', icon: <IconCalendar size={18} />, label: t('appointments') },
    { to: '/reports', icon: <IconReport size={18} />, label: t('reports') },
];

const adminLinks = (t) => [
    { to: '/admin', icon: <IconShield size={18} />, label: 'Admin Dashboard' },
    { to: '/profile', icon: <IconUser size={18} />, label: t('myProfile') },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { t, lang, setLang } = useI18n();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [langOpen, setLangOpen] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const langRef = useRef(null);

    // Apply theme on mount and change
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const role = user?.role;
    const links = role === 'admin' ? adminLinks(t) : role === 'doctor' ? doctorLinks(t) : patientLinks(t);

    // Load avatar - set directly and let img onError handle missing
    useEffect(() => {
        if (!user?.id) return;
        setAvatarUrl(avatarAPI.getUrl(user.id) + '?t=' + Date.now());
    }, [user?.id]);

    // Fetch display name (full name from profile)
    useEffect(() => {
        if (!user) return;
        const fetchName = async () => {
            try {
                if (role === 'doctor') {
                    const res = await doctorAPI.getProfile();
                    if (res.data?.first_name) {
                        setDisplayName(`Dr. ${res.data.first_name} ${res.data.last_name || ''}`.trim());
                        return;
                    }
                } else if (role === 'patient') {
                    const res = await patientAPI.getProfile();
                    if (res.data?.first_name) {
                        setDisplayName(`${res.data.first_name} ${res.data.last_name || ''}`.trim());
                        return;
                    }
                }
            } catch { /* fall through to username */ }
            // Fallback to login username
            setDisplayName(user.username || '');
        };
        fetchName();
    }, [user, role]);

    // Listen for avatar updates from Profile page
    useEffect(() => {
        const handler = () => {
            if (!user?.id) return;
            setAvatarUrl(null); // Reset first to force re-render
            setTimeout(() => setAvatarUrl(avatarAPI.getUrl(user.id) + '?t=' + Date.now()), 50);
        };
        window.addEventListener('avatar-updated', handler);
        // Also listen for profile updates
        const profileHandler = () => {
            if (!user) return;
            if (role === 'doctor') {
                doctorAPI.getProfile().then(res => {
                    if (res.data?.first_name) setDisplayName(`Dr. ${res.data.first_name} ${res.data.last_name || ''}`.trim());
                }).catch(() => { });
            } else if (role === 'patient') {
                patientAPI.getProfile().then(res => {
                    if (res.data?.first_name) setDisplayName(`${res.data.first_name} ${res.data.last_name || ''}`.trim());
                }).catch(() => { });
            }
        };
        window.addEventListener('profile-updated', profileHandler);
        return () => {
            window.removeEventListener('avatar-updated', handler);
            window.removeEventListener('profile-updated', profileHandler);
        };
    }, [user, role]);

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', collapsed);
        document.documentElement.style.setProperty(
            '--sidebar-current-width',
            collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'
        );
    }, [collapsed]);

    useEffect(() => {
        const h = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };

    const roleColor = role === 'admin' ? '#f59e0b' : role === 'doctor' ? '#34d399' : '#60a5fa';
    const roleLabel = role === 'admin' ? 'Admin' : role === 'doctor' ? t('doctor') || 'Doctor' : t('patient') || 'Patient';
    const showName = displayName || user?.username || '';

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
                {collapsed ? '▶' : '◀'}
            </button>

            <div className="sidebar-brand">
                <span className="sidebar-logo" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}><IconPill size={28} /></span>
                {!collapsed && <span className="sidebar-title" style={{ fontFamily: 'Outfit' }}>CareMate</span>}
            </div>

            <div className={`sidebar-user-block ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-avatar">
                    {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setAvatarUrl(null)} />
                        : <span style={{ fontSize: collapsed ? '1.2rem' : '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-sidebar-active)' }}>
                            {role === 'doctor' ? <IconDoctor size={24} /> : role === 'admin' ? <IconShield size={24} /> : <IconUser size={24} />}
                        </span>
                    }
                </div>
                {!collapsed && (
                    <div className="sidebar-user-info">
                        <div className="sidebar-username" style={{ fontSize: showName.length > 18 ? '0.78rem' : '0.88rem' }}>{showName}</div>
                        <span className="role-badge" style={{ background: roleColor + '22', color: roleColor, borderColor: roleColor + '44' }}>
                            {roleLabel}
                        </span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                {links.map(link => (
                    <NavLink key={link.to} to={link.to}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        title={collapsed ? link.label : undefined}>
                        <span className="sidebar-icon">{link.icon}</span>
                        {!collapsed && <span className="sidebar-label">{link.label}</span>}
                    </NavLink>
                ))}
            </nav>

            <div ref={langRef} style={{ marginTop: 'auto', padding: collapsed ? '8px 6px' : '8px 12px', position: 'relative' }}>
                {/* Dark / Light mode toggle */}
                <button
                    onClick={() => setIsDark(d => !d)}
                    title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
                    className="theme-toggle-btn"
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: 6 }}
                >
                    <span>{isDark ? '☀️' : '🌙'}</span>
                    {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button onClick={() => setLangOpen(v => !v)}
                    title={collapsed ? 'Language' : undefined}
                    style={{
                        width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8, padding: collapsed ? '8px 0' : '8px 12px', color: 'rgba(255,255,255,0.75)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}><IconGlobe size={16} /></span>
                    {!collapsed && <span>{LANGUAGES.find(l => l.code === lang)?.label || 'English'}</span>}
                    {!collapsed && <span style={{ marginLeft: 'auto', opacity: 0.6 }}>▾</span>}
                </button>
                {langOpen && (
                    <div style={{
                        position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#1e2d40',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden',
                        boxShadow: '0 -8px 24px rgba(0,0,0,.4)', zIndex: 200, marginBottom: 4,
                    }}>
                        {LANGUAGES.map(l => (
                            <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                    padding: '9px 14px', background: lang === l.code ? 'rgba(79,70,229,0.35)' : 'transparent',
                                    border: 'none', color: lang === l.code ? '#a5b4fc' : 'rgba(255,255,255,0.75)',
                                    cursor: 'pointer', fontSize: '0.83rem', fontWeight: lang === l.code ? 700 : 400,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                <span>{l.flag}</span><span>{l.label}</span>
                                {lang === l.code && <span style={{ marginLeft: 'auto' }}>✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button className="sidebar-logout" onClick={handleLogout} title={collapsed ? t('logout') : undefined} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}><IconLogout size={16} /></span>
                {!collapsed && <span>{t('logout')}</span>}
            </button>
        </aside>
    );
}
