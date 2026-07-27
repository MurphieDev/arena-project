import { Trophy, Zap, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query as firestoreQuery, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';

interface TopTipster {
  id: string;
  name: string;
  handle: string;
  winRate: number;
  followers: number;
  badge?: 'hot' | 'trending';
}

interface TrendingCommunity {
  id: string;
  name: string;
  members: number;
}



export function RightSidebar() {
  const navigate = useNavigate();
  const [topTipsters, setTopTipsters] = useState<TopTipster[]>([]);
  const [trendingCommunities, setTrendingCommunities] = useState<TrendingCommunity[]>([]);

  useEffect(() => {
    // Load real tipsters ordered by winRate
    const q = firestoreQuery(
      collection(db, 'users'),
      orderBy('winRate', 'desc'),
      limit(4)
    );
    const unsub = onSnapshot(q, snapshot => {
      const tipsters = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.role === 'tipster')
        .map((u: any, idx: number) => ({
          id: u.id,
          name: u.displayName || 'Tipster',
          handle: `@${(u.displayName || 'tipster').toLowerCase().replace(/\s/g, '')}`,
          winRate: u.winRate || 0,
          followers: u.followersCount || 0,
          badge: idx === 0 ? 'hot' as const : undefined,
        }));
      setTopTipsters(tipsters);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Load real communities ordered by member count
    const q = firestoreQuery(
      collection(db, 'communities'),
      orderBy('membersCount', 'desc'),
      limit(4)
    );
    const unsub = onSnapshot(q, snapshot => {
      const communities = snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name || 'Community',
        members: d.data().membersCount || 0,
      }));
      setTrendingCommunities(communities);
    });
    return () => unsub();
  }, []);

  return (
    <aside className="w-full p-4" style={{ scrollbarWidth: 'none' }}>
      <div>
        {/* Top Tipsters */}
        <div className="bg-[#12121A] border border-[#1f1f1f] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-[#ef4444]" />
          <h3 className="text-sm font-bold text-white">Top Tipsters</h3>
        </div>
        <div className="space-y-2">
          {topTipsters.map((tipster, idx) => (
            <div
              key={tipster.id}
              className={cn(
                'p-3 rounded-xl border transition-colors cursor-pointer hover:border-[#ef4444]/50',
                idx === 0
                  ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
                  : 'bg-[#0d0d0d] border-[#1f1f1f]'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-white">{tipster.name}</p>
                  <p className="text-xs text-[#71767b]">{tipster.handle}</p>
                </div>
                {idx === 0 && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded-full">
                    HOT
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400 font-bold">{tipster.winRate}% WR</span>
                <span className="text-[#71767b]">{(tipster.followers / 1000).toFixed(0)}K followers</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Communities */}
      <div className="bg-[#12121A] border border-[#1f1f1f] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#ef4444]" />
          <h3 className="text-sm font-bold text-white">Trending Communities</h3>
        </div>
        <div className="space-y-2">
          {trendingCommunities.map((community) => (
            <div
              key={community.id}
              className="p-3 rounded-xl bg-[#0d0d0d] border border-[#1f1f1f] hover:border-[#ef4444]/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-white">{community.name}</p>
                  <p className="text-xs text-[#71767b]">{(community.members / 1000).toFixed(0)}K members</p>
                </div>
                <Users className="w-4 h-4 text-[#71767b]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promoted/Sponsored */}
      <div className="bg-gradient-to-br from-[#ef4444]/10 to-[#dc2626]/5 border border-[#ef4444]/20 rounded-2xl p-4">
        <Zap className="w-4 h-4 text-[#ef4444] mb-2" />
        <h3 className="text-sm font-bold text-white mb-2">Become a Tipster</h3>
        <p className="text-xs text-[#71767b] mb-3 leading-relaxed">
          Join thousands of experts sharing predictions and earning from your expertise.
        </p>
        <button
          onClick={() => navigate('/become-tipster')}
          className="w-full py-2 bg-[#ef4444] text-white font-bold text-xs rounded-lg hover:bg-[#dc2626] transition-colors"
        >
          Learn More
        </button>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-[#1f1f1f]">
        <div className="space-y-1">
          <p className="text-[10px] text-[#71767b]">
            <a href="#" className="hover:underline">About Arena</a> • <a href="/privacy" className="hover:underline">Privacy</a>
          </p>
          <p className="text-[10px] text-[#71767b]">
            © 2024 Arena. All rights reserved.
          </p>
        </div>
      </div>
      </div>
    </aside>
  );
}
