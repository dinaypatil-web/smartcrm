import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function UsersList() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'store', phone: '', entity: '',
        accessStart: '', accessEnd: '',
        permissions: { variableDiscount: false, productionEntry: false, reportAccess: false }
    });

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users?limit=100');
            setUsers(data.users);
        } catch (err) { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    };

    const fetchEntities = async () => {
        if (currentUser?.role === 'developer') {
            try {
                const { data } = await api.get('/entities?limit=100&isActive=true');
                setEntities(data.entities);
            } catch (err) { /* ignore */ }
        }
    };

    useEffect(() => { fetchUsers(); fetchEntities(); }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showModal && users.length > 0) {
                if (e.key === 'Delete') {
                    e.preventDefault();
                    toggleActive(users[0]._id, users[0].isActive);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, users]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.entity) delete payload.entity;
            if (!payload.accessStart) delete payload.accessStart;
            if (!payload.accessEnd) delete payload.accessEnd;
            await api.post('/auth/register', payload);
            toast.success('User created');
            setShowModal(false);
            setForm({
                name: '', email: '', password: '', role: 'store', phone: '', entity: '',
                accessStart: '', accessEnd: '',
                permissions: { variableDiscount: false, productionEntry: false, reportAccess: false }
            });
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const toggleActive = async (userId, isActive) => {
        try {
            if (isActive) {
                await api.delete(`/users/${userId}`);
            } else {
                await api.put(`/users/${userId}`, { isActive: true });
            }
            toast.success(isActive ? 'User deactivated' : 'User activated');
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    // Determine which roles current user can create
    const availableRoles = currentUser?.role === 'developer'
        ? ['store', 'doctor', 'admin', 'developer']
        : ['store', 'doctor'];

    if (loading) return <div className="loading-container"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">👥 Users</h1><p className="page-subtitle">Manage users & access</p></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add User</button>
            </div>

            <div className="table-container">
                <table>
                    <thead><tr>
                        <th>Name</th><th>Email</th><th>Role</th>
                        {currentUser?.role === 'developer' && <th>Entity</th>}
                        <th>Phone</th><th>Access End</th><th>Status</th><th>Last Login</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td><strong>{u.name}</strong></td>
                                <td>{u.email}</td>
                                <td><span className={`badge ${u.role === 'developer' ? 'badge-purple' : u.role === 'admin' ? 'badge-info' : u.role === 'doctor' ? 'badge-success' : 'badge-warning'}`}>{u.role}</span></td>
                                {currentUser?.role === 'developer' && (
                                    <td>{u.entity?.entityName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                )}
                                <td>{u.phone || '—'}</td>
                                <td>{u.accessEnd ? new Date(u.accessEnd).toLocaleDateString('en-IN') : '∞'}</td>
                                <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : '—'}</td>
                                <td><button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(u._id, u.isActive)}>{u.isActive ? 'Deactivate' : 'Activate'}</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add New User</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Name *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                            <div className="form-row form-row-2">
                                <div className="form-group"><label className="form-label">Email *</label>
                                    <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Password *</label>
                                    <input type="password" className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
                            </div>
                            <div className="form-row form-row-2">
                                <div className="form-group"><label className="form-label">Role *</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        {availableRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>

                            {/* Entity selector — only for developer creating admin/store/doctor users */}
                            {currentUser?.role === 'developer' && form.role !== 'developer' && (
                                <div className="form-group">
                                    <label className="form-label">Entity {form.role === 'admin' ? '*' : ''}</label>
                                    <select className="form-select" value={form.entity} onChange={e => setForm({ ...form, entity: e.target.value })}
                                        required={form.role === 'admin'}>
                                        <option value="">— Select Entity —</option>
                                        {entities.map(ent => (
                                            <option key={ent._id} value={ent._id}>{ent.entityName} ({ent.entityCode})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-row form-row-2">
                                <div className="form-group"><label className="form-label">Access Start</label>
                                    <input type="date" className="form-input" value={form.accessStart} onChange={e => setForm({ ...form, accessStart: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Access End</label>
                                    <input type="date" className="form-input" value={form.accessEnd} onChange={e => setForm({ ...form, accessEnd: e.target.value })} /></div>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <label className="form-label">Permissions</label>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <label className="form-checkbox"><input type="checkbox" checked={form.permissions.variableDiscount} onChange={e => setForm({ ...form, permissions: { ...form.permissions, variableDiscount: e.target.checked } })} /><span>Variable Discount</span></label>
                                    <label className="form-checkbox"><input type="checkbox" checked={form.permissions.productionEntry} onChange={e => setForm({ ...form, permissions: { ...form.permissions, productionEntry: e.target.checked } })} /><span>Production Entry</span></label>
                                    <label className="form-checkbox"><input type="checkbox" checked={form.permissions.reportAccess} onChange={e => setForm({ ...form, permissions: { ...form.permissions, reportAccess: e.target.checked } })} /><span>Report Access</span></label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
