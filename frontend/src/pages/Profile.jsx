import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import PostModal from '../components/PostModal';
import { getImageUrl } from '../utils';

export default function Profile() {
    const { userId } = useParams();
    const { user: currentUser, fetchMe } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ display_name: '', bio: '' });
    const [editLoading, setEditLoading] = useState(false);
    const avatarInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [cropScale, setCropScale] = useState(1);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);

    const isOwnProfile = currentUser && parseInt(userId) === currentUser.id;

    useEffect(() => { fetchProfile(); fetchPosts(); }, [userId]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${userId}`);
            setProfile(res.data);
            setEditForm({ display_name: res.data.display_name, bio: res.data.bio });
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchPosts = async () => {
        try { const res = await api.get(`/posts/user/${userId}`); setPosts(res.data); } catch (err) { console.error(err); }
    };

    const fetchFollowers = async () => {
        try { const res = await api.get(`/users/${userId}/followers`); setFollowersList(res.data); setShowFollowers(true); } catch (err) { console.error(err); }
    };

    const fetchFollowing = async () => {
        try { const res = await api.get(`/users/${userId}/following`); setFollowingList(res.data); setShowFollowing(true); } catch (err) { console.error(err); }
    };

    const handleFollow = async () => {
        setFollowLoading(true);
        try {
            if (profile.is_following) {
                await api.delete(`/users/${userId}/follow`);
                setProfile({ ...profile, is_following: false, followers_count: profile.followers_count - 1 });
            } else {
                await api.post(`/users/${userId}/follow`);
                setProfile({ ...profile, is_following: true, followers_count: profile.followers_count + 1 });
            }
        } catch (err) { console.error(err); } finally { setFollowLoading(false); }
    };

    const handleStartChat = async () => {
        try { const res = await api.post('/chat/conversations', { user_id: parseInt(userId) }); navigate(`/chat?conv=${res.data.id}`); } catch (err) { console.error(err); }
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        setCropScale(1);
    };

    const handleSaveProfile = async () => {
        setEditLoading(true);
        try {
            if (avatarFile) {
                const fd = new FormData(); fd.append('file', avatarFile);
                const r = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                setProfile(prev => ({ ...prev, avatar_url: r.data.avatar_url }));
            }
            const res = await api.put('/users/me', editForm);
            setProfile(prev => ({ ...prev, ...res.data }));
            setShowEdit(false); setAvatarPreview(null); setAvatarFile(null);
            await fetchMe();
        } catch (err) { console.error(err); } finally { setEditLoading(false); }
    };


    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="card p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                        <div className="skeleton w-24 h-24 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <div className="skeleton w-32 h-5 rounded" />
                            <div className="skeleton w-48 h-3 rounded" />
                            <div className="flex gap-5"><div className="skeleton w-16 h-10 rounded" /><div className="skeleton w-16 h-10 rounded" /><div className="skeleton w-16 h-10 rounded" /></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>User not found</div>;

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
            <motion.div className="card p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200 }}>
                <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))` }}>
                            <img src={getImageUrl(profile.avatar_url)} alt="" className="w-full h-full rounded-full object-cover" style={{ background: 'var(--bg-base)' }} />
                        </div>
                        {isOwnProfile && (
                            <button onClick={() => setShowEdit(true)} className="absolute bottom-0 right-0 w-7 h-7 rounded-full glass-strong flex items-center justify-center text-xs border-none cursor-pointer transition-transform hover:scale-110" style={{ color: 'var(--accent-primary)' }}>✏️</button>
                        )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.display_name}</h1>
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>@{profile.username}</span>
                        </div>
                        {profile.bio && <p className="text-sm mb-3 max-w-md whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>}

                        {/* Clickable stats */}
                        <div className="flex items-center justify-center sm:justify-start gap-5 mb-3">
                            <div className="text-center">
                                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{posts.length}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Posts</p>
                            </div>
                            <button onClick={fetchFollowers} className="text-center bg-transparent border-none cursor-pointer p-0 transition-transform hover:scale-105">
                                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{profile.followers_count}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Followers</p>
                            </button>
                            <button onClick={fetchFollowing} className="text-center bg-transparent border-none cursor-pointer p-0 transition-transform hover:scale-105">
                                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{profile.following_count}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Following</p>
                            </button>
                        </div>

                        <div className="flex gap-3 justify-center sm:justify-start">
                            {isOwnProfile ? (
                                <motion.button onClick={() => setShowEdit(true)} className="btn-secondary text-sm" whileTap={{ scale: 0.95 }}>Edit Profile</motion.button>
                            ) : (
                                <>
                                    <motion.button onClick={handleFollow} disabled={followLoading} className={profile.is_following ? 'btn-secondary text-sm' : 'btn-primary text-sm'} whileTap={{ scale: 0.95 }}>{followLoading ? '...' : profile.is_following ? 'Unfollow' : 'Follow'}</motion.button>
                                    <motion.button onClick={handleStartChat} className="btn-secondary text-sm" whileTap={{ scale: 0.95 }}>Message</motion.button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Posts Grid */}
            <div className="mb-3"><h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Posts</h2></div>
            {posts.length === 0 ? (
                <div className="card p-10 text-center"><div className="text-3xl mb-3">📷</div><p style={{ color: 'var(--text-muted)' }}>No posts yet</p></div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    {posts.map((post, idx) => (
                        <motion.div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedPost(post)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                            <img src={getImageUrl(post.image_url)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'; }} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
                                <span className="text-white font-semibold text-sm">♥ {post.likes_count}</span>
                                <span className="text-white font-semibold text-sm">💬 {post.comments_count || 0}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {showEdit && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
                        <motion.div className="card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
                            <h2 className="text-xl font-bold mb-5 gradient-text">Edit Profile</h2>
                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Profile Picture</label>
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 cursor-pointer relative group" style={{ borderColor: 'var(--accent-primary)' }} onClick={() => avatarInputRef.current?.click()}>
                                        <img src={avatarPreview || getImageUrl(profile.avatar_url)} alt="" className="w-full h-full object-cover transition-transform" style={{ transform: `scale(${cropScale})` }} />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"><span className="text-white text-2xl">📷</span></div>
                                    </div>
                                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                                    {avatarPreview && (
                                        <div className="w-full">
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Zoom / Adjust</label>
                                            <input type="range" min="1" max="2" step="0.05" value={cropScale} onChange={(e) => setCropScale(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                                        </div>
                                    )}
                                    <button onClick={() => avatarInputRef.current?.click()} className="btn-secondary text-xs !px-4 !py-1.5">Choose Photo</button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                                <input type="text" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="input-field" placeholder="Your name" />
                            </div>
                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bio</label>
                                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="input-field resize-none" placeholder="Tell us about yourself..." rows={4} />
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{editForm.bio?.length || 0}/200</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSaveProfile} disabled={editLoading} className="btn-primary flex-1 disabled:opacity-50">{editLoading ? 'Saving...' : 'Save Changes'}</button>
                                <button onClick={() => { setShowEdit(false); setAvatarPreview(null); setAvatarFile(null); }} className="btn-secondary">Cancel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Followers List Modal */}
            <AnimatePresence>
                {showFollowers && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-md" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} style={{ maxHeight: '70vh' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Followers</h2>
                                <button onClick={() => setShowFollowers(false)} className="bg-transparent border-none cursor-pointer text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                                {followersList.length === 0 ? <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No followers yet</p> :
                                    followersList.map(u => (
                                        <Link key={u.id} to={`/profile/${u.id}`} onClick={() => setShowFollowers(false)} className="flex items-center gap-3 p-3 rounded-xl no-underline transition-all" style={{ color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <img src={getImageUrl(u.avatar_url)} alt="" className="w-10 h-10 rounded-full" style={{ border: '2px solid var(--border-color)' }} />
                                            <div><p className="font-semibold text-sm">{u.display_name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p></div>
                                        </Link>
                                    ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Following List Modal */}
            <AnimatePresence>
                {showFollowing && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-md" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} style={{ maxHeight: '70vh' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Following</h2>
                                <button onClick={() => setShowFollowing(false)} className="bg-transparent border-none cursor-pointer text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                                {followingList.length === 0 ? <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>Not following anyone</p> :
                                    followingList.map(u => (
                                        <Link key={u.id} to={`/profile/${u.id}`} onClick={() => setShowFollowing(false)} className="flex items-center gap-3 p-3 rounded-xl no-underline transition-all" style={{ color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <img src={getImageUrl(u.avatar_url)} alt="" className="w-10 h-10 rounded-full" style={{ border: '2px solid var(--border-color)' }} />
                                            <div><p className="font-semibold text-sm">{u.display_name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p></div>
                                        </Link>
                                    ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Post Modal */}
            {selectedPost && (
                <PostModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                    getImageUrl={getImageUrl}
                    onLike={(postId, data) => setPosts(posts.map(p => p.id === postId ? { ...p, is_liked: data.liked, likes_count: data.likes_count } : p))}
                />
            )}
        </div>
    );
}
