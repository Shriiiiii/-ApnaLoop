import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, X } from 'lucide-react';
import api from '../api';
import { getImageUrl as getImgUrlUtil } from '../utils';

export default function PostModal({ post, onClose, getImgUrl, getImageUrl: getImageUrlProp, onLike }) {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [localPost, setLocalPost] = useState(post);
    const [likeAnim, setLikeAnim] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        if (post) {
            setLocalPost(post);
            loadComments();
        }
    }, [post]);

    const loadComments = async () => {
        try {
            const res = await api.get(`/posts/${post.id}/comments`);
            setComments(res.data);
        } catch (err) { console.error(err); }
    };

    const addComment = async () => {
        if (!commentText.trim()) return;
        try {
            const formData = new FormData();
            formData.append('content', commentText.trim());
            const res = await api.post(`/posts/${post.id}/comments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setComments(prev => [...prev, res.data]);
            setCommentText('');
            setLocalPost(prev => ({ ...prev, comments_count: (prev.comments_count || 0) + 1 }));
        } catch (err) { console.error(err); }
    };

    const handleLike = async () => {
        try {
            const res = await api.post(`/posts/${post.id}/like`);
            setLocalPost(prev => ({ ...prev, is_liked: res.data.liked, likes_count: res.data.likes_count }));
            if (res.data.liked) {
                setLikeAnim(true);
                setTimeout(() => setLikeAnim(false), 600);
            }
            if (onLike) onLike(post.id, res.data);
        } catch (err) { console.error(err); }
    };

    const sharePost = () => {
        if (navigator.share) {
            navigator.share({ title: 'Check this on ApnaLoop!', text: localPost.caption, url: window.location.origin });
        } else {
            navigator.clipboard.writeText(`${window.location.origin} — ${localPost.caption}`);
        }
    };

    const imgUrl = (url) => {
        if (getImgUrl) return getImgUrl(url);
        if (getImageUrlProp) return getImageUrlProp(url);
        return getImgUrlUtil(url);
    };

    if (!post) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-2xl mx-4 flex flex-col rounded-2xl overflow-hidden relative"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', maxHeight: '90vh' }}
                    initial={{ y: 60, scale: 0.95 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 60, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <Link to={`/profile/${localPost.author_id}`} onClick={onClose}>
                            <img src={imgUrl(localPost.author_avatar)} alt="" className="w-8 h-8 rounded-full ring-1 object-cover" style={{ '--tw-ring-color': 'var(--accent-glow)' }} />
                        </Link>
                        <div className="flex-1">
                            <Link to={`/profile/${localPost.author_id}`} onClick={onClose} className="font-semibold text-sm no-underline" style={{ color: 'var(--text-primary)' }}>{localPost.author_username}</Link>
                        </div>
                        <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Image */}
                    <div className="relative flex-shrink-0" onDoubleClick={() => !localPost.is_liked && handleLike()}>
                        <img
                            src={imgUrl(localPost.image_url)}
                            alt=""
                            className="w-full object-contain"
                            style={{ maxHeight: '50vh', background: '#000' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }}
                        />
                        <AnimatePresence>
                            {likeAnim && (
                                <motion.div
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                >
                                    <Heart size={64} fill="#ef4444" color="#ef4444" className="heart-burst" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Actions + Caption */}
                    <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-4 mb-2">
                            <motion.button
                                onClick={handleLike}
                                className="bg-transparent border-none cursor-pointer p-0 flex items-center"
                                animate={likeAnim ? { scale: [1, 1.4, 0.9, 1.15, 1] } : {}}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                            >
                                <Heart size={22} fill={localPost.is_liked ? '#ef4444' : 'none'} color={localPost.is_liked ? '#ef4444' : 'var(--text-secondary)'} strokeWidth={2} />
                            </motion.button>
                            <motion.button onClick={() => setShowComments(!showComments)} className="bg-transparent border-none cursor-pointer p-0 flex items-center" whileTap={{ scale: 0.85 }}>
                                <MessageCircle size={22} color="var(--text-secondary)" strokeWidth={2} />
                            </motion.button>
                            <motion.button onClick={sharePost} className="bg-transparent border-none cursor-pointer p-0 flex items-center" whileTap={{ scale: 0.85 }}>
                                <Send size={20} color="var(--text-secondary)" strokeWidth={2} />
                            </motion.button>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{localPost.likes_count} likes</p>
                        {localPost.caption && (
                            <p className="text-sm mt-1">
                                <span className="font-semibold mr-1.5" style={{ color: 'var(--text-primary)' }}>{localPost.author_username}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{localPost.caption}</span>
                            </p>
                        )}
                    </div>

                    {/* Glassmorphism Sliding Comment Tray */}
                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
                                style={{
                                    background: 'rgba(20, 20, 30, 0.75)',
                                    backdropFilter: 'blur(16px)',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    height: '60%'
                                }}
                                initial={{ y: '100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '100%', opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            >
                                {/* Tray Handle */}
                                <div className="w-full flex justify-center py-2 cursor-pointer" onClick={() => setShowComments(false)}>
                                    <div className="w-12 h-1.5 rounded-full bg-white/30" />
                                </div>

                                {/* Comments List */}
                                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-20">
                                    {comments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-70">
                                            <MessageCircle size={32} className="mb-2" />
                                            <p className="text-sm font-medium">No comments yet</p>
                                            <p className="text-xs">Be the first to comment!</p>
                                        </div>
                                    ) : (
                                        comments.map((c) => (
                                            <motion.div
                                                key={c.id}
                                                className="flex gap-3"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <img src={imgUrl(c.author_avatar)} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover ring-1 ring-white/20" />
                                                <div className="bg-white/5 rounded-2xl rounded-tl-sm px-3 py-2 flex-1">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-xs font-bold text-white">{c.author_username}</span>
                                                        <span className="text-[10px] text-white/50">
                                                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white/90">{c.content}</p>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* Fixed Input Area */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 backdrop-blur-md border-t border-white/10">
                                    <form onSubmit={(e) => { e.preventDefault(); addComment(); }} className="flex gap-2 relative">
                                        <input
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 pl-4 pr-12 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                            placeholder="Write a comment..."
                                            autoFocus
                                        />
                                        <motion.button
                                            type="submit"
                                            disabled={!commentText.trim()}
                                            className="absolute right-1 top-1 bottom-1 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/30 transition-colors"
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Send size={14} className="text-white relative left-[-1px]" />
                                        </motion.button>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
