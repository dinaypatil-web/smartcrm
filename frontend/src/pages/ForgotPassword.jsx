import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FiMail, FiArrowLeft, FiCopy, FiCheck } from 'react-icons/fi';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
            if (data.resetToken) setResetToken(data.resetToken);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const copyToken = () => {
        navigator.clipboard.writeText(resetToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">A</div>
                    <h2>Reset password</h2>
                    <p>{submitted ? 'Check your email for instructions' : 'Enter your email to receive a reset link'}</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                {!submitted ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label><FiMail size={12} /> Email address</label>
                            <input
                                type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required autoFocus
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <span className="spinner" /> : 'Send reset link'}
                        </button>
                    </form>
                ) : (
                    <div>
                        <div style={{
                            background: 'var(--success-muted)', border: '1px solid rgba(0,200,83,0.2)',
                            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                            fontSize: 13, color: 'var(--success)', marginBottom: 16
                        }}>
                            If an account exists for {email}, a reset link has been sent.
                        </div>

                        {resetToken && (
                            <div style={{
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16
                            }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                                    Development — Reset Token
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <code style={{
                                        flex: 1, fontSize: 11, padding: '6px 10px',
                                        background: 'var(--bg-root)', borderRadius: 4,
                                        color: 'var(--accent)', wordBreak: 'break-all',
                                        fontFamily: 'var(--font-mono)'
                                    }}>
                                        {resetToken}
                                    </code>
                                    <button className="btn btn-secondary btn-sm" onClick={copyToken} style={{ flexShrink: 0 }}>
                                        {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <Link to="/reset-password" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                            Enter reset token
                        </Link>
                    </div>
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
