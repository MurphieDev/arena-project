import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowLeft, Send, MoreHorizontal,
  Phone, Video, X, MessageSquare, Bell, Bookmark, Slash,
  Eye, AlertCircle, Trash2
} from 'lucide-react';
import type { Message } from './MessageBubble';
import type { Chat } from './types';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { db } from '../../../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, doc, updateDoc, getDoc
} from 'firebase/firestore';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
}

export function ChatWindow({ chat, onBack, currentUserId, currentUserName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load real messages from Firestore
  useEffect(() => {
    if (!chat.id) return;
    const q = firestoreQuery(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        return {
          id: d.id,
          text: data.deleted ? 'This message was deleted' : (data.text || ''),
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mine: data.senderId === currentUserId,
          reaction: data.reaction || undefined,
          deleted: data.deleted || false,
          edited: data.edited || false,
        };
      });
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsub();
  }, [chat.id, currentUserId]);

  // Mark as read when opening chat
  useEffect(() => {
    if (!chat.id || !currentUserId) return;
    updateDoc(doc(db, 'chats', chat.id), {
      [`unread_${currentUserId}`]: 0,
    }).catch(() => {});
    inputRef.current?.focus();
  }, [chat.id, currentUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Send message to Firestore
  const send = async () => {
    if (!input.trim() || sending || !chat.id || !currentUserId) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        senderId: currentUserId,
        senderName: currentUserName,
        text,
        createdAt: serverTimestamp(),
        deleted: false,
        edited: false,
        reaction: null,
      });
      const otherId = (chat as any).otherId || '';
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        [`unread_${currentUserId}`]: 0,
      });
      if (otherId) {
        const chatDoc = await getDoc(doc(db, 'chats', chat.id));
        const currentUnread = chatDoc.data()?.[`unread_${otherId}`] || 0;
        await updateDoc(doc(db, 'chats', chat.id), {
          [`unread_${otherId}`]: currentUnread + 1,
        });
      }
    } catch (e) {
      setInput(text); // Restore if failed
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // React to message in Firestore
  const handleReact = async (messageId: string, emoji: string) => {
    const msgRef = doc(db, 'chats', chat.id, 'messages', messageId);
    const msgDoc = await getDoc(msgRef);
    if (!msgDoc.exists()) return;
    const currentReaction = msgDoc.data().reaction;
    await updateDoc(msgRef, {
      reaction: currentReaction === emoji ? null : emoji,
    });
  };

  // Delete message in Firestore (soft delete)
  const handleDelete = async (messageId: string) => {
    await updateDoc(doc(db, 'chats', chat.id, 'messages', messageId), {
      deleted: true,
      text: 'This message was deleted',
    });
  };

  const handleMenuOption = async (action: string) => {
    switch (action) {
      case 'search': alert('Search in conversation coming soon'); break;
      case 'mute': alert('Notifications muted for this conversation'); break;
      case 'pin': alert('Conversation pinned'); break;
      case 'unread':
        if (chat.id && currentUserId) {
          await updateDoc(doc(db, 'chats', chat.id), { [`unread_${currentUserId}`]: 1 });
        }
        break;
      case 'clear':
        alert('Clear chat coming soon');
        break;
      case 'block': alert(`${chat.name} has been blocked`); break;
      case 'report': alert('Report submitted'); break;
      case 'delete': alert('Delete coming soon'); break;
      default: break;
    }
    setShowMenu(false);
  };

  // Online status display
  const statusText = () => {
    if (chat.online) return '🟢 Online';
    if ((chat as any).lastSeen) return `Last seen ${(chat as any).lastSeen}`;
    return 'Last seen recently';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1f1f1f] bg-black/95 backdrop-blur-md shrink-0 relative z-20">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <Avatar name={chat.name} online={chat.online} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white leading-tight">{chat.name}</p>
          <p className="text-[11px] text-[#71767b] mt-0.5">{statusText()}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => alert(`Calling ${chat.name}...`)}
            className="p-2.5 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors duration-200">
            <Phone className="w-5 h-5" />
          </button>
          <button onClick={() => alert(`Starting video call with ${chat.name}...`)}
            className="p-2.5 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors duration-200">
            <Video className="w-5 h-5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors duration-200">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-[#0d0d0f] border border-[#2a2a30] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="divide-y divide-[#1f1f1f]">
                    <div className="py-2 px-1">
                      {[
                        { action: 'search', icon: Search, label: 'Search in conversation' },
                        { action: 'mute', icon: Bell, label: 'Mute notifications' },
                        { action: 'pin', icon: Bookmark, label: 'Pin chat' },
                        { action: 'unread', icon: MessageSquare, label: 'Mark as unread' },
                        { action: 'archive', icon: Eye, label: 'Archive conversation' },
                      ].map(({ action, icon: Icon, label }) => (
                        <button key={action} onClick={() => handleMenuOption(action)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#e7e9ea] hover:bg-white/10 rounded-lg transition-colors">
                          <Icon className="w-4 h-4 text-[#71767b]" /><span>{label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="py-2 px-1">
                      {[
                        { action: 'block', icon: Slash, label: 'Block user' },
                        { action: 'report', icon: AlertCircle, label: 'Report conversation/user' },
                        { action: 'clear', icon: Trash2, label: 'Clear chat history' },
                        { action: 'delete', icon: X, label: 'Delete conversation' },
                      ].map(({ action, icon: Icon, label }) => (
                        <button key={action} onClick={() => handleMenuOption(action)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#f4212e] hover:bg-red-600/10 rounded-lg transition-colors">
                          <Icon className="w-4 h-4" /><span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar name={chat.name} online={chat.online} />
            <p className="font-bold text-white mt-3 mb-1">{chat.name}</p>
            <p className="text-xs text-[#71767b]">Say hello to start the conversation!</p>
          </div>
        ) : messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            index={i}
            onReact={handleReact}
            onDelete={handleDelete}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3.5 py-3 border-t border-[#1f1f1f] bg-black shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-2.5 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] focus:border-[#ef4444]/40 focus:bg-[#0a0a0a] transition-all duration-200"
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="w-10 h-10 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md">
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
