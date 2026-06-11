import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, Send, MoreHorizontal,
  Phone, Video, X, Edit
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, where,
  doc, setDoc, getDoc, getDocs, updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  read: boolean;
}

interface ChatUser {
  uid: string;
  displayName: string;
  role: string;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount: Record<string, number>;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md', online }: { name: string; size?: 'sm' | 'md'; online?: boolean }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm' };
  return (
    <div className="relative shrink-0">
      <div className={cn('rounded-full flex items-center justify-center font-black text-white', sizes[size], color)}>
        {name[0].toUpperCase()}
      </div>
      {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-black" />}
    </div>
  );
}

// ── Chat View ──────────────────────────────────────────────────────────────
function ChatView({ chatId, otherUserName, currentUserId, onBack }: {
  chatId: string;
  otherUserName: string;
  currentUserId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = firestoreQuery(messagesRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!chatId || !currentUserId) return;
    updateDoc(doc(db, 'chats', chatId), {
      [`unreadCount.${currentUserId}`]: 0,
    }).catch(() => {});
  }, [chatId, currentUserId, messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text,
        senderId: currentUserId,
        createdAt: serverTimestamp(),
        read: false,
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-black/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <Avatar name={otherUserName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white">{otherUserName}</p>
          <p className="text-[11px] text-[#71767b]">Arena member</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-white/5 text-[#71767b] hover:text-white transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 text-[#71767b] hover:text-white transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/5 text-[#71767b] hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <p className="text-3xl mb-3">💬</p>
            <p className="font-bold text-sm text-white">Start a conversation</p>
            <p className="text-xs text-[#71767b] mt-1">Send a message to {otherUserName}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                isMine
                  ? 'bg-[#ef4444] text-white rounded-br-sm'
                  : 'bg-[#111] text-[#e7e9ea] border border-[#1f1f1f] rounded-bl-sm'
              )}>
                <p>{msg.text}</p>
                <p className={cn('text-[10px] mt-1', isMine ? 'text-white/60 text-right' : 'text-[#71767b]')}>
                  {timeAgo(msg.createdAt)}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-2.5 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] focus:border-[#ef4444]/30 transition-all"
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="w-9 h-9 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] transition-colors disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── New Message Modal ──────────────────────────────────────────────────────
function NewMessageModal({ currentUserId, onClose, onChatCreated }: {
  currentUserId: string;
  onClose: () => void;
  onChatCreated: (chatId: string, userName: string) => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) { setUsers([]); return; }
    setLoading(true);
    const search = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const results = snap.docs
        .map(d => ({ uid: d.id, ...d.data() } as ChatUser))
        .filter(u =>
          u.uid !== currentUserId &&
          u.displayName?.toLowerCase().includes(searchText.toLowerCase())
        );
      setUsers(results);
      setLoading(false);
    };
    const timeout = setTimeout(search, 500);
    return () => clearTimeout(timeout);
  }, [searchText, currentUserId]);

  const startChat = async (otherUser: ChatUser) => {
    const chatId = [currentUserId, otherUser.uid].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        participants: [currentUserId, otherUser.uid],
        participantNames: {
          [currentUserId]: '',
          [otherUser.uid]: otherUser.displayName,
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: { [currentUserId]: 0, [otherUser.uid]: 0 },
      });
    }
    onChatCreated(chatId, otherUser.displayName);
    onClose();
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
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-4 pb-10 max-h-[80vh] flex flex-col"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-white text-base">New Message</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 mb-4">
          <Search className="w-4 h-4 text-[#71767b]" />
          <input value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
          {!loading && searchText && users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-[#71767b]">No users found</p>
            </div>
          )}
          {!loading && !searchText && (
            <div className="text-center py-8">
              <p className="text-sm text-[#71767b]">Search for a user to message</p>
            </div>
          )}
          {users.map(user => (
            <button key={user.uid} onClick={() => startChat(user)}
              className="w-full flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5 transition-colors">
              <Avatar name={user.displayName || 'U'} size="sm" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{user.displayName}</p>
                <p className="text-xs text-[#71767b]">{user.role === 'tipster' ? '🏆 Tipster' : 'User'}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Messages Page ──────────────────────────────────────────────────────────
export function MessagesPage() {
  const [activeChat, setActiveChat] = useState<{ id: string; userName: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
        }
      }
    });
    return () => unsub();
  }, []);

  // Load chats in real time
  useEffect(() => {
    if (!currentUserId) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUserId),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
      setLoading(false);
    });
    return () => unsub();
  }, [currentUserId]);

  const getOtherUserName = (chat: Chat) => {
    const otherUid = chat.participants.find(p => p !== currentUserId) || '';
    return chat.participantNames?.[otherUid] || 'Unknown';
  };

  const getUnreadCount = (chat: Chat) => {
    return currentUserId ? (chat.unreadCount?.[currentUserId] || 0) : 0;
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const filtered = chats.filter(c =>
    getOtherUserName(c).toLowerCase().includes(searchText.toLowerCase())
  );

  if (activeChat && currentUserId) {
    return (
      <ChatView
        chatId={activeChat.id}
        otherUserName={activeChat.userName}
        currentUserId={currentUserId}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Messages</h1>
            <button onClick={() => setShowNewMessage(true)}
              className="p-2 rounded-full bg-[#ef4444]/10 hover:bg-[#ef4444]/20 transition-colors">
              <Edit className="w-4 h-4 text-[#ef4444]" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
            <Search className="w-4 h-4 text-[#71767b] shrink-0" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
            />
            {searchText && (
              <button onClick={() => setSearchText('')}>
                <X className="w-4 h-4 text-[#71767b] hover:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-bold text-white mb-1">
            {searchText ? 'No conversations found' : 'No messages yet'}
          </p>
          <p className="text-sm text-[#71767b] mb-4">
            {searchText ? 'Try a different search' : 'Start a conversation with a tipster or user'}
          </p>
          {!searchText && (
            <button onClick={() => setShowNewMessage(true)}
              className="px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white">
              New Message
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map((chat, i) => {
            const otherName = getOtherUserName(chat);
            const unread = getUnreadCount(chat);
            return (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setActiveChat({ id: chat.id, userName: otherName })}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <Avatar name={otherName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-sm text-white truncate">{otherName}</p>
                    <span className="text-[11px] text-[#71767b] shrink-0 ml-2">
                      {timeAgo(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-xs truncate flex-1', unread > 0 ? 'text-white font-semibold' : 'text-[#71767b]')}>
                      {chat.lastMessage || 'Start a conversation'}
                    </p>
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shrink-0">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessage && currentUserId && (
          <NewMessageModal
            currentUserId={currentUserId}
            onClose={() => setShowNewMessage(false)}
            onChatCreated={(chatId, userName) => {
              setActiveChat({ id: chatId, userName });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
