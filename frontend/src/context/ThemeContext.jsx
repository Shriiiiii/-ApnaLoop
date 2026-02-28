import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const ACCENT_COLORS = {
    indigo: {
        name: 'Indigo',
        primary: '#667eea',
        secondary: '#764ba2',
        glow: 'rgba(102, 126, 234, 0.3)',
    },
    blue: {
        name: 'Telegram Blue',
        primary: '#2AABEE',
        secondary: '#229ED9',
        glow: 'rgba(42, 171, 238, 0.3)',
    },
    pink: {
        name: 'Instagram Pink',
        primary: '#E1306C',
        secondary: '#C13584',
        glow: 'rgba(225, 48, 108, 0.3)',
    },
    emerald: {
        name: 'Emerald',
        primary: '#10B981',
        secondary: '#059669',
        glow: 'rgba(16, 185, 129, 0.3)',
    },
};

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('nexus_theme');
        return saved !== 'light';
    });
    const [accent, setAccent] = useState(() => {
        return localStorage.getItem('nexus_accent') || 'indigo';
    });

    useEffect(() => {
        const root = document.documentElement;
        const ac = ACCENT_COLORS[accent] || ACCENT_COLORS.indigo;

        // Accent colors
        root.style.setProperty('--accent-primary', ac.primary);
        root.style.setProperty('--accent-secondary', ac.secondary);
        root.style.setProperty('--accent-glow', ac.glow);

        if (isDark) {
            root.setAttribute('data-theme', 'dark');
            root.style.setProperty('--bg-base', '#0a0a0f');
            root.style.setProperty('--bg-card', 'rgba(15, 15, 25, 0.7)');
            root.style.setProperty('--bg-glass', 'rgba(15, 15, 25, 0.8)');
            root.style.setProperty('--bg-input', 'rgba(255, 255, 255, 0.04)');
            root.style.setProperty('--bg-hover', 'rgba(255, 255, 255, 0.06)');
            root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.06)');
            root.style.setProperty('--border-hover', 'rgba(255, 255, 255, 0.12)');
            root.style.setProperty('--text-primary', '#e2e8f0');
            root.style.setProperty('--text-secondary', '#94a3b8');
            root.style.setProperty('--text-muted', '#4a5568');
            root.style.setProperty('--scrollbar-track', '#0a0a0f');
            root.style.setProperty('--scrollbar-thumb', '#2d2d3f');
        } else {
            root.setAttribute('data-theme', 'light');
            root.style.setProperty('--bg-base', '#f8fafc');
            root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.9)');
            root.style.setProperty('--bg-glass', 'rgba(255, 255, 255, 0.85)');
            root.style.setProperty('--bg-input', 'rgba(0, 0, 0, 0.04)');
            root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.04)');
            root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
            root.style.setProperty('--border-hover', 'rgba(0, 0, 0, 0.15)');
            root.style.setProperty('--text-primary', '#1e293b');
            root.style.setProperty('--text-secondary', '#64748b');
            root.style.setProperty('--text-muted', '#94a3b8');
            root.style.setProperty('--scrollbar-track', '#f1f5f9');
            root.style.setProperty('--scrollbar-thumb', '#cbd5e1');
        }

        localStorage.setItem('nexus_theme', isDark ? 'dark' : 'light');
        localStorage.setItem('nexus_accent', accent);
    }, [isDark, accent]);

    const toggleTheme = () => setIsDark(!isDark);
    const setAccentColor = (color) => setAccent(color);

    return (
        <ThemeContext.Provider value={{ isDark, accent, toggleTheme, setAccentColor, ACCENT_COLORS }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
