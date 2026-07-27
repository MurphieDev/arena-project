import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import {
  Home,
  Zap,
  Users,
  Trophy,
  Target,
  User,
  Wallet,
  Settings,
  Bookmark,
  X,
  Video,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { UserRole, AppUser } from '../core/types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  isLive?: boolean;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
  appUser: AppUser;
}

const userNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Zap, label: 'Live', path: '/live', isLive: true },
  { icon: Target, label: 'Predictions', path: '/predictions' },
  { icon: Video, label: 'Videos', path: '/videos' },
  { icon: Users, label: 'Communities', path: '/communities' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const tipsterNavItems: NavItem[] = [
  ...userNavItems.filter(item => item.label !== 'Settings'),
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Trophy, label: 'Dashboard', path: '/dashboard' },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Sidebar({ open, onClose, userRole, appUser }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = userRole === 'tipster' ? tipsterNavItems : userNavItems;
  const isOpen = open;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed top-app-header bottom-0 left-0 z-50 w-[min(18rem,88vw)] bg-[#09090c] border-r border-[#1f1f1f] p-3 sm:p-4 transition-transform duration-300 ease-out overflow-y-auto scrollbar-none pb-safe md:relative md:w-auto md:inset-auto md:top-auto md:bottom-auto md:z-auto md:border-none md:p-4 md:flex md:flex-col md:translate-x-0 md:h-full md:bg-transparent',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          <div>
            <div className="flex items-center justify-between mb-4 md:mb-6 md:hidden">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#ef4444] flex items-center justify-center text-white font-black shrink-0 text-sm">
                  {getInitials(appUser.name || 'A')}
                </div>
                <div className="min-w-0">
                  <span className="text-white font-bold block truncate">{appUser.name || 'Arena'}</span>
                  <span className="text-[11px] text-[#71767b] block truncate">{appUser.handle || '@arena'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors shrink-0 min-h-touch min-w-touch flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Section */}
            <div className="mb-6 relative z-10">
              <p className="text-xs font-bold text-[#71767b] uppercase px-4 mb-2">Navigation</p>
              <nav className="space-y-1">
                {navItems.slice(0, 5).map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all text-left relative z-20 min-h-touch',
                        isActive ? 'bg-[#1f1f1f] text-[#ef4444]' : 'text-[#e7e9ea] hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-[#ef4444]')} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-[#ef4444] text-white font-bold rounded-full px-2 py-0.5">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                      {item.isLive && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Other Sections */}
            <div className="border-t border-white/10 pt-6 relative">
              <p className="text-xs font-bold text-[#71767b] uppercase px-4 mb-2">More</p>
              <nav className="space-y-1">
                {navItems.slice(5).map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all text-left relative z-10 min-h-touch',
                        isActive ? 'bg-[#1f1f1f] text-[#ef4444]' : 'text-[#e7e9ea] hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-[#ef4444]')} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] bg-[#ef4444] text-white font-bold rounded-full px-2 py-0.5">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Post Action Button */}
          <div className="mt-3 px-1 sm:px-4">
            <button
              onClick={() => {
                if (location.pathname !== '/') {
                  navigate('/');
                }
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('openPostModal'));
                }, 100);
                onClose();
              }}
              className="w-full py-2.5 bg-gradient-to-r from-[#dc2626] to-[#ef4444] hover:opacity-95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 min-h-touch"
            >
              <span>Post</span>
            </button>
          </div>

          {/* User Profile Section - always at bottom */}
          <div className="shrink-0 border-t border-white/10 pt-3 sm:pt-4 mt-auto hidden md:block">
            <button
              onClick={() => {
                navigate('/profile');
                onClose();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-[#ef4444] flex items-center justify-center text-white font-black flex-shrink-0">
                {getInitials(appUser.name || 'A')}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-bold text-white truncate">{appUser.name || 'Arena User'}</p>
                <p className="text-xs text-[#71767b] truncate">{appUser.handle || '@arena'}</p>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
