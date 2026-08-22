import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Zap, Star, Plus, X,
  Ticket, Lock, Check, ArrowLeft,
  Users, Smile, Mic, ChevronRight, Send,
  BarChart3, Layers, FileText, Image, Video,
  MessageCircle, Calendar, PieChart, Rocket, CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDetailView } from '../../contexts/DetailViewContext';
import { useAuth } from '../../auth/hooks/AuthContext';
import { PredictionCard } from '../../components/PredictionCard';
import { CreatePredictionModal } from '../../components/modals/CreatePredictionModal';
import { PremiumPredictionModal } from '../../components/modals/PremiumPredictionModal';
import { MultiBetModal } from '../../components/modals/MultiBetModal';
import { BettingSlipModal } from '../../components/modals/BettingSlipModal';
import { MatchAnalysisModal } from '../../components/modals/MatchAnalysisModal';
import { LivePredictionModal } from '../../components/modals/LivePredictionModal';
import { ScreenshotUploadModal } from '../../components/modals/ScreenshotUploadModal';
import { VideoUploadModal } from '../../components/modals/VideoUploadModal';
import { SchedulePostModal } from '../../components/modals/SchedulePostModal';
import { SubscriberUpdateModal } from '../../components/modals/SubscriberUpdateModal';
import { PollModal } from '../../components/modals/PollModal';
import { PromotePredictionModal } from '../../components/modals/PromotePredictionModal';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, query as firestoreQuery,
  orderBy, doc, setDoc, deleteDoc, getDoc, getDocs,
  addDoc, updateDoc, increment, serverTimestamp, where
} from 'firebase/firestore';
import { useState as useStateImport, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface Match {
  home: string;
  away: string;
  odds: string;
  status: 'win' | 'lost' | 'pending';
  matchTime?: string;
  prediction?: string;
}

interface FeedPost {
  id: string;
  code: string;
  time: string;
  matches: Match[];
  total: number;
  wins: number;
  losses: number;
  pending: number;
  reactions: { like: number; heart: number; fire: number; laugh: number; wow: number };
  likesCount: number;
  commentsCount: number;
}

interface Channel {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  members: number;
  winRate: string;
  streak: number;
  type: 'paid' | 'free';
  price: string | null;
  lastPost: string;
  lastMessage: string;
  unread: number;
  joined: boolean;
  ownerId?: string;
  feed: FeedPost[];
  bio: string;
  sports: string[];
  creationDate: string;
  avatar?: string;
  coverImage?: string;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, size = 'md', image }: { name: string; size?: 'sm' | 'md' | 'lg'; image?: string }) {
  const colors = ['bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-[44px] h-[44px] text-base' };

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', sizes[size])}
      />
    );
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-black text-white shrink-0', sizes[size], color)}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Channel Row ───────────────────────────────────────────────
function ChannelRow({ ch, active, onTap, isTipster = false }: { ch: Channel; active: boolean; onTap: () => void; isTipster?: boolean }) {
  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onTap}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#1f1f1f]',
        active ? 'bg-[#ef4444]/10 border-l-2 border-l-[#ef4444]' : 'hover:bg-white/[0.02]'
      )}
    >
      <div className="relative shrink-0">
        <Avatar name={ch.name} image={ch.avatar} />
        {ch.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#ef4444] rounded-full flex items-center justify-center ring-2 ring-black">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        )}
        {isTipster && !ch.joined && ch.type === 'paid' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center ring-2 ring-black">
            <Lock className="w-2.5 h-2.5 text-black" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-bold truncate text-white">{ch.name}</p>
            {isTipster && (
              <>
                {ch.type === 'paid'
                  ? <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded font-bold shrink-0">VIP</span>
                  : <span className="text-[9px] bg-green-500/20 text-green-400 px-1 rounded font-bold shrink-0">FREE</span>
                }
              </>
            )}
          </div>
          <span className="text-[11px] text-[#71767b] shrink-0 ml-2">{ch.lastPost}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#71767b] truncate flex-1">{ch.lastMessage}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />{ch.winRate}
            </span>
            <span className="text-[10px] text-[#ef4444] font-bold flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />{ch.streak}
            </span>
            {ch.unread > 0 && (
              <span className="min-w-[18px] h-[18px] bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {ch.unread > 9 ? '9+' : ch.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Action Menu Item ─────────────────────────────────────────
function ActionMenuItem({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-white group"
    >
      <span className="text-[#ef4444] group-hover:text-white transition-colors">{icon}</span>
      <span className="text-left">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-[#71767b] group-hover:text-[#ef4444] transition-colors ml-auto" />
    </button>
  );
}

// ── Channel Feed ──────────────────────────────────────────────
function ChannelFeed({ ch, onBack, isTipster = false }: { ch: Channel; onBack: () => void; isTipster?: boolean }) {
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const [joined, setJoined] = useState(ch.joined);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreatePredictionModal, setShowCreatePredictionModal] = useState(false);
  const [showPremiumPredictionModal, setShowPremiumPredictionModal] = useState(false);
  const [showMultiBetModal, setShowMultiBetModal] = useState(false);
  const [showBettingSlipModal, setShowBettingSlipModal] = useState(false);
  const [showMatchAnalysisModal, setShowMatchAnalysisModal] = useState(false);
  const [showLivePredictionModal, setShowLivePredictionModal] = useState(false);
  const [showScreenshotUploadModal, setShowScreenshotUploadModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [showSchedulePostModal, setShowSchedulePostModal] = useState(false);
  const [showSubscriberUpdateModal, setShowSubscriberUpdateModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showPromotePredictionModal, setShowPromotePredictionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChannelInfoModal, setShowChannelInfoModal] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Enhanced Header */}
      <div className="border-b border-[#1f1f1f] shrink-0 relative bg-black">
        {/* Cover Photo */}
        <div className="h-24 md:h-28 relative overflow-hidden bg-[#111]">
          <img
            src={ch.coverImage || "https://images.unsplash.com/photo-1540747737956-378724044282?q=80&w=800"}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <button onClick={onBack} className="absolute top-3 left-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors z-20">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar and Action Buttons Row */}
        <div className="flex justify-between items-end px-4 pb-3 -mt-6 relative z-10">
          <div 
            onClick={() => setShowChannelInfoModal(true)}
            className="flex items-end gap-3 cursor-pointer hover:opacity-90 select-none min-w-0"
          >
            {ch.avatar ? (
              <img src={ch.avatar} alt={ch.name} className="w-16 h-16 rounded-2xl border-4 border-black object-cover shrink-0 shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] border-4 border-black flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg">
                {ch.name.charAt(0)}
              </div>
            )}
            <div className="pb-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-base text-white truncate leading-tight">{ch.name}</p>
                {ch.verified && <Star className="w-3.5 h-3.5 text-[#ef4444] fill-[#ef4444] shrink-0" />}
              </div>
              <p className="text-[10px] text-[#71767b] font-bold mt-0.5">{ch.members.toLocaleString()} members</p>
            </div>
          </div>

          <button
            onClick={async () => {
              if (!userId) return;
              // Channel owner doesn't need to join
              const isOwner = (ch as any).ownerId === userId;
              if (isOwner) return;
              if (joined) {
                setJoined(false);
                await deleteDoc(doc(db, 'channels', ch.id, 'members', userId));
                await updateDoc(doc(db, 'channels', ch.id), { subscribers: increment(-1) });
              } else {
                if (ch.type === 'paid') {
                  setShowPaymentModal(true);
                } else {
                  setJoined(true);
                  await setDoc(doc(db, 'channels', ch.id, 'members', userId), {
                    userId,
                    joinedAt: serverTimestamp(),
                  });
                  await updateDoc(doc(db, 'channels', ch.id), { subscribers: increment(1) });
                }
              }
            }}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 whitespace-nowrap',
              joined
                ? 'border border-white/20 text-[#71767b] hover:border-[#ef4444]/50 hover:text-[#ef4444]'
                : 'bg-white text-black hover:bg-white/90'
            )}
          >
            {(ch as any).ownerId === userId ? 'Your Channel' : joined ? 'Joined ✓' : ch.type === 'paid' ? `Join · ${ch.price}` : 'Join Free'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6 px-4 py-2 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-bold">
              <span className="text-green-400">{ch.winRate}</span>
              <span className="text-[#71767b] ml-1">Win Rate</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#ef4444]" />
            <span className="text-xs font-bold">
              <span className="text-[#ef4444]">{ch.streak}</span>
              <span className="text-[#71767b] ml-1">Streak</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#71767b]" />
            <span className="text-xs font-bold text-[#71767b]">{ch.members.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Scrollable feed — flex-1 so it fills all remaining space between header and input bar */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {ch.type === 'paid' && !joined && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 text-center"
          >
            <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="font-bold text-sm mb-1 text-white">VIP Channel</p>
            <p className="text-xs text-[#71767b] mb-3">Join to unlock all tips and predictions</p>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-5 py-2 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-lg text-sm font-bold text-white hover:shadow-lg hover:shadow-red-500/30 transition-all"
            >
              Join for {ch.price}
            </button>
            <p className="text-[10px] text-[#71767b] mt-2">Preview below ↓</p>
          </motion.div>
        )}

        {ch.feed.map((post, i) => {
          const isBlurred = ch.type === 'paid' && !joined && i > 0;
          const matches = post.matches.map(m => ({
            team: `${m.home} vs ${m.away}`,
            odds: m.odds,
            status: m.status as 'win' | 'loss' | 'pending',
          }));

          return (
            <div key={post.id} className={cn('flex', isBlurred && 'blur-sm pointer-events-none select-none')}>
              <div className="w-full max-w-xs">
                <PredictionCard
                  code={post.code}
                  userAvatar={ch.avatar}
                  userName={ch.name}
                  userHandle={ch.handle}
                  userStats={{ wins: post.wins, losses: post.losses, streak: ch.streak }}
                  verified={ch.verified}
                  matches={matches}
                  totalOdds={post.total}
                  timestamp={post.time}
                  reactions={post.reactions}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pinned input bar — always visible at the bottom ── */}
      <div className="shrink-0 border-t border-[#1f1f1f] bg-black">
        {isTipster ? (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-t from-black/50 to-black/20 backdrop-blur">
            {/* Action Button - Tipsters only */}
            <button
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#ef4444]/20 to-[#dc2626]/10 border border-[#ef4444]/20 text-[#ef4444] hover:border-[#ef4444]/40 hover:bg-[#ef4444]/30 transition-all shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Message Input */}
            <div className="flex-1 flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-2.5 focus-within:border-[#ef4444]/30 transition-all">
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && message.trim() && userId) {
                    const text = message.trim();
                    setMessage('');
                    await addDoc(collection(db, 'channels', ch.id, 'messages'), {
                      senderId: userId,
                      senderName: currentUser?.name || currentUser?.displayName || 'Tipster',
                      text,
                      createdAt: serverTimestamp(),
                    });
                  }
                }}
                placeholder="Broadcast a new tip or update..."
                className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-[#71767b]"
              />
              {message.trim() && (
                <Smile className="w-4 h-4 text-[#71767b] cursor-pointer hover:text-white transition-colors" />
              )}
            </div>

            {/* Emoji & Mic */}
            <button className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#71767b] hover:text-white transition-all">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#71767b] hover:text-white transition-all">
              <Mic className="w-5 h-5" />
            </button>

            {/* Post Button */}
            <button
              onClick={async () => {
                if (message.trim() && userId) {
                  const text = message.trim();
                  setMessage('');
                  await addDoc(collection(db, 'channels', ch.id, 'messages'), {
                    senderId: userId,
                    senderName: currentUser?.name || currentUser?.displayName || 'Tipster',
                    text,
                    createdAt: serverTimestamp(),
                  });
                }
              }}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-xl transition-all shrink-0',
                message.trim()
                  ? 'bg-gradient-to-br from-[#dc2626] to-[#ef4444] text-white hover:shadow-lg hover:shadow-red-500/40'
                  : 'bg-white/5 text-[#71767b] cursor-not-allowed'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 px-4 py-3.5 border-t border-[#1f1f1f] bg-black text-[#71767b] shrink-0 text-xs font-bold select-none">
            <Lock className="w-4 h-4 text-[#ef4444]" />
            <span>Only channel admins can post messages in this channel.</span>
          </div>
        )}

        {/* Action Menu */}
        <AnimatePresence>
          {showActionMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="fixed left-4 z-50 w-64 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl shadow-2xl bottom-[calc(var(--bottom-nav-height)+1rem+env(safe-area-inset-bottom))] md:bottom-20"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2">
                {/* Predictions Section */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-[#71767b] uppercase px-2 py-1.5">Predictions</p>
                  <ActionMenuItem icon={<BarChart3 className="w-4 h-4" />} label="Create Prediction" onClick={() => {
                    setShowActionMenu(false);
                    setShowCreatePredictionModal(true);
                  }} />
                  <ActionMenuItem icon={<Star className="w-4 h-4" />} label="Premium Prediction" onClick={() => {
                    setShowActionMenu(false);
                    setShowPremiumPredictionModal(true);
                  }} />
                  <ActionMenuItem icon={<Layers className="w-4 h-4" />} label="Multi-Bet" onClick={() => {
                    setShowActionMenu(false);
                    setShowMultiBetModal(true);
                  }} />
                  <ActionMenuItem icon={<Zap className="w-4 h-4" />} label="Live Prediction" onClick={() => {
                    setShowActionMenu(false);
                    setShowLivePredictionModal(true);
                  }} />
                </div>

                <div className="h-px bg-[#1f1f1f] my-2" />

                {/* Content Section */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-[#71767b] uppercase px-2 py-1.5">Content</p>
                  <ActionMenuItem icon={<FileText className="w-4 h-4" />} label="Match Analysis" onClick={() => {
                    setShowActionMenu(false);
                    setShowMatchAnalysisModal(true);
                  }} />
                  <ActionMenuItem icon={<Ticket className="w-4 h-4" />} label="Betting Slip" onClick={() => {
                    setShowActionMenu(false);
                    setShowBettingSlipModal(true);
                  }} />
                  <ActionMenuItem icon={<Image className="w-4 h-4" />} label="Upload Screenshot" onClick={() => {
                    setShowActionMenu(false);
                    setShowScreenshotUploadModal(true);
                  }} />
                  <ActionMenuItem icon={<Video className="w-4 h-4" />} label="Upload Video" onClick={() => {
                    setShowActionMenu(false);
                    setShowVideoUploadModal(true);
                  }} />
                </div>

                <div className="h-px bg-[#1f1f1f] my-2" />

                {/* Engagement Section */}
                <div>
                  <p className="text-[10px] font-bold text-[#71767b] uppercase px-2 py-1.5">Engagement</p>
                  <ActionMenuItem icon={<MessageCircle className="w-4 h-4" />} label="Subscriber Update" onClick={() => {
                    setShowActionMenu(false);
                    setShowSubscriberUpdateModal(true);
                  }} />
                  <ActionMenuItem icon={<Calendar className="w-4 h-4" />} label="Schedule Post" onClick={() => {
                    setShowActionMenu(false);
                    setShowSchedulePostModal(true);
                  }} />
                  <ActionMenuItem icon={<PieChart className="w-4 h-4" />} label="Poll" onClick={() => {
                    setShowActionMenu(false);
                    setShowPollModal(true);
                  }} />
                  <ActionMenuItem icon={<Rocket className="w-4 h-4" />} label="Promote Prediction" onClick={() => {
                    setShowActionMenu(false);
                    setShowPromotePredictionModal(true);
                  }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Prediction Modal */}
      <CreatePredictionModal
        isOpen={showCreatePredictionModal}
        onClose={() => setShowCreatePredictionModal(false)}
        onSubmit={async (data) => {
          if (!userId) { alert('Please sign in first'); return; }
          if (!ch?.id) { alert('No channel selected'); return; }
          try {
            const matches = (data.matches || data.games || []).map((m: any) => ({
              home: m.home || '',
              away: m.away || '',
              odds: String(m.odds || ''),
              prediction: m.prediction || '1',
              status: 'pending',
              matchTime: m.matchTime || '',
              league: m.league || '',
              date: m.date || '',
            }));
            const tipData: Record<string, any> = {
              matches,
              totalOdds: String(data.totalOdds || '0'),
              reasoning: data.reasoning || '',
              tipsterId: userId,
              tipsterName: currentUser?.name || currentUser?.displayName || '',
              status: 'pending',
              likesCount: 0,
              commentsCount: 0,
              source: 'manual',
              createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'channels', ch.id, 'tips'), tipData);
            await updateDoc(doc(db, 'users', userId), { tipsCount: increment(1) });
            console.log('✅ Tip posted successfully');
          } catch(e: any) { 
            console.error('Error posting prediction:', e);
            alert('Failed to post tip: ' + e.message);
          }
          setShowCreatePredictionModal(false);
        }}
      />

      {/* Premium Prediction Modal */}
      <PremiumPredictionModal
        isOpen={showPremiumPredictionModal}
        onClose={() => setShowPremiumPredictionModal(false)}
        onSubmit={(data) => {
          console.log('Premium prediction submitted:', data);
          setShowPremiumPredictionModal(false);
        }}
      />

      {/* Multi-Bet Modal */}
      <MultiBetModal
        isOpen={showMultiBetModal}
        onClose={() => setShowMultiBetModal(false)}
        onSubmit={(data) => {
          console.log('Multi-bet submitted:', data);
          setShowMultiBetModal(false);
        }}
      />

      {/* Betting Slip Modal */}
      <BettingSlipModal
        isOpen={showBettingSlipModal}
        onClose={() => setShowBettingSlipModal(false)}
        onSubmit={async (data) => {
          if (userId) {
            try {
              const tipData: Record<string, any> = {
                matches: (data.matches || []).map((m: any) => ({
                  home: m.home || '', away: m.away || '',
                  odds: m.odds || '', prediction: m.prediction || '',
                  status: 'pending',
                })),
                totalOdds: String(data.totalOdds || '0'),
                bookingCode: data.bookingCode || '',
                platform: data.platform || 'betslip',
                tipsterId: userId,
                tipsterName: currentUser?.name || currentUser?.displayName || '',
                status: 'pending',
                likesCount: 0,
                commentsCount: 0,
                source: 'betslip',
                createdAt: serverTimestamp(),
              };
              if (data.imageUrl && typeof data.imageUrl === 'string') {
                tipData.imageUrl = data.imageUrl;
              }
              await addDoc(collection(db, 'channels', ch.id, 'tips'), tipData);
              await updateDoc(doc(db, 'users', userId), { tipsCount: increment(1) });
            } catch(e) { console.error('Error posting tip:', e); }
          }
          setShowBettingSlipModal(false);
        }}
      />

      {/* Match Analysis Modal */}
      <MatchAnalysisModal
        isOpen={showMatchAnalysisModal}
        onClose={() => setShowMatchAnalysisModal(false)}
        onSubmit={(data) => {
          console.log('Match analysis submitted:', data);
          setShowMatchAnalysisModal(false);
        }}
      />

      {/* Live Prediction Modal */}
      <LivePredictionModal
        isOpen={showLivePredictionModal}
        onClose={() => setShowLivePredictionModal(false)}
        onSubmit={(data) => {
          console.log('Live prediction submitted:', data);
          setShowLivePredictionModal(false);
        }}
      />

      {/* Screenshot Upload Modal */}
      <ScreenshotUploadModal
        isOpen={showScreenshotUploadModal}
        onClose={() => setShowScreenshotUploadModal(false)}
        onSubmit={(data) => {
          console.log('Screenshot upload submitted:', data);
          setShowScreenshotUploadModal(false);
        }}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoUploadModal}
        onClose={() => setShowVideoUploadModal(false)}
        onSubmit={(data) => {
          console.log('Video upload submitted:', data);
          setShowVideoUploadModal(false);
        }}
      />

      {/* Schedule Post Modal */}
      <SchedulePostModal
        isOpen={showSchedulePostModal}
        onClose={() => setShowSchedulePostModal(false)}
        onSubmit={(data) => {
          console.log('Schedule post submitted:', data);
          setShowSchedulePostModal(false);
        }}
      />

      {/* Subscriber Update Modal */}
      <SubscriberUpdateModal
        isOpen={showSubscriberUpdateModal}
        onClose={() => setShowSubscriberUpdateModal(false)}
        onSubmit={(data) => {
          console.log('Subscriber update submitted:', data);
          setShowSubscriberUpdateModal(false);
        }}
      />

      {/* Poll Modal */}
      <PollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={(data) => {
          console.log('Poll submitted:', data);
          setShowPollModal(false);
        }}
      />

      {/* Promote Prediction Modal */}
      <PromotePredictionModal
        isOpen={showPromotePredictionModal}
        onClose={() => setShowPromotePredictionModal(false)}
        onSubmit={(data) => {
          console.log('Promote prediction submitted:', data);
          setShowPromotePredictionModal(false);
        }}
      />

      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        channelName={ch.name}
        price={ch.price || '₦2,500/mo'}
        onSuccess={() => setJoined(true)}
      />

      {/* Channel Info Modal */}
      <ChannelInfoModal
        isOpen={showChannelInfoModal}
        onClose={() => setShowChannelInfoModal(false)}
        ch={ch}
        joined={joined}
        onJoinToggle={() => {
          if (joined) {
            setJoined(false);
          } else {
            if (ch.type === 'paid') {
              setShowPaymentModal(true);
            } else {
              setJoined(true);
            }
          }
        }}
      />
    </div>
  );
}

interface SubscriptionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  price: string;
  onSuccess: () => void;
}

function SubscriptionPaymentModal({ isOpen, onClose, channelName, price, onSuccess }: SubscriptionPaymentModalProps) {
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'card' | 'bank'>('wallet');
  const [walletBalance] = useState(4500); // Mock wallet balance

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset steps for future opens
        setStep('details');
      }, 1500);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl relative z-10"
          >
            {step === 'details' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
                  <h3 className="text-base font-black text-white">Subscribe to VIP</h3>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-[#71767b] hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-4 flex flex-col text-center">
                  <p className="text-[10px] text-[#71767b] uppercase font-black tracking-wider mb-1">Channel</p>
                  <p className="text-base font-bold text-white mb-2">{channelName}</p>
                  <div className="h-px bg-[#1f1f1f] my-2" />
                  <p className="text-2xl font-black text-[#ef4444]">{price}</p>
                  <p className="text-[10px] text-[#71767b] mt-1">Billed monthly. Cancel anytime.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#71767b] px-1">Payment Method</p>
                  
                  {/* Pay via Wallet */}
                  <button
                    onClick={() => setSelectedMethod('wallet')}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                      selectedMethod === 'wallet'
                        ? "border-[#ef4444] bg-[#ef4444]/5"
                        : "border-[#1f1f1f] bg-[#090909] hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#ef4444]" />
                      <div>
                        <p className="text-sm font-bold text-white">Pay with Wallet Balance</p>
                        <p className="text-xs text-[#71767b]">Available: ₦{walletBalance.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                      selectedMethod === 'wallet' ? "border-[#ef4444]" : "border-[#71767b]"
                    )}>
                      {selectedMethod === 'wallet' && <div className="w-2.5 h-2.5 bg-[#ef4444] rounded-full" />}
                    </div>
                  </button>

                  {/* Pay via Card */}
                  <button
                    onClick={() => setSelectedMethod('card')}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left",
                      selectedMethod === 'card'
                        ? "border-[#ef4444] bg-[#ef4444]/5"
                        : "border-[#1f1f1f] bg-[#090909] hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-bold text-white">Debit / Credit Card</p>
                        <p className="text-xs text-[#71767b]">Visa, Mastercard, Verve</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                      selectedMethod === 'card' ? "border-[#ef4444]" : "border-[#71767b]"
                    )}>
                      {selectedMethod === 'card' && <div className="w-2.5 h-2.5 bg-[#ef4444] rounded-full" />}
                    </div>
                  </button>
                </div>

                <button
                  onClick={handlePay}
                  className="w-full py-3 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-xl text-sm font-bold text-white hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.01] transition-all"
                >
                  Subscribe Now
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
                <div>
                  <p className="font-bold text-white">Processing Subscription</p>
                  <p className="text-xs text-[#71767b] mt-1">Verifying secure transaction...</p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500 flex items-center justify-center text-green-500">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Subscription Active!</p>
                  <p className="text-xs text-[#71767b] mt-1">Welcome to {channelName}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Channel Info Modal ────────────────────────────────────────
interface ChannelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ch: Channel;
  joined: boolean;
  onJoinToggle: () => void;
}

function ChannelInfoModal({ isOpen, onClose, ch, joined, onJoinToggle }: ChannelInfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl relative z-10"
          >
            {/* Header Profile Cover */}
            <div className="h-28 relative flex items-end px-6 bg-[#111] overflow-hidden">
              <img
                src={ch.coverImage || "https://images.unsplash.com/photo-1540747737956-378724044282?q=80&w=800"}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/35" />
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Avatar Overlay */}
            <div className="px-6 relative -mt-10 mb-4 flex items-end justify-between">
              <div className="relative">
                {ch.avatar ? (
                  <img src={ch.avatar} alt={ch.name} className="w-20 h-20 rounded-2xl border-4 border-[#0d0d0d] object-cover shadow-xl shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] border-4 border-[#0d0d0d] flex items-center justify-center text-white font-black text-3xl shadow-xl">
                    {ch.name.charAt(0)}
                  </div>
                )}
                {ch.verified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#ef4444] rounded-full flex items-center justify-center ring-4 ring-[#0d0d0d]">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  onJoinToggle();
                }}
                className={cn(
                  'px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-md',
                  joined
                    ? 'border border-white/20 text-[#71767b] hover:border-[#ef4444]/50 hover:text-[#ef4444] hover:bg-white/5'
                    : 'bg-white text-black hover:bg-white/90 hover:shadow-lg'
                )}
              >
                {joined ? 'Joined ✓' : ch.type === 'paid' ? `Join for ${ch.price}` : 'Join Free'}
              </button>
            </div>

            {/* Profile Details */}
            <div className="px-6 pb-6 space-y-5">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  {ch.name}
                </h3>
                <p className="text-sm text-[#71767b] font-bold">{ch.handle}</p>
              </div>

              {/* Bio Description */}
              <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-[#71767b] uppercase font-black tracking-wider">Bio</p>
                <p className="text-xs text-white leading-relaxed">{ch.bio}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-3 text-center">
                  <p className="text-[9px] text-[#71767b] uppercase font-black tracking-wider mb-1">Win Rate</p>
                  <p className="text-sm font-black text-green-400 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {ch.winRate}
                  </p>
                </div>
                <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-3 text-center">
                  <p className="text-[9px] text-[#71767b] uppercase font-black tracking-wider mb-1">Streak</p>
                  <p className="text-sm font-black text-[#ef4444] flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> {ch.streak}
                  </p>
                </div>
                <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-3 text-center">
                  <p className="text-[9px] text-[#71767b] uppercase font-black tracking-wider mb-1">Members</p>
                  <p className="text-sm font-black text-white flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#71767b]" /> {ch.members.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Sports & Access Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-[#71767b] uppercase font-black tracking-wider mb-2">Sports Covered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ch.sports.map((sport) => (
                      <span key={sport} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white">
                        {sport}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#1f1f1f]" />

                {/* Permissions & Premium Locks */}
                <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <Lock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Telegram Premium Structure</p>
                    <p className="text-[11px] text-[#71767b] leading-normal">
                      This channel is locked. Only the verified tipster and platform admins can send messages. Subscribers have read-only access to view daily predictions, slips, and analysis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#71767b]">
                  <span>Created: {ch.creationDate}</span>
                  <span className="flex items-center gap-1">
                    Status: <span className={cn("font-bold", joined ? "text-green-400" : "text-yellow-400")}>{joined ? "Active Member" : "Not Subscribed"}</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Add Modal ─────────────────────────────────────────────────
function AddModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { found: boolean; name?: string }>(null);

  const find = async () => {
    if (!code.trim()) return;
    setLoading(true); setResult(null);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setResult(code.length > 3 ? { found: true, name: 'Elite Tips Channel' } : { found: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-[#0d0d0d] border-t border-[#1f1f1f] rounded-t-3xl px-5 pt-3 pb-10"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-base text-white">Join a Channel</h3>
            <p className="text-xs text-[#71767b] mt-0.5">Enter invite code or channel name</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10">
            <X className="w-4 h-4 text-[#71767b]" />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-[#ef4444]/50 rounded-xl px-3 py-2.5 transition-all">
            <Ticket className="w-4 h-4 text-[#71767b] shrink-0" />
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="GOLD-7X2K or channel name"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none tracking-wider"
            />
          </div>
          <button
            onClick={find}
            className="px-4 bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-xl text-xs font-black text-white"
          >
            {loading ? '...' : 'Find'}
          </button>
        </div>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn('p-4 rounded-xl border', result.found ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10')}
          >
            {result.found ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-white">{result.name}</p>
                  <p className="text-xs text-green-400 mt-0.5">Channel found ✓</p>
                </div>
                <button onClick={onClose} className="px-4 py-2 bg-green-500 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                  <Check className="w-3 h-3" /> Join
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#71767b] text-center">No channel found for that code</p>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────
function Leaderboard({ onSelect }: { onSelect: (name: string) => void }) {
  const [tipsters, setTipsters] = useState<any[]>([]);

  useEffect(() => {
    getDocs(firestoreQuery(collection(db, 'users'), where('role', '==', 'tipster'), orderBy('winRate', 'desc'))).then(snap => {
      setTipsters(snap.docs.map((d, i) => {
        const data = d.data();
        return {
          rank: i + 1,
          id: d.id,
          name: data.displayName || 'Tipster',
          winRate: `${data.winRate || 0}%`,
          streak: data.streak || 0,
          members: data.followersCount || 0,
          badge: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
          avatar: data.profilePicture || undefined,
        };
      }));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#1f1f1f]">
        <h2 className="text-base font-black text-white">Top Tipsters</h2>
        <p className="text-xs text-[#71767b] mt-0.5">Ranked by win rate this month</p>
      </div>
      {tipsters.map((t, i) => (
        <motion.div
          key={t.rank}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect(t.name)}
          className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer transition-colors"
        >
          <div className="w-8 text-center">
            {t.badge
              ? <span className="text-lg">{t.badge}</span>
              : <span className="text-sm font-black text-[#71767b]">#{t.rank}</span>
            }
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            {t.avatar ? (
              <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center font-black text-[#ef4444] text-sm">
                {t.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{t.name}</p>
            <p className="text-xs text-[#71767b]">{t.members.toLocaleString()} members</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-green-400">{t.winRate}</p>
            <p className="text-xs text-[#ef4444] flex items-center gap-0.5 justify-end">
              <Zap className="w-3 h-3" />{t.streak}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71767b]" />
        </motion.div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export function PredictionsPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<'channels' | 'leaderboard'>('channels');
  const [channelTab, setChannelTab] = useState<'my' | 'explore'>('my');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setShowDetailView } = useDetailView();
  const { user } = useAuth();
  const currentUser = user as any;
  const userId = currentUser?.id || currentUser?.uid || '';
  const isTipster = currentUser?.role === 'tipster' || currentUser?.role === 'admin';

  // Load real channels from Firestore
  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snapshot) => {
      const list: Channel[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        // Check if current user is member
        const memberDoc = await getDoc(doc(db, 'channels', d.id, 'members', userId));
        const isJoined = memberDoc.exists() || data.ownerId === userId;
        // Get tips for this channel
        const tipsSnap = await getDocs(
          firestoreQuery(collection(db, 'channels', d.id, 'tips'), orderBy('createdAt', 'desc'))
        );
        const feed: FeedPost[] = tipsSnap.docs.map(td => {
          const tip = td.data();
          const matches = (tip.matches || []).map((m: any) => ({
            home: m.home || '',
            away: m.away || '',
            odds: m.odds || '',
            status: m.status as 'win' | 'lost' | 'pending',
          }));
          return {
            id: td.id,
            code: tip.bookingCode || td.id.slice(0, 8).toUpperCase(),
            time: (() => {
              const date = tip.createdAt?.toDate?.() || new Date();
              const diff = Math.floor((Date.now() - date.getTime()) / 1000);
              return diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : `${Math.floor(diff / 86400)}d ago`;
            })(),
            matches: (tip.matches || []).map((m: any) => ({
              home: m.home || '',
              away: m.away || '',
              odds: m.odds || '',
              status: (m.status || 'pending') as 'win' | 'lost' | 'pending',
              matchTime: m.matchTime || m.time || '',
              prediction: m.prediction || '',
            })),
            total: parseFloat(tip.totalOdds || '0'),
            wins: (tip.matches || []).filter((m: any) => m.status === 'win').length,
            losses: (tip.matches || []).filter((m: any) => m.status === 'lost').length,
            pending: (tip.matches || []).filter((m: any) => m.status === 'pending').length,
            reactions: { like: tip.likesCount || 0, heart: 0, fire: 0, laugh: 0, wow: 0 },
            likesCount: tip.likesCount || 0,
            commentsCount: tip.commentsCount || 0,
          };
        });
        list.push({
          id: d.id,
          name: data.name || 'Channel',
          handle: `@${(data.name || '').toLowerCase().replace(/\s/g, '')}`,
          verified: data.verified || false,
          members: data.subscribers || 0,
          winRate: `${data.winRate || 0}%`,
          streak: data.streak || 0,
          type: data.type || 'free',
          price: data.type === 'paid' ? `₦${(data.price || 0).toLocaleString()}/mo` : null,
          lastPost: feed[0]?.time || 'No posts',
          lastMessage: feed[0] ? `${feed[0].matches[0]?.home || ''} vs ${feed[0].matches[0]?.away || ''}` : 'No tips yet',
          unread: 0,
          joined: isJoined,
          feed,
          bio: data.bio || '',
          sports: data.sports || [],
          creationDate: data.createdAt?.toDate?.()?.toLocaleDateString('en', { month: 'short', year: 'numeric' }) || '',
          ownerId: data.ownerId || '',
          avatar: data.avatar || undefined,
          coverImage: data.coverImage || undefined,
        });
      }
      setChannels(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const activeChannel = channels.find(c => c.id === activeId) ?? null;

  const handleSelectChannel = (channelId: string) => {
    setActiveId(channelId);
    setShowDetailView(true);
  };

  const handleBackFromChannel = () => {
    setActiveId(null);
    setShowDetailView(false);
  };

  const filtered = channels.filter(ch => {
    const q = query.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.handle.toLowerCase().includes(q);
  });

  if (activeChannel) {
    return <ChannelFeed ch={activeChannel} onBack={handleBackFromChannel} isTipster={isTipster} />;
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2 px-4 py-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-1 -ml-1 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white md:hidden mr-1"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-white flex-1">Predictions</h1>
          <button
            onClick={() => setShowAdd(true)}
            title="Join a Channel"
            className="w-8 h-8 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-xl flex items-center justify-center shadow-md shadow-red-500/30 hover:shadow-lg hover:shadow-red-500/50 transition-all"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-4 pb-2">
          {(['channels', 'leaderboard'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                tab === t ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white hover:bg-white/5'
              )}
            >
              {t === 'channels' ? '📡 Channels' : '🏆 Leaderboard'}
            </button>
          ))}
        </div>

        {tab === 'channels' && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-[#111] rounded-full px-3 py-2 border border-[#1f1f1f] focus-within:border-[#ef4444]/30 transition-all">
              <Search className="w-4 h-4 text-[#71767b] shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search channels..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#71767b] outline-none"
              />
              {query && <button onClick={() => setQuery('')}><X className="w-3.5 h-3.5 text-[#71767b]" /></button>}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'channels' && (
          <motion.div key="channels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* My Channels / Explore tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1f1f1f]">
              <button onClick={() => setChannelTab('my')}
                className={cn('px-3 py-1 rounded-full text-xs font-bold transition-all',
                  channelTab === 'my' ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white')}>
                {isTipster ? '📡 My Channel' : '✅ Joined'}
              </button>
              <button onClick={() => setChannelTab('explore')}
                className={cn('px-3 py-1 rounded-full text-xs font-bold transition-all',
                  channelTab === 'explore' ? 'bg-[#ef4444] text-white' : 'text-[#71767b] hover:text-white')}>
                🔍 Explore
              </button>
              <span className="ml-auto text-[10px] text-[#71767b]">{loading ? 'Loading...' : `${channels.length} total`}</span>
            </div>
            {(() => {
              const myChannels = isTipster
                ? filtered.filter(c => c.ownerId === userId)
                : filtered.filter(c => c.joined);
              const exploreChannels = isTipster
                ? filtered.filter(c => c.ownerId !== userId)
                : filtered.filter(c => !c.joined);
              const displayList = channelTab === 'my' ? myChannels : exploreChannels;
              return displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                  <p className="text-3xl mb-3">📡</p>
                  <p className="font-bold text-sm text-white">
                    {channelTab === 'my' ? (isTipster ? 'You have no channels yet' : 'No joined channels') : 'No channels to explore'}
                  </p>
                  {channelTab === 'my' && !isTipster && (
                    <p className="text-xs text-[#71767b] mt-1">Go to Explore to join channels</p>
                  )}
                </div>
              ) : displayList.map(ch => (
                <ChannelRow key={ch.id} ch={ch} active={activeId === ch.id} onTap={() => handleSelectChannel(ch.id)} isTipster={isTipster} />
              ));
            })()}
          </motion.div>
        )}

        {tab === 'leaderboard' && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Leaderboard onSelect={(name) => navigate(`/user/${encodeURIComponent(name)}`)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  );
}
