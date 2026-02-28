import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import PostModal from '../components/PostModal';

import { getImageUrl } from '../utils';

export default function Explore() {
    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('posts');
    const [selectedPost, setSelectedPost] = useState(null);

    useEffect(() => { fetchExplore(); }, []);

    const fetchExplore = async () => {
        try {
            const res = await api.get('/posts/explore');
            setPosts(res.data);
        } catch (err) {
            console.error('Failed to load explore', err);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (q) => {
        if (!q.trim()) { setUsers([]); return; }
        try {
            const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
            setUsers(res.data);
        } catch (err) {
            console.error('Search failed', err);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => searchUsers(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const handlePostLikeUpdate = (postId, data) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, is_liked: data.liked, likes_count: data.likes_count } : p
        ));
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Search People */}
            <div className="mb-6">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setTab('users'); }}
                    className="input-field"
                    placeholder="🔍  Search people by name..."
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setTab('posts')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-none cursor-pointer
            ${tab === 'posts' ? 'gradient-primary text-white' : ''}`}
                    style={tab !== 'posts' ? { background: 'var(--bg-hover)', color: 'var(--text-secondary)' } : {}}
                >
                    Explore Posts
                </button>
                <button
                    onClick={() => setTab('users')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-none cursor-pointer
            ${tab === 'users' ? 'gradient-primary text-white' : ''}`}
                    style={tab !== 'users' ? { background: 'var(--bg-hover)', color: 'var(--text-secondary)' } : {}}
                >
                    Find People
                </button>
            </div>

            {tab === 'users' && searchQuery && (
                <div className="space-y-3 mb-6">
                    {users.length === 0 ? (
                        <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No users found</p>
                    ) : (
                        users.map((u) => (
                            <Link
                                key={u.id}
                                to={`/profile/${u.id}`}
                                className="card flex items-center gap-3 p-4 no-underline transition-all"
                            >
                                <img src={getImageUrl(u.avatar_url)} alt={u.username} className="w-12 h-12 rounded-full ring-2" style={{ '--tw-ring-color': 'var(--border-color)' }} />
                                <div>
                                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{u.display_name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                                </div>
                                <div className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {u.followers_count} followers
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            )}

            {tab === 'posts' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {posts.map((post, idx) => (
                        <motion.div
                            key={post.id}
                            className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => setSelectedPost(post)}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03, type: 'spring', stiffness: 200 }}
                        >
                            <img
                                src={getImageUrl(post.image_url)}
                                alt={post.caption}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                                <span className="text-white font-semibold text-sm">♥ {post.likes_count}</span>
                                <span className="text-white font-semibold text-sm">💬 {post.comments_count || 0}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Post Modal */}
            {selectedPost && (
                <PostModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    getImgUrl={getImageUrl}
                    onLike={handlePostLikeUpdate}
                />
            )}
        </div>
    );
}
