import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft, ArrowUpRight,
  CreditCard, Building, Phone, ChevronRight,
  TrendingUp, TrendingDown, Clock, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../core/types';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, onSnapshot, query as firestoreQuery,
  orderBy, doc, updateDoc, serverTimestamp, where
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';

const paymentMethods = [
  { id: 'pm1', icon: CreditCard, label: 'Debit/Credit Card', desc: 'Visa, Mastercard, Verve' },
  { id: 'pm2', icon: Building, label: 'Bank Transfer', desc: 'Direct bank deposit' },
  { id: 'pm3', icon: Phone, label: 'USSD', desc: '*737#, *919# and more' },
];

interface WalletPageProps { userRole: UserRole; }

// Load Paystack script once
function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) { resolve(); return; }
    const existing = document.querySelector('script[src*="paystack"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.body.appendChild(script);
  });
}

export function WalletPage({ userRole }: WalletPageProps) {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const userEmail = currentUser?.email || '';
  const isTipster = userRole === 'tipster';

  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const quickAmounts = [1000, 2000, 5000, 10000];

  // Load Paystack on mount
  useEffect(() => { loadPaystack().catch(() => {}); }, []);

  // Load wallet balance
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBalance(data.walletBalance || 0);
        setEarnings(data.totalEarnings || 0);
      }
    });
    return () => unsub();
  }, [userId]);

  // Load transactions
  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const txs: any[] = snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` :
          diff < 86400 ? `${Math.floor(diff / 3600)}h ago` :
          diff < 604800 ? `${Math.floor(diff / 86400)}d ago` : `${Math.floor(diff / 604800)}w ago`;
        return { id: d.id, ...data, time };
      });
      setTransactions(txs);
      setTotalIn(txs.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0));
      setTotalOut(txs.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0));
    });
    return () => unsub();
  }, [userId]);

  const handleDeposit = async () => {
    if (!amount || !userId || !userEmail) return;
    const depositAmount = Number(amount);
    if (depositAmount < 100) { alert('Minimum deposit is ₦100'); return; }
    if (!selectedMethod) { alert('Please select a payment method'); return; }

    setProcessing(true);
    try {
      await loadPaystack();
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        alert('Payment system failed to load. Please refresh and try again.');
        setProcessing(false);
        return;
      }

      const handler = PaystackPop.setup({
        key: 'pk_live_26d167510c713243d75cadd382ec55e1939a55d6',
        email: userEmail,
        amount: depositAmount * 100,
        currency: 'NGN',
        ref: `ARENA_${userId}_${Date.now()}`,
        callback: function(response: any) {
          if (response.status === 'success') {
            updateDoc(doc(db, 'users', userId), {
              walletBalance: balance + depositAmount,
            }).then(() => addDoc(collection(db, 'transactions'), {
              userId,
              type: 'credit',
              desc: `Deposit via ${selectedMethod === 'pm1' ? 'Card' : selectedMethod === 'pm2' ? 'Bank Transfer' : 'USSD'}`,
              amount: depositAmount,
              status: 'success',
              reference: response.reference,
              createdAt: serverTimestamp(),
            })).then(() => {
              setAmount('');
              setSelectedMethod(null);
              setProcessing(false);
              setActiveTab('overview');
              alert('✅ Deposit successful!');
            }).catch(e => {
              console.error('DB update error:', e);
              setProcessing(false);
            });
          } else {
            setProcessing(false);
          }
        },
        onClose: function() { setProcessing(false); },
      });
      handler.openIframe();
    } catch (e: any) {
      alert('Payment error: ' + e.message);
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !userId) return;
    const withdrawAmount = Number(amount);
    if (withdrawAmount < 500) { alert('Minimum withdrawal is ₦500'); return; }
    if (withdrawAmount > balance) { alert('Insufficient balance'); return; }
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        walletBalance: balance - withdrawAmount,
      });
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'debit',
        desc: 'Withdrawal to Bank',
        amount: withdrawAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setAmount('');
      setProcessing(false);
      alert('Withdrawal request submitted! Processing within 24 hours.');
    } catch (e) {
      console.error('Withdrawal error:', e);
      setProcessing(false);
    }
  };

  const baseTabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'deposit', label: 'Deposit' },
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'history', label: 'History' },
  ];
  const tabs = isTipster ? [...baseTabs, { key: 'earnings', label: 'Earnings' }] : baseTabs;

  return (
    <div>
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
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
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-[#ef4444]/20 to-[#dc2626]/5 border border-[#ef4444]/20 rounded-2xl p-5 text-white">
                <p className="text-sm opacity-70 mb-1">Total Balance</p>
                <p className="text-4xl font-black mb-4">₦{balance.toLocaleString()}</p>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="flex items-center gap-1 text-green-400 mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Money In</span>
                    </div>
                    <p className="font-black text-white">₦{totalIn.toLocaleString()}</p>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div>
                    <div className="flex items-center gap-1 text-[#ef4444] mb-0.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">Money Out</span>
                    </div>
                    <p className="font-black text-white">₦{totalOut.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveTab('deposit')}
                  className="flex-1 py-3 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors">
                  + Deposit
                </button>
                <button onClick={() => setActiveTab('withdraw')}
                  className="flex-1 py-3 border border-[#1f1f1f] rounded-full text-sm font-bold text-white hover:bg-white/5 transition-colors">
                  Withdraw
                </button>
              </div>
              {transactions.slice(0, 3).map((tx, i) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-[#1f1f1f]">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', tx.type === 'credit' ? 'bg-green-500/20' : 'bg-[#ef4444]/20')}>
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{tx.desc}</p>
                    <p className="text-xs text-[#71767b]">{tx.time}</p>
                  </div>
                  <p className={cn('text-sm font-black shrink-0', tx.type === 'credit' ? 'text-green-400' : 'text-[#ef4444]')}>
                    {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Deposit */}
          {activeTab === 'deposit' && (
            <div className="p-4 space-y-4">
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
                        amount === String(a) ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]' : 'bg-[#111] border-[#1f1f1f] text-[#71767b]'
                      )}>₦{a.toLocaleString()}</button>
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
                          selectedMethod === pm.id ? 'bg-[#ef4444]/10 border-[#ef4444]/30' : 'bg-[#111] border-[#1f1f1f]'
                        )}>
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', selectedMethod === pm.id ? 'bg-[#ef4444]/20' : 'bg-white/5')}>
                          <Icon className={cn('w-4 h-4', selectedMethod === pm.id ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-bold text-white">{pm.label}</p>
                          <p className="text-xs text-[#71767b]">{pm.desc}</p>
                        </div>
                        <ChevronRight className={cn('w-4 h-4', selectedMethod === pm.id ? 'text-[#ef4444]' : 'text-[#71767b]')} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={handleDeposit} disabled={!amount || !selectedMethod || processing}
                className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Deposit ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              </button>
            </div>
          )}

          {/* Withdraw */}
          {activeTab === 'withdraw' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                <p className="text-xs text-[#71767b] mb-1">Available to Withdraw</p>
                <p className="text-2xl font-black text-white">₦{balance.toLocaleString()}</p>
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
                        amount === String(a) ? 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#ef4444]' : 'bg-[#111] border-[#1f1f1f] text-[#71767b]'
                      )}>₦{a.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-2">Bank Details</p>
                <div className="space-y-3">
                  <input placeholder="Account Number" className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none" />
                  <input placeholder="Bank Name" className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none" />
                  <input placeholder="Account Name" className="w-full bg-[#111] border border-[#1f1f1f] focus:border-[#ef4444]/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#71767b] outline-none" />
                </div>
              </div>
              <button onClick={handleWithdraw} disabled={!amount || processing}
                className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : `Withdraw ₦${amount ? Number(amount).toLocaleString() : '0'}`}
              </button>
              <p className="text-xs text-[#71767b] text-center">Withdrawals processed within 24 hours</p>
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <p className="font-black text-white text-sm">Transaction History</p>
                <p className="text-xs text-[#71767b] mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
              </div>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-3xl mb-2">💳</p>
                  <p className="font-bold text-white">No transactions yet</p>
                  <p className="text-sm text-[#71767b] mt-1">Your deposits and withdrawals will show here</p>
                </div>
              ) : transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', tx.type === 'credit' ? 'bg-green-500/20' : 'bg-[#ef4444]/20')}>
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-[#ef4444]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{tx.desc}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#71767b]">{tx.time}</p>
                      {tx.status === 'pending' && <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Pending</span>}
                    </div>
                  </div>
                  <p className={cn('text-sm font-black shrink-0', tx.type === 'credit' ? 'text-green-400' : 'text-[#ef4444]')}>
                    {tx.type === 'credit' ? '+' : '-'}₦{(tx.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Earnings */}
          {activeTab === 'earnings' && isTipster && (
            <div className="p-4 space-y-4">
              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5">
                <p className="text-sm text-white/70 mb-1">Total Earnings</p>
                <p className="text-3xl font-black text-white">₦{earnings.toLocaleString()}</p>
              </div>
              <p className="text-sm text-[#71767b] text-center">Earnings are paid out monthly. Contact support for payout requests.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
