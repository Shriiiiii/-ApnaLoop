import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { isDark, accent, toggleTheme, setAccentColor, ACCENT_COLORS } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showAccentPicker, setShowAccentPicker] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setMobileMenuOpen(false);
    };

    const navLinks = [
        { to: '/feed', label: 'Feed', icon: '✦' },
        { to: '/explore', label: 'Explore', icon: '◈' },
        { to: '/chat', label: 'Chat', icon: '◉' },
        { to: `/profile/${user?.id}`, label: 'Profile', icon: '◎' },
    ];

    return (
        <nav className="glass sticky top-0 z-50 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* Hamburger (mobile) */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden bg-transparent border-none cursor-pointer p-1 text-xl"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>

                {/* Logo */}
                <Link to="/feed" className="flex items-center gap-2 no-underline">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm">
                        N
                    </div>
                    <span className="text-lg font-bold gradient-text hidden sm:inline">Nexus</span>
                </Link>

                {/* Nav Links (desktop) */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = location.pathname === link.to ||
                            (link.to === '/feed' && location.pathname === '/');
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium no-underline transition-all duration-200
                  ${isActive
                                        ? 'gradient-primary text-white shadow-lg'
                                        : ''
                                    }`}
                                style={!isActive ? { color: 'var(--text-secondary)' } : {}}
                            >
                                <span className="text-base">{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Right side: theme toggle + accent + user */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="bg-transparent border-none cursor-pointer text-lg p-1.5 rounded-lg transition-all hover:scale-110"
                        style={{ color: 'var(--text-secondary)' }}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    {/* Accent color picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAccentPicker(!showAccentPicker)}
                            className="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                            style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`, borderColor: 'var(--border-color)' }}
                            title="Change accent color"
                        />
                        {showAccentPicker && (
                            <div className="absolute right-0 top-10 card p-3 min-w-40 animate-slide-up z-50">
                                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Accent Color</p>
                                <div className="flex flex-col gap-1.5">
                                    {Object.entries(ACCENT_COLORS).map(([key, val]) => (
                                        <button
                                            key={key}
                                            onClick={() => { setAccentColor(key); setShowAccentPicker(false); }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-none cursor-pointer text-sm transition-all text-left
                        ${accent === key ? 'font-semibold' : ''}`}
                                            style={{
                                                background: accent === key ? 'var(--bg-hover)' : 'transparent',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${val.primary}, ${val.secondary})` }} />
                                            {val.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User avatar (desktop) */}
                    <div className="hidden md:flex items-center gap-2 ml-1">
                        <img
                            src={user?.avatar_url}
                            alt={user?.username}
                            className="w-8 h-8 rounded-full ring-2"
                            style={{ '--tw-ring-color': 'var(--accent-glow)' }}
                        />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary !px-3 !py-1.5 text-xs hidden sm:block"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t animate-slide-up pb-3" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex flex-col gap-1 px-4 pt-2">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.to;
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-all
                    ${isActive ? 'gradient-primary text-white' : ''}`}
                                    style={!isActive ? { color: 'var(--text-secondary)' } : {}}
                                >
                                    <span className="text-lg">{link.icon}</span>
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-transparent border-none cursor-pointer text-left"
                            style={{ color: '#ef4444' }}
                        >
                            <span className="text-lg">⏻</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
