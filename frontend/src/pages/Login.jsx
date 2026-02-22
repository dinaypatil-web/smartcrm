import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome to AyurERP');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">A</div>
                    <h1>AyurERP</h1>
                    <p>Sign in to your account</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label><FiMail size={12} /> Email</label>
                        <input
                            type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label><FiLock size={12} /> Password</label>
                        <input
                            type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
                        {loading ? <span className="spinner" /> : <><span>Sign in</span><FiArrowRight size={14} /></>}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>
                        Forgot your password?
                    </Link>
                </div>

                <div style={{
                    textAlign: 'center', marginTop: 20, padding: '12px 0',
                    borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)'
                }}>
                    Default credentials: admin@ayurveda.com / admin123
                </div>
            </div>
        </div>
    );
}
