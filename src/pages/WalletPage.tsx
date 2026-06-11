import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ArrowDownLeft, ArrowUpRight,
  CreditCard, Building, Phone, ChevronRight,
  TrendingUp, TrendingDown, Clock,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  doc, getDoc, updateDoc, collection,
  query as firestoreQuery, where, orderBy,
  onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const PAYSTACK_PUBLIC_KEY = 'pk_test_6a3e3c3188dfa71759518245e6f566ba507c1f23';

// ── Types ──────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  desc: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  walletBalance: number;
}

const paymentMethods = [
  { id: 'card', icon: CreditCard, label: 'Debit/Credit Card', desc: 'Visa, Mastercard, Verve' },
  { id: 'bank', icon: Building, label: 'Bank Transfer', desc: 'Direct bank deposit' },
  { id: 'ussd', icon: Phone, label: 'USSD', desc: '*737#, *919# and more' },
];

const quickAmounts = [1000, 2000, 5000, 10000];

// ── Load Paystack Script ───────────────────────────────────────────────────
function loadPaystack(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

// ── Wallet Page ────────────────────────────────────────────────────────────
export function WalletPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    bankName: '',
    accountName: '',
  });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load user profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
        }
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Load transactions in real time
  useEffect(() => {
    if (!profile) return;
    const txQuery = firestoreQuery(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(txQuery, snapshot => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    });
    return () => unsub();
  }, [profile?.uid]);

  // Paystack deposit
  const handleDeposit = async () => {
    if (!amount || !profile) return;
    const numAmount = parseInt(amount);
    if (numAmount < 100) { showToast('Minimum deposit is ₦100', 'error'); return; }

    setProcessing(true);
    try {
      await loadPaystack();
      const handler = (window as any).PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: profile.email,
        amount: numAmount * 100,
        currency: 'NGN',
        metadata: { userId: profile.uid, type: 'wallet_deposit' },
        callback: async (response: any) => {
          await updateDoc(doc(db, 'users', profile.uid), {
            walletBalance: (profile.walletBalance || 0) + numAmount,
          });
          await addDoc(collection(db, 'transactions'), {
            userId: profile.uid,
            type: 'credit',
            desc: 'Wallet Deposit via Paystack',
            amount: numAmount,
            reference: response.reference,
            status: 'success',
            createdAt: serverTimestamp(),
          });
          setProfile(prev => prev ? { ...prev, walletBalance: (prev.walletBalance || 0) + numAmount } : null);
          setAmount('');
          setSelectedMethod(null);
          showToast(`₦${numAmount.toLocaleString()} deposited successfully!`, 'success');
          setActiveTab('overview');
        },
        onClose: () => setProcessing(false),
      });
      handler.openIframe();
    } catch (e) {
      showToast('Payment failed. Try again.', 'error');
      setProcessing(false);
    }
  };

  // Withdrawal request
  const handleWithdraw = async () => {
    if (!amount || !profile) return;
    const numAmount = parseInt(amount);
    if (numAmount < 500) { showToast('Minimum withdrawal is ₦500', 'error'); return; }
    if (numAmount > (profile.walletBalance || 0)) { showToast('Insufficient balance', 'error'); return; }
    if (!bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.accountName) {
      showToast('Please fill in all bank details', 'error'); return;
    }
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        walletBalance: (profile.walletBalance || 0) - numAmount,
      });
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        type: 'debit',
        desc: 'Withdrawal to Bank Account',
        amount: numAmount,
        bankDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'withdrawalRequests'), {
        userId: profile.uid,
        userName: profile.displayName,
        amount: numAmount,
        bankDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setProfile(prev => prev ? { ...prev, walletBalance: (prev.walletBalance || 0) - numAmount } : null);
      setAmount('');
      setBankDetails({ accountNumber: '', bankName: '', accountName: '' });
      showToast('Withdrawal request submitted! Processing within 24hrs.', 'success');
      setActiveTab('overview');
    } catch (e) {
      showToast('Withdrawal failed. Try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const totalIn = transactions
    .filter(t => t.type === 'credit' && t.status === 'success')
    .reduce((a, t) => a + t.amount, 0);
  const totalOut = transactions
    .filter(t => t.type === 'debit' && t.status === 'success')
    .reduce((a, t) => a + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: '💼 Overview' },
    { key: 'deposit', label: '⬇️ Deposit' },
    { key: 'withdraw', label: '⬆️ Withdraw' },
    { key: 'history', label: '📋 History' },
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
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-white shrink-0" />
              : <AlertCircle className="w-4 h-4 text-white shrink-0" />
            }
            <p className="text-white text-sm font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <h1 className="text-lg font-black text-white mb-3">Wallet</h1>
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
              <div className="bg-gradient-to-br from-[#ef4444] via-[#dc2626] to-[#b91c1c] rounded-3xl p-6 text-white shadow-xl shadow-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <p className="text-sm opacity-80">Available Balance</p>
                </div>
                <p className="text-5xl font-black mb-1">₦{(profile?.walletBalance || 0).toLocaleString()}</p>
                <p className="text-xs opacity-60 mb-5">
                  {profile?.role === 'tipster' ? 'Earnings from channel subscriptions' : 'Your wallet balance'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setActiveTab('deposit')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-2xl py-3 text-sm font-bold transition-all">
                    <ArrowDownLeft className="w-4 h-4" /> Deposit
                  </button>
                  <button onClick={() => setActiveTab('withdraw')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-2xl py-3 text-sm font-bold transition-all">
                    <ArrowUpRight className="w-4 h-4" /> Withdraw
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-[#71767b]">Total In</p>
                  </div>
                  <p className="text-xl font-black text-white">₦{totalIn.toLocaleString()}</p>
                  <p className="text-xs text-green-400 mt-0.5">All time</p>
                </div>
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                    <p className="text-xs text-[#71767b]">Total Out</p>
                  </div>
                  <p className="text-xl font-black text-white">₦{totalOut.toLocaleString()}</p>
                  <p className="text-xs text-[#ef4444] mt-0.5">All time</p>
                </div>
              </div>

              {profile?.role === 'tipster' && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                  <p className="text-xs font-bold text-white mb-1">💡 How earnings work</p>
                  <p className="text-xs text-[#71767b] leading-relaxed">
                    When a user joins your paid channel, you receive <span className="text-white font-bold">90%</span> of the payment. Arena keeps a <span className="text-white font-bold">10%</span> platform fee.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-white text-sm">Recent Transactions</p>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-[#ef4444] hover:underline">See all</button>
                </div>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-2">💳</p>
                    <p className="text-sm text-[#71767b]">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 4).map((tx, i) => (
                      <motion.div key={tx.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2.5">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          tx.type === 'credit' ? 'bg-green-500/20' : 'bg-[#ef4444]/20')}>
                          {tx.type === 'credit'
                            ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold truncate">{tx.desc}</p>
                          <p className="text-xs text-[#71767b]">{timeAgo(tx.createdAt)}</p>
                        </div>
                        <p className={cn('text-sm font-black shrink-0',
                          tx.type === 'credit' ? 'text-green-400' : 'text-[#ef4444]')}>
                          {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Deposit ── */}
          {activeTab === 'deposit' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                <p className="text-xs text-[#71767b] mb-1">Current Balance</p>
                <p className="text-2xl font-black text-white">₦{(profile?.walletBalance || 0).toLocaleString()}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-2">Enter Amount</p>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all mb-3">
                  <span className="text-[#71767b] font-bold">₦</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0" className="flex-1 bg-transparent text-xl font-black text-white outline-none" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map(a => (
                    <button key={a} onClick={() => setAmount(String(a))}
                      className={cn('py-2 rounded-xl text-xs font-bold border transition-all',
                        amount === String(a)
                          ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-white/20 hover:text-white'
                      )}>
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-2">Payment Method</p>
                <div className="space-y-2">
                  {paymentMethods.map(pm => {
                    const Icon = pm.icon;
                    return (
                      <button key={pm.id} onClick={() => setSelectedMethod(pm.id)}
                        className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                          selectedMethod === pm.id
                            ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                            : 'bg-[#111] border-[#1f1f1f] hover:border-white/10'
                        )}>
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          selectedMethod === pm.id ? 'bg-[#ef4444]/20' : 'bg-white/5')}>
                          <Icon className={cn('w-4 h-4', selectedMethod === pm.id ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">{pm.label}</p>
                          <p className="text-xs text-[#71767b]">{pm.desc}</p>
                        </div>
                        <ChevronRight className={cn('w-4 h-4',
                          selectedMethod === pm.id ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <p className="text-xs text-[#71767b]">💳 Powered by <span className="text-white font-bold">Paystack</span> — Secure & encrypted</p>
              </div>

              <button onClick={handleDeposit} disabled={!amount || !selectedMethod || processing}
                className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-red-500/20">
                {processing ? 'Processing...' : `Deposit ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              </button>
            </div>
          )}

          {/* ── Withdraw ── */}
          {activeTab === 'withdraw' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                <p className="text-xs text-[#71767b] mb-1">Available to Withdraw</p>
                <p className="text-2xl font-black text-white">₦{(profile?.walletBalance || 0).toLocaleString()}</p>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-2">Withdraw Amount</p>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] focus-within:border-[#ef4444]/50 rounded-xl px-4 py-3 transition-all mb-3">
                  <span className="text-[#71767b] font-bold">₦</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0" className="flex-1 bg-transparent text-xl font-black text-white outline-none" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map(a => (
                    <button key={a} onClick={() => setAmount(String(a))}
                      className={cn('py-2 rounded-xl text-xs font-bold border transition-all',
                        amount === String(a)
                          ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]'
                          : 'bg-[#111] border-[#1f1f1f] text-[#71767b] hover:border-white/20 hover:text-white'
                      )}>
                      ₦{a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-2">Bank Details</p>
                <div className="space-y-3">
                  <input placeholder="Account Number" value={bankDetails.accountNumber}
                    onChange={e => setBankDetails(b => ({ ...b, accountNumber: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <input placeholder="Bank Name (e.g. GTBank, Access Bank)" value={bankDetails.bankName}
                    onChange={e => setBankDetails(b => ({ ...b, bankName: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                  <input placeholder="Account Name" value={bankDetails.accountName}
                    onChange={e => setBankDetails(b => ({ ...b, accountName: e.target.value }))}
                    className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none transition-all"
                  />
                </div>
              </div>

              <button onClick={handleWithdraw} disabled={!amount || processing}
                className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-red-500/20">
                {processing ? 'Processing...' : `Withdraw ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              </button>

              <p className="text-xs text-[#71767b] text-center">
                Withdrawals processed within 24 hours · Minimum ₦500
              </p>
            </div>
          )}

          {/* ── History ── */}
          {activeTab === 'history' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <p className="font-black text-white text-sm">Transaction History</p>
                <p className="text-xs text-[#71767b] mt-0.5">{transactions.length} transactions</p>
              </div>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-3xl mb-3">📋</p>
                  <p className="font-bold text-sm text-white">No transactions yet</p>
                  <p className="text-xs text-[#71767b] mt-1">Your transaction history will appear here</p>
                </div>
              ) : transactions.map((tx, i) => (
                <motion.div key={tx.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    tx.type === 'credit' ? 'bg-green-500/20' : 'bg-[#ef4444]/20')}>
                    {tx.type === 'credit'
                      ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                      : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{tx.desc}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#71767b]">{timeAgo(tx.createdAt)}</p>
                      {tx.status === 'pending' && (
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-bold">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                      {tx.status === 'failed' && (
                        <span className="text-[10px] text-[#ef4444] font-bold">Failed</span>
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
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
