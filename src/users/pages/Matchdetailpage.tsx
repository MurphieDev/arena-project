import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Zap, MessageCircle,
  BarChart2, Clock, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query as firestoreQuery, orderBy, doc, getDoc
} from 'firebase/firestore';
import { useAuth } from '../../auth/hooks/AuthContext';



// ── Stat Bar ──────────────────────────────────────────────────
function StatBar({ label, home, away, homeVal, awayVal }: {
  label: string; home: string; away: string; homeVal: number; awayVal: number;
}) {
  const total = homeVal + awayVal || 1;
  const homePercent = (homeVal / total) * 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-white w-12 text-left">{home}</span>
        <span className="text-xs text-[#71767b] flex-1 text-center">{label}</span>
        <span className="text-sm font-bold text-white w-12 text-right">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-[#1f1f1f]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-[#6CABDD] rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - homePercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-[#EF0107] rounded-r-full"
        />
      </div>
    </div>
  );
}

// ── Match Detail Page ─────────────────────────────────────────
interface MatchDetailPageProps {
  onBack: () => void;
}

export function MatchDetailPage({ onBack, matchId }: MatchDetailPageProps & { matchId?: string }) {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const userName = currentUser?.name || currentUser?.displayName || 'User';

  const [activeTab, setActiveTab] = useState<'commentary' | 'stats' | 'chat'>('commentary');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const match = matchData || {
    id: matchId || 'live',
    home: { name: 'Home', short: 'HME', color: '#6CABDD', score: 0 },
    away: { name: 'Away', short: 'AWY', color: '#EF0107', score: 0 },
    minute: "0'",
    league: 'Live Match',
    stadium: '',
    status: 'live',
  };

  // Load real match data from API-Football
  useEffect(() => {
    if (!matchId) return;
    const API_KEY = '71b6bd51ec2a77eee7d4a472b85436f0';

    const fetchMatchData = async () => {
      try {
        const [fixtureRes, eventsRes, statsRes] = await Promise.all([
          fetch(`https://v3.football.api-sports.io/fixtures?id=${matchId}`, { headers: { 'x-apisports-key': API_KEY } }),
          fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`, { headers: { 'x-apisports-key': API_KEY } }),
          fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`, { headers: { 'x-apisports-key': API_KEY } }),
        ]);

        const [fixtureData, eventsData, statsData] = await Promise.all([
          fixtureRes.json(), eventsRes.json(), statsRes.json()
        ]);

        const fixture = fixtureData.response?.[0];
        if (fixture) {
          setMatchData({
            id: matchId,
            home: {
              name: fixture.teams.home.name,
              short: fixture.teams.home.name.substring(0, 3).toUpperCase(),
              color: '#6CABDD',
              score: fixture.goals.home ?? 0,
            },
            away: {
              name: fixture.teams.away.name,
              short: fixture.teams.away.name.substring(0, 3).toUpperCase(),
              color: '#EF0107',
              score: fixture.goals.away ?? 0,
            },
            minute: `${fixture.fixture.status.elapsed || 0}'`,
            league: fixture.league.name,
            stadium: fixture.fixture.venue?.name || '',
            status: ['1H','HT','2H','ET','P'].includes(fixture.fixture.status.short) ? 'live' : 'finished',
          });
        }

        // Map events
        const mappedEvents = (eventsData.response || []).map((e: any, i: number) => ({
          id: `e${i}`,
          minute: `${e.time.elapsed}'`,
          type: e.type.toLowerCase().includes('goal') ? 'goal' : e.type.toLowerCase().includes('card') ? (e.detail.toLowerCase().includes('yellow') ? 'yellow' : 'red') : 'chance',
          team: e.team.id === fixture?.teams?.home?.id ? 'home' : 'away',
          player: e.player.name || '',
          desc: `${e.type === 'Goal' ? '⚽' : e.detail?.includes('Yellow') ? '🟨' : e.detail?.includes('Red') ? '🟥' : '•'} ${e.player.name} - ${e.detail || e.type}`,
          important: e.type === 'Goal',
        })).reverse();
        setEvents(mappedEvents);

        // Map stats
        const homeStats = statsData.response?.[0]?.statistics || [];
        const awayStats = statsData.response?.[1]?.statistics || [];
        const mappedStats = homeStats.map((s: any, i: number) => {
          const homeVal = typeof s.value === 'string' ? parseFloat(s.value) || 0 : s.value || 0;
          const awayVal = typeof awayStats[i]?.value === 'string' ? parseFloat(awayStats[i]?.value) || 0 : awayStats[i]?.value || 0;
          return {
            label: s.type,
            home: String(s.value || 0),
            away: String(awayStats[i]?.value || 0),
            homeVal: Math.min(homeVal, 100),
            awayVal: Math.min(awayVal, 100),
          };
        }).filter((s: any) => ['Ball Possession', 'Total Shots', 'Shots on Goal', 'Corner Kicks', 'Fouls', 'Yellow Cards', 'Total passes'].includes(s.label));
        setStats(mappedStats);

      } catch (e) {
        console.error('Error fetching match data:', e);
      }
    };

    fetchMatchData();

    // Auto refresh if live
    const interval = setInterval(fetchMatchData, 60000);
    return () => clearInterval(interval);
  }, [matchId]);

  // Real-time live chat
  useEffect(() => {
    const chatId = matchId || 'live-general';
    const q = firestoreQuery(
      collection(db, 'liveChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          user: data.userName || 'User',
          text: data.text || '',
          time: data.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
          mine: data.userId === userId,
        };
      }));
      if (activeTab === 'chat') {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    });
    return () => unsub();
  }, [matchId, userId, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !userId) return;
    const text = chatInput.trim();
    setChatInput('');
    const chatId = matchId || 'live-general';
    await addDoc(collection(db, 'liveChats', chatId, 'messages'), {
      userId,
      userName,
      text,
      createdAt: serverTimestamp(),
    });
  };

  const tabs = [
    { key: 'commentary', label: 'Commentary', icon: MessageCircle },
    { key: 'stats',      label: 'Stats',      icon: BarChart2 },
    { key: 'chat',       label: 'Live Chat',  icon: Zap },
  ] as const;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">

      {/* Back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <p className="text-sm font-bold text-white">{match.league}</p>
          <p className="text-xs text-[#71767b]">{match.stadium}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-[#ef4444]/15 px-2.5 py-1 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
          <span className="text-xs text-[#ef4444] font-bold">LIVE {match.minute}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-4 py-5 border-b border-[#1f1f1f] shrink-0 bg-gradient-to-b from-[#111] to-black">
        <div className="flex items-center justify-between gap-4">

          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
              style={{ backgroundColor: `${match.home.color}20`, border: `2px solid ${match.home.color}40` }}
            >
              {match.home.short}
            </div>
            <p className="text-sm font-bold text-white text-center">{match.home.name}</p>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-black text-white">{match.home.score}</span>
              <span className="text-2xl text-[#71767b]">-</span>
              <span className="text-5xl font-black text-white">{match.away.score}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#ef4444]" />
              <span className="text-xs text-[#ef4444] font-bold">{match.minute}</span>
            </div>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white"
              style={{ backgroundColor: `${match.away.color}20`, border: `2px solid ${match.away.color}40` }}
            >
              {match.away.short}
            </div>
            <p className="text-sm font-bold text-white text-center">{match.away.name}</p>
          </div>
        </div>

        {/* Goal scorers */}
        <div className="flex justify-between mt-3 px-2">
          <div className="text-xs text-[#71767b] space-y-0.5">
            {events.filter(e => e.type === 'goal' && e.team === 'home').map(e => (
              <p key={e.id}>⚽ {e.player} {e.minute}</p>
            ))}
          </div>
          <div className="text-xs text-[#71767b] space-y-0.5 text-right">
            {events.filter(e => e.type === 'goal' && e.team === 'away').map(e => (
              <p key={e.id}>{e.minute} {e.player} ⚽</p>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                activeTab === tab.key
                  ? 'bg-[#ef4444] text-white'
                  : 'text-[#71767b] hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >

            {/* ── Commentary ── */}
            {activeTab === 'commentary' && (
              <div className="divide-y divide-[#1f1f1f]">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex gap-3 px-4 py-3',
                      event.important && 'bg-[#ef4444]/5'
                    )}
                  >
                    <div className="w-10 shrink-0 text-right">
                      <span className={cn(
                        'text-xs font-black',
                        event.important ? 'text-[#ef4444]' : 'text-[#71767b]'
                      )}>
                        {event.minute}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm leading-relaxed',
                        event.important ? 'text-white font-semibold' : 'text-[#71767b]'
                      )}>
                        {event.desc}
                      </p>
                      {event.important && (
                        <div className="mt-1 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#ef4444]" />
                          <span className="text-[10px] text-[#ef4444] font-bold">KEY EVENT</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ── Stats ── */}
            {activeTab === 'stats' && (
              <div className="px-4 py-4">
                {/* Team labels */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-white">{match.home.short}</span>
                  <span className="text-xs text-[#71767b]">Match Stats</span>
                  <span className="text-sm font-black text-white">{match.away.short}</span>
                </div>
                {stats.map(stat => (
                  <StatBar key={stat.label} {...stat} />
                ))}
              </div>
            )}

            {/* ── Live Chat ── */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn('flex gap-2', msg.mine ? 'justify-end' : 'justify-start')}
                    >
                      {!msg.mine && (
                        <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center text-[10px] font-black text-[#ef4444] shrink-0 mt-1">
                          {msg.user[0]}
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[75%]',
                        msg.mine ? 'items-end' : 'items-start'
                      )}>
                        {!msg.mine && (
                          <p className="text-[10px] text-[#71767b] mb-0.5 ml-1">{msg.user}</p>
                        )}
                        <div className={cn(
                          'px-3 py-2 rounded-2xl text-sm',
                          msg.mine
                            ? 'bg-[#ef4444] text-white rounded-br-sm'
                            : 'bg-[#111] text-[#e7e9ea] border border-[#1f1f1f] rounded-bl-sm'
                        )}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-[#71767b] mt-0.5 mx-1">{msg.time}</p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Chat Input */}
                <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1f1f1f] bg-black shrink-0">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="React to the match..."
                    className="flex-1 bg-[#111] border border-[#1f1f1f] px-4 py-2 rounded-full text-sm outline-none text-white placeholder:text-[#71767b] focus:border-[#ef4444]/30 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    className="w-9 h-9 bg-[#ef4444] rounded-full flex items-center justify-center hover:bg-[#dc2626] transition-colors disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
