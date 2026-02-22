import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FiBell, FiTrash2, FiCheckCircle, FiInfo, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';

export default function NotificationsList() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async (p = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/notifications?page=${p}&limit=15`);
            setNotifications(data.notifications || []);
            setTotalPages(data.pages || 1);
            setUnreadCount(data.unreadCount || 0);
            setPage(data.page || 1);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications(1);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id || n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const getIcon = (type, severity) => {
        if (severity === 'critical') return <FiAlertCircle style={{ color: 'var(--danger)' }} />;
        if (severity === 'warning') return <FiAlertTriangle style={{ color: 'var(--warning)' }} />;
        return <FiInfo style={{ color: 'var(--accent)' }} />;
    };

    if (loading && page === 1) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notifications</h1>
                    <p className="page-subtitle">You have {unreadCount} unread alerts</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary" onClick={markAllAsRead}>
                            <FiCheckCircle style={{ marginRight: 8 }} /> Mark All as Read
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => fetchNotifications(page)}>Refresh</button>
                </div>
            </div>

            <div className="card">
                <div style={{ padding: '0 16px' }}>
                    {notifications.length === 0 ? (
                        <div className="empty-state" style={{ padding: '60px 0' }}>
                            <FiBell size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                            <h3>All caught up!</h3>
                            <p>No notifications at the moment.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id || n._id}
                                style={{
                                    display: 'flex',
                                    gap: 16,
                                    padding: '20px 0',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    opacity: n.isRead ? 0.7 : 1,
                                    transition: 'all 200ms'
                                }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'var(--bg-hover)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20
                                }}>
                                    {getIcon(n.type, n.severity)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{n.title}</h4>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(n.createdAt?.seconds ? n.createdAt.seconds * 1000 : n.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{n.message}</p>
                                    {!n.isRead && (
                                        <button
                                            onClick={() => markAsRead(n.id || n._id)}
                                            style={{
                                                marginTop: 12, background: 'none', border: 'none',
                                                color: 'var(--accent)', fontSize: 12, fontWeight: 500,
                                                cursor: 'pointer', padding: 0
                                            }}
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="pagination" style={{ padding: 20, borderTop: '1px solid var(--border)' }}>
                        <button disabled={page === 1} onClick={() => fetchNotifications(page - 1)}>Previous</button>
                        <span>Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => fetchNotifications(page + 1)}>Next</button>
                    </div>
                )}
            </div>
        </div>
    );
}
