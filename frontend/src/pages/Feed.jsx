import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import PostModal from '../components/PostModal';
import { getImageUrl } from '../utils';

export default function Feed() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [caption, setCaption] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [likedHearts, setLikedHearts] = useState({});
    const [selectedPost, setSelectedPost] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => { loadFeed(); }, []);

    const loadFeed = async () => {
        try {
            const res = await api.get('/posts/feed');
            setPosts(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleFileSelect = (e) => {
        const f = e.target.files[0];
        if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
    };

    const createPost = async () => {
        if (!file && !preview) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('caption', caption);
            if (file) formData.append('file', file);
            const res = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setPosts([res.data, ...posts]);
            setShowCreate(false); setCaption(''); setFile(null); setPreview(null);
        } catch (err) { console.error(err); }
        finally { setUploading(false); }
    };

    const toggleLike = async (post) => {
        try {
            const res = await api.post(`/posts/${post.id}/like`);
            setPosts(posts.map(p => p.id === post.id ? { ...p, is_liked: res.data.liked, likes_count: res.data.likes_count } : p));
            if (res.data.liked) {
                setLikedHearts(prev => ({ ...prev, [post.id]: true }));
                setTimeout(() => setLikedHearts(prev => ({ ...prev, [post.id]: false })), 600);
            }
        } catch (err) { console.error(err); }
    };

    const handlePostLikeUpdate = (postId, data) => {
        setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: data.liked, likes_count: data.likes_count } : p));
        if (data.liked) {
            setLikedHearts(prev => ({ ...prev, [postId]: true }));
            setTimeout(() => setLikedHearts(prev => ({ ...prev, [postId]: false })), 600);
        }
    };

    const sharePost = (post) => {
        if (navigator.share) {
            navigator.share({ title: 'Check this on ApnaLoop!', text: post.caption, url: window.location.origin });
        } else {
            navigator.clipboard.writeText(`${window.location.origin} — ${post.caption}`);
        }
    };


    // Skeleton loader
    if (loading) {
        return (
            <div className="max-w-lg mx-auto px-4 py-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="card p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3"><div className="skeleton w-9 h-9 rounded-full" /><div className="skeleton w-24 h-3 rounded" /></div>
                        <div className="skeleton w-full h-64 rounded-lg mb-3" />
                        <div className="skeleton w-40 h-3 rounded mb-2" />
                        <div className="skeleton w-28 h-3 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
            {/* Create Post Button */}
            <motion.button
                onClick={() => setShowCreate(!showCreate)}
                className="btn-primary w-full mb-4 text-sm"
                whileTap={{ scale: 0.97 }}
            >
                + Create Post
            </motion.button>

            {/* Create Post Form */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="card p-4 mb-4 overflow-hidden"
                    >
                        <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3 transition-colors hover:border-[var(--accent-primary)]" style={{ borderColor: 'var(--border-color)' }}>
                            {preview ? (
                                <img src={preview} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
                            ) : (
                                <div>
                                    <span className="text-2xl">📷</span>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click to upload</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="input-field resize-none mb-3" rows={2} placeholder="Write a caption..." />
                        <button onClick={createPost} disabled={!file || uploading} className="btn-primary w-full disabled:opacity-40 text-sm">
                            {uploading ? 'Posting...' : 'Share Post'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Posts */}
            {posts.map((post, idx) => (
                <motion.div
                    key={post.id}
                    className="card mb-4 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 200 }}
                >
                    {/* Post Header */}
                    <div className="flex items-center gap-3 p-3">
                        <Link to={`/profile/${post.author_id}`}>
                            <img src={getImageUrl(post.author_avatar)} alt="" className="w-9 h-9 rounded-full ring-1 object-cover" style={{ '--tw-ring-color': 'var(--accent-glow)' }} />
                        </Link>
                        <div className="flex-1">
                            <Link to={`/profile/${post.author_id}`} className="font-semibold text-sm no-underline" style={{ color: 'var(--text-primary)' }}>{post.author_username}</Link>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    {/* Image — click to open modal, double-click to like */}
                    <div
                        className="relative cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                        onDoubleClick={(e) => { e.stopPropagation(); if (!post.is_liked) toggleLike(post); }}
                    >
                        <img src={getImageUrl(post.image_url)} alt="" className="w-full max-h-[500px] object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }} />
                        <AnimatePresence>
                            {likedHearts[post.id] && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                >
                                    <span className="text-6xl heart-burst">❤️</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Action buttons */}
                    <div className="p-3">
                        <div className="flex items-center gap-4 mb-2">
                            <motion.button
                                onClick={() => toggleLike(post)}
                                className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                                animate={likedHearts[post.id] ? { scale: [1, 1.4, 0.9, 1.15, 1] } : {}}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                                <Heart
                                    size={22}
                                    fill={post.is_liked ? '#ef4444' : 'none'}
                                    color={post.is_liked ? '#ef4444' : 'var(--text-secondary)'}
                                    strokeWidth={2}
                                />
                            </motion.button>
                            <motion.button
                                onClick={() => setSelectedPost(post)}
                                className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                                whileTap={{ scale: 0.85 }}
                            >
                                <MessageCircle size={22} color="var(--text-secondary)" strokeWidth={2} />
                            </motion.button>
                            <motion.button
                                onClick={() => sharePost(post)}
                                className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                                whileTap={{ scale: 0.85 }}
                            >
                                <Send size={20} color="var(--text-secondary)" strokeWidth={2} />
                            </motion.button>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{post.likes_count} likes</p>
                        <p className="text-sm mt-1">
                            <Link to={`/profile/${post.author_id}`} className="font-semibold no-underline mr-1.5" style={{ color: 'var(--text-primary)' }}>{post.author_username}</Link>
                            <span style={{ color: 'var(--text-secondary)' }}>{post.caption}</span>
                        </p>
                        {(post.comments_count || 0) > 0 && (
                            <button
                                onClick={() => setSelectedPost(post)}
                                className="bg-transparent border-none cursor-pointer text-xs mt-1 p-0"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                View all {post.comments_count} comments
                            </button>
                        )}
                    </div>
                </motion.div>
            ))}

            {posts.length === 0 && (
                <div className="card p-10 text-center">
                    <div className="text-3xl mb-3">🌿</div>
                    <p style={{ color: 'var(--text-muted)' }}>Follow people to see their posts!</p>
                </div>
            )}

            {/* Post Modal */}
            {selectedPost && (
                <PostModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    getImgUrl={getImgUrl}
                    onLike={handlePostLikeUpdate}
                />
            )}
        </div>
    );
}
