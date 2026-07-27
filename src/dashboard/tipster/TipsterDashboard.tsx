import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, TrendingUp, Users, Wallet,
  BarChart3, UserPlus, UserCircle, Plus,
  Trophy, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/AuthContext';
import { DashboardCard, StatCard, ActivityFeed, QuickActionButton } from '../shared/DashboardComponents';
import { db } from '../../lib/firebase';
import {
  collection, query as firestoreQuery, where,
  getDocs, orderBy, limit, onSnapshot, doc, getDoc
} from 'firebase/firestore';

interface TipsterStats {
  totalPredictions: number;
  winRate: number;
  followers: number;
  revenue: number;
  streak: number;
  won: number;
  lost: number;
  pending: number;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

const TipsterDashboard: React.FC = () => {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const navigate = useNavigate();
  const [stats, setStats] = useState<TipsterStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentTips, setRecentTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchDashboardData = async () => {
      try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data() || {};

        // Get followers count
        const followersSnap = await getDocs(collection(db, 'users', userId, 'followers'));

        // Get all tips across channels
        const channelsSnap = await getDocs(
          firestoreQuery(collection(db, 'channels'), where('ownerId', '==', userId))
        );

        let totalTips = 0, wonTips = 0, lostTips = 0, pendingTips = 0;
        let totalRevenue = 0;
        const tipsList: any[] = [];

        for (const ch of channelsSnap.docs) {
          const chData = ch.data();

          // Get subscribers
          const membersSnap = await getDocs(collection(db, 'channels', ch.id, 'members'));
          if (chData.type === 'paid' && chData.price) {
            totalRevenue += membersSnap.size * (chData.price || 0) * 0.9; // 90% after 10% commission
          }

          // Get tips
          const tipsSnap = await getDocs(
            firestoreQuery(collection(db, 'channels', ch.id, 'tips'), orderBy('createdAt', 'desc'), limit(10))
          );
          tipsSnap.docs.forEach(d => {
            const tip = d.data();
            totalTips++;
            if (tip.status === 'won') wonTips++;
            else if (tip.status === 'lost') lostTips++;
            else pendingTips++;
            tipsList.push({ id: d.id, channelName: chData.name, ...tip });
          });
        }

        const winRate = (wonTips + lostTips) > 0 ? Math.round((wonTips / (wonTips + lostTips)) * 100) : 0;

        setStats({
          totalPredictions: totalTips,
          winRate: userData.winRate || winRate,
          followers: followersSnap.size,
          revenue: totalRevenue,
          streak: userData.streak || 0,
          won: wonTips,
          lost: lostTips,
          pending: pendingTips,
        });

        setRecentTips(tipsList.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Real-time notifications for activities
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => {
        const data = d.data();
        const date = data.createdAt?.toDate?.() || new Date();
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        const time = diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
        return { id: d.id, type: data.type || 'info', message: data.message || data.title || '', timestamp: time };
      }));
    });
    return () => unsub();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[16rem] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
        <p className="text-sm text-[#71767b] font-semibold">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-[#71767b]">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-1">Tipster Dashboard</p>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Welcome back, {(user as any)?.name?.split(' ')[0] ?? 'Tipster'}!
          </h1>
        </div>
        <p className="text-xs text-[#71767b] shrink-0">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <StatCard label="Total Predictions" value={stats.totalPredictions}
          change={`${stats.won}W · ${stats.lost}L · ${stats.pending} pending`}
          changeType="neutral" icon={<Target className="w-4 h-4" />} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`}
          change={stats.winRate >= 60 ? '🔥 Great form' : stats.winRate >= 50 ? 'Above average' : 'Keep improving'}
          changeType={stats.winRate >= 60 ? 'positive' : stats.winRate >= 50 ? 'neutral' : 'negative'}
          icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Followers" value={stats.followers.toLocaleString()}
          change="Total followers" changeType="positive" icon={<Users className="w-4 h-4" />} />
        <StatCard label="Est. Revenue" prefix="₦" value={stats.revenue.toLocaleString('en-NG')}
          change="After 10% platform fee" changeType="positive" icon={<Wallet className="w-4 h-4" />} />
      </div>

      {/* Streak banner */}
      {stats.streak > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#ef4444]/10 to-transparent border border-[#ef4444]/20">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 flex items-center justify-center shrink-0">
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">{stats.streak}-win streak!</p>
            <p className="text-xs text-[#71767b]">Keep it going — your followers are watching</p>
          </div>
        </div>
      )}

      {/* Record summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-green-400">{stats.won}</p>
          <p className="text-xs text-[#71767b] mt-0.5">Won ✅</p>
        </div>
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-[#ef4444]">{stats.lost}</p>
          <p className="text-xs text-[#71767b] mt-0.5">Lost ❌</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 text-center">
          <p className="text-2xl font-black text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-[#71767b] mt-0.5">Pending ⏳</p>
        </div>
      </div>

      {/* Recent Tips */}
      {recentTips.length > 0 && (
        <DashboardCard title="Recent Tips">
          <div className="space-y-2">
            {recentTips.map(tip => (
              <div key={tip.id} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {tip.matches?.[0] ? `${tip.matches[0].home} vs ${tip.matches[0].away}` : 'Multi-match tip'}
                    {tip.matches?.length > 1 && ` +${tip.matches.length - 1} more`}
                  </p>
                  <p className="text-[10px] text-[#71767b]">{tip.channelName}</p>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                  tip.status === 'won' ? 'bg-green-500/20 text-green-400' :
                  tip.status === 'lost' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {tip.status === 'won' ? '✅ WON' : tip.status === 'lost' ? '❌ LOST' : '⏳ PENDING'}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <DashboardCard title="Recent Activity">
          <ActivityFeed activities={activities.length > 0 ? activities : [
            { id: '0', type: 'info', message: 'No activity yet. Start posting tips!', timestamp: 'now' }
          ]} />
        </DashboardCard>

        <DashboardCard title="Quick Actions">
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            <QuickActionButton label="Post New Tip" variant="primary"
              icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/predictions')} />
            <QuickActionButton label="View Analytics" variant="success"
              icon={<BarChart3 className="w-4 h-4" />} onClick={() => navigate('/dashboard')} />
            <QuickActionButton label="Manage Channel Members" variant="accent"
              icon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/settings/account/channels')} />
            <QuickActionButton label="Update Profile" variant="muted"
              icon={<UserCircle className="w-4 h-4" />} onClick={() => navigate('/profile')} />
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

export default TipsterDashboard;
