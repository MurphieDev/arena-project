import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardCard, StatCard, QuickActionButton } from '../../dashboard/shared/DashboardComponents';
import { Percent, Users, Shield, AlertTriangle, TrendingUp, Wallet, CheckCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, query as firestoreQuery,
  orderBy, limit, onSnapshot
} from 'firebase/firestore';

interface AdminStats {
  totalUsers: number;
  totalTipsters: number;
  totalPredictions: number;
  reportedContent: number;
  pendingTipsters: number;
  totalTransactions: number;
  totalRevenue: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersSnap, transactionsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'transactions')),
        ]);

        const users = usersSnap.docs.map(d => d.data());
        const totalUsers = users.length;
        const totalTipsters = users.filter(u => u.role === 'tipster').length;
        const pendingTipsters = users.filter(u => u.pendingTipsterApproval).length;

        const transactions = transactionsSnap.docs.map(d => d.data());
        const totalRevenue = transactions
          .filter(t => t.type === 'debit' && t.status === 'success')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Count total predictions
        let totalPredictions = 0;
        const channelsSnap = await getDocs(collection(db, 'channels'));
        for (const ch of channelsSnap.docs) {
          const tipsSnap = await getDocs(collection(db, 'channels', ch.id, 'tips'));
          totalPredictions += tipsSnap.size;
        }

        setStats({
          totalUsers,
          totalTipsters,
          totalPredictions,
          reportedContent: 0,
          pendingTipsters,
          totalTransactions: transactions.length,
          totalRevenue: totalRevenue * 0.1, // Arena takes 10% commission
          systemHealth: 'good',
        });
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();

    // Real-time recent transactions
    const q = firestoreQuery(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      setRecentActivity(snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
        return {
          title: data.desc || 'Transaction',
          desc: `₦${(data.amount || 0).toLocaleString()} · ${data.status}`,
          time,
        };
      }));
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[16rem] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
        <p className="text-sm text-[#71767b] font-semibold">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-[#71767b]">Failed to load admin data</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-1">Admin Panel</p>
          <h1 className="text-xl sm:text-2xl font-black text-white">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            stats.systemHealth === 'good' ? 'bg-green-500' :
            stats.systemHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-[#71767b] capitalize">System: {stats.systemHealth}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()}
          change="All registered users" changeType="positive" icon={<Users className="w-4 h-4" />} />
        <StatCard label="Active Tipsters" value={stats.totalTipsters.toLocaleString()}
          change={`${stats.pendingTipsters} pending approval`}
          changeType={stats.pendingTipsters > 0 ? 'negative' : 'positive'}
          icon={<Shield className="w-4 h-4" />} />
        <StatCard label="Total Predictions" value={stats.totalPredictions.toLocaleString()}
          change="All time" changeType="positive" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Platform Revenue" prefix="₦" value={stats.totalRevenue.toLocaleString('en-NG')}
          change="10% of all transactions" changeType="positive" icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <DashboardCard title="User Management">
          <div className="grid grid-cols-1 gap-2.5">
            <QuickActionButton
              label={`All Users (${stats.totalUsers.toLocaleString()})`}
              variant="primary" icon={<Users className="w-4 h-4" />}
              onClick={() => navigate('/admin/users')} />
            <QuickActionButton
              label={`Tipster Approvals ${stats.pendingTipsters > 0 ? `(${stats.pendingTipsters} pending)` : ''}`}
              variant="success" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => navigate('/admin/tipsters')} />
            <QuickActionButton
              label="Reported Content"
              variant="accent" icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => navigate('/admin/reports')} />
          </div>
        </DashboardCard>

        <DashboardCard title="Platform & Revenue">
          <div className="grid grid-cols-1 gap-2.5">
            <QuickActionButton
              label="Pricing & Commissions"
              variant="primary" icon={<Percent className="w-4 h-4" />}
              onClick={() => navigate('/admin/pricing')} />
            <QuickActionButton
              label={`All Transactions (${stats.totalTransactions})`}
              variant="success" icon={<Wallet className="w-4 h-4" />}
              onClick={() => navigate('/admin/transactions')} />
            <QuickActionButton
              label="Platform Settings"
              variant="muted" icon={<Shield className="w-4 h-4" />}
              onClick={() => navigate('/admin/settings')} />
          </div>
        </DashboardCard>
      </div>

      {/* Recent Transactions */}
      <DashboardCard title="Recent Transactions">
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[#71767b] text-center py-4">No transactions yet</p>
          ) : recentActivity.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-[#1f1f1f] last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-[#71767b] mt-0.5">{item.desc}</p>
              </div>
              <span className="text-xs text-[#71767b] shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
};

export default AdminDashboard;
