import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiUser, FiLogOut, FiChevronDown, FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import api from '../../api/axios';

const themeOptions = [
    { value: 'light', icon: FiSun, label: 'Light' },
    { value: 'dark', icon: FiMoon, label: 'Dark' },
    { value: 'system', icon: FiMonitor, label: 'System' },
];

export default function Header({ onToggleSidebar }) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notifications?limit=5');
                setUnreadCount(data.unreadCount || 0);
                setNotifications(data.notifications || []);
            } catch (err) { /* ignore */ }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close menus on outside click
    useEffect(() => {
        if (!showMenu && !showThemePicker && !showNotifications) return;
        const handleClick = () => {
            setShowMenu(false);
            setShowThemePicker(false);
            setShowNotifications(false);
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showMenu, showThemePicker, showNotifications]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const CurrentThemeIcon = themeOptions.find(t => t.value === theme)?.icon || FiMoon;

    return (
        <header className="top-header">
            <div className="header-left">
                <button className="toggle-btn" onClick={onToggleSidebar}>
                    <FiMenu size={15} />
                </button>
                <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <div className="header-right">
                {/* Theme Toggle */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="toggle-btn"
                        title={`Theme: ${theme}`}
                        onClick={(e) => { e.stopPropagation(); setShowThemePicker(!showThemePicker); setShowMenu(false); }}
                    >
                        <CurrentThemeIcon size={15} />
                    </button>

                    {showThemePicker && (
                        <div style={{
                            position: 'absolute', top: 40, right: 0,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius)',
                            padding: 4, minWidth: 140, zIndex: 3000,
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'fadeIn 120ms var(--ease-out)'
                        }} onClick={e => e.stopPropagation()}>
                            {themeOptions.map(opt => {
                                const Icon = opt.icon;
                                const isActive = theme === opt.value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => { setTheme(opt.value); setShowThemePicker(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer', fontSize: 13,
                                            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                            background: isActive ? 'var(--accent-subtle)' : 'transparent',
                                            fontWeight: isActive ? 500 : 400,
                                            transition: 'all 120ms'
                                        }}
                                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                                    >
                                        <Icon size={14} /> {opt.label}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }}>
                    <div
                        className="notification-badge"
                        title="Notifications"
                        onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowMenu(false); setShowThemePicker(false); }}
                        style={{ cursor: 'pointer' }}
                    >
                        <FiBell size={15} />
                        {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </div>

                    {showNotifications && (
                        <div style={{
                            position: 'absolute', top: 40, right: 0,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius)',
                            width: 320, zIndex: 3000,
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'fadeIn 120ms var(--ease-out)',
                            overflow: 'hidden'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await api.put('/notifications/read-all');
                                                setUnreadCount(0);
                                                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                                            } catch (err) { console.error(err); }
                                        }}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--accent)',
                                            fontSize: 11, cursor: 'pointer', fontWeight: 500
                                        }}
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id || n._id}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: n.isRead ? 'transparent' : 'var(--accent-subtle)',
                                                cursor: 'pointer',
                                                transition: 'background 120ms'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--accent-subtle)'}
                                            onClick={async () => {
                                                if (!n.isRead) {
                                                    try {
                                                        await api.put(`/notifications/${n.id || n._id}/read`);
                                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                                        setNotifications(prev => prev.map(item =>
                                                            (item.id === n.id || item._id === n._id) ? { ...item, isRead: true } : item
                                                        ));
                                                    } catch (err) { console.error(err); }
                                                }
                                                // Navigate based on type if needed
                                                if (n.type === 'LOW_STOCK') navigate('/inventory');
                                                setShowNotifications(false);
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <div style={{
                                                    marginTop: 2,
                                                    color: n.severity === 'critical' ? 'var(--danger)' : n.severity === 'warning' ? 'var(--warning)' : 'var(--accent)'
                                                }}>
                                                    <FiBell size={14} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {new Date(n.createdAt?.seconds ? n.createdAt.seconds * 1000 : n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div
                                onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                                style={{
                                    padding: '12px', textAlign: 'center', fontSize: 12,
                                    color: 'var(--accent)', fontWeight: 500, cursor: 'pointer',
                                    borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            >
                                View all notifications
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

                <div className="user-menu" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setShowThemePicker(false); }}>
                    <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">{user?.role}</span>
                    </div>
                    <FiChevronDown size={12} style={{ color: 'var(--text-muted)', marginLeft: 2 }} />
                </div>

                {showMenu && (
                    <div style={{
                        position: 'absolute', top: 52, right: 32,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius)',
                        padding: 4,
                        minWidth: 180, zIndex: 3000,
                        boxShadow: 'var(--shadow-lg)',
                        animation: 'fadeIn 120ms var(--ease-out)'
                    }}>
                        <div
                            onClick={() => { navigate('/profile'); setShowMenu(false); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
                                transition: 'all 120ms'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            <FiUser size={14} /> Profile
                        </div>
                        <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
                        <div
                            onClick={handleLogout}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: 13, color: 'var(--danger)',
                                transition: 'all 120ms'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-muted)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <FiLogOut size={14} /> Sign out
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
