import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, Bell, Mail, User,
  Zap, BarChart2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import {
  collection, query as firestoreQuery, where,
  onSnapshot, doc, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface MainLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

// ── Main Layout ────────────────────────────────────────────────────────────
export function MainLayout({ children, activePage, onNavigate }: MainLayoutProps) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [userRole, setUserRole] = useState<'user' | 'tipster' | 'admin'>('user');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserRole(data.role || 'user');
          setUserName(data.displayName || '');
        }
      } else {
        setUserId(null);
        setUserRole('user');
      }
    });
    return () => unsub();
  }, []);

  // Unread messages
  useEffect(() => {
    if (!userId) return;
    const q = firestoreQuery(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );
    const unsub = onSnapshot(q, snapshot => {
      let total = 0;
      snapshot.docs.forEach(d => {
        total += d.data()[`unread_${userId}`] || 0;
      });
      setUnreadMessages(total);
    });
    return () => unsub();
  }, [userId]);

  // Unread notifications
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

  // ── Navigation items based on role ──────────────────────────────────────
  const isTipster = userRole === 'tipster' || userRole === 'admin';

  const navItems = [
    { key: 'home', icon: Home, label: 'Home', show: true },
    { key: 'explore', icon: Search, label: 'Explore', show: true },
    { key: 'live', icon: Zap, label: 'Live', show: true },
    // Dashboard ONLY for tipsters
    { key: 'dashboard', icon: BarChart2, label: 'Dashboard', show: isTipster },
    { key: 'notifications', icon: Bell, label: 'Alerts', show: true, badge: unreadNotifications },
    { key: 'messages', icon: Mail, label: 'Messages', show: true, badge: unreadMessages },
    { key: 'profile', icon: User, label: 'Profile', show: true },
  ].filter(item => item.show);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1f1f1f] h-14 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-base font-black text-white">Arena</span>
          {isTipster && (
            <span className="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1.5 py-0.5 rounded-full font-black ml-1">
              TIPSTER
            </span>
          )}
        </div>
        {userName && (
          <div className="ml-auto flex items-center gap-2">
            <p className="text-xs text-[#71767b]">Hi, {userName.split(' ')[0]}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="pt-14 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-t border-[#1f1f1f]">
        <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            const badge = (item as any).badge || 0;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all relative min-w-[40px]"
              >
                <div className="relative">
                  <Icon className={cn(
                    'w-5 h-5 transition-all',
                    isActive ? 'text-[#ef4444]' : 'text-[#71767b]',
                    item.key === 'dashboard' && 'text-yellow-400'
                  )} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-[#ef4444] text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[9px] font-semibold transition-all',
                  isActive ? 'text-[#ef4444]' : 'text-[#71767b]',
                  item.key === 'dashboard' && !isActive && 'text-yellow-400'
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 w-1 h-1 bg-[#ef4444] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
