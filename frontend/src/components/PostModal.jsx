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
                    className="w-full max-w-2xl mx-4 flex flex-col rounded-2xl overflow-hidden"
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
                            <motion.button onClick={() => document.getElementById('modal-comment-input')?.focus()} className="bg-transparent border-none cursor-pointer p-0 flex items-center" whileTap={{ scale: 0.85 }}>
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

                    {/* Comments Tray */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: '25vh' }}>
                        {comments.length === 0 ? (
                            <p className="text-center py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet — be the first!</p>
                        ) : (
                            comments.map((c) => (
                                <motion.div
                                    key={c.id}
                                    className="flex gap-2.5"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                >
                                    <img src={imgUrl(c.author_avatar)} alt="" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
                                    <div>
                                        <span className="text-xs font-semibold mr-1.5" style={{ color: 'var(--text-primary)' }}>{c.author_username}</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.content}</span>
                                        <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Comment Input — fixed at bottom */}
                    <form onSubmit={(e) => { e.preventDefault(); addComment(); }} className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-glass)' }}>
                        <input
                            id="modal-comment-input"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="input-field flex-1 !text-sm"
                            placeholder="Add a comment..."
                        />
                        <motion.button
                            type="submit"
                            disabled={!commentText.trim()}
                            className="btn-primary !px-4 !py-2 text-sm disabled:opacity-30"
                            whileTap={{ scale: 0.9 }}
                        >
                            Post
                        </motion.button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
