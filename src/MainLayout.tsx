import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, Zap, Target, MessageCircle,
  Wallet, Settings, Bell, Menu, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query as firestoreQuery,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Nav Items ──────────────────────────────────────────────────────────────
const navItems = [
  { icon: Home,          label: 'Home',        path: '/' },
  { icon: Compass,       label: 'Explore',     path: '/explore' },
  { icon: Zap,           label: 'Live',        path: '/live' },
  { icon: Target,        label: 'Predictions', path: '/predictions' },
  { icon: MessageCircle, label: 'Messages',    path: '/messages' },
  { icon: Wallet,        label: 'Wallet',      path: '/wallet' },
  { icon: Settings,      label: 'Settings',    path: '/settings' },
];

const bottomNavItems = [
  { icon: Home,          label: 'Home',        path: '/' },
  { icon: Compass,       label: 'Explore',     path: '/explore' },
  { icon: Zap,           label: 'Live',        path: '/live' },
  { icon: Target,        label: 'Predictions', path: '/predictions' },
  { icon: MessageCircle, label: 'Messages',    path: '/messages' },
];

// ── Hook: Real unread counts from Firebase ─────────────────────────────────
function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user id
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Listen to unread notifications
  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, snapshot => {
      setUnreadNotifications(snapshot.size);
    });
    return () => unsub();
  }, [userId]);

  // Listen to unread messages
  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const unsub = onSnapshot(q, snapshot => {
      let total = 0;
      snapshot.docs.forEach(d => {
        const data = d.data();
        total += data.unreadCount?.[userId] || 0;
      });
      setUnreadMessages(total);
    });
    return () => unsub();
  }, [userId]);

  return { unreadMessages, unreadNotifications };
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 hidden md:block"
          />
          <motion.div
            ref={sidebarRef}
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-64 bg-[#0d0d0d] border-r border-[#1f1f1f] z-50 flex flex-col py-6 px-3"
          >
            <div className="flex items-center gap-3 px-3 mb-8">
              <img src="/logo.jpg" alt="Arena" className="w-9 h-9 rounded-full object-cover" />
              <span className="text-white font-black text-xl tracking-tight">Arena</span>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all',
                      isActive
                        ? 'bg-[#ef4444]/15 text-[#ef4444] ring-1 ring-[#ef4444]/30'
                        : 'text-[#71767b] hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isActive && 'text-[#ef4444]')} />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ef4444]"
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            <button
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-3 text-[#71767b] hover:text-white text-sm font-semibold transition-colors"
            >
              <X className="w-5 h-5" />
              Close Menu
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages, unreadNotifications } = useUnreadCounts();

  const headerTabs = [
    { label: 'Home',        path: '/' },
    { label: 'Explore',     path: '/explore' },
    { label: 'Live',        path: '/live' },
    { label: 'Predictions', path: '/predictions' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md border-b border-[#1f1f1f]">
      <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center justify-between gap-4">

        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {headerTabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
                    isActive
                      ? 'text-[#ef4444] bg-[#ef4444]/10'
                      : 'text-[#71767b] hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {/* Notifications — dot only when there are unread */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full" />
            )}
          </button>

          {/* Messages — dot only when there are unread */}
          <button
            onClick={() => navigate('/messages')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Mobile Bottom Nav ──────────────────────────────────────────────────────
function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 md:hidden">
      <div className="bg-[#0d0d0d]/95 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl px-2 py-2 flex items-center justify-around shadow-xl shadow-black/50">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
                isActive ? 'text-[#ef4444]' : 'text-[#71767b]'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all',
                isActive && 'bg-[#ef4444]/15 ring-1 ring-[#ef4444]/30'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────
export function MainLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="pt-14 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-[680px] mx-auto w-full border-x border-[#1f1f1f] min-h-screen">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
