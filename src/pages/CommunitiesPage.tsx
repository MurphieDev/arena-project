import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, Users, Plus, Send,
  X, MessageCircle, Heart, Share, MoreHorizontal,
  Lock, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, doc, getDoc,
  updateDoc, setDoc, deleteDoc, increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  category: string;
  emoji: string;
  createdBy: string;
  createdByName: string;
  isPrivate: boolean;
  createdAt: any;
}

interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: any;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface CurrentUser {
  uid: string;
  displayName: string;
  email: string;
}

// ── Categories ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All', emoji: '🌍' },
  { label: 'Football', emoji: '⚽' },
  { label: 'Basketball', emoji: '🏀' },
  { label: 'Tennis', emoji: '🎾' },
  { label: 'Cricket', emoji: '🏏' },
  { label: 'Rugby', emoji: '🏉' },
  { label: 'F1', emoji: '🏎️' },
  { label: 'Boxing', emoji: '🥊' },
  { label: 'General', emoji: '🏆' },
];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Create Community Modal ─────────────────────────────────────────────────
function CreateCommunityModal({ currentUser, onClose }: {
  currentUser: CurrentUser;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: '', description: '', category: 'Football', emoji: '⚽', isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      setError('Name and description are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const communityRef = await addDoc(collection(db, 'communities'), {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        emoji: form.emoji,
        isPrivate: form.isPrivate,
        members: 1,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
        createdAt: serverTimestamp(),
      });

      // Auto-join creator
      await setDoc(doc(db, 'communities', communityRef.id, 'members', currentUser.uid), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        joinedAt: serverTimestamp(),
        role: 'admin',
      });

      onClose();
    } catch (e) {
      setError('Failed to create community. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const categoryEmojis: Record<string, string> = {
    Football: '⚽', Basketball: '🏀', Tennis: '🎾',
    Cricket: '🏏', Rugby: '🏉', F1: '🏎️', Boxing: '🥊', General: '🏆',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-4 pb-10 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-white text-base">Create Community</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Community Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Premier League Fans"
              className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-[#71767b] mb-1 block">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What is this community about?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none resize-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-[#71767b] mb-2 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.filter(c => c.label !== 'All').map(cat => (
                <button key={cat.label}
                  onClick={() => setForm(f => ({ ...f, category: cat.label, emoji: categoryEmojis[cat.label] || cat.emoji }))}
                  className={cn('p-2 rounded-xl border text-center transition-all',
                    form.category === cat.label ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-white/5 border-white/10'
                  )}>
                  <p className="text-lg">{cat.emoji}</p>
                  <p className="text-[9px] text-[#71767b] mt-0.5">{cat.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-white">Private Community</p>
              <p className="text-xs text-[#71767b]">Only invited members can join</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
              className={cn('w-11 h-6 rounded-full transition-all relative',
                form.isPrivate ? 'bg-[#ef4444]' : 'bg-[#71767b]/40'
              )}>
              <motion.div
                animate={{ x: form.isPrivate ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
              />
            </button>
          </div>

          {error && <p className="text-xs text-[#ef4444] text-center">{error}</p>}

          <button onClick={handleCreate} disabled={loading || !form.name || !form.description}
            className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Community 🚀'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Community Detail ───────────────────────────────────────────────────────
function CommunityDetail({ community, currentUser, onBack }: {
  community: Community;
  currentUser: CurrentUser | null;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'feed' | 'chat'>('feed');
  const [joined, setJoined] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check if user is a member
  useEffect(() => {
    if (!currentUser) { setCheckingMembership(false); return; }
    const checkMembership = async () => {
      const memberDoc = await getDoc(doc(db, 'communities', community.id, 'members', currentUser.uid));
      setJoined(memberDoc.exists());
      setCheckingMembership(false);
    };
    checkMembership();
  }, [community.id, currentUser?.uid]);

  // Load posts
  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'communities', community.id, 'posts'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost)));
    });
    return () => unsub();
  }, [community.id]);

  // Load messages
  useEffect(() => {
    if (!joined) return;
    const q = firestoreQuery(
      collection(db, 'communities', community.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return () => unsub();
  }, [community.id, joined]);

  useEffect(() => {
    if (tab === 'chat') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [tab, messages]);

  const handleJoin = async () => {
    if (!currentUser) return;
    if (joined) {
      await deleteDoc(doc(db, 'communities', community.id, 'members', currentUser.uid));
      await updateDoc(doc(db, 'communities', community.id), { members: increment(-1) });
      setJoined(false);
    } else {
      await setDoc(doc(db, 'communities', community.id, 'members', currentUser.uid), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        joinedAt: serverTimestamp(),
        role: 'member',
      });
      await updateDoc(doc(db, 'communities', community.id), { members: increment(1) });
      setJoined(true);
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() || !currentUser || !joined) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'communities', community.id, 'posts'), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        content: postContent.trim(),
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
      });
      setPostContent('');
    } catch (e) {
      console.error('Post failed:', e);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const newLiked = new Set(likedPosts);
    const postRef = doc(db, 'communities', community.id, 'posts', postId);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
      await updateDoc(postRef, { likes: increment(-1) });
    } else {
      newLiked.add(postId);
      await updateDoc(postRef, { likes: increment(1) });
    }
    setLikedPosts(newLiked);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentUser || !joined) return;
    const text = chatInput.trim();
    setChatInput('');
    await addDoc(collection(db, 'communities', community.id, 'messages'), {
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text,
      createdAt: serverTimestamp(),
    });
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-black/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-lg shrink-0">
          {community.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-black text-sm text-white truncate">{community.name}</p>
            {community.isPrivate && <Lock className="w-3 h-3 text-[#71767b] shrink-0" />}
          </div>
          <p className="text-[11px] text-[#71767b]">{community.members.toLocaleString()} members</p>
        </div>
        {!checkingMembership && (
          <button onClick={handleJoin}
            className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
              joined
                ? 'border border-white/20 text-[#71767b] hover:border-[#ef4444]/50 hover:text-[#ef4444]'
                : 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white'
            )}>
            {joined ? '✓ Joined' : 'Join'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] shrink-0">
        {(['feed', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
              tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
            )}>
            {t === 'feed' ? '📰 Feed' : '💬 Group Chat'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Feed */}
          {tab === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Description */}
              <div className="px-4 py-3 border-b border-[#1f1f1f] bg-[#ef4444]/5">
                <p className="text-xs text-[#71767b] leading-relaxed">{community.description}</p>
                <p className="text-[10px] text-[#71767b] mt-1">Created by {community.createdByName}</p>
              </div>

              {/* Post composer */}
              {joined && (
                <div className="px-4 py-3 border-b border-[#1f1f1f]">
                  <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    placeholder="Share something with the community..."
                    rows={2}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#71767b] outline-none resize-none transition-all mb-2"
                  />
                  <button onClick={handlePost} disabled={posting || !postContent.trim()}
                    className="px-4 py-2 bg-[#ef4444] rounded-full text-xs font-bold text-white disabled:opacity-40 transition-all">
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              )}

              {/* Posts */}
              {posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">📰</p>
                  <p className="font-bold text-sm text-white">No posts yet</p>
                  <p className="text-xs text-[#71767b] mt-1">
                    {joined ? 'Be the first to post!' : 'Join to start posting'}
                  </p>
                </div>
              ) : posts.map((post, i) => (
                <motion.div key={post.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={post.userName} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-white">{post.userName}</p>
                      <p className="text-[10px] text-[#71767b]">{timeAgo(post.createdAt)}</p>
                    </div>
                    <button className="ml-auto p-1 rounded-full hover:bg-white/5 text-[#71767b]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-[#71767b]">
                    <button onClick={() => handleLike(post.id)}
                      className={cn('flex items-center gap-1.5 text-xs transition-colors',
                        likedPosts.has(post.id) ? 'text-[#ef4444]' : 'hover:text-[#ef4444]'
                      )}>
                      <Heart className={cn('w-4 h-4', likedPosts.has(post.id) && 'fill-[#ef4444]')} />
                      {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors">
                      <MessageCircle className="w-4 h-4" />{post.comments}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs hover:text-[#ef4444] transition-colors">
                      <Share className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Chat */}
          {tab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!joined ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                  <Lock className="w-12 h-12 text-[#71767b] mb-3" />
                  <p className="font-bold text-white mb-1">Members Only</p>
                  <p className="text-sm text-[#71767b] mb-4">Join this community to access the group chat</p>
                  <button onClick={handleJoin}
                    className="px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white">
                    Join Community
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-3xl mb-2">💬</p>
                      <p className="text-sm font-bold text-white">No messages yet</p>
                      <p className="text-xs text-[#71767b] mt-1">Be the first to say something!</p>
                    </div>
                  ) : messages.map((msg, i) => {
                    const isMine = msg.senderId === currentUser?.uid;
                    return (
                      <motion.div key={msg.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}>
                        {!isMine && <Avatar name={msg.senderName} size="sm" />}
                        <div className={cn('max-w-[75%]', isMine ? 'items-end' : 'items-start')}>
                          {!isMine && <p className="text-[10px] text-[#71767b] mb-0.5 ml-1">{msg.senderName}</p>}
                          <div className={cn('px-3 py-2 rounded-2xl text-sm',
                            isMine ? 'bg-[#ef4444] text-white rounded-br-sm' : 'bg-[#111] text-[#e7e9ea] border border-[#1f1f1f] rounded-bl-sm'
                          )}>
                            {msg.text}
                          </div>
                          <p className="text-[10px] text-[#71767b] mt-0.5 mx-1">{timeAgo(msg.createdAt)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat input */}
      {tab === 'chat' && joined && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message the community..."
            className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-2.5 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] focus:border-[#ef4444]/30 transition-all"
          />
          <button onClick={sendMessage} disabled={!chatInput.trim()}
            className="w-9 h-9 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] transition-colors disabled:opacity-40 shrink-0">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Communities Page ───────────────────────────────────────────────────────
export function CommunitiesPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Community | null>(null);
  const [tab, setTab] = useState<'discover' | 'joined'>('discover');
  const [activeCategory, setActiveCategory] = useState('All');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setCurrentUser({
          uid: user.uid,
          email: user.email || '',
          displayName: userDoc.data()?.displayName || user.displayName || 'User',
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  // Load all communities
  useEffect(() => {
    const q = firestoreQuery(collection(db, 'communities'), orderBy('members', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setCommunities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Community)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load joined communities
  useEffect(() => {
    if (!currentUser) return;
    const loadJoined = async () => {
      const joined = new Set<string>();
      for (const community of communities) {
        const memberDoc = await getDoc(doc(db, 'communities', community.id, 'members', currentUser.uid));
        if (memberDoc.exists()) joined.add(community.id);
      }
      setJoinedIds(joined);
    };
    if (communities.length > 0) loadJoined();
  }, [communities, currentUser?.uid]);

  if (selected) {
    return (
      <CommunityDetail
        community={selected}
        currentUser={currentUser}
        onBack={() => setSelected(null)}
      />
    );
  }

  const filtered = communities.filter(c => {
    const q = query.toLowerCase();
    const matchesQuery = c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || c.category === activeCategory;
    const matchesTab = tab === 'discover' ? true : joinedIds.has(c.id);
    return matchesQuery && matchesCategory && matchesTab;
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Communities</h1>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] rounded-full text-xs font-bold text-white hover:bg-[#dc2626] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all mb-3">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search communities..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {query && <button onClick={() => setQuery('')}><X className="w-4 h-4 text-[#71767b]" /></button>}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-2">
            {(['discover', 'joined'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
                  tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}>
                {t === 'discover' ? '🔍 Discover' : `✓ Joined (${joinedIds.size})`}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0',
                  activeCategory === cat.label
                    ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                    : 'text-[#71767b] hover:text-white bg-white/5'
                )}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab + activeCategory} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <Users className="w-12 h-12 text-[#71767b] mb-3" />
                <p className="font-bold text-white mb-1">
                  {tab === 'joined' ? 'No communities joined yet' : 'No communities found'}
                </p>
                <p className="text-sm text-[#71767b]">
                  {tab === 'joined' ? 'Discover and join communities you like' : 'Try a different search or create your own'}
                </p>
                {tab === 'joined' && (
                  <button onClick={() => setTab('discover')}
                    className="mt-4 px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white">
                    Discover Communities
                  </button>
                )}
              </div>
            ) : filtered.map((community, i) => (
              <motion.div key={community.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(community)}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-2xl shrink-0">
                  {community.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm text-white truncate">{community.name}</p>
                    {joinedIds.has(community.id) && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    )}
                    {community.isPrivate && (
                      <Lock className="w-3 h-3 text-[#71767b] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[#71767b] truncate mb-1">{community.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#71767b] flex items-center gap-1">
                      <Users className="w-3 h-3" />{community.members.toLocaleString()}
                    </span>
                    <span className="text-[10px] bg-[#ef4444]/10 text-[#ef4444] px-1.5 py-0.5 rounded-full font-semibold">
                      {community.category}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && currentUser && (
          <CreateCommunityModal currentUser={currentUser} onClose={() => setShowCreate(false)} />
        )}
        {showCreate && !currentUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6"
            onClick={() => setShowCreate(false)}>
            <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 text-center">
              <p className="font-black text-white mb-2">Sign in required</p>
              <p className="text-xs text-[#71767b]">You need to be signed in to create a community</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
