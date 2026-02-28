import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils';
import { useTheme } from '../context/ThemeContext';

export default function TopBar() {
    const { user } = useAuth();
    const { isDark, accent, toggleTheme, setAccentColor, ACCENT_COLORS } = useTheme();
    const [logoExpanded, setLogoExpanded] = useState(false);
    const [showAccentPicker, setShowAccentPicker] = useState(false);

    const handleLogoClick = () => {
        setLogoExpanded(!logoExpanded);
    };

    return (
        <>
            {/* Top Bar — glassmorphism */}
            <header className="glass-bar sticky top-0 z-40 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
                    {/* Logo */}
                    <button
                        onClick={handleLogoClick}
                        className="flex items-center gap-2 bg-transparent border-none cursor-pointer group"
                    >
                        <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-xs shadow-lg group-hover:scale-110 transition-transform">
                            A
                        </div>
                        <span className="text-lg font-extrabold gradient-text tracking-tight">ApnaLoop</span>
                    </button>

                    {/* Right: theme + accent */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="bg-transparent border-none cursor-pointer text-base p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: 'var(--text-secondary)' }}
                            title={isDark ? 'Light Mode' : 'Dark Mode'}
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowAccentPicker(!showAccentPicker)}
                                className="w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                                style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`, borderColor: 'var(--border-color)' }}
                                title="Accent color"
                            />
                            {showAccentPicker && (
                                <div className="absolute right-0 top-9 card p-3 min-w-36 animate-slide-up z-50">
                                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Accent</p>
                                    <div className="flex flex-col gap-1">
                                        {Object.entries(ACCENT_COLORS).map(([key, val]) => (
                                            <button
                                                key={key}
                                                onClick={() => { setAccentColor(key); setShowAccentPicker(false); }}
                                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-none cursor-pointer text-xs transition-all text-left"
                                                style={{
                                                    background: accent === key ? 'var(--bg-hover)' : 'transparent',
                                                    color: 'var(--text-primary)',
                                                    fontWeight: accent === key ? 600 : 400,
                                                }}
                                            >
                                                <span className="w-3.5 h-3.5 rounded-full" style={{ background: `linear-gradient(135deg, ${val.primary}, ${val.secondary})` }} />
                                                {val.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {user && (
                            <Link to={`/profile/${user.id}`}>
                                <img
                                    src={getImageUrl(user.avatar_url)}
                                    alt={user.username}
                                    className="w-7 h-7 rounded-full ring-1 ml-1 cursor-pointer transition-transform hover:scale-110"
                                    style={{ '--tw-ring-color': 'var(--accent-glow)' }}
                                />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Logo fullscreen overlay */}
            {logoExpanded && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }}
                    onClick={handleLogoClick}
                >
                    <div className="logo-expand flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center text-white font-bold text-5xl shadow-xl" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}>
                            A
                        </div>
                        <span className="text-5xl md:text-7xl font-extrabold gradient-text tracking-tight">ApnaLoop</span>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Tap anywhere to close</p>
                    </div>
                </div>
            )}
        </>
    );
}
