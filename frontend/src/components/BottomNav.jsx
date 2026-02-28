import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function BottomNav() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchUnread = async () => {
            try {
                const res = await api.get('/notifications/unread-count');
                setUnreadCount(res.data.count);
            } catch (err) { /* ignore */ }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [user]);

    // Reset when visiting notifications page
    useEffect(() => {
        if (location.pathname === '/notifications') {
            setUnreadCount(0);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/chat', label: 'Chat', icon: '💬' },
        { to: '/feed', label: 'Feed', icon: '🏠' },
        { to: '/explore', label: 'Explore', icon: '🔍' },
        { to: '/notifications', label: 'Alerts', icon: 'bell', isBell: true },
        { to: `/profile/${user?.id}`, label: 'Profile', icon: '👤', isProfile: true },
    ];

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 glass-bar border-t"
            style={{ borderColor: 'var(--border-color)' }}
        >
            <div className="max-w-lg mx-auto flex items-center justify-around h-14 px-2">
                {navItems.map((item) => {
                    const isActive = item.isProfile
                        ? location.pathname.startsWith('/profile')
                        : location.pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl no-underline transition-all relative"
                            style={{
                                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                            }}
                        >
                            {isActive && (
                                <span
                                    className="absolute -top-0.5 w-8 h-0.5 rounded-full"
                                    style={{ background: 'var(--accent-primary)', boxShadow: `0 0 8px var(--accent-glow)` }}
                                />
                            )}
                            {item.isBell ? (
                                <span className="relative text-xl flex items-center justify-center">
                                    <Bell size={20} strokeWidth={isActive ? 2.5 : 2} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                    {unreadCount > 0 && (
                                        <span
                                            className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white notif-badge"
                                            style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}
                                        >
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </span>
                            ) : (
                                <span className="text-xl">{item.icon}</span>
                            )}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl bg-transparent border-none cursor-pointer transition-all"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <span className="text-xl">⏻</span>
                    <span className="text-[10px] font-medium">Logout</span>
                </button>
            </div>
        </nav>
    );
}
