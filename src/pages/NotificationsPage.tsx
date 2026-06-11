import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Heart, MessageCircle, Repeat2,
  Zap, Trophy, Target, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, query as firestoreQuery, where,
  orderBy, onSnapshot, updateDoc, doc, writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'tip_result' | 'new_follower' | 'new_payment' | 'paid_channel_eligible' | 'channel_join' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  userId: string;
}

// ── Icon map ───────────────────────────────────────────────────────────────
function NotifIcon({ type }: { type: Notification['type'] }) {
  const map: Record<string, { icon: any; color: string }> = {
    like: { icon: Heart, color: 'bg-pink-500/20 text-pink-400' },
    comment: { icon: MessageCircle, color: 'bg-blue-500/20 text-blue-400' },
    follow: { icon: Zap, color: 'bg-[#ef4444]/20 text-[#ef4444]' },
    new_follower: { icon: Zap, color: 'bg-[#ef4444]/20 text-[#ef4444]' },
    tip_result: { icon: Target, color: 'bg-purple-500/20 text-purple-400' },
    new_payment: { icon: Trophy, color: 'bg-green-500/20 text-green-400' },
    paid_channel_eligible: { icon: Trophy, color: 'bg-yellow-500/20 text-yellow-400' },
    channel_join: { icon: Repeat2, color: 'bg-blue-500/20 text-blue-400' },
    general: { icon: Bell, color: 'bg-white/10 text-[#71767b]' },
  };
  const { icon: Icon, color } = map[type] || map.general;
  return (
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', color)}>
      <Icon className="w-4.5 h-4.5" />
    </div>
  );
}

// ── Notifications Page ─────────────────────────────────────────────────────
export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'tips' | 'mentions' | 'payments'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Load notifications in real time
  useEffect(() => {
    if (!currentUserId) return;
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    });
    return () => unsub();
  }, [currentUserId]);

  // Mark single notification as read
  const markAsRead = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!currentUserId) return;
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
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

  const getCategory = (type: string) => {
    if (['like', 'comment', 'follow', 'new_follower'].includes(type)) return 'mentions';
    if (['tip_result', 'paid_channel_eligible'].includes(type)) return 'tips';
    if (['new_payment', 'channel_join'].includes(type)) return 'payments';
    return 'all';
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return getCategory(n.type) === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'tips', label: '🎯 Tips' },
    { key: 'mentions', label: '💬 Mentions' },
    { key: 'payments', label: '💰 Payments' },
  ] as const;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#ef4444] text-white px-2 py-0.5 rounded-full font-black">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-[#ef4444] font-bold hover:underline">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeTab === tab.key
                    ? 'bg-[#ef4444] text-white'
                    : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <Bell className="w-12 h-12 text-[#71767b] mb-3" />
                <p className="font-bold text-white mb-1">No notifications</p>
                <p className="text-sm text-[#71767b]">
                  {activeTab === 'all'
                    ? "You're all caught up!"
                    : `No ${activeTab} notifications yet`}
                </p>
              </div>
            ) : filtered.map((notif, i) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={cn(
                  'flex items-start gap-3 px-4 py-4 border-b border-[#1f1f1f] cursor-pointer transition-all hover:bg-white/[0.02]',
                  !notif.read && 'bg-[#ef4444]/[0.04] border-l-2 border-l-[#ef4444]'
                )}
              >
                <NotifIcon type={notif.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-snug mb-0.5">
                    {notif.title}
                  </p>
                  <p className="text-xs text-[#71767b] leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-[#71767b] mt-1.5">{timeAgo(notif.createdAt)}</p>
                </div>
                {!notif.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0 mt-1.5" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
