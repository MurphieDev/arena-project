import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Zap, Star, Plus, X,
  Ticket, Lock, ArrowLeft, Users,
  Smile, Mic, ChevronRight, CheckCircle,
  Clock, AlertTriangle, Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot,
  query as firestoreQuery, orderBy,
  serverTimestamp, doc, getDoc, setDoc,
  updateDoc, increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Config ─────────────────────────────────────────────────────────────────
const PAYSTACK_PUBLIC_KEY = 'pk_test_6a3e3c3188dfa71759518245e6f566ba507c1f23';
const PLATFORM_FEE = 0.1;

// ── Types ──────────────────────────────────────────────────────────────────
interface Match {
  home: string;
  away: string;
  odds: string;
  prediction: string;
  time?: string;
  status: 'win' | 'lost' | 'pending';
}

interface Tip {
  id: string;
  bookingCode?: string;
  code?: string;
  platform?: string;
  tipsterId: string;
  tipsterName: string;
  sport: string;
  prediction: string;
  totalOdds?: string;
  odds?: number;
  analysis: string;
  matches: Match[];
  imageUrl?: string;
  status: 'pending' | 'won' | 'lost';
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

interface Channel {
  id: string;
  name: string;
  handle: string;
  ownerId: string;
  ownerName: string;
  verified: boolean;
  subscribers: number;
  winRate: string;
  streak: number;
  type: 'paid' | 'free';
  price?: number;
  subscriptionDuration?: string;
  lastPost: string;
  lastMessage: string;
  createdAt: any;
}

interface Subscription {
  channelId: string;
  userId: string;
  status: 'active' | 'expired' | 'pending';
  startDate: any;
  expiryDate: any;
  paymentReference: string;
  amount: number;
}

// ── Load Paystack ──────────────────────────────────────────────────────────
function loadPaystack(): Promise<void> {
  return new Promise(resolve => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getDurationDays(duration?: string): number {
  if (duration === 'weekly') return 7;
  if (duration === '2weeks') return 14;
  return 30;
}

function getDurationLabel(duration?: string): string {
  if (duration === 'weekly') return 'Weekly';
  if (duration === '2weeks') return '2 Weeks';
  return 'Monthly';
}

async function sendNotification(userId: string, type: string, title: string, message: string) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId, type, title, message,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error('Notification failed:', e);
  }
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Channel Preview Modal ──────────────────────────────────────────────────
function ChannelPreviewModal({ channel, currentUser, onClose, onSubscribed }: {
  channel: Channel;
  currentUser: { uid: string; email: string; displayName: string } | null;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSubscribe = async () => {
    if (!currentUser || !channel.price) return;
    setProcessing(true);
    try {
      await loadPaystack();
      const handler = (window as any).PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: channel.price * 100,
        currency: 'NGN',
        metadata: {
          userId: currentUser.uid,
          channelId: channel.id,
          channelName: channel.name,
          tipsterId: channel.ownerId,
          type: 'channel_subscription',
        },
        callback: async (response: any) => {
          try {
            const days = getDurationDays(channel.subscriptionDuration);
            const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            const tipsterEarnings = channel.price! * (1 - PLATFORM_FEE);
            const platformEarnings = channel.price! * PLATFORM_FEE;

            await setDoc(doc(db, 'channels', channel.id, 'members', currentUser.uid), {
              userId: currentUser.uid,
              userName: currentUser.displayName,
              channelId: channel.id,
              status: 'active',
              startDate: serverTimestamp(),
              expiryDate: expiryDate.toISOString(),
              paymentReference: response.reference,
              amount: channel.price,
              tipsterEarnings,
              platformEarnings,
              joinedAt: serverTimestamp(),
            });

            // Pending earnings — not instant
            await addDoc(collection(db, 'transactions'), {
              userId: channel.ownerId,
              type: 'credit',
              desc: `Channel subscription — ${channel.name}`,
              amount: tipsterEarnings,
              reference: response.reference,
              channelId: channel.id,
              subscriberId: currentUser.uid,
              status: 'pending',
              platformFee: platformEarnings,
              createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'transactions'), {
              userId: 'platform',
              type: 'credit',
              desc: `Platform fee — ${channel.name}`,
              amount: platformEarnings,
              reference: response.reference,
              status: 'success',
              createdAt: serverTimestamp(),
            });

            await updateDoc(doc(db, 'channels', channel.id), {
              subscribers: increment(1),
              revenue: increment(tipsterEarnings),
            });

            await sendNotification(
              channel.ownerId,
              'channel_join',
              'New Subscriber! 🎉',
              `${currentUser.displayName} just subscribed to ${channel.name} for ₦${channel.price?.toLocaleString()}`
            );

            await sendNotification(
              currentUser.uid,
              'new_payment',
              'Subscription Confirmed ✅',
              `You now have access to ${channel.name} until ${expiryDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`
            );

            onSubscribed();
            onClose();
          } catch (e) {
            showToast('Payment recorded but access setup failed. Contact support.');
          }
        },
        onClose: () => setProcessing(false),
      });
      handler.openIframe();
    } catch (e) {
      showToast('Payment failed. Try again.');
      setProcessing(false);
    }
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

        {toast && (
          <div className="mb-4 bg-[#ef4444]/20 border border-[#ef4444]/30 rounded-xl px-4 py-3">
            <p className="text-xs text-[#ef4444]">{toast}</p>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <Avatar name={channel.name} />
            {channel.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#ef4444] rounded-full flex items-center justify-center ring-2 ring-black">
                <Star className="w-2.5 h-2.5 text-white fill-white" />
              </div>
            )}
          </div>
          <div>
            <p className="font-black text-white">{channel.name}</p>
            <p className="text-xs text-[#71767b]">{channel.handle}</p>
          </div>
          <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full font-black">VIP</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Win Rate', value: channel.winRate, color: 'text-green-400' },
            { label: 'Members', value: (channel.subscribers || 0).toLocaleString(), color: 'text-white' },
            { label: 'Streak', value: channel.streak, color: 'text-[#ef4444]' },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
              <p className={cn('text-lg font-black', s.color)}>{s.value}</p>
              <p className="text-[10px] text-[#71767b]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-white mb-3">What you get:</p>
          {[
            'Access to all premium tips and predictions',
            'Real-time match notifications',
            'Direct access to tipster analysis',
            `Access for ${getDurationLabel(channel.subscriptionDuration)}`,
            'Old tips remain visible after expiry',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <p className="text-xs text-[#71767b]">{item}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71767b]">Subscription Price</p>
              <p className="text-2xl font-black text-white">₦{channel.price?.toLocaleString()}</p>
              <p className="text-xs text-[#71767b]">per {getDurationLabel(channel.subscriptionDuration).toLowerCase()}</p>
            </div>
            <Crown className="w-10 h-10 text-yellow-400 opacity-50" />
          </div>
        </div>

        <button onClick={handleSubscribe} disabled={processing}
          className="w-full py-3.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-red-500/20">
          {processing ? 'Processing...' : `Subscribe for ₦${channel.price?.toLocaleString()}`}
        </button>
        <p className="text-[10px] text-[#71767b] text-center mt-3">💳 Secure payment via Paystack</p>
      </motion.div>
    </motion.div>
  );
}

// ── Renew Modal ────────────────────────────────────────────────────────────
function RenewModal({ channel, currentUser, onClose, onRenewed }: {
  channel: Channel;
  currentUser: { uid: string; email: string; displayName: string } | null;
  onClose: () => void;
  onRenewed: () => void;
}) {
  const [processing, setProcessing] = useState(false);

  const handleRenew = async () => {
    if (!currentUser || !channel.price) return;
    setProcessing(true);
    try {
      await loadPaystack();
      const handler = (window as any).PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: currentUser.email,
        amount: channel.price * 100,
        currency: 'NGN',
        callback: async (response: any) => {
          const days = getDurationDays(channel.subscriptionDuration);
          const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          const tipsterEarnings = channel.price! * (1 - PLATFORM_FEE);

          await setDoc(doc(db, 'channels', channel.id, 'members', currentUser.uid), {
            userId: currentUser.uid,
            status: 'active',
            startDate: serverTimestamp(),
            expiryDate: expiryDate.toISOString(),
            paymentReference: response.reference,
            amount: channel.price,
            joinedAt: serverTimestamp(),
          });

          await addDoc(collection(db, 'transactions'), {
            userId: channel.ownerId,
            type: 'credit',
            desc: `Renewal — ${channel.name}`,
            amount: tipsterEarnings,
            reference: response.reference,
            status: 'pending',
            createdAt: serverTimestamp(),
          });

          await updateDoc(doc(db, 'channels', channel.id), {
            subscribers: increment(1),
            revenue: increment(tipsterEarnings),
          });

          await sendNotification(
            currentUser.uid,
            'new_payment',
            'Subscription Renewed ✅',
            `Your access to ${channel.name} has been renewed until ${expiryDate.toLocaleDateString()}`
          );

          onRenewed();
          onClose();
        },
        onClose: () => setProcessing(false),
      });
      handler.openIframe();
    } catch (e) {
      setProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-6 w-full"
      >
        <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
        <p className="font-black text-white text-center mb-1">Subscription Expired</p>
        <p className="text-xs text-[#71767b] text-center mb-4">
          Your access to <span className="text-white font-bold">{channel.name}</span> has expired. Renew to access new tips.
        </p>
        <p className="text-center text-2xl font-black text-white mb-4">
          ₦{channel.price?.toLocaleString()}
          <span className="text-xs text-[#71767b] font-normal">/{getDurationLabel(channel.subscriptionDuration).toLowerCase()}</span>
        </p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-[#1f1f1f] rounded-full text-sm font-bold text-[#71767b]">
            Not now
          </button>
          <button onClick={handleRenew} disabled={processing}
            className="flex-1 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white disabled:opacity-40">
            {processing ? 'Processing...' : 'Renew Access'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Channel Feed ───────────────────────────────────────────────────────────
function ChannelFeed({ ch, currentUser, onBack }: {
  ch: Channel;
  currentUser: { uid: string; email: string; displayName: string } | null;
  onBack: () => void;
}) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [message, setMessage] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [likedTips, setLikedTips] = useState<Set<string>>(new Set());

  const isOwner = currentUser?.uid === ch.ownerId;

  useEffect(() => {
    if (!currentUser || ch.type === 'free') return;
    const checkSub = async () => {
      const subDoc = await getDoc(doc(db, 'channels', ch.id, 'members', currentUser.uid));
      if (subDoc.exists()) {
        const data = subDoc.data() as Subscription;
        const expiry = new Date(data.expiryDate);
        if (expiry < new Date()) {
          await updateDoc(doc(db, 'channels', ch.id, 'members', currentUser.uid), { status: 'expired' });
          setSubscription({ ...data, status: 'expired' });
        } else {
          setSubscription(data);
        }
      }
    };
    checkSub();
  }, [ch.id, currentUser?.uid, ch.type]);

  useEffect(() => {
    const q = firestoreQuery(collection(db, 'channels', ch.id, 'tips'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setTips(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tip)));
    });
    return () => unsub();
  }, [ch.id]);

  const hasAccess = ch.type === 'free' || isOwner || subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired';

  const handleLike = async (tipId: string) => {
    if (!currentUser) return;
    const newLiked = new Set(likedTips);
    const tipRef = doc(db, 'channels', ch.id, 'tips', tipId);
    const tip = tips.find(t => t.id === tipId);

    if (newLiked.has(tipId)) {
      newLiked.delete(tipId);
      await updateDoc(tipRef, { likesCount: increment(-1) });
    } else {
      newLiked.add(tipId);
      await updateDoc(tipRef, { likesCount: increment(1) });
      if (tip && tip.tipsterId !== currentUser.uid) {
        await sendNotification(
          tip.tipsterId,
          'like',
          'New Like ❤️',
          `${currentUser.displayName} liked your tip in ${ch.name}`
        );
      }
    }
    setLikedTips(newLiked);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    await addDoc(collection(db, 'channels', ch.id, 'messages'), {
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: message.trim(),
      createdAt: serverTimestamp(),
    });
    setMessage('');
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const expiryWarning = () => {
    if (!subscription?.expiryDate) return null;
    const daysLeft = Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 3 && daysLeft > 0) return `⚠️ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] bg-black/90 backdrop-blur shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <Avatar name={ch.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-bold text-sm text-white">{ch.name}</p>
            {ch.verified && <Star className="w-3 h-3 text-[#ef4444] fill-[#ef4444]" />}
            {ch.type === 'paid' && <Crown className="w-3 h-3 text-yellow-400" />}
          </div>
          <p className="text-[11px] text-[#71767b]">{(ch.subscribers || 0).toLocaleString()} members · {ch.winRate} win rate</p>
        </div>
        {!isOwner && ch.type === 'paid' && (
          hasAccess
            ? <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-green-500/30 text-green-400">✓ Active</span>
            : isExpired
              ? <button onClick={() => setShowRenew(true)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-500 text-black">Renew</button>
              : <button onClick={() => setShowPreview(true)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white">Join · ₦{ch.price?.toLocaleString()}</button>
        )}
        {!isOwner && ch.type === 'free' && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400">Free</span>
        )}
      </div>

      {expiryWarning() && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <p className="text-xs text-yellow-400 font-semibold">{expiryWarning()}</p>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1f1f1f] shrink-0">
        <span className="flex items-center gap-1 text-[11px] text-green-400 font-bold">
          <TrendingUp className="w-3 h-3" />{ch.winRate} Win Rate
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#ef4444] font-bold">
          <Zap className="w-3 h-3" />{ch.streak} Streak
        </span>
        <span className="flex items-center gap-1 text-[11px] text-[#71767b]">
          <Users className="w-3 h-3" />{(ch.subscribers || 0).toLocaleString()}
        </span>
      </div>

      {/* Tips */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {ch.type === 'paid' && !hasAccess && !isExpired && (
          <div className="p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 text-center">
            <Lock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <p className="font-bold text-white mb-1">VIP Channel</p>
            <p className="text-xs text-[#71767b] mb-1">₦{ch.price?.toLocaleString()} / {getDurationLabel(ch.subscriptionDuration).toLowerCase()}</p>
            <p className="text-xs text-[#71767b] mb-4">Subscribe to unlock all tips and predictions</p>
            <button onClick={() => setShowPreview(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white">
              View Details & Subscribe
            </button>
          </div>
        )}

        {isExpired && (
          <div className="p-5 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/5 text-center mb-3">
            <Clock className="w-8 h-8 text-[#ef4444] mx-auto mb-2" />
            <p className="font-bold text-white text-sm mb-1">Subscription Expired</p>
            <p className="text-xs text-[#71767b] mb-3">Renew to access new tips. Previous tips are still visible below.</p>
            <button onClick={() => setShowRenew(true)}
              className="px-5 py-2 bg-[#ef4444] rounded-full text-sm font-bold text-white">
              Renew — ₦{ch.price?.toLocaleString()}
            </button>
          </div>
        )}

        {tips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-3">🎯</p>
            <p className="font-bold text-sm text-white">No tips posted yet</p>
            <p className="text-xs text-[#71767b] mt-1">Tips will appear here in real time</p>
          </div>
        )}

        {tips.map((tip, i) => {
          const isLocked = ch.type === 'paid' && !hasAccess && !isExpired;
          return (
            <motion.div key={tip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
              <div className={cn('bg-[#111] border border-[#ef4444]/20 rounded-xl p-3', isLocked && 'blur-sm select-none pointer-events-none')}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-[#ef4444]" />
                    {tip.bookingCode || tip.code || 'No code'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#71767b]">{timeAgo(tip.createdAt)}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black',
                      tip.status === 'won' && 'bg-green-500/20 text-green-400',
                      tip.status === 'lost' && 'bg-[#ef4444]/20 text-[#ef4444]',
                      tip.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                    )}>
                      {tip.status === 'won' ? '✔ WON' : tip.status === 'lost' ? '✘ LOST' : '⏳ PENDING'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs mb-2">
                  {tip.platform && <span className="text-[#71767b]">{tip.platform}</span>}
                  <span className="capitalize text-[#71767b]">{tip.sport}</span>
                  {(tip.totalOdds || tip.odds) && (
                    <span className="text-green-400 font-bold">@ {tip.totalOdds || tip.odds}x</span>
                  )}
                </div>

                {tip.matches?.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-white/80">{m.home} vs {m.away}</span>
                    <div className="flex items-center gap-2">
                      {m.prediction && (
                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-[#71767b]">{m.prediction}</span>
                      )}
                      <span className={cn('text-xs font-bold',
                        m.status === 'win' ? 'text-green-400' : m.status === 'lost' ? 'text-[#ef4444]' : 'text-yellow-400'
                      )}>
                        {m.status === 'win' ? '✔' : m.status === 'lost' ? '✘' : '⏳'}
                      </span>
                    </div>
                  </div>
                ))}
                {tip.matches?.length > 3 && (
                  <p className="text-[10px] text-[#71767b] mt-1">+{tip.matches.length - 3} more matches</p>
                )}

                {tip.analysis && (
                  <p className="text-xs text-[#71767b] mt-2 italic">"{tip.analysis}"</p>
                )}



                <div className="flex items-center gap-4 text-xs text-[#71767b] mt-3">
                  <button onClick={() => handleLike(tip.id)}
                    className={cn('flex items-center gap-1 transition-colors',
                      likedTips.has(tip.id) ? 'text-[#ef4444]' : 'hover:text-[#ef4444]'
                    )}>
                    {likedTips.has(tip.id) ? '❤️' : '🤍'} {tip.likesCount + (likedTips.has(tip.id) ? 1 : 0)}
                  </button>
                  <span>💬 {tip.commentsCount}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {hasAccess && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
          <Plus className="w-5 h-5 text-[#71767b]" />
          <input value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message..."
            className="flex-1 bg-[#111] px-3 py-2 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] border border-[#1f1f1f]"
          />
          <Smile className="w-5 h-5 text-[#71767b] cursor-pointer hover:text-white transition-colors" />
          <Mic className="w-5 h-5 text-[#71767b] cursor-pointer hover:text-white transition-colors" />
        </div>
      )}

      <AnimatePresence>
        {showPreview && currentUser && (
          <ChannelPreviewModal channel={ch} currentUser={currentUser}
            onClose={() => setShowPreview(false)}
            onSubscribed={() => setSubscription({
              channelId: ch.id, userId: currentUser.uid,
              status: 'active', startDate: new Date(),
              expiryDate: new Date(Date.now() + getDurationDays(ch.subscriptionDuration) * 86400000).toISOString(),
              paymentReference: '', amount: ch.price || 0
            })}
          />
        )}
        {showRenew && currentUser && (
          <RenewModal channel={ch} currentUser={currentUser}
            onClose={() => setShowRenew(false)}
            onRenewed={() => setSubscription(prev => prev ? {
              ...prev, status: 'active',
              expiryDate: new Date(Date.now() + getDurationDays(ch.subscriptionDuration) * 86400000).toISOString()
            } : null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Channel Row ────────────────────────────────────────────────────────────
function ChannelRow({ ch, active, onTap }: { ch: Channel; active: boolean; onTap: () => void }) {
  return (
    <motion.div whileTap={{ scale: 0.99 }} onClick={onTap}
      className={cn('flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#1f1f1f]',
        active ? 'bg-[#ef4444]/10 border-l-2 border-l-[#ef4444]' : 'hover:bg-white/[0.02]'
      )}>
      <div className="relative shrink-0">
        <Avatar name={ch.name} />
        {ch.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#ef4444] rounded-full flex items-center justify-center ring-2 ring-black">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        )}
        {ch.type === 'paid' && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center ring-2 ring-black">
            <Crown className="w-2.5 h-2.5 text-black" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-bold truncate text-white">{ch.name}</p>
            {ch.type === 'paid'
              ? <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded font-bold shrink-0">VIP</span>
              : <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded font-bold shrink-0">FREE</span>
            }
          </div>
          <span className="text-[11px] text-[#71767b] shrink-0 ml-2">{ch.lastPost}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#71767b] truncate flex-1">{ch.lastMessage}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />{ch.winRate}
            </span>
            <span className="text-[10px] text-[#ef4444] font-bold flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{ch.streak}
            </span>
          </div>
        </div>
        {ch.type === 'paid' && ch.price && (
          <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
            ₦{ch.price.toLocaleString()}/{getDurationLabel(ch.subscriptionDuration).toLowerCase()}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Leaderboard ────────────────────────────────────────────────────────────
function Leaderboard({ channels, onTap }: { channels: Channel[]; onTap: (id: string) => void }) {
  const sorted = [...channels].sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
  return (
    <div>
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <h2 className="text-base font-black text-white">Top Tipsters</h2>
        <p className="text-xs text-[#71767b] mt-0.5">Ranked by win rate</p>
      </div>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="font-bold text-sm text-white">No channels yet</p>
        </div>
      ) : sorted.map((ch, i) => (
        <motion.div key={ch.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          onClick={() => onTap(ch.id)}
          className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors">
          <div className="w-8 text-center">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-sm font-black text-[#71767b]">#{i + 1}</span>}
          </div>
          <Avatar name={ch.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{ch.name}</p>
            <p className="text-xs text-[#71767b]">{(ch.subscribers || 0).toLocaleString()} members</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-green-400">{ch.winRate}</p>
            <p className="text-xs text-[#ef4444] flex items-center gap-0.5 justify-end">
              <Zap className="w-3 h-3" />{ch.streak}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71767b]" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function PredictionsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [tab, setTab] = useState<'channels' | 'leaderboard'>('channels');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setCurrentUser({
          uid: user.uid,
          email: user.email || '',
          displayName: userDoc.data()?.displayName || '',
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = firestoreQuery(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setChannels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Channel)));
    });
    return () => unsub();
  }, []);

  const activeChannel = channels.find(c => c.id === activeId) ?? null;
  const filtered = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchText.toLowerCase()) ||
    ch.handle?.toLowerCase().includes(searchText.toLowerCase())
  );

  if (activeChannel) {
    return (
      <ChannelFeed
        ch={activeChannel}
        currentUser={currentUser}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <div>
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="text-lg font-black text-white flex-1">Predictions</h1>
        </div>
        <div className="flex items-center gap-1 px-4 pb-2">
          {(['channels', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
              )}>
              {t === 'channels' ? '📡 Channels' : '🏆 Leaderboard'}
            </button>
          ))}
        </div>
        {tab === 'channels' && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-[#111] rounded-full px-3 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
              <Search className="w-4 h-4 text-[#71767b] shrink-0" />
              <input value={searchText} onChange={e => setSearchText(e.target.value)}
                placeholder="Search channels..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
              />
              {searchText && (
                <button onClick={() => setSearchText('')}>
                  <X className="w-3.5 h-3.5 text-[#71767b]" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'channels' && (
          <motion.div key="channels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1f1f1f]">
              <span className="text-[10px] text-[#71767b]">{channels.length} channels</span>
              <span className="text-[10px] text-[#71767b]">{channels.filter(c => c.type === 'free').length} free</span>
              <span className="text-[10px] text-yellow-400">{channels.filter(c => c.type === 'paid').length} VIP</span>
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-3xl mb-3">📡</p>
                <p className="font-bold text-sm text-white">No channels yet</p>
                <p className="text-xs text-[#71767b] mt-1">Channels created by tipsters will appear here</p>
              </div>
            ) : filtered.map(ch => (
              <ChannelRow key={ch.id} ch={ch} active={activeId === ch.id} onTap={() => setActiveId(ch.id)} />
            ))}
          </motion.div>
        )}
        {tab === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Leaderboard channels={channels} onTap={setActiveId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
