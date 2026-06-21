import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, Zap, Target, MessageCircle,
  Wallet, Settings, Bell, Menu, X, Users,
  BarChart2, Shield, User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, query as firestoreQuery,
  where, onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface MainLayoutProps {
  children: ReactNode;
  userRole?: string;
}

// ── Real unread counts ─────────────────────────────────────────────────────
function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, snap => setUnreadNotifications(snap.size));
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const unsub = onSnapshot(q, snap => {
      let total = 0;
      snap.docs.forEach(d => {
        total += d.data()[`unread_${userId}`] || 0;
      });
      setUnreadMessages(total);
    });
    return () => unsub();
  }, [userId]);

  return { unreadMessages, unreadNotifications };
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose, userRole }: {
  open: boolean;
  onClose: () => void;
  userRole: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const isTipster = userRole === 'tipster' || userRole === 'admin';
  const isAdmin = userRole === 'admin';

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Zap, label: 'Live', path: '/live' },
    { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: Users, label: 'Communities', path: '/communities' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(isTipster ? [{ icon: BarChart2, label: 'Dashboard', path: '/dashboard' }] : []),
    ...(isAdmin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ];

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.div
            ref={ref}
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-72 bg-[#0a0a0a] border-r border-[#1f1f1f] z-50 flex flex-col"
          >
            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#1f1f1f]">
                  <img
                    src="/logo.jpg"
                    alt="Arena"
                    className="w-full h-full object-cover"
                    onError={e => {
                      // Fallback if logo.jpg doesn't exist
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-[#ef4444] flex items-center justify-center"><span class="text-white font-black text-sm">A</span></div>';
                    }}
                  />
                </div>
                <span className="text-white font-black text-xl tracking-tight">Arena</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#71767b] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left',
                      isActive
                        ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
                        : 'text-[#71767b] hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {item.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Bottom user role badge */}
            <div className="px-4 py-4 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-xl border border-[#1f1f1f]">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-[#71767b] font-semibold capitalize">{userRole}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { unreadMessages, unreadNotifications } = useUnreadCounts();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f] h-14">
      <div className="h-full px-4 flex items-center justify-between">

        {/* Left — hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#1f1f1f]">
              <img
                src="/logo.jpg"
                alt="Arena"
                className="w-full h-full object-cover"
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full bg-[#ef4444] flex items-center justify-center"><span class="text-white font-black text-xs">A</span></div>';
                }}
              />
            </div>
            <span className="font-black text-white text-base tracking-tight">Arena</span>
          </button>
        </div>

        {/* Right — notifications + messages */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/messages')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
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

  const items = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Zap, label: 'Live', path: '/live' },
    { icon: Target, label: 'Tips', path: '/predictions' },
    { icon: Users, label: 'Community', path: '/communities' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#1f1f1f]">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all',
                isActive ? 'text-[#ef4444]' : 'text-[#71767b]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────
export function MainLayout({ children, userRole = 'user' }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={userRole}
      />
      <main className="pt-14 pb-20 md:pb-8 min-h-screen">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
