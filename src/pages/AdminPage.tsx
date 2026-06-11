import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Wallet, TrendingUp, Check,
  X, AlertTriangle, Search, ChevronRight,
  Trophy, Clock, Ban, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, query as firestoreQuery, orderBy,
  onSnapshot, updateDoc, doc, where, getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Admin emails — only these can access ──────────────────────────────────
const ADMIN_EMAILS = ['progressemem578@gmail.com']; // Replace with your email

// ── Types ──────────────────────────────────────────────────────────────────
interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  bankDetails: { accountNumber: string; bankName: string; accountName: string };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface UserData {
  id: string;
  displayName: string;
  email: string;
  role: string;
  verified: boolean;
  banned?: boolean;
  tipsCount: number;
  winRate: number;
  followersCount: number;
  walletBalance: number;
  createdAt: any;
}

interface PlatformStats {
  totalUsers: number;
  totalTipsters: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  totalChannels: number;
}

// ── Admin Page ─────────────────────────────────────────────────────────────
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'withdrawals' | 'users' | 'tipsters'>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalTipsters: 0, totalEarnings: 0,
    pendingWithdrawals: 0, totalChannels: 0,
  });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && ADMIN_EMAILS.includes(user.email || '')) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load withdrawal requests
  useEffect(() => {
    if (!isAdmin) return;
    const q = firestoreQuery(
      collection(db, 'withdrawalRequests'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snapshot => {
      setWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
    });
    return () => unsub();
  }, [isAdmin]);

  // Load users
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, 'users'), snapshot => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      setUsers(allUsers);
      setStats(prev => ({
        ...prev,
        totalUsers: allUsers.filter(u => u.role === 'user').length,
        totalTipsters: allUsers.filter(u => u.role === 'tipster').length,
      }));
    });
    return () => unsub();
  }, [isAdmin]);

  // Load platform stats
  useEffect(() => {
    if (!isAdmin) return;
    const loadStats = async () => {
      const channelsSnap = await getDocs(collection(db, 'channels'));
      const txSnap = await getDocs(
        firestoreQuery(collection(db, 'transactions'), where('type', '==', 'credit'))
      );
      const totalEarnings = txSnap.docs.reduce((a, d) => a + (d.data().platformFee || 0), 0);
      const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
      setStats(prev => ({
        ...prev,
        totalChannels: channelsSnap.size,
        totalEarnings,
        pendingWithdrawals,
      }));
    };
    loadStats();
  }, [isAdmin, withdrawals]);

  // Approve withdrawal
  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    setProcessing(withdrawal.id);
    try {
      await updateDoc(doc(db, 'withdrawalRequests', withdrawal.id), { status: 'approved' });
      await updateDoc(doc(db, 'transactions', withdrawal.id), { status: 'success' });
      showToast(`₦${withdrawal.amount.toLocaleString()} withdrawal approved for ${withdrawal.userName}`, 'success');
    } catch (e) {
      showToast('Failed to approve withdrawal', 'error');
    } finally {
      setProcessing(null);
    }
  };

  // Reject withdrawal
  const handleRejectWithdrawal = async (withdrawal: WithdrawalRequest) => {
    setProcessing(withdrawal.id);
    try {
      await updateDoc(doc(db, 'withdrawalRequests', withdrawal.id), { status: 'rejected' });
      // Refund the amount back to user wallet
      await updateDoc(doc(db, 'users', withdrawal.userId), {
        walletBalance: withdrawal.amount,
      });
      showToast(`Withdrawal rejected and ₦${withdrawal.amount.toLocaleString()} refunded to ${withdrawal.userName}`, 'success');
    } catch (e) {
      showToast('Failed to reject withdrawal', 'error');
    } finally {
      setProcessing(null);
    }
  };

  // Verify tipster
  const handleVerifyTipster = async (userId: string, verified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { verified });
      showToast(verified ? 'Tipster verified!' : 'Tipster unverified', 'success');
    } catch (e) {
      showToast('Failed to update verification', 'error');
    }
  };

  // Ban/unban user
  const handleBanUser = async (userId: string, banned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { banned });
      showToast(banned ? 'User banned' : 'User unbanned', 'success');
    } catch (e) {
      showToast('Failed to update user', 'error');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 text-center">
        <Shield className="w-16 h-16 text-[#ef4444] mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-[#71767b] text-sm">You don't have permission to access this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const tipsters = filteredUsers.filter(u => u.role === 'tipster');
  const regularUsers = filteredUsers.filter(u => u.role === 'user');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'withdrawals', label: `💰 Withdrawals${pendingWithdrawals.length > 0 ? ` (${pendingWithdrawals.length})` : ''}` },
    { key: 'tipsters', label: '🏆 Tipsters' },
    { key: 'users', label: '👥 Users' },
  ] as const;

  return (
    <div className="min-h-screen bg-black pb-20">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-4 left-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl',
              toast.type === 'success' ? 'bg-green-500' : 'bg-[#ef4444]'
            )}
          >
            <p className="text-white text-sm font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-black border-b border-[#1f1f1f] px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-[#ef4444]" />
          <div>
            <h1 className="text-lg font-black text-white">Arena Admin</h1>
            <p className="text-xs text-[#71767b]">Platform Management</p>
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

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Total Tipsters', value: stats.totalTipsters, icon: Trophy, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
                  { label: 'Total Channels', value: stats.totalChannels, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Pending Withdrawals', value: pendingWithdrawals.length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
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

              {/* Platform Earnings */}
              <div className="bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] rounded-3xl p-5 text-white shadow-xl shadow-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <p className="text-sm opacity-80">Arena Platform Earnings (10%)</p>
                </div>
                <p className="text-4xl font-black mb-1">₦{stats.totalEarnings.toLocaleString()}</p>
                <p className="text-xs opacity-60">Total from all channel subscriptions</p>
              </div>

              {/* Pending withdrawals alert */}
              {pendingWithdrawals.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-bold text-yellow-400">{pendingWithdrawals.length} Withdrawal{pendingWithdrawals.length > 1 ? 's' : ''} Pending</p>
                  </div>
                  <p className="text-xs text-[#71767b] mb-3">
                    Total: ₦{pendingWithdrawals.reduce((a, w) => a + w.amount, 0).toLocaleString()} needs to be processed
                  </p>
                  <button onClick={() => setActiveTab('withdrawals')}
                    className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Recent withdrawals */}
              <div>
                <p className="font-bold text-white text-sm mb-3">Recent Withdrawal Requests</p>
                {withdrawals.slice(0, 3).map((w, i) => (
                  <motion.div key={w.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5 mb-2">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      w.status === 'pending' ? 'bg-yellow-500/20' : w.status === 'approved' ? 'bg-green-500/20' : 'bg-[#ef4444]/20'
                    )}>
                      {w.status === 'pending' ? <Clock className="w-4 h-4 text-yellow-400" />
                        : w.status === 'approved' ? <Check className="w-4 h-4 text-green-400" />
                        : <X className="w-4 h-4 text-[#ef4444]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{w.userName}</p>
                      <p className="text-xs text-[#71767b]">{w.bankDetails?.bankName} · {timeAgo(w.createdAt)}</p>
                    </div>
                    <p className="text-sm font-black text-white shrink-0">₦{w.amount.toLocaleString()}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Withdrawals ── */}
          {activeTab === 'withdrawals' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <p className="font-black text-white">Withdrawal Requests</p>
                <p className="text-xs text-[#71767b] mt-0.5">{pendingWithdrawals.length} pending · {withdrawals.length} total</p>
              </div>

              {withdrawals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">💰</p>
                  <p className="font-bold text-white">No withdrawal requests</p>
                </div>
              ) : withdrawals.map((w, i) => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="px-4 py-4 border-b border-[#1f1f1f]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-white">{w.userName}</p>
                      <p className="text-xs text-[#71767b]">{timeAgo(w.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">₦{w.amount.toLocaleString()}</p>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-black',
                        w.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                        w.status === 'approved' && 'bg-green-500/20 text-green-400',
                        w.status === 'rejected' && 'bg-[#ef4444]/20 text-[#ef4444]',
                      )}>
                        {w.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Bank details */}
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3 mb-3">
                    <p className="text-xs text-[#71767b] mb-1">Bank Details</p>
                    <p className="text-sm text-white font-semibold">{w.bankDetails?.accountName}</p>
                    <p className="text-xs text-[#71767b]">{w.bankDetails?.bankName} · {w.bankDetails?.accountNumber}</p>
                  </div>

                  {/* Actions */}
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveWithdrawal(w)}
                        disabled={processing === w.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 rounded-full text-xs font-bold text-white disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {processing === w.id ? 'Processing...' : 'Approve & Pay'}
                      </button>
                      <button
                        onClick={() => handleRejectWithdrawal(w)}
                        disabled={processing === w.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-[#ef4444]/30 rounded-full text-xs font-bold text-[#ef4444] disabled:opacity-50">
                        <X className="w-3.5 h-3.5" />
                        Reject & Refund
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Tipsters ── */}
          {activeTab === 'tipsters' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <p className="font-black text-white mb-2">Tipsters ({tipsters.length})</p>
                <div className="flex items-center gap-2 bg-[#111] rounded-full px-3 py-2 border border-[#1f1f1f]">
                  <Search className="w-4 h-4 text-[#71767b]" />
                  <input value={searchText} onChange={e => setSearchText(e.target.value)}
                    placeholder="Search tipsters..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                </div>
              </div>

              {tipsters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">🏆</p>
                  <p className="font-bold text-white">No tipsters yet</p>
                </div>
              ) : tipsters.map((tipster, i) => (
                <motion.div key={tipster.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="px-4 py-3 border-b border-[#1f1f1f]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-white">{tipster.displayName}</p>
                        {tipster.verified && (
                          <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-black">VERIFIED</span>
                        )}
                        {tipster.banned && (
                          <span className="text-[9px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full font-black">BANNED</span>
                        )}
                      </div>
                      <p className="text-xs text-[#71767b]">{tipster.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#71767b]">
                        <span>{tipster.tipsCount || 0} tips</span>
                        <span className="text-green-400">{tipster.winRate || 0}% win rate</span>
                        <span>{tipster.followersCount || 0} followers</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifyTipster(tipster.id, !tipster.verified)}
                      className={cn('flex-1 py-2 rounded-full text-xs font-bold transition-all',
                        tipster.verified
                          ? 'border border-[#1f1f1f] text-[#71767b]'
                          : 'bg-[#ef4444] text-white'
                      )}>
                      {tipster.verified ? '✓ Verified' : 'Verify'}
                    </button>
                    <button
                      onClick={() => handleBanUser(tipster.id, !tipster.banned)}
                      className={cn('flex-1 py-2 rounded-full text-xs font-bold transition-all',
                        tipster.banned
                          ? 'bg-green-500/20 text-green-400'
                          : 'border border-[#ef4444]/30 text-[#ef4444]'
                      )}>
                      <Ban className="w-3 h-3 inline mr-1" />
                      {tipster.banned ? 'Unban' : 'Ban'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <p className="font-black text-white mb-2">Users ({regularUsers.length})</p>
                <div className="flex items-center gap-2 bg-[#111] rounded-full px-3 py-2 border border-[#1f1f1f]">
                  <Search className="w-4 h-4 text-[#71767b]" />
                  <input value={searchText} onChange={e => setSearchText(e.target.value)}
                    placeholder="Search users..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
                  />
                </div>
              </div>

              {regularUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">👥</p>
                  <p className="font-bold text-white">No users yet</p>
                </div>
              ) : regularUsers.map((user, i) => (
                <motion.div key={user.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/20 flex items-center justify-center font-black text-[#ef4444] shrink-0">
                    {(user.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white truncate">{user.displayName}</p>
                      {user.banned && (
                        <span className="text-[9px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded-full font-black">BANNED</span>
                      )}
                    </div>
                    <p className="text-xs text-[#71767b] truncate">{user.email}</p>
                    <p className="text-xs text-[#71767b]">Joined {timeAgo(user.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleBanUser(user.id, !user.banned)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-bold shrink-0',
                      user.banned ? 'bg-green-500/20 text-green-400' : 'border border-[#ef4444]/30 text-[#ef4444]'
                    )}>
                    {user.banned ? 'Unban' : 'Ban'}
                  </button>
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
