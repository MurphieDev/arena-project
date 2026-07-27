import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Hash, Trophy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query as firestoreQuery, orderBy, limit, where } from 'firebase/firestore';
import { SearchBar, FilterTabs, SearchResultsList } from '../../components/SearchComponents';
import { TeamDetailPage } from './TeamDetailPage';
import { PlayerProfilePage } from './PlayerProfilePage';

// ── Mock Data ─────────────────────────────────────────────────
const trending = [
  { id: '1', tag: '#ChampionsLeague', posts: '2.4M', category: 'Football', hot: true },
  { id: '2', tag: '#NBAPlayoffs', posts: '1.8M', category: 'Basketball', hot: true },
  { id: '3', tag: '#TransferDeadlineDay', posts: '890K', category: 'Football', hot: false },
  { id: '4', tag: '#Messi', posts: '654K', category: 'Football', hot: false },
  { id: '5', tag: '#F1Monaco', posts: '432K', category: 'F1', hot: true },
  { id: '6', tag: '#PremierLeague', posts: '321K', category: 'Football', hot: false },
  { id: '7', tag: '#WimbledonOpen', posts: '234K', category: 'Tennis', hot: false },
  { id: '8', tag: '#SuperBowl', posts: '198K', category: 'NFL', hot: false },
];

const sports = [
  { id: '1', name: 'Football', emoji: '⚽', posts: '12.4M', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
  { id: '2', name: 'Basketball', emoji: '🏀', posts: '8.2M', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  { id: '3', name: 'Tennis', emoji: '🎾', posts: '3.1M', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  { id: '4', name: 'F1', emoji: '🏎️', posts: '4.5M', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
  { id: '5', name: 'Cricket', emoji: '🏏', posts: '2.8M', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { id: '6', name: 'Rugby', emoji: '🏉', posts: '1.2M', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { id: '7', name: 'MMA', emoji: '🥊', posts: '2.1M', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
  { id: '8', name: 'Baseball', emoji: '⚾', posts: '1.9M', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
];

const teams = [
  { id: '1', name: 'Real Madrid', league: 'La Liga', followers: '4.2M', emoji: '⚽' },
  { id: '2', name: 'Manchester City', league: 'Premier League', followers: '3.8M', emoji: '⚽' },
  { id: '3', name: 'LA Lakers', league: 'NBA', followers: '3.1M', emoji: '🏀' },
  { id: '4', name: 'Barcelona', league: 'La Liga', followers: '2.9M', emoji: '⚽' },
  { id: '5', name: 'Golden State Warriors', league: 'NBA', followers: '2.4M', emoji: '🏀' },
  { id: '6', name: 'Bayern Munich', league: 'Bundesliga', followers: '2.1M', emoji: '⚽' },
  { id: '7', name: 'Liverpool', league: 'Premier League', followers: '1.9M', emoji: '⚽' },
  { id: '8', name: 'Inter Miami', league: 'MLS', followers: '1.7M', emoji: '⚽' },
];

const players = [
  { id: '1', name: 'Lionel Messi', sport: 'Football', team: 'Inter Miami', followers: '8.9M' },
  { id: '2', name: 'LeBron James', sport: 'Basketball', team: 'LA Lakers', followers: '7.2M' },
  { id: '3', name: 'Cristiano Ronaldo', sport: 'Football', team: 'Al Nassr', followers: '6.8M' },
  { id: '4', name: 'Erling Haaland', sport: 'Football', team: 'Man City', followers: '4.1M' },
  { id: '5', name: 'Stephen Curry', sport: 'Basketball', team: 'Warriors', followers: '3.9M' },
  { id: '6', name: 'Kylian Mbappé', sport: 'Football', team: 'Real Madrid', followers: '3.4M' },
  { id: '7', name: 'Carlos Alcaraz', sport: 'Tennis', team: 'Spain', followers: '2.1M' },
  { id: '8', name: 'Max Verstappen', sport: 'F1', team: 'Red Bull', followers: '1.8M' },
];

// ── Explore Page ──────────────────────────────────────────────
export function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'trending' | 'sports' | 'search' | 'hashtags'>('trending');
  const [searchFilter, setSearchFilter] = useState<'teams' | 'players'>('teams');
  const [query, setQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  if (selectedTeam) {
    return <TeamDetailPage onBack={() => setSelectedTeam(null)} />;
  }

  if (selectedPlayer) {
    return <PlayerProfilePage onBack={() => setSelectedPlayer(null)} />;
  }

  const tabs = [
    { key: 'trending', label: 'Trending', icon: TrendingUp },
    { key: 'sports', label: 'Sports', icon: Trophy },
    { key: 'search', label: 'Search', icon: Search },
    { key: 'hashtags', label: 'Hashtags', icon: Hash },
  ] as const;

  const filteredTeams = teams.filter(team => {
    const term = query.toLowerCase();
    return team.name.toLowerCase().includes(term) || team.league.toLowerCase().includes(term);
  });

  const filteredPlayers = players.filter(player => {
    const term = query.toLowerCase();
    return player.name.toLowerCase().includes(term)
      || player.sport.toLowerCase().includes(term)
      || player.team.toLowerCase().includes(term);
  });

  const searchResults = searchFilter === 'teams'
    ? filteredTeams.map(item => ({
        id: item.id,
        title: item.name,
        subtitle: `${item.league} · ${item.followers} followers`,
      }))
    : filteredPlayers.map(item => ({
        id: item.id,
        title: item.name,
        subtitle: `${item.sport} · ${item.team} · ${item.followers} followers`,
      }));

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="px-4 pt-3 pb-2">
          <SearchBar
            value={query}
            placeholder="Search teams and players..."
            onChange={setQuery}
            onClear={() => setQuery('')}
          />
        </div>

        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-2 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  isActive
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

        {activeTab === 'search' && (
          <FilterTabs
            tabs={[
              { key: 'teams', label: 'Teams' },
              { key: 'players', label: 'Players' },
            ]}
            activeKey={searchFilter}
            onChange={(key: string) => setSearchFilter(key as 'teams' | 'players')}
          />
        )}
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

          {/* Trending */}
          {activeTab === 'trending' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Trending in Sports</h2>
              </div>
              {trending.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-[#71767b]">#{i + 1} · {item.category}</span>
                      {item.hot && (
                        <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">🔥 HOT</span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-white">{item.tag}</p>
                    <p className="text-xs text-[#71767b] mt-0.5">{item.posts} posts</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-[#ef4444]" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Sports */}
          {activeTab === 'sports' && (
            <div className="p-4">
              <h2 className="text-base font-black text-white mb-3">Browse by Sport</h2>
              <div className="grid grid-cols-2 gap-3">
                {sports.map((sport, i) => (
                  <motion.button
                    key={sport.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn('flex flex-col items-start p-4 rounded-2xl border transition-all hover:scale-[1.02]', sport.color)}
                  >
                    <span className="text-2xl mb-2">{sport.emoji}</span>
                    <p className="font-bold text-white text-sm">{sport.name}</p>
                    <p className="text-xs opacity-70 mt-0.5">{sport.posts} posts</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {activeTab === 'search' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Search {searchFilter === 'teams' ? 'Teams' : 'Players'}</h2>
                <p className="mt-1 text-xs text-[#71767b]">
                  {query ? `Showing results for “${query}”` : `Browse the most followed ${searchFilter}.`}
                </p>
              </div>
              <SearchResultsList
                items={searchResults}
                emptyText={`No ${searchFilter} matched your search.`}
                onSelect={(id: string) => {
                  if (searchFilter === 'teams') {
                    setSelectedTeam(id);
                  } else {
                    setSelectedPlayer(id);
                  }
                }}
              />
            </div>
          )}

          {/* Hashtags */}
          {activeTab === 'hashtags' && (
            <div>
              <div className="px-4 py-3 border-b border-[#1f1f1f]">
                <h2 className="text-base font-black text-white">Trending Hashtags</h2>
              </div>
              {trending.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-[#ef4444]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">{item.tag}</p>
                    <p className="text-xs text-[#71767b]">{item.posts} posts · {item.category}</p>
                  </div>
                  {item.hot && (
                    <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-bold">🔥 HOT</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
