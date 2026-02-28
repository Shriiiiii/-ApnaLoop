import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserCheck } from 'lucide-react';
import api from '../api';
import { getImageUrl } from '../utils';

const ICON_MAP = {
    like: Heart,
    comment: MessageCircle,
    follow: UserCheck,
};

const COLOR_MAP = {
    like: '#ef4444',
    comment: '#3b82f6',
    follow: '#22c55e',
};

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
        // Mark all as read when page opens
        api.post('/notifications/read').catch(() => { });
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const formatTime = (d) => {
        const dt = new Date(d);
        const diff = (Date.now() - dt.getTime()) / 1000;
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <div className="max-w-lg mx-auto px-4 py-4">
                <h2 className="text-lg font-bold mb-4 gradient-text">Notifications</h2>
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                            <div className="flex-1">
                                <div className="skeleton w-48 h-3 rounded mb-2" />
                                <div className="skeleton w-20 h-2 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
            <h2 className="text-lg font-bold mb-4 gradient-text">Notifications</h2>

            {notifications.length === 0 ? (
                <div className="card p-10 text-center">
                    <div className="text-3xl mb-3">🔔</div>
                    <p style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        When someone likes or comments on your posts, you'll see it here!
                    </p>
                </div>
            ) : (
                <div className="space-y-1">
                    {notifications.map((notif, idx) => {
                        const IconComp = ICON_MAP[notif.type] || Heart;
                        const iconColor = COLOR_MAP[notif.type] || 'var(--accent-primary)';
                        return (
                            <motion.div
                                key={notif.id}
                                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                                style={{
                                    background: notif.is_read ? 'transparent' : 'rgba(102,126,234,0.06)',
                                }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200 }}
                            >
                                {/* Actor avatar */}
                                <Link to={notif.actor ? `/profile/${notif.actor.id}` : '#'} className="flex-shrink-0 relative">
                                    <img
                                        src={notif.actor?.avatar_url ? getImageUrl(notif.actor.avatar_url) : `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover"
                                        style={{ border: '2px solid var(--border-color)' }}
                                    />
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ background: iconColor }}
                                    >
                                        <IconComp size={10} color="white" strokeWidth={2.5} />
                                    </span>
                                </Link>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                                        <span className="font-semibold">
                                            {notif.actor?.display_name || notif.actor?.username || 'Someone'}
                                        </span>{' '}
                                        <span style={{ color: 'var(--text-secondary)' }}>{notif.text?.replace(notif.actor?.display_name || notif.actor?.username || '', '').trim()}</span>
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {formatTime(notif.created_at)}
                                    </p>
                                </div>

                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ background: 'var(--accent-primary)' }}
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
