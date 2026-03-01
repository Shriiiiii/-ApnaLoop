import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils';

const AI_BOT_USERNAME = 'apnaloop_ai';
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const WALLPAPERS = [
    { name: 'Default', value: '' },
    { name: 'Starry', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
    { name: 'Sunset', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
    { name: 'Forest', value: 'linear-gradient(135deg, #0d1117 0%, #1a2332 50%, #1e3a2b 100%)' },
];
const BUBBLE_COLORS = [
    { name: 'Indigo', value: '#667eea' },
    { name: 'Blue', value: '#2196f3' },
    { name: 'Pink', value: '#e91e8a' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
];

export default function Chat() {
    const { user, token } = useAuth();
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showGroupCreate, setShowGroupCreate] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [aiTyping, setAiTyping] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [chatWallpaper, setChatWallpaper] = useState('');
    const [bubbleColor, setBubbleColor] = useState('#667eea');
    const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [hoveredMsg, setHoveredMsg] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [groupMembers, setGroupMembers] = useState([]);
    const [stories, setStories] = useState([]);
    const [showStoryUpload, setShowStoryUpload] = useState(false);
    const [storySuccess, setStorySuccess] = useState(false);
    const [storyFile, setStoryFile] = useState(null);
    const [storyPreview, setStoryPreview] = useState(null);
    const [viewingStory, setViewingStory] = useState(null);
    const [storyUploading, setStoryUploading] = useState(false);
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const storyFileRef = useRef(null);
    const storyTimerRef = useRef(null);

    useEffect(() => { fetchConversations(); fetchStories(); }, []);

    const fetchStories = async () => {
        try {
            const res = await api.get('/stories');
            setStories(res.data);
        } catch (err) { console.error(err); }
    };

    const uploadStory = async () => {
        if (!storyFile) return;
        setStoryUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', storyFile);
            await api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setShowStoryUpload(false);
            setStoryFile(null);
            setStoryPreview(null);
            // Springy success animation
            setStorySuccess(true);
            setTimeout(() => setStorySuccess(false), 2000);
            await fetchStories();
        } catch (err) { console.error(err); }
        finally { setStoryUploading(false); }
    };

    const openStoryViewer = (storyGroup) => {
        setViewingStory(storyGroup);
        if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
        storyTimerRef.current = setTimeout(() => {
            setViewingStory(null);
        }, 5000);
    };

    useEffect(() => {
        return () => { if (storyTimerRef.current) clearTimeout(storyTimerRef.current); };
    }, []);

    useEffect(() => {
        const convId = searchParams.get('conv');
        if (convId && conversations.length > 0) {
            const conv = conversations.find(c => c.id === parseInt(convId));
            if (conv) selectConversation(conv);
        }
    }, [searchParams, conversations]);

    useEffect(() => {
        if (!token) return;
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        let wsHost;
        if (apiUrl) {
            // Production: derive host from API URL (e.g. https://apnaloop-api.onrender.com)
            wsHost = apiUrl.replace(/^https?:\/\//, '');
        } else {
            // Dev: same host, backend on port 8000
            wsHost = `${window.location.hostname}:8000`;
        }
        const wsUrl = `${wsProtocol}://${wsHost}/api/chat/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                // Update active conversation view ONLY if this message belongs to the currently open chat
                setMessages(prev => {
                    // Check if the chat is currently open by checking if we have messages for this conversation
                    // If activeConv (which is not easily accessible here due to closure) matches the id:
                    // Actually, the closure might have a stale activeConv. 
                    // Let's rely on the fact that if prev has messages, they belong to the active chat
                    // Better approach: filter based on a ref, or just check if the message matches the first message's conv id
                    if (prev.length > 0 && prev[0].conversation_id !== data.message.conversation_id) {
                        return prev; // Not for this active chat
                    }
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });

                // Always update the sidebar text for all chats
                setConversations(prev => prev.map(c =>
                    c.id === data.message.conversation_id
                        ? { ...c, last_message: data.message.content, updated_at: data.message.created_at }
                        : c
                ));
            } else if (data.type === 'reaction') {
                setMessages(prev => prev.map(m => {
                    if (m.id !== data.message_id) return m;
                    let reactions = [...(m.reactions || [])];
                    if (data.action === 'add') {
                        reactions.push({ emoji: data.emoji, user_id: data.user_id, username: data.username });
                    } else {
                        reactions = reactions.filter(r => !(r.user_id === data.user_id && r.emoji === data.emoji));
                    }
                    return { ...m, reactions };
                }));
            }
        };
        wsRef.current = ws;
        return () => ws.close();
    }, [token]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/chat/conversations');
            const sorted = res.data.sort((a, b) => {
                const aIsAI = a.other_user?.username === AI_BOT_USERNAME;
                const bIsAI = b.other_user?.username === AI_BOT_USERNAME;
                if (aIsAI && !bIsAI) return -1;
                if (!aIsAI && bIsAI) return 1;
                return new Date(b.updated_at) - new Date(a.updated_at);
            });
            setConversations(sorted);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const selectConversation = async (conv) => {
        setActiveConv(conv);
        setShowSidebar(false);
        setShowMenu(false);
        try {
            const res = await api.get(`/chat/conversations/${conv.id}/messages`);
            setMessages(res.data);
        } catch (err) { console.error(err); }
    };

    const isAIConversation = useCallback(() => activeConv?.other_user?.username === AI_BOT_USERNAME, [activeConv]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConv) return;
        const content = newMessage.trim();
        setNewMessage('');

        if (isAIConversation()) {
            setMessages(prev => [...prev, { id: Date.now(), conversation_id: activeConv.id, sender_id: user.id, content, created_at: new Date().toISOString(), sender_username: user.username, status: 'sent', reactions: [] }]);
            setAiTyping(true);
            try {
                const res = await api.post('/ai/chat', { message: content });
                setMessages(prev => [...prev, { id: Date.now() + 1, conversation_id: activeConv.id, sender_id: activeConv.other_user.id, content: res.data.response, created_at: new Date().toISOString(), sender_username: AI_BOT_USERNAME, status: 'read', reactions: [] }]);
                setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: res.data.response } : c));
            } catch (err) { console.error(err); } finally { setAiTyping(false); }
        } else {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ conversation_id: activeConv.id, content }));
            }
        }
    };

    const sendReaction = (messageId, emoji) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && activeConv) {
            wsRef.current.send(JSON.stringify({ type: 'reaction', message_id: messageId, emoji, conversation_id: activeConv.id }));
        }
        setHoveredMsg(null);
    };

    const clearChat = async () => {
        if (!activeConv) return;
        try {
            await api.delete(`/chat/conversations/${activeConv.id}/messages`);
            setMessages([]);
            setShowMenu(false);
        } catch (err) { console.error(err); }
    };

    const createGroup = async () => {
        if (!groupName.trim() || groupMembers.length === 0) return;
        try {
            const res = await api.post('/chat/groups', { name: groupName, member_ids: groupMembers.map(m => m.id) });
            setShowGroupCreate(false);
            setGroupName('');
            setGroupMembers([]);
            await fetchConversations();
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(res.data.filter(u => u.id !== user?.id));
            } catch (err) { console.error(err); }
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const startNewChat = async (targetUser) => {
        try {
            const res = await api.post('/chat/conversations', { user_id: targetUser.id });
            setShowNewChat(false);
            setSearchQuery('');
            await fetchConversations();
            const convRes = await api.get('/chat/conversations');
            const conv = convRes.data.find(c => c.id === res.data.id);
            if (conv) selectConversation(conv);
        } catch (err) { console.error(err); }
    };

    const getName = (conv) => conv.is_group ? conv.name : (conv.other_user?.display_name || conv.other_user?.username || 'Chat');
    const formatTime = (d) => { const dt = new Date(d); const h = (new Date() - dt) / 3600000; if (h < 24) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (h < 168) return dt.toLocaleDateString([], { weekday: 'short' }); return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
    const getStatusIcon = (status) => { if (status === 'read') return '✓✓'; if (status === 'delivered') return '✓✓'; return '✓'; };
    const getStatusColor = (status) => { if (status === 'read') return '#3b82f6'; return 'var(--text-muted)'; };

    if (loading) {
        return (
            <div className="flex" style={{ height: 'calc(100vh - 6.5rem)' }}>
                <div className="w-full md:w-80 p-3 space-y-3">
                    {[...Array(6)].map((_, i) => (<div key={i} className="flex items-center gap-3"><div className="skeleton w-11 h-11 rounded-full flex-shrink-0" /><div className="flex-1"><div className="skeleton w-24 h-3 rounded mb-2" /><div className="skeleton w-36 h-2 rounded" /></div></div>))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex" style={{ height: 'calc(100vh - 6.5rem)' }}>
            {/* Sidebar */}
            <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r glass`} style={{ borderColor: 'var(--border-color)' }}>
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h2 className="text-base font-bold gradient-text">Messages</h2>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{conversations.length} chats</p>
                    </div>
                    <div className="flex gap-1.5">
                        <motion.button onClick={() => setShowGroupCreate(true)} className="w-8 h-8 rounded-xl glass-strong flex items-center justify-center text-sm border-none cursor-pointer" style={{ color: 'var(--accent-primary)' }} whileTap={{ scale: 0.9 }} title="Create Group">👥</motion.button>
                        <motion.button onClick={() => setShowNewChat(true)} className="w-8 h-8 rounded-xl glass-strong flex items-center justify-center text-base border-none cursor-pointer" style={{ color: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-glow)' }} whileTap={{ scale: 0.9 }} title="New Chat">+</motion.button>
                    </div>
                </div>

                {/* Story Bar */}
                <div className="flex gap-3 p-3 overflow-x-auto border-b" style={{ borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}>
                    {/* Own story / upload */}
                    <motion.div
                        className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowStoryUpload(true)}
                    >
                        <div className="w-14 h-14 rounded-full p-[2px] relative" style={{ background: 'var(--border-color)' }}>
                            <img
                                src={getImageUrl(user?.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt="Your Story"
                                className="w-full h-full rounded-full object-cover"
                                style={{ border: '2px solid var(--bg-base)' }}
                            />
                            <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-primary)', border: '2px solid var(--bg-base)' }}>
                                <Plus size={10} color="white" strokeWidth={3} />
                            </span>
                        </div>
                        <span className="text-[10px] w-14 text-center truncate" style={{ color: 'var(--accent-primary)' }}>Your Story</span>
                    </motion.div>

                    {/* Other users' stories */}
                    {stories.filter(s => s.user_id !== user?.id).map((storyGroup) => (
                        <motion.div
                            key={storyGroup.user_id}
                            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openStoryViewer(storyGroup)}
                        >
                            <div
                                className="w-14 h-14 rounded-full p-[2px]"
                                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary), #f093fb)' }}
                            >
                                <img
                                    src={getImageUrl(storyGroup.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${storyGroup.username}`}
                                    alt={storyGroup.display_name}
                                    className="w-full h-full rounded-full object-cover"
                                    style={{ border: '2px solid var(--bg-base)' }}
                                />
                            </div>
                            <span className="text-[10px] w-14 text-center truncate" style={{ color: 'var(--text-secondary)' }}>{storyGroup.display_name || storyGroup.username}</span>
                        </motion.div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => {
                        const isAI = conv.other_user?.username === AI_BOT_USERNAME;
                        const avatar = getImageUrl(conv.other_user?.avatar_url);
                        return (
                            <motion.button
                                key={conv.id}
                                onClick={() => selectConversation(conv)}
                                className="w-full flex items-center gap-3 px-3 py-3 border-none cursor-pointer text-left transition-all"
                                style={{ background: activeConv?.id === conv.id ? 'var(--bg-hover)' : 'transparent', borderLeft: activeConv?.id === conv.id ? '3px solid var(--accent-primary)' : '3px solid transparent' }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="relative flex-shrink-0">
                                    {conv.is_group ? (
                                        <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">👥</div>
                                    ) : avatar ? (
                                        <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover" style={{ border: isAI ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)' }} />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">{getName(conv)[0]}</div>
                                    )}
                                    {isAI && <span className="absolute -bottom-0.5 -right-0.5 text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold" style={{ background: 'var(--accent-primary)', color: 'white' }}>AI</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                            {getName(conv)} {isAI && '🤖'} {conv.is_group && `(${conv.member_count})`}
                                        </p>
                                        <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{conv.updated_at ? formatTime(conv.updated_at) : ''}</span>
                                    </div>
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{conv.last_message || 'No messages yet'}</p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`${!showSidebar || activeConv ? 'flex' : 'hidden'} md:flex flex-col flex-1`} style={{ background: chatWallpaper || 'var(--bg-base)' }}>
                {activeConv ? (
                    <>
                        {/* Header */}
                        <div className="glass-bar flex items-center gap-3 px-4 py-2.5 border-b relative" style={{ borderColor: 'var(--border-color)', overflow: 'visible', zIndex: 20 }}>
                            <button onClick={() => { setShowSidebar(true); setActiveConv(null); }} className="md:hidden bg-transparent border-none cursor-pointer text-lg p-1" style={{ color: 'var(--text-secondary)' }}>←</button>
                            {activeConv.is_group ? (
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">👥</div>
                            ) : getImageUrl(activeConv.other_user?.avatar_url) ? (
                                <img src={getImageUrl(activeConv.other_user?.avatar_url)} alt="" className="w-9 h-9 rounded-full ring-2 object-cover" style={{ '--tw-ring-color': 'var(--accent-glow)' }} />
                            ) : (
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">{getName(activeConv)[0]}</div>
                            )}
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{getName(activeConv)}</h3>
                                <p className="text-[11px]" style={{ color: isAIConversation() ? 'var(--accent-primary)' : '#22c55e' }}>
                                    {isAIConversation() ? 'AI Assistant' : activeConv.is_group ? `${activeConv.member_count} members` : 'Online'}
                                </p>
                            </div>
                            {/* Three dots menu */}
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="bg-transparent border-none cursor-pointer text-lg p-1" style={{ color: 'var(--text-secondary)' }}>⋮</button>
                                {showMenu && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-0 top-10 card p-2 min-w-44" style={{ zIndex: 999 }}>
                                        <button onClick={clearChat} className="w-full text-left px-3 py-2 rounded-lg text-xs bg-transparent border-none cursor-pointer transition-colors" style={{ color: 'var(--text-primary)' }} onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>🗑️ Clear Chat</button>
                                        <button onClick={() => { setShowWallpaperPicker(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs bg-transparent border-none cursor-pointer transition-colors" style={{ color: 'var(--text-primary)' }} onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>🎨 Chat Wallpaper</button>
                                        <button onClick={() => { setShowColorPicker(true); setShowMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs bg-transparent border-none cursor-pointer transition-colors" style={{ color: 'var(--text-primary)' }} onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.target.style.background = 'transparent'}>🎯 Bubble Color</button>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === user?.id;
                                const isBotMsg = msg.sender_username === AI_BOT_USERNAME;
                                return (
                                    <motion.div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300 }}
                                        onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                                        <div className="relative max-w-[75%]">
                                            <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'text-white rounded-br-md' : 'glass rounded-bl-md'}`}
                                                style={isMe ? { background: bubbleColor } : { color: 'var(--text-primary)' }}>
                                                {!isMe && <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>{isBotMsg ? '🤖 ApnaLoop AI' : msg.sender_username}</p>}
                                                <p className="text-sm leading-relaxed break-words whitespace-pre-line">{msg.content}</p>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className={`text-[10px] ${isMe ? 'text-white/50' : ''}`} style={!isMe ? { color: 'var(--text-muted)' } : {}}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && <span className="text-[10px]" style={{ color: getStatusColor(msg.status) }}>{getStatusIcon(msg.status)}</span>}
                                                </div>
                                            </div>

                                            {/* Reactions display */}
                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                                    {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                                                        <span key={emoji} className="text-[11px] px-1.5 py-0.5 rounded-full glass" style={{ fontSize: '11px' }}>{emoji} {count > 1 && count}</span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reaction picker on hover */}
                                            <AnimatePresence>
                                                {hoveredMsg === msg.id && !isAIConversation() && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className={`absolute ${isMe ? 'right-0' : 'left-0'} -top-8 glass-strong rounded-full px-1.5 py-0.5 flex gap-0.5 z-10`}
                                                    >
                                                        {REACTION_EMOJIS.map(emoji => (
                                                            <motion.button
                                                                key={emoji}
                                                                onClick={() => sendReaction(msg.id, emoji)}
                                                                className="bg-transparent border-none cursor-pointer text-sm p-0.5 rounded hover:scale-125 transition-transform"
                                                                whileTap={{ scale: 0.8 }}
                                                            >
                                                                {emoji}
                                                            </motion.button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {aiTyping && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-primary)' }}>🤖 ApnaLoop AI</p>
                                        <div className="flex gap-1">
                                            {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-primary)', animationDelay: `${d}ms` }} />)}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="p-3 border-t glass-bar" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex gap-2">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="input-field flex-1" placeholder={isAIConversation() ? 'Ask ApnaLoop AI...' : 'Type a message...'} autoFocus />
                                <motion.button type="submit" disabled={!newMessage.trim()} className="btn-primary !px-4 disabled:opacity-30" whileTap={{ scale: 0.9 }}>➤</motion.button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center">
                        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring' }}>
                            <div className="text-5xl mb-4">💬</div>
                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>ApnaLoop Messages</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Select a conversation or start a new one</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setShowNewChat(true)} className="btn-primary">New Chat</button>
                                <button onClick={() => setShowGroupCreate(true)} className="btn-secondary">Create Group</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* New Chat */}
            <AnimatePresence>
                {showNewChat && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-md" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} style={{ maxHeight: '70vh' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Chat</h2>
                                <button onClick={() => { setShowNewChat(false); setSearchQuery(''); }} className="bg-transparent border-none cursor-pointer text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field mb-4" placeholder="Search people..." autoFocus />
                            <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
                                {searchResults.length === 0 && searchQuery ? <p className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No users found</p> : searchResults.map(u => (
                                    <button key={u.id} onClick={() => startNewChat(u)} className="w-full flex items-center gap-3 p-3 rounded-xl border-none cursor-pointer text-left transition-all" style={{ background: 'transparent', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <img src={getImageUrl(u.avatar_url)} alt="" className="w-10 h-10 rounded-full" style={{ border: '2px solid var(--border-color)' }} />
                                        <div><p className="font-semibold text-sm">{u.display_name}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p></div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Group Create */}
            <AnimatePresence>
                {showGroupCreate && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-md" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} style={{ maxHeight: '80vh' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Create Group</h2>
                                <button onClick={() => { setShowGroupCreate(false); setGroupMembers([]); setGroupName(''); setSearchQuery(''); }} className="bg-transparent border-none cursor-pointer text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="input-field mb-3" placeholder="Group name..." />
                            {groupMembers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {groupMembers.map(m => (
                                        <span key={m.id} className="glass text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                                            {m.display_name}
                                            <button onClick={() => setGroupMembers(groupMembers.filter(gm => gm.id !== m.id))} className="bg-transparent border-none cursor-pointer text-[10px]" style={{ color: 'var(--text-muted)' }}>✕</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field mb-3" placeholder="Search to add members..." />
                            <div className="overflow-y-auto mb-3" style={{ maxHeight: '30vh' }}>
                                {searchResults.filter(u => !groupMembers.some(m => m.id === u.id)).map(u => (
                                    <button key={u.id} onClick={() => { setGroupMembers([...groupMembers, u]); setSearchQuery(''); }} className="w-full flex items-center gap-3 p-2.5 rounded-xl border-none cursor-pointer text-left transition-all" style={{ background: 'transparent', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <img src={getImageUrl(u.avatar_url)} alt="" className="w-8 h-8 rounded-full" style={{ border: '2px solid var(--border-color)' }} />
                                        <div><p className="font-semibold text-xs">{u.display_name}</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>@{u.username}</p></div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0} className="btn-primary w-full disabled:opacity-40">Create Group ({groupMembers.length} members)</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wallpaper Picker */}
            <AnimatePresence>
                {showWallpaperPicker && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-sm" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
                            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Chat Wallpaper</h2>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {WALLPAPERS.map(w => (
                                    <button key={w.name} onClick={() => { setChatWallpaper(w.value); setShowWallpaperPicker(false); }} className="h-20 rounded-xl border-2 cursor-pointer transition-transform hover:scale-105" style={{ background: w.value || 'var(--bg-base)', borderColor: chatWallpaper === w.value ? 'var(--accent-primary)' : 'var(--border-color)' }}>
                                        <span className="text-[10px] text-white/70">{w.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowWallpaperPicker(false)} className="btn-secondary w-full text-sm">Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Color Picker */}
            <AnimatePresence>
                {showColorPicker && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-sm" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
                            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Bubble Color</h2>
                            <div className="flex gap-3 mb-4 flex-wrap">
                                {BUBBLE_COLORS.map(c => (
                                    <button key={c.name} onClick={() => { setBubbleColor(c.value); setShowColorPicker(false); }} className="w-10 h-10 rounded-full border-2 cursor-pointer transition-transform hover:scale-110" style={{ background: c.value, borderColor: bubbleColor === c.value ? 'white' : 'transparent' }} title={c.name} />
                                ))}
                            </div>
                            <button onClick={() => setShowColorPicker(false)} className="btn-secondary w-full text-sm">Close</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Upload Modal */}
            <AnimatePresence>
                {showStoryUpload && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <motion.div className="card p-5 w-full max-w-md" initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Story</h2>
                                <button onClick={() => { setShowStoryUpload(false); setStoryFile(null); setStoryPreview(null); }} className="bg-transparent border-none cursor-pointer text-xl" style={{ color: 'var(--text-muted)' }}>✕</button>
                            </div>
                            <div onClick={() => storyFileRef.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3 transition-colors hover:border-[var(--accent-primary)]" style={{ borderColor: 'var(--border-color)' }}>
                                {storyPreview ? (
                                    <img src={storyPreview} alt="Preview" className="max-h-64 rounded-lg mx-auto" />
                                ) : (
                                    <div>
                                        <span className="text-3xl">📷</span>
                                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Click to select an image</p>
                                    </div>
                                )}
                            </div>
                            <input ref={storyFileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) { setStoryFile(f); setStoryPreview(URL.createObjectURL(f)); } }} className="hidden" />
                            <button onClick={uploadStory} disabled={!storyFile || storyUploading} className="btn-primary w-full disabled:opacity-40 text-sm">
                                {storyUploading ? 'Uploading...' : 'Share Story'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Upload Success Toast */}
            <AnimatePresence>
                {storySuccess && (
                    <motion.div
                        className="fixed top-20 left-1/2 z-[110] flex items-center gap-2 px-5 py-3 rounded-2xl glass-strong"
                        style={{ color: '#22c55e' }}
                        initial={{ opacity: 0, y: -30, x: '-50%', scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, x: '-50%', scale: [0.8, 1.1, 0.95, 1] }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                        <CheckCircle size={18} />
                        <span className="text-sm font-semibold">Story shared!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full-Screen Story Viewer */}
            <AnimatePresence>
                {viewingStory && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer"
                        style={{ background: 'rgba(0,0,0,0.95)' }}
                        onClick={() => { setViewingStory(null); if (storyTimerRef.current) clearTimeout(storyTimerRef.current); }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Progress bar */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
                            <div className="h-full rounded-r story-progress-bar" style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />
                        </div>

                        {/* Header */}
                        <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-10">
                            <img
                                src={getImageUrl(viewingStory.avatar_url) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${viewingStory.username}`}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                                style={{ border: '2px solid white' }}
                            />
                            <span className="text-white text-sm font-semibold">{viewingStory.display_name || viewingStory.username}</span>
                            <button onClick={(e) => { e.stopPropagation(); setViewingStory(null); if (storyTimerRef.current) clearTimeout(storyTimerRef.current); }} className="ml-auto bg-transparent border-none text-white text-xl cursor-pointer">✕</button>
                        </div>

                        {/* Story image */}
                        <motion.img
                            src={getImageUrl(viewingStory.stories?.[0]?.image_url)}
                            alt="Story"
                            className="max-w-full max-h-[80vh] rounded-2xl object-contain"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
