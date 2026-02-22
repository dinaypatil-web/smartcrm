import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FiKey, FiLock, FiArrowLeft, FiCheck } from 'react-icons/fi';

export default function ResetPassword() {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) return setError('Passwords do not match');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            toast.success('Password reset successful');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Reset failed — token may be invalid or expired');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">A</div>
                    <h2>Set new password</h2>
                    <p>{success ? 'Your password has been reset' : 'Enter the reset token and your new password'}</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                {success ? (
                    <div style={{
                        textAlign: 'center', padding: '24px 0'
                    }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'var(--success-muted)', color: 'var(--success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', fontSize: 20
                        }}>
                            <FiCheck />
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Redirecting to sign in...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label><FiKey size={12} /> Reset token</label>
                            <input
                                type="text" value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder="Paste your reset token"
                                required autoFocus
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                            />
                        </div>
                        <div className="form-group">
                            <label><FiLock size={12} /> New password</label>
                            <input
                                type="password" value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                required minLength={6}
                            />
                        </div>
                        <div className="form-group">
                            <label><FiLock size={12} /> Confirm password</label>
                            <input
                                type="password" value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Re-enter password"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Reset password'}
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <FiArrowLeft size={12} /> Back to sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
