import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Zap, MessageCircle,
  BarChart2, Clock, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Mock Match Data ───────────────────────────────────────────
const match = {
  id: 'l1',
  home: { name: 'Man City', short: 'MCI', color: '#6CABDD', score: 2 },
  away: { name: 'Arsenal', short: 'ARS', color: '#EF0107', score: 1 },
  minute: "67'",
  league: 'Premier League',
  stadium: 'Etihad Stadium',
  status: 'live',
};

const events = [
  { id: 'e1', minute: "67'", type: 'goal', team: 'home', player: 'Haaland', desc: '⚽ GOAL! Erling Haaland scores from close range. Man City 2-1 Arsenal', important: true },
  { id: 'e2', minute: "54'", type: 'yellow', team: 'away', player: 'Partey', desc: '🟨 Yellow card for Thomas Partey — reckless challenge on Rodri', important: false },
  { id: 'e3', minute: "43'", type: 'goal', team: 'away', player: 'Saka', desc: '⚽ GOAL! Bukayo Saka equalizes for Arsenal. Man City 1-1 Arsenal', important: true },
  { id: 'e4', minute: "31'", type: 'goal', team: 'home', player: 'De Bruyne', desc: '⚽ GOAL! Kevin De Bruyne opens the scoring. Man City 1-0 Arsenal', important: true },
  { id: 'e5', minute: "18'", type: 'chance', team: 'home', player: 'Haaland', desc: '💥 Big chance! Haaland heads wide from 6 yards out', important: false },
  { id: 'e6', minute: "7'", type: 'chance', team: 'away', player: 'Martinelli', desc: '💥 Martinelli fires just over the bar from 20 yards', important: false },
  { id: 'e7', minute: "1'", type: 'kickoff', team: 'home', player: '', desc: '🟢 Kick off! Man City vs Arsenal underway at Etihad Stadium', important: false },
];

const stats = [
  { label: 'Possession', home: '58%', away: '42%', homeVal: 58, awayVal: 42 },
  { label: 'Shots', home: '12', away: '7', homeVal: 12, awayVal: 7 },
  { label: 'Shots on Target', home: '5', away: '3', homeVal: 5, awayVal: 3 },
  { label: 'Corners', home: '6', away: '2', homeVal: 6, awayVal: 2 },
  { label: 'Fouls', home: '8', away: '11', homeVal: 8, awayVal: 11 },
  { label: 'Yellow Cards', home: '0', away: '1', homeVal: 0, awayVal: 1 },
  { label: 'Passes', home: '421', away: '312', homeVal: 421, awayVal: 312 },
  { label: 'Pass Accuracy', home: '89%', away: '81%', homeVal: 89, awayVal: 81 },
];

const chatMessages = [
  { id: 'cm1', user: 'John Pulse', text: 'Haaland is unreal tonight 🔥', time: '67:23', mine: false },
  { id: 'cm2', user: 'Sarah Kicks', text: 'Arsenal need to wake up in the second half', time: '66:45', mine: false },
  { id: 'cm3', user: 'Me', text: 'De Bruyne running the show as always', time: '65:12', mine: true },
  { id: 'cm4', user: 'NBA Central', text: 'City are too good on the counter', time: '63:00', mine: false },
  { id: 'cm5', user: 'UCL King', text: 'Saka was brilliant for that goal though', time: '44:00', mine: false },
];

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

export function MatchDetailPage({ onBack }: MatchDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'commentary' | 'stats' | 'chat'>('commentary');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(chatMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, {
      id: `cm${Date.now()}`,
      user: 'Me',
      text: chatInput.trim(),
      time: match.minute,
      mine: true,
    }]);
    setChatInput('');
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