import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Calendar, Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MatchDetailPage } from './Matchdetailpage';

// ── Types ─────────────────────────────────────────────────────
interface Match {
  id: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  time: string;
  league: string;
  leagueEmoji: string;
  status: 'live' | 'today' | 'upcoming' | 'result';
  minute?: string;
  date?: string;
  stadium?: string;
}

// ── API-Football helper ─────────────────────────────────────────
const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';

function getLeagueEmoji(country: string): string {
  const map: Record<string, string> = {
    England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Germany: '🇩🇪', France: '🇫🇷',
    Italy: '🇮🇹', Netherlands: '🇳🇱', Portugal: '🇵🇹', Brazil: '🇧🇷',
    Argentina: '🇦🇷', USA: '🇺🇸', Nigeria: '🇳🇬', World: '🌍',
  };
  return map[country] || '⚽';
}

async function fetchMatches(type: 'live' | 'today' | 'upcoming' | 'result'): Promise<Match[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    let endpoint = '';
    if (type === 'live') endpoint = `${API_BASE}/fixtures?live=all`;
    else if (type === 'today') endpoint = `${API_BASE}/fixtures?date=${today}&status=NS`;
    else if (type === 'upcoming') endpoint = `${API_BASE}/fixtures?date=${tomorrow}&status=NS`;
    else endpoint = `${API_BASE}/fixtures?from=${twoDaysAgo}&to=${yesterday}&status=FT`;

    const res = await fetch(endpoint, {
      headers: { 'x-apisports-key': API_KEY },
    });
    const data = await res.json();
    const fixtures = data.response || [];

    return fixtures.slice(0, 30).map((f: any) => {
      const status = f.fixture.status.short;
      const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'BT'].includes(status);
      const isFT = ['FT', 'AET', 'PEN'].includes(status);
      const date = new Date(f.fixture.date);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let matchStatus: Match['status'] = 'today';
      if (isLive) matchStatus = 'live';
      else if (isFT) matchStatus = 'result';
      else if (type === 'upcoming') matchStatus = 'upcoming';

      const yesterday2 = new Date(Date.now() - 86400000).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
      const twoDaysAgoStr = new Date(Date.now() - 172800000).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
      const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });

      return {
        id: String(f.fixture.id),
        home: f.teams.home.name,
        away: f.teams.away.name,
        homeScore: f.goals.home ?? undefined,
        awayScore: f.goals.away ?? undefined,
        time: isLive ? `${f.fixture.status.elapsed}'` : isFT ? 'FT' : timeStr,
        league: f.league.name,
        leagueEmoji: getLeagueEmoji(f.league.country),
        status: matchStatus,
        minute: isLive ? `${f.fixture.status.elapsed}'` : undefined,
        date: matchStatus === 'result'
          ? date.toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : twoDaysAgoStr
          : matchStatus === 'upcoming' ? 'Tomorrow' : undefined,
        stadium: f.fixture.venue?.name || '',
      };
    });
  } catch (e) {
    console.error('API error:', e);
    return [];
  }
}

// ── Match Card ────────────────────────────────────────────────
function MatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  const isLive = match.status === 'live';
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{match.leagueEmoji}</span>
          <span className="text-xs text-[#71767b] font-semibold">{match.league}</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1 bg-[#ef4444]/15 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[10px] text-[#ef4444] font-bold">LIVE {match.minute}</span>
          </div>
        )}
        {match.status === 'result' && (
          <span className="text-[10px] text-[#71767b] font-semibold">{match.date}</span>
        )}
        {match.status === 'upcoming' && (
          <span className="text-[10px] text-[#71767b] font-semibold">{match.date}</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-right">
          <p className={cn('font-bold text-sm', hasScore && match.homeScore! > match.awayScore! ? 'text-white' : 'text-[#e7e9ea]')}>
            {match.home}
          </p>
        </div>

        <div className="flex flex-col items-center shrink-0 min-w-[60px]">
          {hasScore ? (
            <div className="flex items-center gap-2">
              <span className={cn('text-xl font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>
                {match.homeScore}
              </span>
              <span className="text-[#71767b] text-sm">-</span>
              <span className={cn('text-xl font-black', isLive ? 'text-[#ef4444]' : 'text-white')}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-[#ef4444]">{match.time}</span>
          )}
          {match.status === 'result' && (
            <span className="text-[10px] text-[#71767b] mt-0.5">Full Time</span>
          )}
          {match.status === 'today' && match.stadium && (
            <span className="text-[10px] text-[#71767b] mt-0.5 truncate max-w-[80px]">{match.stadium}</span>
          )}
        </div>

        <div className="flex-1">
          <p className={cn('font-bold text-sm', hasScore && match.awayScore! > match.homeScore! ? 'text-white' : 'text-[#e7e9ea]')}>
            {match.away}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-[#71767b] shrink-0" />
      </div>
    </motion.div>
  );
}

// ── Live Page ─────────────────────────────────────────────────
export function LivePage() {
  const [activeTab, setActiveTab] = useState<'live' | 'today' | 'upcoming' | 'results'>('live');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  // Fetch matches when tab changes
  useEffect(() => {
    setLoading(true);
    const apiType = activeTab === 'results' ? 'result' : activeTab;
    fetchMatches(apiType as any).then(data => {
      setMatches(data);
      setLoading(false);
    });
  }, [activeTab]);

  // Get live count for badge
  useEffect(() => {
    fetchMatches('live').then(data => setLiveCount(data.length));
    fetchMatches('today').then(data => setTodayCount(data.length));
  }, []);

  // Auto refresh live matches every 60s
  useEffect(() => {
    if (activeTab !== 'live') return;
    const interval = setInterval(() => {
      fetchMatches('live').then(data => {
        setMatches(data);
        setLiveCount(data.length);
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [activeTab]);

  if (selectedMatchId) {
    return <MatchDetailPage onBack={() => setSelectedMatchId(null)} matchId={selectedMatchId} />;
  }

  const tabs = [
    { key: 'live',     label: 'Live',     icon: Zap,      count: liveCount },
    { key: 'today',    label: 'Today',    icon: Clock,    count: todayCount },
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, count: null },
    { key: 'results',  label: 'Results',  icon: Trophy,   count: null },
  ] as const;

  return (
    <div>
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 py-3">
          <h1 className="text-lg font-black text-white mb-3">Matches</h1>
          <div className="flex items-center gap-1.5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    isActive ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-black',
                      isActive ? 'bg-white/20 text-white' : 'bg-[#ef4444]/20 text-[#ef4444]'
                    )}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === 'live' && !loading && (
            <div className="px-4 py-2 bg-[#ef4444]/5 border-b border-[#ef4444]/10">
              <p className="text-xs text-[#ef4444] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse inline-block" />
                {matches.length} matches live right now · Auto-refreshes every 60s
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ef4444] animate-spin" />
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <p className="text-4xl mb-3">⚽</p>
              <p className="font-bold text-white mb-1">No matches right now</p>
              <p className="text-sm text-[#71767b]">Check back soon for upcoming fixtures</p>
            </div>
          ) : (
            matches.map(match => (
              <MatchCard key={match.id} match={match} onClick={() => setSelectedMatchId(match.id)} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
