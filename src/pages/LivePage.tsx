import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Calendar, Trophy, ChevronRight,
  RefreshCw, ArrowLeft, MapPin,
  Star, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, query as firestoreQuery, where,
  getDocs, updateDoc, doc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── API Config ─────────────────────────────────────────────────────────────
const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';
const API_BASE = 'https://v3.football.api-sports.io';
const SEASON = 2025;

async function apiCall(endpoint: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'x-apisports-key': API_KEY,
      },
    });
    const data = await res.json();
    return data.response || [];
  } catch { return []; }
}

// ── Sports & Leagues ───────────────────────────────────────────────────────
const SPORTS = [
  {
    key: 'football', label: 'Football', emoji: '⚽',
    leagues: [
      { id: 39, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
      { id: 140, name: 'La Liga', flag: '🇪🇸', country: 'Spain' },
      { id: 78, name: 'Bundesliga', flag: '🇩🇪', country: 'Germany' },
      { id: 135, name: 'Serie A', flag: '🇮🇹', country: 'Italy' },
      { id: 61, name: 'Ligue 1', flag: '🇫🇷', country: 'France' },
      { id: 2, name: 'Champions League', flag: '🏆', country: 'Europe' },
      { id: 3, name: 'Europa League', flag: '🌍', country: 'Europe' },
      { id: 848, name: 'Conference League', flag: '🌍', country: 'Europe' },
      { id: 88, name: 'Eredivisie', flag: '🇳🇱', country: 'Netherlands' },
      { id: 94, name: 'Primeira Liga', flag: '🇵🇹', country: 'Portugal' },
      { id: 203, name: 'Super Lig', flag: '🇹🇷', country: 'Turkey' },
      { id: 128, name: 'Liga Profesional', flag: '🇦🇷', country: 'Argentina' },
      { id: 71, name: 'Série A', flag: '🇧🇷', country: 'Brazil' },
      { id: 253, name: 'MLS', flag: '🇺🇸', country: 'USA' },
      { id: 333, name: 'NPFL', flag: '🇳🇬', country: 'Nigeria' },
      { id: 1, name: 'World Cup', flag: '🌍', country: 'World' },
      { id: 4, name: 'Euro Championship', flag: '🇪🇺', country: 'Europe' },
      { id: 6, name: 'Africa Cup', flag: '🌍', country: 'Africa' },
    ]
  },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
    venue: { name: string; city: string };
    referee: string;
  };
  league: { id: number; name: string; country: string; logo: string; flag: string; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

interface FixtureDetails {
  fixture: Fixture;
  events: FixtureEvent[];
  lineups: LineupData[];
  statistics: StatisticsData[];
  players: PlayerData[];
}

interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

interface LineupData {
  team: { id: number; name: string; logo: string; colors: any };
  formation: string;
  startXI: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[];
  substitutes: { player: { id: number; name: string; number: number; pos: string; grid: string | null } }[];
  coach: { id: number; name: string; photo: string };
}

interface StatisticsData {
  team: { id: number; name: string; logo: string };
  statistics: { type: string; value: string | number | null }[];
}

interface PlayerData {
  team: { id: number; name: string };
  players: {
    player: { id: number; name: string; photo: string };
    statistics: {
      games: { minutes: number; rating: string; captain: boolean };
      goals: { total: number | null; assists: number | null };
      shots: { total: number | null; on: number | null };
      passes: { total: number | null; accuracy: string | null };
      tackles: { total: number | null };
      cards: { yellow: number; red: number };
    }[];
  }[];
}

interface Standing {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  home: { played: number; win: number; draw: number; lose: number };
  away: { played: number; win: number; draw: number; lose: number };
}

// ── Tip Verification Engine ────────────────────────────────────────────────
function checkPrediction(pred: string, homeScore: number, awayScore: number, events: FixtureEvent[]): boolean {
  const p = pred.toLowerCase().trim();
  const total = homeScore + awayScore;

  // 1X2
  if (p === '1' || p === 'home win' || p === 'home') return homeScore > awayScore;
  if (p === 'x' || p === 'draw') return homeScore === awayScore;
  if (p === '2' || p === 'away win' || p === 'away') return awayScore > homeScore;

  // Double Chance
  if (p === '1x' || p === 'double chance 1x') return homeScore >= awayScore;
  if (p === 'x2' || p === 'double chance x2') return awayScore >= homeScore;
  if (p === '12' || p === 'double chance 12') return homeScore !== awayScore;

  // BTTS
  if (p === 'gg' || p === 'btts' || p === 'btts yes' || p === 'both teams to score') return homeScore > 0 && awayScore > 0;
  if (p === 'ng' || p === 'btts no' || p === 'no btts') return homeScore === 0 || awayScore === 0;

  // Over/Under
  const overMatch = p.match(/^over\s*([\d.]+)/);
  if (overMatch) return total > parseFloat(overMatch[1]);
  const underMatch = p.match(/^under\s*([\d.]+)/);
  if (underMatch) return total < parseFloat(underMatch[1]);

  // Correct Score
  const scoreMatch = p.match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (scoreMatch) return homeScore === parseInt(scoreMatch[1]) && awayScore === parseInt(scoreMatch[2]);

  // Home/Away to score
  if (p === 'home to score' || p === 'home team to score') return homeScore > 0;
  if (p === 'away to score' || p === 'away team to score') return awayScore > 0;

  // Clean sheet
  if (p.includes('clean sheet')) {
    if (p.includes('home')) return awayScore === 0;
    if (p.includes('away')) return homeScore === 0;
    return homeScore === 0 || awayScore === 0;
  }

  // Win to nil
  if (p.includes('win to nil')) {
    if (p.includes('home')) return homeScore > awayScore && awayScore === 0;
    if (p.includes('away')) return awayScore > homeScore && homeScore === 0;
  }

  // Goal times
  if (events.length > 0) {
    const goals = events.filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty');

    if (p === 'goal in first 10 minutes') return goals.some(g => g.time.elapsed <= 10);
    if (p === 'goal in first 15 minutes') return goals.some(g => g.time.elapsed <= 15);
    if (p === 'goal before half time') return goals.some(g => g.time.elapsed < 45);

    // First/Last team to score
    if (p.includes('first to score') || p.includes('first team to score')) {
      const firstGoal = goals.sort((a, b) => a.time.elapsed - b.time.elapsed)[0];
      if (!firstGoal) return false;
      if (p.includes('home')) return firstGoal.team.name.toLowerCase().includes('home');
      if (p.includes('away')) return firstGoal.team.name.toLowerCase().includes('away');
    }

    // Anytime scorer
    if (p.includes('anytime')) {
      const playerName = p.replace('anytime goal scorer', '').replace('anytime scorer', '').trim();
      return goals.some(g => g.player.name.toLowerCase().includes(playerName));
    }

    // First goal scorer
    if (p.includes('first goal scorer') || p.includes('first scorer')) {
      const playerName = p.replace('first goal scorer', '').replace('first scorer', '').trim();
      const firstGoal = goals.sort((a, b) => a.time.elapsed - b.time.elapsed)[0];
      return firstGoal?.player.name.toLowerCase().includes(playerName) || false;
    }
  }

  // Over/Under first half
  const htOverMatch = p.match(/(?:ht|first half)\s*over\s*([\d.]+)/);
  if (htOverMatch) return false; // needs HT score

  return false;
}

async function checkTipResults(userId: string) {
  try {
    const channelsSnap = await getDocs(
      firestoreQuery(collection(db, 'channels'), where('ownerId', '==', userId))
    );
    for (const channelDoc of channelsSnap.docs) {
      const tipsSnap = await getDocs(
        firestoreQuery(
          collection(db, 'channels', channelDoc.id, 'tips'),
          where('status', '==', 'pending')
        )
      );
      for (const tipDoc of tipsSnap.docs) {
        const tip = tipDoc.data();
        if (!tip.matches || tip.matches.length === 0) continue;

        let allSettled = true;
        let allWon = true;

        for (const match of tip.matches) {
          if (!match.home || !match.away) continue;
          try {
            // Search for fixture
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const fixtures = await apiCall(
              `/fixtures?team=${encodeURIComponent(match.home)}&season=${SEASON}&from=${weekAgo}&to=${today}&status=FT`
            );

            const matchedFixture = fixtures.find((f: any) =>
              f.teams.home.name.toLowerCase().includes(match.home.toLowerCase()) &&
              f.teams.away.name.toLowerCase().includes(match.away.toLowerCase())
            );

            if (!matchedFixture) { allSettled = false; continue; }

            // Get events for goal-time markets
            const details = await apiCall(`/fixtures?id=${matchedFixture.fixture.id}`);
            const events: FixtureEvent[] = details[0]?.events || [];

            const homeScore = matchedFixture.goals.home ?? 0;
            const awayScore = matchedFixture.goals.away ?? 0;
            const prediction = match.prediction || tip.prediction || '';

            const won = checkPrediction(prediction, homeScore, awayScore, events);
            if (!won) allWon = false;
          } catch { allSettled = false; }
        }

        if (allSettled) {
          await updateDoc(doc(db, 'channels', channelDoc.id, 'tips', tipDoc.id), {
            status: allWon ? 'won' : 'lost',
          });
          const allTipsSnap = await getDocs(collection(db, 'channels', channelDoc.id, 'tips'));
          const allTips = allTipsSnap.docs.map(d => d.data());
          const wonCount = allTips.filter(t => t.status === 'won').length;
          const total = allTips.filter(t => t.status !== 'pending').length;
          if (total > 0) {
            await updateDoc(doc(db, 'users', userId), {
              winRate: Math.round((wonCount / total) * 100),
              tipsCount: allTips.length,
              paidChannelEligible: allTips.length >= 5,
            });
          }
        }
      }
    }
  } catch (e) { console.error('Tip check error:', e); }
}

// ── Match Detail ───────────────────────────────────────────────────────────
function MatchDetail({ fixture, onBack }: { fixture: Fixture; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'lineups' | 'players' | 'h2h'>('events');
  const [details, setDetails] = useState<FixtureDetails | null>(null);
  const [h2h, setH2h] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  const isLive = !['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'NS'].includes(fixture.fixture.status.short);
  const hasScore = fixture.goals.home !== null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [fixtureData, h2hData] = await Promise.all([
        apiCall(`/fixtures?id=${fixture.fixture.id}`),
        apiCall(`/fixtures/headtohead?h2h=${fixture.teams.home.id}-${fixture.teams.away.id}&last=5`),
      ]);
      if (fixtureData[0]) {
        setDetails({
          fixture: fixtureData[0],
          events: fixtureData[0].events || [],
          lineups: fixtureData[0].lineups || [],
          statistics: fixtureData[0].statistics || [],
          players: fixtureData[0].players || [],
        });
      }
      setH2h(h2hData);
      setLoading(false);
    };
    load();
    // Auto refresh if live
    let interval: any;
    if (isLive) interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [fixture.fixture.id, isLive]);

  const homeGoals = details?.events.filter(e => e.type === 'Goal' && e.team.id === fixture.teams.home.id) || [];
  const awayGoals = details?.events.filter(e => e.type === 'Goal' && e.team.id === fixture.teams.away.id) || [];

  const getStatValue = (teamStats: StatisticsData, type: string) =>
    teamStats?.statistics.find(s => s.type === type)?.value ?? '-';

  const statRows = [
    'Ball Possession', 'Total Shots', 'Shots on Goal', 'Shots off Goal',
    'Blocked Shots', 'Corner Kicks', 'Offsides', 'Fouls',
    'Yellow Cards', 'Red Cards', 'Goalkeeper Saves', 'Total passes',
    'Passes accurate', 'Expected Goals',
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] sticky top-14 z-20 bg-black/90 backdrop-blur">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{fixture.league.name}</p>
          <p className="text-xs text-[#71767b]">{fixture.league.round}</p>
        </div>
        {isLive && (
          <div className="flex items-center gap-1 bg-[#ef4444]/15 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[10px] text-[#ef4444] font-bold">LIVE {fixture.fixture.status.elapsed}'</span>
          </div>
        )}
      </div>

      {/* Score Hero */}
      <div className="px-4 py-6 border-b border-[#1f1f1f] bg-gradient-to-b from-[#111] to-black">
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Home */}
          <div className="flex-1 text-center">
            <img src={fixture.teams.home.logo} alt={fixture.teams.home.name}
              className="w-16 h-16 object-contain mx-auto mb-2" />
            <p className="font-black text-sm text-white leading-tight">{fixture.teams.home.name}</p>
            {/* Goal scorers */}
            {homeGoals.map((g, i) => (
              <p key={i} className="text-[10px] text-[#71767b] mt-0.5">
                {g.player.name} {g.time.elapsed}'
                {g.detail === 'Own Goal' && ' (OG)'}
                {g.detail === 'Penalty' && ' (P)'}
              </p>
            ))}
          </div>

          {/* Score */}
          <div className="text-center shrink-0">
            {hasScore ? (
              <>
                <div className="flex items-center gap-3">
                  <span className={cn('text-5xl font-black', fixture.teams.home.winner ? 'text-white' : 'text-[#71767b]')}>
                    {fixture.goals.home}
                  </span>
                  <span className="text-2xl text-[#71767b]">-</span>
                  <span className={cn('text-5xl font-black', fixture.teams.away.winner ? 'text-white' : 'text-[#71767b]')}>
                    {fixture.goals.away}
                  </span>
                </div>
                {isLive ? (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                    <span className="text-xs text-[#ef4444] font-bold">{fixture.fixture.status.elapsed}'</span>
                  </div>
                ) : (
                  <p className="text-xs text-[#71767b] mt-1">{fixture.fixture.status.long}</p>
                )}
                {/* HT Score */}
                {fixture.score.halftime.home !== null && (
                  <p className="text-[10px] text-[#71767b] mt-0.5">
                    HT: {fixture.score.halftime.home} - {fixture.score.halftime.away}
                  </p>
                )}
                {/* Extra time */}
                {fixture.score.extratime.home !== null && (
                  <p className="text-[10px] text-yellow-400 mt-0.5">
                    AET: {fixture.score.extratime.home} - {fixture.score.extratime.away}
                  </p>
                )}
                {/* Penalties */}
                {fixture.score.penalty.home !== null && (
                  <p className="text-[10px] text-[#ef4444] mt-0.5">
                    Pen: {fixture.score.penalty.home} - {fixture.score.penalty.away}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-3xl font-black text-[#ef4444]">
                  {new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-[#71767b] mt-1">
                  {new Date(fixture.fixture.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 text-center">
            <img src={fixture.teams.away.logo} alt={fixture.teams.away.name}
              className="w-16 h-16 object-contain mx-auto mb-2" />
            <p className="font-black text-sm text-white leading-tight">{fixture.teams.away.name}</p>
            {awayGoals.map((g, i) => (
              <p key={i} className="text-[10px] text-[#71767b] mt-0.5">
                {g.player.name} {g.time.elapsed}'
                {g.detail === 'Own Goal' && ' (OG)'}
                {g.detail === 'Penalty' && ' (P)'}
              </p>
            ))}
          </div>
        </div>

        {/* Venue + Referee */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-[#71767b]">
          {fixture.fixture.venue.name && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fixture.fixture.venue.name}, {fixture.fixture.venue.city}</span>
          )}
          {fixture.fixture.referee && (
            <span className="flex items-center gap-1"><Star className="w-3 h-3" />{fixture.fixture.referee}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] overflow-x-auto scrollbar-hide">
        {(['events', 'stats', 'lineups', 'players', 'h2h'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 capitalize',
              activeTab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
            )}>{t === 'h2h' ? 'H2H' : t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Events */}
          {activeTab === 'events' && (
            <div className="p-4">
              {!details?.events.length ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">⚽</p>
                  <p className="text-sm text-[#71767b]">
                    {fixture.fixture.status.short === 'NS' ? 'Match not started yet' : 'No events recorded'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {details.events.map((event, i) => {
                    const isHome = event.team.id === fixture.teams.home.id;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className={cn('flex items-center gap-3', isHome ? 'flex-row' : 'flex-row-reverse')}>
                        <div className={cn('flex-1', isHome ? 'text-left' : 'text-right')}>
                          <p className="text-sm font-bold text-white">{event.player.name}</p>
                          {event.assist.name && (
                            <p className="text-xs text-[#71767b]">Assist: {event.assist.name}</p>
                          )}
                          <p className="text-xs text-[#71767b]">{event.detail}</p>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-base',
                            event.type === 'Goal' ? 'bg-green-500/20' :
                            event.type === 'Card' && event.detail === 'Yellow Card' ? 'bg-yellow-500/20' :
                            event.type === 'Card' ? 'bg-[#ef4444]/20' :
                            event.type === 'subst' ? 'bg-blue-500/20' : 'bg-white/5'
                          )}>
                            {event.type === 'Goal' ? '⚽' :
                             event.detail === 'Yellow Card' ? '🟨' :
                             event.detail === 'Red Card' ? '🟥' :
                             event.type === 'subst' ? '🔄' : '•'}
                          </div>
                          <span className="text-[10px] text-[#71767b] mt-0.5">{event.time.elapsed}'</span>
                        </div>
                        <div className="flex-1" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {activeTab === 'stats' && (
            <div className="p-4">
              {!details?.statistics.length ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm text-[#71767b]">Stats not available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {statRows.map(statType => {
                    const homeStats = details.statistics.find(s => s.team.id === fixture.teams.home.id);
                    const awayStats = details.statistics.find(s => s.team.id === fixture.teams.away.id);
                    const homeVal = homeStats ? getStatValue(homeStats, statType) : '-';
                    const awayVal = awayStats ? getStatValue(awayStats, statType) : '-';
                    if (homeVal === '-' && awayVal === '-') return null;
                    const homeNum = typeof homeVal === 'string' ? parseFloat(homeVal.replace('%', '')) || 0 : Number(homeVal) || 0;
                    const awayNum = typeof awayVal === 'string' ? parseFloat(awayVal.replace('%', '')) || 0 : Number(awayVal) || 0;
                    const total = homeNum + awayNum || 1;
                    return (
                      <div key={statType}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-black text-white">{homeVal}</span>
                          <span className="text-[10px] text-[#71767b]">{statType}</span>
                          <span className="text-sm font-black text-white">{awayVal}</span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-[#1f1f1f]">
                          <div className="bg-[#ef4444] rounded-l-full" style={{ width: `${(homeNum / total) * 100}%` }} />
                          <div className="bg-blue-500 rounded-r-full" style={{ width: `${(awayNum / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lineups */}
          {activeTab === 'lineups' && (
            <div className="p-4">
              {!details?.lineups.length ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">👥</p>
                  <p className="text-sm text-[#71767b]">Lineups not announced yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {details.lineups.map((lineup, li) => (
                    <div key={li}>
                      <div className="flex items-center gap-2 mb-3">
                        <img src={lineup.team.logo} alt="" className="w-6 h-6 object-contain" />
                        <p className="text-xs font-black text-white">{lineup.team.name}</p>
                      </div>
                      <p className="text-[10px] text-[#ef4444] font-bold mb-2">Formation: {lineup.formation}</p>
                      <p className="text-[9px] text-[#71767b] font-bold mb-1">STARTING XI</p>
                      {lineup.startXI.map(({ player }, i) => (
                        <div key={i} className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-[#71767b] w-4">{player.number}</span>
                          <span className="text-xs text-white truncate">{player.name}</span>
                          <span className="text-[9px] text-[#ef4444] ml-auto">{player.pos}</span>
                        </div>
                      ))}
                      <p className="text-[9px] text-[#71767b] font-bold mb-1 mt-3">SUBSTITUTES</p>
                      {lineup.substitutes.map(({ player }, i) => (
                        <div key={i} className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-[#71767b] w-4">{player.number}</span>
                          <span className="text-xs text-[#71767b] truncate">{player.name}</span>
                        </div>
                      ))}
                      <p className="text-[9px] text-[#71767b] font-bold mt-2">COACH: {lineup.coach.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Players */}
          {activeTab === 'players' && (
            <div className="p-4">
              {!details?.players.length ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">⭐</p>
                  <p className="text-sm text-[#71767b]">Player stats not available yet</p>
                </div>
              ) : details.players.map((teamData, ti) => (
                <div key={ti} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-black text-white">{teamData.team.name}</p>
                  </div>
                  <div className="grid grid-cols-7 text-[9px] text-[#71767b] font-bold px-2 mb-1">
                    <span className="col-span-2">Player</span>
                    <span className="text-center">Min</span>
                    <span className="text-center">G</span>
                    <span className="text-center">A</span>
                    <span className="text-center">Shots</span>
                    <span className="text-center">Rtg</span>
                  </div>
                  {teamData.players.map(({ player, statistics }, pi) => {
                    const s = statistics[0];
                    const rating = parseFloat(s?.games?.rating || '0');
                    return (
                      <div key={pi} className={cn('grid grid-cols-7 px-2 py-1.5 rounded-lg mb-0.5',
                        rating >= 8 ? 'bg-green-500/5' : rating >= 7 ? 'bg-white/[0.02]' : ''
                      )}>
                        <span className="col-span-2 text-xs text-white truncate">
                          {s?.games?.captain && '©'}{player.name}
                        </span>
                        <span className="text-[11px] text-[#71767b] text-center">{s?.games?.minutes || '-'}</span>
                        <span className="text-[11px] text-center font-bold text-green-400">{s?.goals?.total || '-'}</span>
                        <span className="text-[11px] text-center text-blue-400">{s?.goals?.assists || '-'}</span>
                        <span className="text-[11px] text-center text-[#71767b]">{s?.shots?.on || '-'}</span>
                        <span className={cn('text-[11px] text-center font-bold',
                          rating >= 8 ? 'text-green-400' : rating >= 7 ? 'text-yellow-400' : 'text-[#71767b]'
                        )}>
                          {rating > 0 ? rating.toFixed(1) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* H2H */}
          {activeTab === 'h2h' && (
            <div className="p-4">
              <p className="text-xs font-black text-[#71767b] uppercase mb-3">Last 5 Meetings</p>
              {!h2h.length ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-sm text-[#71767b]">No H2H data available</p>
                </div>
              ) : h2h.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 py-2.5 border-b border-[#1f1f1f]">
                  <span className="text-[10px] text-[#71767b] shrink-0 w-16">
                    {new Date(f.fixture.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <p className={cn('text-xs font-bold flex-1 text-right', f.teams.home.winner ? 'text-white' : 'text-[#71767b]')}>
                      {f.teams.home.name}
                    </p>
                    <span className="text-xs font-black text-white shrink-0 bg-[#1f1f1f] px-2 py-0.5 rounded">
                      {f.goals.home} - {f.goals.away}
                    </span>
                    <p className={cn('text-xs font-bold flex-1', f.teams.away.winner ? 'text-white' : 'text-[#71767b]')}>
                      {f.teams.away.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Standings View ─────────────────────────────────────────────────────────
function StandingsView({ leagueId }: { leagueId: number }) {
  const [standings, setStandings] = useState<Standing[][]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    setLoading(true);
    apiCall(`/standings?league=${leagueId}&season=${SEASON}`).then(data => {
      const groups = data[0]?.league?.standings || [];
      setStandings(groups);
      setLoading(false);
    });
  }, [leagueId]);

  if (loading) return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" /></div>;

  if (!standings.length) return (
    <div className="text-center py-12">
      <p className="text-2xl mb-2">📊</p>
      <p className="text-sm text-[#71767b]">Standings not available for this league/season</p>
    </div>
  );

  return (
    <div>
      {standings.map((group, gi) => {
        const isExpanded = expandedGroups.has(gi);
        const groupName = group[0]?.group;
        return (
          <div key={gi} className="mb-2">
            {standings.length > 1 && (
              <button
                onClick={() => {
                  const next = new Set(expandedGroups);
                  isExpanded ? next.delete(gi) : next.add(gi);
                  setExpandedGroups(next);
                }}
                className="w-full flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#1f1f1f]">
                <p className="text-xs font-black text-white">{groupName}</p>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-[#71767b]" /> : <ChevronDown className="w-4 h-4 text-[#71767b]" />}
              </button>
            )}
            {isExpanded && (
              <>
                <div className="grid grid-cols-10 px-4 py-2 border-b border-[#1f1f1f] text-[10px] text-[#71767b] font-bold">
                  <span>#</span>
                  <span className="col-span-3">Club</span>
                  <span className="text-center">MP</span>
                  <span className="text-center">W</span>
                  <span className="text-center">D</span>
                  <span className="text-center">L</span>
                  <span className="text-center">GD</span>
                  <span className="text-center text-white">Pts</span>
                </div>
                {group.map((standing, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-10 px-4 py-2 border-b border-[#1f1f1f] items-center hover:bg-white/[0.02] transition-colors">
                    <span className={cn('text-xs font-black',
                      standing.description?.toLowerCase().includes('champions') ? 'text-[#ef4444]' :
                      standing.description?.toLowerCase().includes('europa') ? 'text-blue-400' :
                      standing.description?.toLowerCase().includes('relegation') ? 'text-orange-400' : 'text-[#71767b]'
                    )}>{standing.rank}</span>
                    <div className="col-span-3 flex items-center gap-1.5">
                      <img src={standing.team.logo} alt="" className="w-4 h-4 object-contain shrink-0" />
                      <span className="text-xs font-semibold text-white truncate">{standing.team.name}</span>
                    </div>
                    <span className="text-xs text-[#71767b] text-center">{standing.all.played}</span>
                    <span className="text-xs text-green-400 text-center">{standing.all.win}</span>
                    <span className="text-xs text-[#71767b] text-center">{standing.all.draw}</span>
                    <span className="text-xs text-[#ef4444] text-center">{standing.all.lose}</span>
                    <span className={cn('text-xs text-center', standing.goalsDiff > 0 ? 'text-green-400' : standing.goalsDiff < 0 ? 'text-[#ef4444]' : 'text-[#71767b]')}>
                      {standing.goalsDiff > 0 ? '+' : ''}{standing.goalsDiff}
                    </span>
                    <span className="text-sm font-black text-white text-center">{standing.points}</span>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Match Card ─────────────────────────────────────────────────────────────
function MatchCard({ fixture, onClick }: { fixture: Fixture; onClick: () => void }) {
  const status = fixture.fixture.status.short;
  const isLive = !['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'NS', 'TBD'].includes(status);
  const isFinished = ['FT', 'AET', 'PEN'].includes(status);
  const hasScore = fixture.goals.home !== null;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#71767b]">{fixture.league.round}</span>
        {isLive ? (
          <div className="flex items-center gap-1 bg-[#ef4444]/15 px-1.5 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[10px] text-[#ef4444] font-bold">{fixture.fixture.status.elapsed}'</span>
          </div>
        ) : isFinished ? (
          <span className="text-[10px] text-[#71767b]">FT</span>
        ) : (
          <span className="text-[10px] text-[#71767b]">
            {new Date(fixture.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <p className={cn('font-bold text-sm', fixture.teams.home.winner ? 'text-white' : hasScore ? 'text-[#71767b]' : 'text-white')}>
            {fixture.teams.home.name}
          </p>
          <img src={fixture.teams.home.logo} alt="" className="w-7 h-7 object-contain shrink-0" />
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 shrink-0 min-w-[64px] justify-center">
          {hasScore ? (
            <>
              <span className={cn('text-xl font-black', isLive ? 'text-[#ef4444]' : fixture.teams.home.winner ? 'text-white' : 'text-[#71767b]')}>
                {fixture.goals.home}
              </span>
              <span className="text-[#71767b]">-</span>
              <span className={cn('text-xl font-black', isLive ? 'text-[#ef4444]' : fixture.teams.away.winner ? 'text-white' : 'text-[#71767b]')}>
                {fixture.goals.away}
              </span>
            </>
          ) : (
            <span className="text-sm font-black text-[#ef4444]">VS</span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1">
          <img src={fixture.teams.away.logo} alt="" className="w-7 h-7 object-contain shrink-0" />
          <p className={cn('font-bold text-sm', fixture.teams.away.winner ? 'text-white' : hasScore ? 'text-[#71767b]' : 'text-white')}>
            {fixture.teams.away.name}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-[#71767b] shrink-0" />
      </div>

      {fixture.fixture.venue.name && !hasScore && (
        <p className="text-[9px] text-[#71767b] mt-1 flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" />{fixture.fixture.venue.name}
        </p>
      )}
    </motion.div>
  );
}

// ── Live Page ──────────────────────────────────────────────────────────────
export function LivePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'results' | 'standings'>('today');
  const [activeSport] = useState(SPORTS[0]);
  const [activeLeague, setActiveLeague] = useState(SPORTS[0].leagues[0]);
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingTips, setCheckingTips] = useState(false);
  const [lastChecked, setLastChecked] = useState('');
  const refreshTimer = useRef<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setUserId(user?.uid || null));
    return () => unsub();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const loadFixtures = useCallback(async () => {
    setLoading(true);
    try {
      let data: Fixture[] = [];
      if (activeTab === 'today') {
        data = await apiCall(`/fixtures?league=${activeLeague.id}&season=${SEASON}&date=${today}`);
      } else if (activeTab === 'upcoming') {
        data = await apiCall(`/fixtures?league=${activeLeague.id}&season=${SEASON}&from=${today}&to=${nextWeek}&status=NS-TBD`);
      } else if (activeTab === 'results') {
        data = await apiCall(`/fixtures?league=${activeLeague.id}&season=${SEASON}&from=${lastWeek}&to=${today}&status=FT-AET-PEN`);
      }
      setFixtures(data);
    } catch { setFixtures([]); }
    setLoading(false);
  }, [activeTab, activeLeague, today, nextWeek, lastWeek]);

  useEffect(() => {
    if (activeTab !== 'standings') loadFixtures();
    else setLoading(false);

    // Auto refresh every 60s when on today tab
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (activeTab === 'today') {
      refreshTimer.current = setInterval(loadFixtures, 60000);
    }
    return () => clearInterval(refreshTimer.current);
  }, [loadFixtures, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFixtures();
    setRefreshing(false);
  };

  const handleCheckTips = useCallback(async () => {
    if (!userId) return;
    setCheckingTips(true);
    await checkTipResults(userId);
    setCheckingTips(false);
    setLastChecked(new Date().toLocaleTimeString());
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    handleCheckTips();
    const interval = setInterval(handleCheckTips, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, handleCheckTips]);

  if (selectedFixture) return <MatchDetail fixture={selectedFixture} onBack={() => setSelectedFixture(null)} />;

  const tabs = [
    { key: 'today', label: 'Today', icon: Zap },
    { key: 'upcoming', label: 'Upcoming', icon: Calendar },
    { key: 'results', label: 'Results', icon: Trophy },
    { key: 'standings', label: 'Standings', icon: Star },
  ] as const;

  const liveFixtures = fixtures.filter(f => !['FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'NS', 'TBD'].includes(f.fixture.status.short));
  const scheduledFixtures = fixtures.filter(f => ['NS', 'TBD'].includes(f.fixture.status.short));
  const finishedFixtures = fixtures.filter(f => ['FT', 'AET', 'PEN'].includes(f.fixture.status.short));

  return (
    <div className="pb-20">
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-black text-white">Live & Scores</h1>
            <div className="flex items-center gap-2">
              {lastChecked && <span className="text-[10px] text-[#71767b]">✓ {lastChecked}</span>}
              <button onClick={handleRefresh} disabled={refreshing} className="p-1.5 rounded-full hover:bg-white/10">
                <RefreshCw className={cn('w-4 h-4 text-[#71767b]', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Main tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                    activeTab === tab.key ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.key === 'today' && liveFixtures.length > 0 && (
                    <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded-full font-black">{liveFixtures.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* League selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {(showAllLeagues ? activeSport.leagues : activeSport.leagues.slice(0, 8)).map(league => (
              <button key={league.id} onClick={() => setActiveLeague(league)}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0',
                  activeLeague.id === league.id
                    ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                    : 'text-[#71767b] hover:text-white bg-white/5'
                )}>
                {league.flag} {league.name}
              </button>
            ))}
            <button onClick={() => setShowAllLeagues(!showAllLeagues)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0 text-[#71767b] hover:text-white bg-white/5">
              {showAllLeagues ? '← Less' : `+${activeSport.leagues.length - 8} More`}
            </button>
          </div>
        </div>
      </div>

      {/* Tip checker banner */}
      {userId && (
        <div className="px-4 py-2 bg-blue-500/5 border-b border-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <p className="text-xs text-blue-400">Auto-checking pending tips against real results</p>
          </div>
          <button onClick={handleCheckTips} disabled={checkingTips}
            className="text-[10px] text-blue-400 font-bold shrink-0">
            {checkingTips ? 'Checking...' : 'Check now'}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeTab + activeLeague.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

          {activeTab === 'standings' ? (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center gap-2">
                <img src={`https://media.api-sports.io/football/leagues/${activeLeague.id}.png`} alt="" className="w-5 h-5 object-contain" />
                <p className="text-sm font-black text-white">{activeLeague.flag} {activeLeague.name} — {SEASON}/{SEASON + 1}</p>
              </div>
              <StandingsView leagueId={activeLeague.id} />
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-[#71767b]">Loading {activeLeague.name} fixtures...</p>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <p className="text-4xl mb-3">⚽</p>
              <p className="font-bold text-white mb-1">No matches found</p>
              <p className="text-sm text-[#71767b]">
                {activeTab === 'today' ? `No ${activeLeague.name} matches today` :
                 activeTab === 'upcoming' ? 'No upcoming fixtures this week' :
                 'No recent results'}
              </p>
            </div>
          ) : (
            <div>
              {/* League header */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border-b border-[#1f1f1f]">
                <img src={`https://media.api-sports.io/football/leagues/${activeLeague.id}.png`} alt="" className="w-5 h-5 object-contain" />
                <p className="text-xs font-black text-[#71767b] uppercase">{activeLeague.name}</p>
                <span className="ml-auto text-[10px] text-[#71767b]">{fixtures.length} matches</span>
              </div>

              {activeTab === 'today' ? (
                <>
                  {liveFixtures.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-[#ef4444]/10 border-b border-[#ef4444]/20">
                        <p className="text-xs font-black text-[#ef4444] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse inline-block" />
                          {liveFixtures.length} LIVE
                        </p>
                      </div>
                      {liveFixtures.map(f => <MatchCard key={f.fixture.id} fixture={f} onClick={() => setSelectedFixture(f)} />)}
                    </div>
                  )}
                  {scheduledFixtures.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-[#1f1f1f]">
                        <p className="text-[10px] font-bold text-[#71767b]">UPCOMING TODAY</p>
                      </div>
                      {scheduledFixtures.map(f => <MatchCard key={f.fixture.id} fixture={f} onClick={() => setSelectedFixture(f)} />)}
                    </div>
                  )}
                  {finishedFixtures.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 bg-[#0a0a0a] border-b border-[#1f1f1f]">
                        <p className="text-[10px] font-bold text-[#71767b]">FINISHED</p>
                      </div>
                      {finishedFixtures.map(f => <MatchCard key={f.fixture.id} fixture={f} onClick={() => setSelectedFixture(f)} />)}
                    </div>
                  )}
                </>
              ) : (
                fixtures.map(f => <MatchCard key={f.fixture.id} fixture={f} onClick={() => setSelectedFixture(f)} />)
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
