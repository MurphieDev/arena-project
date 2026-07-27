import { useState, useEffect } from 'react';
import type { Chat as ChatType } from './types';

import { Conversation } from './Conversation';
import { ChatWindow } from './ChatWindow';
import { db } from '../../../lib/firebase';
import {
  collection, onSnapshot, query as firestoreQuery,
  orderBy, where, doc, setDoc, getDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { useAuth } from '../../../auth/hooks/AuthContext';

interface ChatProps {
  isDesktop: boolean;
  activeChat: ChatType | null;
  onSelectChat: (chat: ChatType | null) => void;
  onBack: () => void;
}

export function Chat({ isDesktop, activeChat, onSelectChat, onBack }: ChatProps) {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const userName = currentUser?.name || currentUser?.displayName || '';
  const [chats, setChats] = useState<ChatType[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real chats from Firestore
  useEffect(() => {
    if (!userId) return;

    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const chatList: any[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        const otherId = (data.participants || []).find((id: string) => id !== userId) || '';
        const otherName = data.participantNames?.[otherId] || 'User';

        // Get other user's online status
        let online = false;
        let lastSeen = '';
        try {
          const otherDoc = await getDoc(doc(db, 'users', otherId));
          if (otherDoc.exists()) {
            const otherData = otherDoc.data();
            online = otherData.online || false;
            if (!online && otherData.lastSeen?.toDate) {
              const diff = Math.floor((Date.now() - otherData.lastSeen.toDate().getTime()) / 1000);
              if (diff < 3600) lastSeen = `${Math.floor(diff / 60)}m ago`;
              else if (diff < 86400) lastSeen = `${Math.floor(diff / 3600)}h ago`;
              else lastSeen = `${Math.floor(diff / 86400)}d ago`;
            }
          }
        } catch { /* ignore */ }

        // Format time
        const formatTime = (ts: any) => {
          if (!ts) return '';
          const date = ts.toDate?.() || new Date(ts);
          const diff = Math.floor((Date.now() - date.getTime()) / 1000);
          if (diff < 60) return 'now';
          if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
          if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
          return `${Math.floor(diff / 86400)}d ago`;
        };

        chatList.push({
          id: d.id,
          name: otherName,
          handle: `@${otherName.toLowerCase().replace(/\s/g, '')}`,
          lastMessage: data.lastMessage || 'Start chatting',
          time: formatTime(data.lastMessageTime),
          unread: data[`unread_${userId}`] || 0,
          online,
          lastSeen,
          messages: [], // Messages are loaded separately in ChatWindow
          otherId,
        });
      }

      setChats(chatList);
      setLoading(false);

      // Auto-select first chat on desktop
      if (isDesktop && !activeChat && chatList.length > 0) {
        onSelectChat(chatList[0]);
      }
    });

    return () => unsub();
  }, [userId, isDesktop]);

  // Track own online status
  useEffect(() => {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    setDoc(userRef, { online: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    const handleVisibility = () => {
      if (document.hidden) {
        setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      } else {
        setDoc(userRef, { online: true }, { merge: true }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };
  }, [userId]);

  // Start new chat with a user
  const handleNewChat = async (otherId: string, otherName: string) => {
    if (!userId) return;
    const chatId = [userId, otherId].sort().join('_');
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      await setDoc(doc(db, 'chats', chatId), {
        participants: [userId, otherId],
        participantNames: { [userId]: userName, [otherId]: otherName },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        [`unread_${userId}`]: 0,
        [`unread_${otherId}`]: 0,
      });
    }
    const newChat: ChatType = {
      id: chatId, name: otherName,
      handle: `@${otherName.toLowerCase().replace(/\s/g, '')}`,
      lastMessage: '', time: 'now', unread: 0, online: false, messages: [],
      otherId,
    };
    onSelectChat(newChat);
  };

  if (activeChat && !isDesktop) {
    return (
      <ChatWindow
        chat={activeChat}
        onBack={onBack}
        currentUserId={userId || ''}
        currentUserName={user?.name || ''}
      />
    );
  }

  return (
    <div className="h-full flex overflow-hidden rounded-[28px] border border-[#1f1f1f] bg-[#070708] shadow-lg">
      <Conversation
        chats={chats}
        loading={loading}
        activeChat={activeChat}
        onSelectChat={onSelectChat}
        onNewChat={handleNewChat}
        currentUserId={userId || ''}
      />
      <section className="hidden md:flex flex-1 flex-col bg-[#0b141a]">
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            onBack={() => onSelectChat(null)}
            currentUserId={userId || ''}
            currentUserName={user?.name || ''}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#71767b]">
            {loading ? (
              <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
            ) : (
              <p className="text-sm">Select a conversation to view the thread.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
