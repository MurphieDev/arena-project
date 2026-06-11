import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BarChart2, TrendingUp,
  RefreshCw, Trophy, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Mock Data ─────────────────────────────────────────────────
const player = {
  id: 'p10',
  name: 'Erling Haaland',
  position: 'Striker',
  number: 9,
  nationality: '🇳🇴',
  country: 'Norway',
  age: 23,
  height: '194cm',
  weight: '88kg',
  team: 'Manchester City',
  teamShort: 'MCI',
  teamColor: '#6CABDD',
  marketValue: '€180M',
  followers: '4.1M',
  foot: 'Left',
};

const seasonStats = [
  { label: 'Goals', value: 28, max: 40 },
  { label: 'Assists', value: 6, max: 20 },
  { label: 'Shots', value: 89, max: 120 },
  { label: 'Shots on Target', value: 54, max: 89 },
  { label: 'Minutes Played', value: 2430, max: 2880 },
  { label: 'Headed Goals', value: 8, max: 28 },
];

const careerStats = [
  { season: '2024/25', club: 'Man City', apps: 28, goals: 28, assists: 6 },
  { season: '2023/24', club: 'Man City', apps: 31, goals: 27, assists: 5 },
  { season: '2022/23', club: 'Man City', apps: 35, goals: 36, assists: 8 },
  { season: '2021/22', club: 'Dortmund', apps: 29, goals: 22, assists: 7 },
  { season: '2020/21', club: 'Dortmund', apps: 41, goals: 41, assists: 12 },
  { season: '2019/20', club: 'Dortmund', apps: 26, goals: 16, assists: 8 },
];

const transfers = [
  { id: 'tr1', from: 'Borussia Dortmund', to: 'Manchester City', year: 2022, fee: '€51M', type: 'transfer' },
  { id: 'tr2', from: 'RB Salzburg', to: 'Borussia Dortmund', year: 2020, fee: '€20M', type: 'transfer' },
  { id: 'tr3', from: 'Molde FK', to: 'RB Salzburg', year: 2019, fee: '€3M', type: 'transfer' },
  { id: 'tr4', from: 'Youth', to: 'Molde FK', year: 2017, fee: 'Free', type: 'debut' },
];

const achievements = [
  { title: 'Premier League', year: '2022/23', icon: '🏆' },
  { title: 'UEFA Champions League', year: '2022/23', icon: '🏆' },
  { title: 'FA Cup', year: '2022/23', icon: '🏆' },
  { title: 'Premier League Top Scorer', year: '2022/23', icon: '⚽' },
  { title: 'Bundesliga Top Scorer', year: '2020/21', icon: '⚽' },
  { title: 'UCL Top Scorer', year: '2020/21', icon: '⚽' },
];

// ── Player Profile Page ───────────────────────────────────────
interface PlayerProfilePageProps {
  onBack: () => void;
}

export function PlayerProfilePage({ onBack }: PlayerProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'season' | 'career' | 'transfers'>('season');

  const tabs = [
    { key: 'season',    label: 'Season Stats', icon: BarChart2 },
    { key: 'career',    label: 'Career',       icon: TrendingUp },
    { key: 'transfers', label: 'Transfers',    icon: RefreshCw },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] sticky top-14 z-20 bg-black/90 backdrop-blur-md">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-sm">{player.name}</p>
          <p className="text-xs text-[#71767b]">{player.nationality} {player.position} · {player.team}</p>
        </div>
        <button className="px-3 py-1.5 bg-[#ef4444] rounded-full text-xs font-bold text-white hover:bg-[#dc2626] transition-colors">
          Follow
        </button>
      </div>

      {/* Player Hero */}
      <div
        className="px-4 py-6 border-b border-[#1f1f1f]"
        style={{ background: `linear-gradient(135deg, ${player.teamColor}20, #000)` }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
            style={{ backgroundColor: `${player.teamColor}30`, border: `2px solid ${player.teamColor}50` }}
          >
            {player.name.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white">{player.name}</h1>
            <p className="text-sm text-[#71767b] mb-2">{player.nationality} · {player.team} · #{player.number}</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded-full font-bold">
                {player.position}
              </span>
              <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-bold">
                {player.marketValue}
              </span>
              <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-bold">
                {player.followers} followers
              </span>
            </div>
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Age', value: player.age },
            { label: 'Height', value: player.height },
            { label: 'Weight', value: player.weight },
            { label: 'Foot', value: player.foot },
          ].map(info => (
            <div key={info.label} className="bg-black/40 rounded-xl p-2.5 text-center">
              <p className="text-sm font-black text-white">{info.value}</p>
              <p className="text-[10px] text-[#71767b] mt-0.5">{info.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <p className="text-xs font-bold text-[#71767b] mb-2">HONOURS</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {achievements.map((ach, i) => (
            <div
              key={i}
              className="shrink-0 bg-[#111] border border-[#1f1f1f] rounded-xl px-3 py-2 flex items-center gap-2"
            >
              <span className="text-base">{ach.icon}</span>
              <div>
                <p className="text-xs font-bold text-white whitespace-nowrap">{ach.title}</p>
                <p className="text-[10px] text-[#71767b]">{ach.year}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f]">
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

          {/* Season Stats */}
          {activeTab === 'season' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Goals', value: 28, color: 'text-[#ef4444]' },
                  { label: 'Assists', value: 6, color: 'text-blue-400' },
                  { label: 'Apps', value: 28, color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 text-center">
                    <p className={cn('text-3xl font-black', s.color)}>{s.value}</p>
                    <p className="text-xs text-[#71767b] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {seasonStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-[#71767b]">{stat.label}</span>
                      <span className="text-sm font-black text-white">{stat.value}</span>
                    </div>
                    <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stat.value / stat.max) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                        className="h-full bg-[#ef4444] rounded-full"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Career */}
          {activeTab === 'career' && (
            <div>
              <div className="grid grid-cols-4 px-4 py-2 border-b border-[#1f1f1f]">
                {['Season', 'Club', 'Goals', 'Apps'].map(h => (
                  <p key={h} className="text-[10px] text-[#71767b] font-bold">{h}</p>
                ))}
              </div>
              {careerStats.map((row, i) => (
                <motion.div
                  key={row.season}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-4 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] transition-colors items-center"
                >
                  <p className="text-xs text-[#71767b]">{row.season}</p>
                  <p className="text-xs text-white font-semibold truncate">{row.club}</p>
                  <p className="text-sm font-black text-[#ef4444]">{row.goals}</p>
                  <p className="text-sm font-black text-white">{row.apps}</p>
                </motion.div>
              ))}

              {/* Career totals */}
              <div className="px-4 py-3 border-t border-[#1f1f1f] bg-[#111]">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Career Goals', value: careerStats.reduce((a, r) => a + r.goals, 0), icon: Trophy },
                    { label: 'Career Apps', value: careerStats.reduce((a, r) => a + r.apps, 0), icon: Zap },
                    { label: 'Career Assists', value: careerStats.reduce((a, r) => a + r.assists, 0), icon: TrendingUp },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-black rounded-xl p-3 text-center border border-[#1f1f1f]">
                        <Icon className="w-4 h-4 text-[#ef4444] mx-auto mb-1" />
                        <p className="text-xl font-black text-white">{s.value}</p>
                        <p className="text-[10px] text-[#71767b]">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Transfers */}
          {activeTab === 'transfers' && (
            <div className="p-4 space-y-3">
              {transfers.map((tr, i) => (
                <motion.div
                  key={tr.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#71767b] font-semibold">{tr.year}</span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      tr.type === 'transfer' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-green-500/20 text-green-400'
                    )}>
                      {tr.type === 'transfer' ? 'TRANSFER' : 'DEBUT'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/40 rounded-xl p-2.5 text-center">
                      <p className="text-xs font-bold text-white truncate">{tr.from}</p>
                      <p className="text-[10px] text-[#71767b]">From</p>
                    </div>
                    <div className="text-[#ef4444] font-black text-lg">→</div>
                    <div className="flex-1 bg-black/40 rounded-xl p-2.5 text-center">
                      <p className="text-xs font-bold text-white truncate">{tr.to}</p>
                      <p className="text-[10px] text-[#71767b]">To</p>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-sm font-black text-green-400">{tr.fee}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}