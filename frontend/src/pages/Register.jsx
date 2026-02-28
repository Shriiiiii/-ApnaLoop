import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(form.username, form.email, form.password, form.display_name);
            navigate('/chat');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--accent-glow)', opacity: 0.2 }} />
                <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--accent-glow)', opacity: 0.3 }} />
            </div>

            <div className="card w-full max-w-md p-8 animate-slide-up relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                        A
                    </div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">Join ApnaLoop</h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create your account and start connecting</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                        <input type="text" name="display_name" value={form.display_name} onChange={handleChange} className="input-field" placeholder="Your name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
                        <input type="text" name="username" value={form.username} onChange={handleChange} className="input-field" placeholder="Choose a username" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="your@email.com" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field" placeholder="Create a password" required />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full !py-3 text-base disabled:opacity-50">
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium no-underline" style={{ color: 'var(--accent-primary)' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
