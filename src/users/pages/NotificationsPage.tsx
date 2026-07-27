import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Heart, MessageCircle, Repeat2, Zap, Target, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, query as firestoreQuery,
  where, orderBy, doc, updateDoc, writeBatch
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'match' | 'prediction' | 'tipster' | 'tip_result' | 'welcome' | 'new_post';
  user?: string;
  text: string;
  time: string;
  read: boolean;
  category: 'all' | 'matches' | 'mentions' | 'predictions';
  navigateTo?: string;
}

function timeAgo(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getCategory(type: string): Notification['category'] {
  if (['like', 'comment', 'repost', 'follow', 'new_post'].includes(type)) return 'mentions';
  if (['match'].includes(type)) return 'matches';
  if (['prediction', 'tipster', 'tip_result'].includes(type)) return 'predictions';
  return 'all';
}

function getNavigation(type: string): string {
  if (['like', 'comment', 'repost', 'follow', 'new_post', 'welcome'].includes(type)) return '/';
  if (type === 'match') return '/live';
  if (['prediction', 'tipster', 'tip_result'].includes(type)) return '/predictions';
  return '/';
}

function NotifIcon({ type }: { type: Notification['type'] }) {
  const map: Record<string, { icon: any; color: string }> = {
    like:       { icon: Heart,          color: 'bg-pink-500/20 text-pink-400' },
    comment:    { icon: MessageCircle,  color: 'bg-blue-500/20 text-blue-400' },
    repost:     { icon: Repeat2,        color: 'bg-green-500/20 text-green-400' },
    follow:     { icon: Zap,            color: 'bg-[#ef4444]/20 text-[#ef4444]' },
    match:      { icon: Zap,            color: 'bg-yellow-500/20 text-yellow-400' },
    prediction: { icon: Target,         color: 'bg-purple-500/20 text-purple-400' },
    tipster:    { icon: Zap,            color: 'bg-[#ef4444]/20 text-[#ef4444]' },
    tip_result: { icon: Target,         color: 'bg-green-500/20 text-green-400' },
    welcome:    { icon: Zap,            color: 'bg-[#ef4444]/20 text-[#ef4444]' },
    new_post:   { icon: MessageCircle,  color: 'bg-blue-500/20 text-blue-400' },
  };
  const { icon: Icon, color } = map[type] || map.welcome;
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', color)}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'matches' | 'mentions' | 'predictions'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'matches', label: 'Matches' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'predictions', label: 'Predictions' },
  ] as const;

  useEffect(() => {
    if (!user?.id) return;
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const notifs: Notification[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type || 'welcome',
          user: data.fromUserName,
          text: data.message || data.title || '',
          time: timeAgo(data.createdAt),
          read: data.read || false,
          category: getCategory(data.type),
          navigateTo: getNavigation(data.type),
        };
      });
      setNotifications(notifs);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.id]);

  const filtered = notifications.filter(n =>
    activeTab === 'all' ? true : n.category === activeTab
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
    if (notif.navigateTo) navigate(notif.navigateTo);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  return (
    <div>
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Notifications</h1>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#ef4444] font-semibold hover:underline">
                <Check className="w-3.5 h-3.5" /> Mark all read ({unreadCount})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <Bell className="w-12 h-12 text-[#71767b] mb-3" />
              <p className="font-bold text-white mb-1">No notifications</p>
              <p className="text-sm text-[#71767b]">You're all caught up!</p>
            </div>
          ) : filtered.map((notif, i) => (
            <motion.div key={notif.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => handleClick(notif)}
              className={cn('flex items-start gap-3 px-4 py-3 border-b border-[#1f1f1f] cursor-pointer transition-colors hover:bg-white/[0.02]',
                !notif.read && 'bg-[#ef4444]/[0.03] border-l-2 border-l-[#ef4444]'
              )}>
              <NotifIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#e7e9ea] leading-relaxed">
                  {notif.user && <span className="font-bold text-white">{notif.user} </span>}
                  {notif.text}
                </p>
                <p className="text-xs text-[#71767b] mt-0.5">{notif.time}</p>
              </div>
              {!notif.read && <div className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0 mt-1.5" />}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
