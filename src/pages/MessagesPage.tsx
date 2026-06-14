import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Send, X,
  Edit2, Trash2, Pin, Check, CheckCheck,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, doc, getDoc,
  updateDoc, setDoc, getDocs, where
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
  edited?: boolean;
  deleted?: boolean;
  pinned?: boolean;
  reactions?: Record<string, string[]>;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: any;
  [key: string]: any;
}

interface UserResult {
  uid: string;
  displayName: string;
  role: string;
}

interface CurrentUser {
  uid: string;
  displayName: string;
}

// ── Emoji reactions ────────────────────────────────────────────────────────
const REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '💯', '⚽'];

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({
  message, isMine, chatId, currentUserId,
  onPin, isPinned
}: {
  message: Message;
  isMine: boolean;
  chatId: string;
  currentUserId: string;
  onPin: (msgId: string) => void;
  isPinned: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setShowActions(true), 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleReact = async (emoji: string) => {
    const msgRef = doc(db, 'chats', chatId, 'messages', message.id);
    const reactions: Record<string, string[]> = { ...(message.reactions || {}) };
    const users = reactions[emoji] || [];
    const alreadyReacted = users.includes(currentUserId);
    if (alreadyReacted) {
      reactions[emoji] = users.filter(id => id !== currentUserId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, currentUserId];
    }
    await updateDoc(msgRef, { reactions });
    setShowActions(false);
  };

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.text) { setEditing(false); return; }
    await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
      text: editText.trim(),
      edited: true,
    });
    setEditing(false);
    setShowActions(false);
  };

  const handleDelete = async () => {
    await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
      deleted: true,
      text: 'This message was deleted',
    });
    setShowActions(false);
  };

  const totalReactions = Object.entries(message.reactions || {})
    .filter(([, users]) => (users as string[]).length > 0) as [string, string[]][];

  if (message.deleted) {
    return (
      <div className={cn('flex mb-2', isMine ? 'justify-end' : 'justify-start')}>
        <p className="text-xs text-[#71767b] italic px-3 py-1.5 bg-[#111] rounded-2xl border border-[#1f1f1f]">
          This message was deleted
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex mb-3', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] relative')}>
        {/* Pinned indicator */}
        {isPinned && (
          <div className={cn('flex items-center gap-1 mb-1', isMine ? 'justify-end' : 'justify-start')}>
            <Pin className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-semibold">Pinned</span>
          </div>
        )}

        {/* Bubble */}
        <div
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          className={cn('px-3.5 py-2.5 rounded-2xl cursor-pointer select-none',
            isMine ? 'bg-[#ef4444] text-white rounded-br-sm' : 'bg-[#1f1f1f] text-[#e7e9ea] rounded-bl-sm'
          )}>
          {editing ? (
            <div className="flex items-center gap-2 min-w-[150px]">
              <input value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEdit()}
                autoFocus
                className="flex-1 bg-transparent outline-none text-sm text-white"
              />
              <button onClick={handleEdit} className="shrink-0">
                <Check className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setEditing(false)} className="shrink-0">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{message.text}</p>
          )}
          {message.edited && !editing && (
            <p className={cn('text-[10px] mt-0.5', isMine ? 'text-white/60' : 'text-[#71767b]')}>edited</p>
          )}
        </div>

        {/* Reactions display */}
        {totalReactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            {totalReactions.map(([emoji, users]) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all',
                  users.includes(currentUserId)
                    ? 'bg-[#ef4444]/20 border border-[#ef4444]/30'
                    : 'bg-white/5 border border-white/10'
                )}>
                <span>{emoji}</span>
                <span className="text-[10px] text-white font-bold">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time + read receipt */}
        <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
          <p className="text-[10px] text-[#71767b]">
            {message.createdAt?.toDate
              ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </p>
          {isMine && <CheckCheck className="w-3 h-3 text-[#71767b]" />}
        </div>

        {/* Action menu */}
        <AnimatePresence>
          {showActions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                className={cn(
                  'absolute z-50 bottom-full mb-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-xl',
                  isMine ? 'right-0' : 'left-0'
                )}>
                {/* Emoji row */}
                <div className="flex items-center gap-1 px-3 py-2.5 border-b border-[#1f1f1f]">
                  {REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleReact(emoji)}
                      className="text-xl hover:scale-125 transition-transform active:scale-95 p-0.5">
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="py-1 min-w-[160px]">
                  {isMine && (
                    <button onClick={() => { setEditing(true); setShowActions(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                      <Edit2 className="w-4 h-4 text-[#71767b]" />
                      <span className="text-sm text-white">Edit</span>
                    </button>
                  )}
                  <button onClick={() => { onPin(message.id); setShowActions(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                    <Pin className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-white">{isPinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                  {isMine && (
                    <button onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                      <Trash2 className="w-4 h-4 text-[#ef4444]" />
                      <span className="text-sm text-[#ef4444]">Delete</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Chat View ──────────────────────────────────────────────────────────────
function ChatView({ chatId, otherUserName, currentUser, onBack }: {
  chatId: string;
  otherUserName: string;
  currentUser: CurrentUser;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = firestoreQuery(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      const pinned = msgs.find(m => m.pinned);
      if (pinned) { setPinnedMessageId(pinned.id); setPinnedMessage(pinned); }
      else { setPinnedMessageId(null); setPinnedMessage(null); }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    updateDoc(doc(db, 'chats', chatId), {
      [`unread_${currentUser.uid}`]: 0,
    }).catch(() => {});
  }, [chatId, currentUser.uid]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: msgText,
        createdAt: serverTimestamp(),
        deleted: false,
        edited: false,
        reactions: {},
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: msgText,
        lastMessageTime: serverTimestamp(),
        [`unread_${currentUser.uid}`]: 0,
      });
    } catch {
      setText(msgText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handlePin = async (msgId: string) => {
    const isCurrentlyPinned = pinnedMessageId === msgId;
    for (const msg of messages) {
      if (msg.pinned) {
        await updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { pinned: false });
      }
    }
    if (!isCurrentlyPinned) {
      await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { pinned: true });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-black/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <Avatar name={otherUserName} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{otherUserName}</p>
          <p className="text-[10px] text-green-400">Active now</p>
        </div>
        <button className="p-1.5 rounded-full hover:bg-white/10">
          <MoreHorizontal className="w-5 h-5 text-[#71767b]" />
        </button>
      </div>

      {/* Pinned message */}
      <AnimatePresence>
        {pinnedMessage && !pinnedMessage.deleted && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 shrink-0">
            <Pin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-400 truncate flex-1">
              <span className="font-bold">Pinned: </span>{pinnedMessage.text}
            </p>
            <button onClick={() => handlePin(pinnedMessage.id)}>
              <X className="w-3.5 h-3.5 text-yellow-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar name={otherUserName} size="lg" />
            <p className="font-bold text-white mt-3 mb-1">{otherUserName}</p>
            <p className="text-xs text-[#71767b]">Start a conversation</p>
          </div>
        ) : messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === currentUser.uid}
            chatId={chatId}
            currentUserId={currentUser.uid}
            onPin={handlePin}
            isPinned={pinnedMessageId === msg.id}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/30 px-4 py-2.5 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] transition-all"
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="w-9 h-9 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] transition-colors disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Messages Page ──────────────────────────────────────────────────────────
export function MessagesPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setCurrentUser({
          uid: user.uid,
          displayName: userDoc.data()?.displayName || 'User',
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Chat)));
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const handleSearch = async (query: string) => {
    setSearchText(query);
    if (!query.trim() || !currentUser) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const results = snap.docs
        .filter(d => d.id !== currentUser.uid)
        .map(d => ({ uid: d.id, ...d.data() } as UserResult))
        .filter(u => u.displayName?.toLowerCase().includes(query.toLowerCase()));
      setSearchResults(results.slice(0, 10));
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const startChat = async (otherUser: UserResult) => {
    if (!currentUser) return;
    setShowSearch(false);
    setSearchText('');
    setSearchResults([]);

    const existingChat = chats.find(c => c.participants.includes(otherUser.uid));
    if (existingChat) {
      setActiveChat({ id: existingChat.id, name: otherUser.displayName });
      return;
    }

    const chatId = [currentUser.uid, otherUser.uid].sort().join('_');
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentUser.uid, otherUser.uid],
      participantNames: {
        [currentUser.uid]: currentUser.displayName,
        [otherUser.uid]: otherUser.displayName,
      },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      [`unread_${currentUser.uid}`]: 0,
      [`unread_${otherUser.uid}`]: 0,
    });
    setActiveChat({ id: chatId, name: otherUser.displayName });
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

  if (activeChat && currentUser) {
    return (
      <ChatView
        chatId={activeChat.id}
        otherUserName={activeChat.name}
        currentUser={currentUser}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div className="pb-20">
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Messages</h1>
            <button onClick={() => setShowSearch(s => !s)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors">
              {showSearch ? <X className="w-5 h-5 text-white" /> : <Search className="w-5 h-5 text-[#71767b]" />}
            </button>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center gap-2 bg-[#111] rounded-full px-4 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all mb-2">
                  <Search className="w-4 h-4 text-[#71767b] shrink-0" />
                  <input value={searchText} onChange={e => handleSearch(e.target.value)}
                    placeholder="Search people to message..."
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                  {searching && <div className="w-3.5 h-3.5 border-2 border-[#71767b] border-t-transparent rounded-full animate-spin" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search results */}
      <AnimatePresence>
        {showSearch && searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="px-4 py-2 border-b border-[#1f1f1f]">
              <p className="text-xs text-[#71767b] font-semibold uppercase">People</p>
            </div>
            {searchResults.map(user => (
              <button key={user.uid} onClick={() => startChat(user)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
                <Avatar name={user.displayName} size="sm" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-white">{user.displayName}</p>
                  <p className="text-xs text-[#71767b] capitalize">{user.role || 'user'}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat list */}
      {chats.length === 0 && !showSearch ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-16 h-16 bg-[#ef4444]/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-[#ef4444]" />
          </div>
          <p className="font-bold text-white mb-1">No messages yet</p>
          <p className="text-sm text-[#71767b] mb-4">Search for someone to start a conversation</p>
          <button onClick={() => setShowSearch(true)}
            className="px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white">
            Start a Conversation
          </button>
        </div>
      ) : (
        chats.map((chat, i) => {
          if (!currentUser) return null;
          const otherId = chat.participants.find((id: string) => id !== currentUser.uid) || '';
          const otherName = chat.participantNames?.[otherId] || 'User';
          const unread = chat[`unread_${currentUser.uid}`] || 0;

          return (
            <motion.div key={chat.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setActiveChat({ id: chat.id, name: otherName })}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors">
              <div className="relative shrink-0">
                <Avatar name={otherName} size="md" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className={cn('text-sm font-bold truncate', unread > 0 ? 'text-white' : 'text-[#e7e9ea]')}>
                    {otherName}
                  </p>
                  <span className="text-[11px] text-[#71767b] shrink-0 ml-2">
                    {timeAgo(chat.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs truncate flex-1', unread > 0 ? 'text-white font-semibold' : 'text-[#71767b]')}>
                    {chat.lastMessage || 'Start chatting'}
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
        })
      )}
    </div>
  );
}
