import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, Zap, Target, MessageCircle,
  Wallet, Settings, Bell, Menu, X, User,
  Users, LogOut, LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Nav Items ─────────────────────────────────────────────────
const navItems = [
  { icon: Home,            label: 'Home',        path: '/' },
  { icon: Compass,         label: 'Explore',     path: '/explore' },
  { icon: Zap,             label: 'Live',        path: '/live' },
  { icon: Target,          label: 'Predictions', path: '/predictions' },
  { icon: Users,           label: 'Communities', path: '/communities' },
  { icon: MessageCircle,   label: 'Messages',    path: '/messages' },
  { icon: Wallet,          label: 'Wallet',      path: '/wallet' },
  { icon: LayoutDashboard, label: 'Dashboard',   path: '/dashboard' },
  { icon: Settings,        label: 'Settings',    path: '/settings' },
];

const bottomNavItems = [
  { icon: Home,          label: 'Home',        path: '/' },
  { icon: Compass,       label: 'Explore',     path: '/explore' },
  { icon: Zap,           label: 'Live',        path: '/live' },
  { icon: Target,        label: 'Predictions', path: '/predictions' },
  { icon: User,          label: 'Profile',     path: '/profile' },
];

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            ref={sidebarRef}
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 h-screen w-60 bg-[#0d0d0d] border-r border-[#1f1f1f] z-50 flex flex-col py-6 px-3"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-3 mb-8">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#ef4444]">
                <img
                  src="/logo.jpg"
                  alt="Arena"
                  className="w-full h-full object-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <span className="text-white font-black text-xl tracking-tight">Arena</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      isActive
                        ? 'bg-[#ef4444]/15 text-[#ef4444] ring-1 ring-[#ef4444]/20'
                        : 'text-[#71767b] hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-[#ef4444]')} />
                    <span>{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ef4444]" />}
                  </motion.button>
                );
              })}

              {/* Profile */}
              <motion.button
                onClick={() => navigate('/profile')}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  location.pathname === '/profile'
                    ? 'bg-[#ef4444]/15 text-[#ef4444] ring-1 ring-[#ef4444]/20'
                    : 'text-[#71767b] hover:text-white hover:bg-white/5'
                )}
              >
                <User className="w-5 h-5 shrink-0" />
                <span>Profile</span>
              </motion.button>
            </nav>

            {/* Sign Out */}
            <div className="pt-3 border-t border-[#1f1f1f] space-y-1">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const headerTabs = [
    { label: 'Home',        path: '/' },
    { label: 'Explore',     path: '/explore' },
    { label: 'Live',        path: '/live' },
    { label: 'Predictions', path: '/predictions' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f]">
      <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all mr-1"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-0.5">
            {headerTabs.map(tab => {
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

          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#ef4444]">
              <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-black text-lg tracking-tight">Arena</span>
          </div>
        </div>

        {/* Right — bells */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full ring-1 ring-black" />
          </button>
          <button
            onClick={() => navigate('/messages')}
            className="relative p-2 rounded-xl text-[#71767b] hover:text-white hover:bg-white/5 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full ring-1 ring-black" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Mobile Bottom Nav ─────────────────────────────────────────
function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 md:hidden">
      <div className="bg-[#0d0d0d]/95 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl px-1 py-2 flex items-center justify-around shadow-2xl shadow-black/80">
        {bottomNavItems.map((item) => {
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
              <div className={cn(
                'p-1.5 rounded-xl transition-all',
                isActive && 'bg-[#ef4444]/15 ring-1 ring-[#ef4444]/20'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────
interface MainLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export function MainLayout({ children, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-[#e7e9ea]">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />
      <main className="pt-14 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-[680px] mx-auto w-full border-x border-[#1f1f1f] min-h-[calc(100vh-56px)]">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}