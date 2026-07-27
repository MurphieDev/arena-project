import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Chat } from './types';
import { Avatar } from './Avatar';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface ConversationListProps {
  chats: Chat[];
  loading: boolean;
  activeChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onNewChat: (otherId: string, otherName: string) => void;
  currentUserId: string;
}

export function Conversation({ chats, loading, activeChat, onSelectChat, onNewChat, currentUserId }: ConversationListProps) {
  const [query, setQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const filtered = chats.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.handle.toLowerCase().includes(query.toLowerCase())
  );

  const handleUserSearch = async (q: string) => {
    setUserSearch(q);
    if (!q.trim()) { setUserResults([]); return; }
    setSearching(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const results = snap.docs
        .filter(d => d.id !== currentUserId)
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter((u: any) => u.displayName?.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 8);
      setUserResults(results);
    } catch { setUserResults([]); }
    setSearching(false);
  };

  return (
    <aside className="w-full md:w-[380px] border-r border-[#1f1f1f] bg-[#08090b] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1f1f1f] bg-black/80 backdrop-blur-sm px-4 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-3.5">
          <button onClick={() => navigate('/')}
            className="p-1 -ml-1 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-white tracking-tight flex-1">Messages</h1>
          <button onClick={() => setShowNewChat(s => !s)}
            className="p-2 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors"
            title="New message">
            {showNewChat ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* New chat search */}
        <AnimatePresence>
          {showNewChat && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3">
              <div className="flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-full px-4 py-2 mb-2">
                <Search className="w-4 h-4 text-[#ef4444] shrink-0" />
                <input value={userSearch} onChange={e => handleUserSearch(e.target.value)}
                  placeholder="Search people to message..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                />
                {searching && <Loader2 className="w-3.5 h-3.5 text-[#ef4444] animate-spin" />}
              </div>
              {userResults.length > 0 && (
                <div className="bg-[#0d0d0f] border border-[#1f1f1f] rounded-xl overflow-hidden">
                  {userResults.map((u: any) => (
                    <button key={u.uid} onClick={() => { onNewChat(u.uid, u.displayName); setShowNewChat(false); setUserSearch(''); setUserResults([]); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                      <Avatar name={u.displayName} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-white">{u.displayName}</p>
                        <p className="text-xs text-[#71767b] capitalize">{u.role || 'user'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search existing chats */}
        <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2.5 border border-[#1f1f1f] focus-within:border-[#ef4444]/40 transition-all duration-200">
          <Search className="w-4 h-4 text-[#71767b] shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-white/10">
              <X className="w-4 h-4 text-[#71767b]" />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <p className="text-5xl mb-4">💬</p>
              <p className="font-bold text-white mb-1.5 text-base">No messages yet</p>
              <p className="text-sm text-[#71767b] leading-relaxed">Tap + to start a conversation</p>
            </div>
          ) : filtered.map((chat, i) => (
            <motion.button key={chat.id} type="button"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              onClick={() => onSelectChat(chat)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 border-b border-[#1f1f1f] text-left transition-colors duration-200',
                activeChat?.id === chat.id ? 'bg-[#ef4444]/8 border-b border-[#ef4444]/20' : 'hover:bg-white/[0.03]'
              )}>
              <Avatar name={chat.name} online={chat.online} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className="font-bold text-sm text-white truncate">{chat.name}</p>
                  <span className="text-[10px] text-[#71767b] shrink-0 font-medium">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 min-h-5">
                  <p className={cn('text-xs truncate flex-1 leading-snug', chat.unread > 0 ? 'text-white font-semibold' : 'text-[#71767b]')}>
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="min-w-[20px] h-5 bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1.5 shrink-0 shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
