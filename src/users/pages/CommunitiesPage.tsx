import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, Users, Plus, Send,
  X, MessageCircle, Heart, Share, MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CreateCommunity } from '../../components/SharedComponents';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, doc, setDoc,
  deleteDoc, updateDoc, increment, getDoc
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';

// ── Types ─────────────────────────────────────────────────────
interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  category: string;
  emoji: string;
  joined: boolean;
  posts: CommunityPost[];
  messages: ChatMessage[];
}

interface CommunityPost {
  id: string;
  user: string;
  content: string;
  time: string;
  likes: number;
  comments: number;
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  mine: boolean;
}



// ── Avatar ────────────────────────────────────────────────────
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

// ── Community Detail ──────────────────────────────────────────
function CommunityDetail({ community, onBack }: { community: Community; onBack: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'feed' | 'chat'>('feed');
  const [joined, setJoined] = useState(community.joined);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [membersCount, setMembersCount] = useState(community.members);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load real messages
  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'communities', community.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          user: data.senderName || 'User',
          text: data.text || '',
          time: data.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
          mine: data.senderId === user?.id,
        };
      }));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [community.id, user?.id]);

  // Load real posts
  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'communities', community.id, 'posts'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.();
        const diff = date ? Math.floor((Date.now() - date.getTime()) / 1000) : 0;
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
        return { id: d.id, user: data.userName || 'User', content: data.content || '', time, likes: data.likes || 0, comments: data.comments || 0 };
      }));
    });
    return () => unsub();
  }, [community.id]);

  const handleJoin = async () => {
    if (!user?.id) return;
    const newJoined = !joined;
    setJoined(newJoined);
    setMembersCount(n => n + (newJoined ? 1 : -1));
    if (newJoined) {
      await setDoc(doc(db, 'communities', community.id, 'members', user.id), {
        userId: user.id, userName: user.name, joinedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'communities', community.id), { membersCount: increment(1) });
    } else {
      await deleteDoc(doc(db, 'communities', community.id, 'members', user.id));
      await updateDoc(doc(db, 'communities', community.id), { membersCount: increment(-1) });
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user?.id) return;
    const text = chatInput.trim();
    setChatInput('');
    await addDoc(collection(db, 'communities', community.id, 'messages'), {
      senderId: user.id,
      senderName: user.name,
      text,
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-black/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-lg shrink-0">
          {community.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm text-white truncate">{community.name}</p>
          <p className="text-[11px] text-[#71767b]">{membersCount.toLocaleString()} members</p>
        </div>
        <button
          onClick={handleJoin}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0',
            joined
              ? 'border border-white/20 text-[#71767b] hover:border-[#ef4444]/50 hover:text-[#ef4444]'
              : 'bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white'
          )}
        >
          {joined ? 'Joined ✓' : 'Join'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] shrink-0">
        {(['feed', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
              tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
            )}
          >
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
              <div className="px-4 py-3 border-b border-[#1f1f1f] bg-[#ef4444]/5">
                <p className="text-xs text-[#71767b] leading-relaxed">{community.description}</p>
              </div>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={post.user} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-white">{post.user}</p>
                      <p className="text-[10px] text-[#71767b]">{post.time}</p>
                    </div>
                    <button className="ml-auto p-1 rounded-full hover:bg-white/5 text-[#71767b]">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-[#e7e9ea] leading-relaxed mb-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-[#71767b]">
                    <button
                      onClick={() => setLiked(l => ({ ...l, [post.id]: !l[post.id] }))}
                      className={cn('flex items-center gap-1.5 text-xs transition-colors', liked[post.id] ? 'text-[#ef4444]' : 'hover:text-[#ef4444]')}
                    >
                      <Heart className={cn('w-4 h-4', liked[post.id] && 'fill-[#ef4444]')} />
                      {post.likes + (liked[post.id] ? 1 : 0)}
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
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              <div className="flex-1 px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm font-bold text-white">No messages yet</p>
                    <p className="text-xs text-[#71767b] mt-1">Be the first to say something!</p>
                  </div>
                ) : messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn('flex gap-2', msg.mine ? 'justify-end' : 'justify-start')}
                  >
                    {!msg.mine && <Avatar name={msg.user} size="sm" />}
                    <div className={cn('max-w-[75%]', msg.mine ? 'items-end' : 'items-start')}>
                      {!msg.mine && <p className="text-[10px] text-[#71767b] mb-0.5 ml-1">{msg.user}</p>}
                      <div className={cn(
                        'px-3 py-2 rounded-2xl text-sm',
                        msg.mine
                          ? 'bg-[#ef4444] text-white rounded-br-sm'
                          : 'bg-[#111] text-[#e7e9ea] border border-[#1f1f1f] rounded-bl-sm'
                      )}>
                        {msg.text}
                      </div>
                      <p className="text-[10px] text-[#71767b] mt-0.5 mx-1">{msg.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Input */}
      {tab === 'chat' && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message the community..."
            className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-2.5 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] focus:border-[#ef4444]/30 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!chatInput.trim()}
            className="w-9 h-9 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Communities Page ──────────────────────────────────────────
export function CommunitiesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Community | null>(null);
  const [tab, setTab] = useState<'discover' | 'joined'>('discover');
  const [showCreate, setShowCreate] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const q = firestoreQuery(collection(db, 'communities'), orderBy('membersCount', 'desc'));
    const unsub = onSnapshot(q, async snap => {
      const list: Community[] = [];
      for (const d of snap.docs) {
        const data = d.data();
        let isJoined = false;
        if (user?.id) {
          const memberDoc = await getDoc(doc(db, 'communities', d.id, 'members', user.id));
          isJoined = memberDoc.exists();
        }
        list.push({
          id: d.id,
          name: data.name || 'Community',
          description: data.description || '',
          members: data.membersCount || 0,
          category: data.category || 'General',
          emoji: data.emoji || '🌍',
          joined: isJoined,
          posts: [],
          messages: [],
        });
      }
      setCommunities(list);
    });
    return () => unsub();
  }, [user?.id]);

  if (selected) {
    return <CommunityDetail community={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = communities.filter(c => {
    const q = query.toLowerCase();
    const matchesQuery = c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchesTab = tab === 'discover' ? true : c.joined;
    return matchesQuery && matchesTab;
  });

  const handleCreate = async (data: { name: string; description: string; category: string; type: string }) => {
    if (!user?.id) return;
    const emojis: Record<string, string> = {
      Football: '⚽', Basketball: '🏀', Tennis: '🎾', F1: '🏎️',
      Cricket: '🏏', Rugby: '🏉', MMA: '🥊', General: '🌍',
    };
    const newDocRef = await addDoc(collection(db, 'communities'), {
      name: data.name,
      description: data.description,
      category: data.category,
      emoji: emojis[data.category] ?? '🌍',
      membersCount: 1,
      type: data.type || 'public',
      createdBy: user.id,
      createdByName: user.name,
      createdAt: serverTimestamp(),
    });
    // Auto-join creator
    await setDoc(doc(db, 'communities', newDocRef.id, 'members', user.id), {
      userId: user.id, userName: user.name, joinedAt: serverTimestamp(),
    });
    setShowCreate(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Communities</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] rounded-full text-xs font-bold text-white hover:bg-[#dc2626] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all mb-3">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search communities..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X className="w-4 h-4 text-[#71767b]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(['discover', 'joined'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
                  tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}
              >
                {t === 'discover' ? '🔍 Discover' : `✓ Joined (${communities.filter(c => c.joined).length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <Users className="w-12 h-12 text-[#71767b] mb-3" />
              <p className="font-bold text-white mb-1">No communities found</p>
              <p className="text-sm text-[#71767b]">Try a different search or create your own</p>
            </div>
          ) : filtered.map((community, i) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(community)}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-2xl shrink-0">
                {community.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-sm text-white truncate">{community.name}</p>
                  {community.joined && (
                    <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">JOINED</span>
                  )}
                </div>
                <p className="text-xs text-[#71767b] truncate mb-1">{community.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#71767b] flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {community.members.toLocaleString()}
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

      {/* Create Community Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateCommunity
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
