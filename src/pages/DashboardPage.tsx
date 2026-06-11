import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Users, Zap, Trophy, Plus,
  Ticket, ArrowUpRight, Check, X, Clock, Star, Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  doc, getDoc, updateDoc, collection,
  query as firestoreQuery, where, orderBy,
  onSnapshot, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { BetSlipUpload } from '../components/BetSlipUpload';

// ── Types ──────────────────────────────────────────────────────────────────
interface TipsterProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  winRate: number;
  tipsCount: number;
  followersCount: number;
  walletBalance: number;
  verified: boolean;
  paidChannelEligible: boolean;
  sports?: string[];
}

interface Channel {
  id: string;
  name: string;
  type: 'free' | 'paid';
  price?: number;
  subscriptionDuration?: string;
  subscribers: number;
  revenue: number;
  ownerId: string;
  createdAt: any;
}

interface Tip {
  id: string;
  bookingCode: string;
  platform: string;
  sport: string;
  totalOdds: string;
  status: 'pending' | 'won' | 'lost';
  matches: { home: string; away: string; prediction: string; odds: string; time: string }[];
  imageUrl?: string;
  createdAt: any;
  channelId: string;
}

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  desc: string;
  amount: number;
  status: string;
  createdAt: any;
}

const subscriptionOptions = [
  { key: 'weekly', label: 'Weekly', days: 7 },
  { key: '2weeks', label: '2 Weeks', days: 14 },
  { key: 'monthly', label: 'Monthly', days: 30 },
];

// ── Dashboard Page ─────────────────────────────────────────────────────────
export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'create' | 'payouts'>('overview');
  const [profile, setProfile] = useState<TipsterProfile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Create channel state
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({
    name: '', type: 'free', price: '', subscriptionDuration: 'monthly',
  });
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Withdrawal state
  const [bankDetails, setBankDetails] = useState({ accountNumber: '', bankName: '', accountName: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile({ uid: user.uid, ...userDoc.data() } as TipsterProfile);
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Load channels
  useEffect(() => {
    if (!profile) return;
    const q = firestoreQuery(
      collection(db, 'channels'),
      where('ownerId', '==', profile.uid)
    );
    const unsub = onSnapshot(q, snapshot => {
      setChannels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Channel)));
    });
    return () => unsub();
  }, [profile?.uid]);

  // Load tips
  useEffect(() => {
    if (!profile || channels.length === 0) return;
    const loadTips = async () => {
      const allTips: Tip[] = [];
      for (const ch of channels) {
        const tipsSnap = await getDocs(
          firestoreQuery(
            collection(db, 'channels', ch.id, 'tips'),
            where('tipsterId', '==', profile.uid),
            orderBy('createdAt', 'desc')
          )
        );
        tipsSnap.docs.forEach(d => allTips.push({ id: d.id, channelId: ch.id, ...d.data() } as Tip));
      }
      allTips.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTips(allTips);
    };
    loadTips();
  }, [channels, profile?.uid]);

  // Load transactions
  useEffect(() => {
    if (!profile) return;
    const q = firestoreQuery(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });
    return () => unsub();
  }, [profile?.uid]);

  // Create channel
  const handleCreateChannel = async () => {
    if (!channelForm.name || !profile) return;
    if (channelForm.type === 'paid' && !channelForm.price) {
      showToast('Please set a price for your paid channel', 'error'); return;
    }
    if (channelForm.type === 'paid' && parseFloat(channelForm.price) > 50000) {
      showToast('Maximum channel price is ₦50,000', 'error'); return;
    }
    if (channelForm.type === 'paid' && !profile.paidChannelEligible) {
      showToast('You need 5+ tips to create a paid channel', 'error'); return;
    }
    const paidExists = channels.find(c => c.type === 'paid');
    const freeExists = channels.find(c => c.type === 'free');
    if (channelForm.type === 'free' && freeExists) {
      showToast('You already have a free channel', 'error'); return;
    }
    if (channelForm.type === 'paid' && paidExists) {
      showToast('You already have a paid channel', 'error'); return;
    }

    setCreatingChannel(true);
    try {
      await addDoc(collection(db, 'channels'), {
        name: channelForm.name,
        handle: `@${channelForm.name.toLowerCase().replace(/\s/g, '')}`,
        type: channelForm.type,
        price: channelForm.type === 'paid' ? parseFloat(channelForm.price) : null,
        subscriptionDuration: channelForm.type === 'paid' ? channelForm.subscriptionDuration : null,
        ownerId: profile.uid,
        ownerName: profile.displayName,
        verified: profile.verified,
        subscribers: 0,
        revenue: 0,
        winRate: '0%',
        streak: 0,
        lastPost: 'Just now',
        createdAt: serverTimestamp(),
      });

      if (channelForm.type === 'paid' && freeExists) {
        await updateDoc(doc(db, 'channels', freeExists.id), { disabled: true });
      }

      setChannelForm({ name: '', type: 'free', price: '', subscriptionDuration: 'monthly' });
      setShowCreateChannel(false);
      showToast('Channel created successfully! 🎉', 'success');
    } catch (e) {
      showToast('Failed to create channel. Try again.', 'error');
    } finally {
      setCreatingChannel(false);
    }
  };

  // Withdraw
  const handleWithdraw = async () => {
    if (!profile || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (amount < 500) { showToast('Minimum withdrawal is ₦500', 'error'); return; }
    if (amount > (profile.walletBalance || 0)) { showToast('Insufficient balance', 'error'); return; }
    if (!bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.accountName) {
      showToast('Please fill in all bank details', 'error'); return;
    }
    setWithdrawing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        walletBalance: (profile.walletBalance || 0) - amount,
      });
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        type: 'debit',
        desc: 'Withdrawal to Bank Account',
        amount,
        bankDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'withdrawalRequests'), {
        userId: profile.uid,
        userName: profile.displayName,
        amount,
        bankDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setProfile(prev => prev ? { ...prev, walletBalance: (prev.walletBalance || 0) - amount } : null);
      setWithdrawAmount('');
      showToast('Withdrawal request submitted! Processing within 24hrs.', 'success');
    } catch (e) {
      showToast('Withdrawal failed. Try again.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const wonTips = tips.filter(t => t.status === 'won').length;
  const lostTips = tips.filter(t => t.status === 'lost').length;
  const totalRevenue = transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const paidChannel = channels.find(c => c.type === 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'channels', label: '📡 Channels' },
    { key: 'create', label: '🎯 New Ticket' },
    { key: 'payouts', label: '💰 Payouts' },
  ] as const;

  return (
    <div className="pb-20">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-20 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl',
              toast.type === 'success' ? 'bg-green-500' : 'bg-[#ef4444]'
            )}
          >
            <p className="text-white text-sm font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-black text-white">Tipster Dashboard</h1>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#ef4444] fill-[#ef4444]" />
                <span className="text-xs text-[#ef4444] font-bold">
                  {profile?.verified ? 'Verified Tipster' : 'Tipster'} · {profile?.displayName}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#71767b]">Wallet</p>
              <p className="text-sm font-black text-white">₦{(profile?.walletBalance || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Subscribers', value: channels.reduce((a, c) => a + (c.subscribers || 0), 0).toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Win Rate', value: `${profile?.winRate || 0}%`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Tips Posted', value: profile?.tipsCount || 0, icon: Zap, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
                  { label: 'Followers', value: (profile?.followersCount || 0).toLocaleString(), icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', stat.bg)}>
                        <Icon className={cn('w-4 h-4', stat.color)} />
                      </div>
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      <p className="text-xs text-[#71767b] mt-0.5">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Revenue Card */}
              <div className="bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] rounded-3xl p-5 text-white shadow-xl shadow-red-500/20">
                <p className="text-sm opacity-80 mb-1">Total Earnings</p>
                <p className="text-3xl font-black mb-1">₦{totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-60 mb-4">90% of all channel subscriptions</p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-lg font-black">{wonTips}</p>
                    <p className="text-xs opacity-70">Won</p>
                  </div>
                  <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-lg font-black">{tips.filter(t => t.status === 'pending').length}</p>
                    <p className="text-xs opacity-70">Pending</p>
                  </div>
                  <div className="flex-1 bg-white/10 rounded-2xl p-3 text-center">
                    <p className="text-lg font-black">{lostTips}</p>
                    <p className="text-xs opacity-70">Lost</p>
                  </div>
                </div>
              </div>

              {/* Paid channel progress */}
              {!profile?.paidChannelEligible && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-bold text-yellow-400">Paid Channel Locked</p>
                  </div>
                  <p className="text-xs text-[#71767b] mb-3">
                    Post <span className="text-white font-bold">{5 - Math.min(profile?.tipsCount || 0, 5)} more tip{(5 - Math.min(profile?.tipsCount || 0, 5)) !== 1 ? 's' : ''}</span> to unlock your paid channel.
                  </p>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: `${Math.min((profile?.tipsCount || 0) / 5 * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-[#71767b] mt-1">{Math.min(profile?.tipsCount || 0, 5)}/5 tips</p>
                </div>
              )}

              {profile?.paidChannelEligible && !paidChannel && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-bold text-green-400">Paid Channel Unlocked! 🎉</p>
                  </div>
                  <p className="text-xs text-[#71767b] mb-3">You can now create a paid VIP channel and start earning!</p>
                  <button onClick={() => { setActiveTab('channels'); setShowCreateChannel(true); }}
                    className="w-full py-2 bg-green-500 rounded-full text-xs font-bold text-white">
                    Create Paid Channel
                  </button>
                </div>
              )}

              {/* Recent Tips */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-white text-sm">Recent Tips</p>
                  <button onClick={() => setActiveTab('create')}
                    className="text-xs text-[#ef4444] font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                {tips.length === 0 ? (
                  <div className="text-center py-8 bg-[#111] rounded-2xl border border-[#1f1f1f]">
                    <p className="text-2xl mb-2">🎯</p>
                    <p className="text-sm text-[#71767b]">No tips posted yet</p>
                    <button onClick={() => setActiveTab('create')}
                      className="mt-3 px-4 py-2 bg-[#ef4444] rounded-full text-xs font-bold text-white">
                      Post First Tip
                    </button>
                  </div>
                ) : tips.slice(0, 4).map((tip, i) => (
                  <motion.div key={tip.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-[#ef4444]" />
                        {tip.bookingCode || 'No code'}
                      </span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black',
                        tip.status === 'won' && 'bg-green-500/20 text-green-400',
                        tip.status === 'lost' && 'bg-[#ef4444]/20 text-[#ef4444]',
                        tip.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                      )}>
                        {tip.status === 'won' ? '✔ WON' : tip.status === 'lost' ? '✘ LOST' : '⏳ PENDING'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#71767b]">
                      <span>{tip.platform}</span>
                      <span>{tip.matches?.length || 0} games</span>
                      {tip.totalOdds && <span className="text-green-400">@ {tip.totalOdds}x</span>}
                      <span className="ml-auto">{timeAgo(tip.createdAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Channels ── */}
          {activeTab === 'channels' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-base">My Channels</p>
                <button onClick={() => setShowCreateChannel(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#ef4444] rounded-full text-xs font-bold text-white hover:bg-[#dc2626] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New Channel
                </button>
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-16 bg-[#111] rounded-2xl border border-[#1f1f1f]">
                  <p className="text-3xl mb-3">📡</p>
                  <p className="font-bold text-white mb-1">No channels yet</p>
                  <p className="text-xs text-[#71767b] mb-4">Create your first channel to start posting tips</p>
                  <button onClick={() => setShowCreateChannel(true)}
                    className="px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white">
                    Create Channel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {channels.map((ch, i) => (
                    <motion.div key={ch.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 pt-4 pb-3">
                        <div>
                          <p className="font-black text-white text-base">{ch.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {ch.type === 'paid'
                              ? <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-black">VIP</span>
                              : <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-black">FREE</span>
                            }
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-black">ACTIVE</span>
                            {ch.type === 'paid' && ch.price && (
                              <span className="text-[10px] text-[#71767b]">
                                ₦{ch.price.toLocaleString()}/{subscriptionOptions.find(o => o.key === ch.subscriptionDuration)?.label || 'Monthly'}
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="px-4 py-1.5 border border-[#2f2f2f] rounded-full text-xs font-bold text-[#71767b] hover:border-white hover:text-white transition-colors">
                          Manage
                        </button>
                      </div>
                      <div className="h-px bg-[#1f1f1f] mx-4" />
                      <div className="grid grid-cols-2 px-4 py-4 gap-4">
                        <div>
                          <p className="text-xs text-[#71767b] mb-1">Subscribers</p>
                          <p className="text-xl font-black text-white">{(ch.subscribers || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#71767b] mb-1">Revenue</p>
                          <p className="text-xl font-black text-green-400">₦{(ch.revenue || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowCreateChannel(true)}
                className="w-full flex items-center justify-center gap-2 py-5 border-2 border-dashed border-[#2f2f2f] rounded-2xl text-[#71767b] hover:border-[#ef4444]/40 hover:text-[#ef4444] transition-all">
                <Plus className="w-5 h-5" />
                <span className="text-sm font-bold">Create New Channel</span>
              </button>
            </div>
          )}

          {/* ── New Ticket (OCR Upload Only) ── */}
          {activeTab === 'create' && (
            <div className="p-4 space-y-4">
              <div>
                <p className="font-bold text-white mb-1">Post New Tip</p>
                <p className="text-xs text-[#71767b]">Upload your bet slip — we'll extract all match details automatically</p>
              </div>

              {/* Warning: use saved image not screenshot */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-400 mb-1">📱 For best results</p>
                <p className="text-xs text-[#71767b] leading-relaxed">
                  Use the <span className="text-white font-bold">saved/shared image</span> from your betting app — not a screenshot. The saved image contains full details including all match info, booking code and odds clearly.
                </p>
              </div>

              {channels.length === 0 ? (
                <div className="text-center py-12 bg-[#111] rounded-2xl border border-[#1f1f1f]">
                  <p className="text-2xl mb-2">📡</p>
                  <p className="text-sm text-[#71767b]">Create a channel first before posting tips</p>
                  <button onClick={() => setActiveTab('channels')}
                    className="mt-3 px-4 py-2 bg-[#ef4444] rounded-full text-xs font-bold text-white">
                    Go to Channels
                  </button>
                </div>
              ) : profile ? (
                <BetSlipUpload
                  channels={channels}
                  tipsterId={profile.uid}
                  tipsterName={profile.displayName}
                  onSuccess={() => {
                    showToast('Tip posted successfully! 🎯', 'success');
                    setActiveTab('overview');
                  }}
                />
              ) : null}
            </div>
          )}

          {/* ── Payouts ── */}
          {activeTab === 'payouts' && (
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] rounded-3xl p-5 text-white shadow-xl shadow-red-500/20">
                <p className="text-sm opacity-80 mb-1">Available for Withdrawal</p>
                <p className="text-4xl font-black mb-1">₦{(profile?.walletBalance || 0).toLocaleString()}</p>
                <p className="text-xs opacity-60">Your 90% share of subscriptions</p>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-3">Request Withdrawal</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all">
                    <span className="text-[#71767b] font-bold">₦</span>
                    <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                      placeholder="Amount to withdraw"
                      className="flex-1 bg-transparent text-lg font-black text-white outline-none" />
                  </div>
                  <input placeholder="Account Number" value={bankDetails.accountNumber}
                    onChange={e => setBankDetails(b => ({ ...b, accountNumber: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <input placeholder="Bank Name (e.g. GTBank)" value={bankDetails.bankName}
                    onChange={e => setBankDetails(b => ({ ...b, bankName: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <input placeholder="Account Name" value={bankDetails.accountName}
                    onChange={e => setBankDetails(b => ({ ...b, accountName: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount}
                    className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40">
                    {withdrawing ? 'Processing...' : `Withdraw ₦${withdrawAmount ? Number(withdrawAmount).toLocaleString() : '0'}`}
                  </button>
                </div>
              </div>

              <div>
                <p className="font-bold text-white text-sm mb-3">Earnings History</p>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 bg-[#111] rounded-2xl border border-[#1f1f1f]">
                    <p className="text-2xl mb-2">💰</p>
                    <p className="text-sm text-[#71767b]">No earnings yet</p>
                  </div>
                ) : transactions.map((tx, i) => (
                  <motion.div key={tx.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5 mb-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      tx.type === 'credit' ? 'bg-green-500/20' : 'bg-[#ef4444]/20')}>
                      {tx.type === 'credit'
                        ? <Check className="w-4 h-4 text-green-400" />
                        : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{tx.desc}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[#71767b]">{timeAgo(tx.createdAt)}</p>
                        {tx.status === 'pending' && (
                          <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={cn('text-sm font-black shrink-0',
                      tx.type === 'credit' ? 'text-green-400' : 'text-[#ef4444]')}>
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-400">Withdrawals processed within 24 hours</p>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateChannel && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowCreateChannel(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-4 pb-10"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-white text-base">Create Channel</h3>
                <button onClick={() => setShowCreateChannel(false)} className="p-1.5 rounded-full bg-white/5">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <div className="space-y-3">
                <input placeholder="Channel name *" value={channelForm.name}
                  onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#ef4444]/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all"
                />

                <div>
                  <p className="text-xs text-[#71767b] mb-2">Channel Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'free', label: 'Free Channel', desc: 'Open to everyone', locked: false },
                      { key: 'paid', label: 'VIP Channel', desc: 'Paid subscribers only', locked: !profile?.paidChannelEligible },
                    ].map(opt => (
                      <button key={opt.key}
                        onClick={() => !opt.locked && setChannelForm(f => ({ ...f, type: opt.key }))}
                        disabled={opt.locked}
                        className={cn('p-3 rounded-xl border text-left transition-all',
                          channelForm.type === opt.key ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-white/5 border-white/10',
                          opt.locked && 'opacity-40 cursor-not-allowed'
                        )}>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-xs font-bold text-white">{opt.label}</p>
                          {opt.locked && <Lock className="w-3 h-3 text-[#71767b]" />}
                        </div>
                        <p className="text-[10px] text-[#71767b]">{opt.locked ? 'Need 5+ tips first' : opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {channelForm.type === 'paid' && (
                  <>
                    <div>
                      <p className="text-xs text-[#71767b] mb-2">Subscription Duration</p>
                      <div className="grid grid-cols-3 gap-2">
                        {subscriptionOptions.map(opt => (
                          <button key={opt.key}
                            onClick={() => setChannelForm(f => ({ ...f, subscriptionDuration: opt.key }))}
                            className={cn('py-2.5 rounded-xl text-xs font-bold border transition-all',
                              channelForm.subscriptionDuration === opt.key
                                ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                                : 'bg-white/5 border-white/10 text-[#71767b]'
                            )}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#71767b] mb-2">Subscription Price (max ₦50,000)</p>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-2.5 transition-all">
                        <span className="text-[#71767b] font-bold">₦</span>
                        <input type="number" value={channelForm.price}
                          onChange={e => setChannelForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="e.g. 2500" max={50000}
                          className="flex-1 bg-transparent text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button onClick={handleCreateChannel} disabled={creatingChannel || !channelForm.name}
                  className="w-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white font-bold text-sm py-3 rounded-full hover:opacity-90 transition-all disabled:opacity-50">
                  {creatingChannel ? 'Creating...' : 'Create Channel 🚀'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
