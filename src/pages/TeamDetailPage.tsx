import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Trophy, Users, BarChart2,
  Calendar, ChevronRight, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Mock Data ─────────────────────────────────────────────────
const team = {
  id: 't1',
  name: 'Manchester City',
  short: 'MCI',
  league: 'Premier League',
  country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  color: '#6CABDD',
  founded: 1880,
  stadium: 'Etihad Stadium',
  capacity: '53,400',
  manager: 'Pep Guardiola',
  followers: '3.8M',
  position: 1,
  played: 32,
  won: 24,
  drawn: 4,
  lost: 4,
  gf: 78,
  ga: 32,
  points: 76,
};

const squad = [
  { id: 'p1', name: 'Ederson', position: 'GK', number: 31, nationality: '🇧🇷', age: 30 },
  { id: 'p2', name: 'Kyle Walker', position: 'RB', number: 2, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', age: 33 },
  { id: 'p3', name: 'Ruben Dias', position: 'CB', number: 3, nationality: '🇵🇹', age: 26 },
  { id: 'p4', name: 'Manuel Akanji', position: 'CB', number: 25, nationality: '🇨🇭', age: 28 },
  { id: 'p5', name: 'Josko Gvardiol', position: 'LB', number: 24, nationality: '🇭🇷', age: 22 },
  { id: 'p6', name: 'Rodri', position: 'CDM', number: 16, nationality: '🇪🇸', age: 27 },
  { id: 'p7', name: 'Kevin De Bruyne', position: 'CM', number: 17, nationality: '🇧🇪', age: 32 },
  { id: 'p8', name: 'Bernardo Silva', position: 'CM', number: 20, nationality: '🇵🇹', age: 29 },
  { id: 'p9', name: 'Phil Foden', position: 'LW', number: 47, nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', age: 23 },
  { id: 'p10', name: 'Erling Haaland', position: 'ST', number: 9, nationality: '🇳🇴', age: 23 },
  { id: 'p11', name: 'Jeremy Doku', position: 'RW', number: 11, nationality: '🇧🇪', age: 22 },
];

const fixtures = [
  { id: 'f1', home: 'Man City', away: 'Liverpool', date: 'Sat 20 Apr', time: '17:30', league: 'Premier League' },
  { id: 'f2', home: 'Real Madrid', away: 'Man City', date: 'Wed 24 Apr', time: '20:00', league: 'UCL' },
  { id: 'f3', home: 'Man City', away: 'Tottenham', date: 'Sun 28 Apr', time: '16:00', league: 'Premier League' },
];

const results = [
  { id: 'r1', home: 'Man City', away: 'Arsenal', homeScore: 2, awayScore: 1, date: 'Today', league: 'Premier League' },
  { id: 'r2', home: 'Chelsea', away: 'Man City', homeScore: 0, awayScore: 3, date: 'Apr 13', league: 'Premier League' },
  { id: 'r3', home: 'Man City', away: 'Dortmund', homeScore: 3, awayScore: 1, date: 'Apr 9', league: 'UCL' },
  { id: 'r4', home: 'Wolves', away: 'Man City', homeScore: 0, awayScore: 5, date: 'Apr 6', league: 'Premier League' },
];

const teamStats = [
  { label: 'Goals Scored', value: '78', rank: '1st' },
  { label: 'Goals Conceded', value: '32', rank: '3rd' },
  { label: 'Possession Avg', value: '62%', rank: '1st' },
  { label: 'Pass Accuracy', value: '91%', rank: '1st' },
  { label: 'Shots per Game', value: '18.4', rank: '1st' },
  { label: 'Clean Sheets', value: '14', rank: '2nd' },
];

// ── Position color ────────────────────────────────────────────
function posColor(pos: string) {
  if (pos === 'GK') return 'bg-yellow-500/20 text-yellow-400';
  if (['RB', 'CB', 'LB'].includes(pos)) return 'bg-blue-500/20 text-blue-400';
  if (['CDM', 'CM', 'CAM'].includes(pos)) return 'bg-green-500/20 text-green-400';
  return 'bg-[#ef4444]/20 text-[#ef4444]';
}

// ── Team Detail Page ──────────────────────────────────────────
interface TeamDetailPageProps {
  onBack: () => void;
}

export function TeamDetailPage({ onBack }: TeamDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'stats' | 'fixtures' | 'results'>('overview');

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: Trophy },
    { key: 'squad',     label: 'Squad',     icon: Users },
    { key: 'stats',     label: 'Stats',     icon: BarChart2 },
    { key: 'fixtures',  label: 'Fixtures',  icon: Calendar },
    { key: 'results',   label: 'Results',   icon: Zap },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] sticky top-14 z-20 bg-black/90 backdrop-blur-md">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
          style={{ backgroundColor: `${team.color}30`, border: `2px solid ${team.color}50` }}
        >
          {team.short}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{team.name}</p>
          <p className="text-xs text-[#71767b]">{team.country} {team.league}</p>
        </div>
        <button className="px-3 py-1.5 bg-[#ef4444] rounded-full text-xs font-bold text-white hover:bg-[#dc2626] transition-colors">
          Follow
        </button>
      </div>

      {/* Cover + Info */}
      <div
        className="h-28 flex items-end px-4 pb-4"
        style={{ background: `linear-gradient(135deg, ${team.color}30, #000)` }}
      >
        <div className="flex items-end gap-4 w-full">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
            style={{ backgroundColor: `${team.color}40`, border: `2px solid ${team.color}60` }}
          >
            {team.short}
          </div>
          <div className="flex-1 pb-1">
            <p className="text-xl font-black text-white">{team.name}</p>
            <p className="text-xs text-[#71767b]">{team.followers} followers · {team.league}</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 border-b border-[#1f1f1f]">
        {[
          { label: 'Position', value: `#${team.position}` },
          { label: 'Points', value: team.points },
          { label: 'Won', value: team.won },
          { label: 'GD', value: `+${team.gf - team.ga}` },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center py-3 border-r border-[#1f1f1f] last:border-0">
            <p className="text-lg font-black text-white">{s.value}</p>
            <p className="text-[10px] text-[#71767b]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f] overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 space-y-3">
                <p className="font-bold text-white text-sm">Club Info</p>
                {[
                  { label: 'Founded', value: team.founded },
                  { label: 'Stadium', value: team.stadium },
                  { label: 'Capacity', value: team.capacity },
                  { label: 'Manager', value: team.manager },
                  { label: 'League', value: team.league },
                ].map(info => (
                  <div key={info.label} className="flex items-center justify-between border-b border-[#1f1f1f] pb-2 last:border-0 last:pb-0">
                    <p className="text-xs text-[#71767b]">{info.label}</p>
                    <p className="text-sm font-semibold text-white">{info.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4">
                <p className="font-bold text-white text-sm mb-3">Season Record</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Played', value: team.played, color: 'text-white' },
                    { label: 'Won', value: team.won, color: 'text-green-400' },
                    { label: 'Drawn', value: team.drawn, color: 'text-yellow-400' },
                    { label: 'Lost', value: team.lost, color: 'text-[#ef4444]' },
                    { label: 'Goals For', value: team.gf, color: 'text-green-400' },
                    { label: 'Goals Against', value: team.ga, color: 'text-[#ef4444]' },
                  ].map(s => (
                    <div key={s.label} className="bg-black/40 rounded-xl p-3 text-center">
                      <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
                      <p className="text-[10px] text-[#71767b] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Squad */}
          {activeTab === 'squad' && (
            <div>
              <div className="px-4 py-2 border-b border-[#1f1f1f]">
                <p className="text-xs text-[#71767b]">{squad.length} players</p>
              </div>
              {squad.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center text-xs font-black text-[#71767b] shrink-0">
                    {player.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{player.name}</p>
                    <p className="text-xs text-[#71767b]">{player.nationality} · Age {player.age}</p>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', posColor(player.position))}>
                    {player.position}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#71767b] shrink-0" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Stats */}
          {activeTab === 'stats' && (
            <div className="p-4 space-y-3">
              <p className="font-bold text-white text-sm">Season Statistics</p>
              {teamStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3"
                >
                  <p className="text-sm text-[#71767b]">{stat.label}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-white">{stat.value}</p>
                    <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-bold">
                      {stat.rank}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Fixtures */}
          {activeTab === 'fixtures' && (
            <div>
              <div className="px-4 py-2 border-b border-[#1f1f1f]">
                <p className="text-xs text-[#71767b]">Upcoming matches</p>
              </div>
              {fixtures.map((fix, i) => (
                <motion.div
                  key={fix.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#71767b]">{fix.league}</span>
                    <span className="text-xs text-[#71767b]">{fix.date} · {fix.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn('font-bold text-sm', fix.home === team.name ? 'text-white' : 'text-[#e7e9ea]')}>{fix.home}</p>
                    <span className="text-xs text-[#ef4444] font-bold px-2">VS</span>
                    <p className={cn('font-bold text-sm', fix.away === team.name ? 'text-white' : 'text-[#e7e9ea]')}>{fix.away}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Results */}
          {activeTab === 'results' && (
            <div>
              <div className="px-4 py-2 border-b border-[#1f1f1f]">
                <p className="text-xs text-[#71767b]">Recent results</p>
              </div>
              {results.map((res, i) => {
                const cityHome = res.home === team.name;
                const cityScore = cityHome ? res.homeScore : res.awayScore;
                const oppScore = cityHome ? res.awayScore : res.homeScore;
                const won = cityScore > oppScore;
                const drew = cityScore === oppScore;
                return (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#71767b]">{res.league}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#71767b]">{res.date}</span>
                        <span className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-black',
                          won ? 'bg-green-500/20 text-green-400' : drew ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#ef4444]/20 text-[#ef4444]'
                        )}>
                          {won ? 'W' : drew ? 'D' : 'L'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn('font-bold text-sm', res.home === team.name ? 'text-white' : 'text-[#e7e9ea]')}>{res.home}</p>
                      <span className="text-sm font-black text-white">{res.homeScore} - {res.awayScore}</span>
                      <p className={cn('font-bold text-sm', res.away === team.name ? 'text-white' : 'text-[#e7e9ea]')}>{res.away}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}