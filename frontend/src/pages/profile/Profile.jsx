import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiShield, FiClock } from 'react-icons/fi';

export default function Profile() {
    const { user, setUser } = useAuth();
    const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
        }
    }, [user]);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put('/users/profile', profile);
            setUser(data.user);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error('New passwords do not match');
        }
        if (passwords.newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        setPwLoading(true);
        try {
            await api.put('/users/change-password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            toast.success('Password changed successfully');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to change password');
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}><FiUser /> My Profile</h1>

            {/* Profile Info */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}><FiUser style={{ marginRight: 8 }} /> Personal Information</h3>
                <form onSubmit={handleProfileSave}>
                    <div className="form-group">
                        <label><FiUser /> Full Name</label>
                        <input type="text" value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label><FiMail /> Email</label>
                        <input type="email" value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label><FiPhone /> Phone</label>
                        <input type="text" value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    </div>

                    {/* Read-only info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}><FiShield /> Role</small>
                            <p style={{ margin: 0, textTransform: 'capitalize' }}>{user?.role}</p>
                        </div>
                        <div>
                            <small style={{ color: 'var(--text-muted)' }}><FiClock /> Last Login</small>
                            <p style={{ margin: 0 }}>{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}</p>
                        </div>
                        {user?.entity && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <small style={{ color: 'var(--text-muted)' }}>🏢 Entity</small>
                                <p style={{ margin: 0 }}>{user.entity.entityName || user.entity}</p>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={loading}>
                        <FiSave /> {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}><FiLock style={{ marginRight: 8 }} /> Change Password</h3>
                <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input type="password" value={passwords.currentPassword}
                            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" value={passwords.newPassword}
                            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" value={passwords.confirmPassword}
                            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required minLength={6} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                        <FiLock /> {pwLoading ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
