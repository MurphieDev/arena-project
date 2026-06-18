import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MainLayout } from './layout/MainLayout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { LivePage } from './pages/LivePage';
import { PredictionsPage } from './pages/PredictionsPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { MessagesPage } from './pages/MessagesPage';
import { WalletPage } from './pages/WalletPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';

type Page =
  | 'home' | 'explore' | 'live' | 'predictions'
  | 'communities' | 'messages' | 'wallet' | 'settings'
  | 'profile' | 'notifications' | 'dashboard' | 'admin';

// ── Admin emails ────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ['your-admin-email@gmail.com'];

function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('home');
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        if (user.emailVerified || isGoogle) {
          setAuthed(true);
          // Load user role
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          }
          // Check if admin
          if (ADMIN_EMAILS.includes(user.email || '')) {
            setUserRole('admin');
          }
        } else {
          setAuthed(false);
        }
      } else {
        setAuthed(false);
        setUserRole('user');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleNavigate = (page: string) => {
    // Block dashboard for non-tipsters
    if (page === 'dashboard' && userRole === 'user') return;
    setActivePage(page as Page);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#dc2626] to-[#ef4444] rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30">
            <span className="text-2xl font-black text-white">A</span>
          </div>
          <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!authed) {
    return <AuthPage onComplete={() => setAuthed(true)} />;
  }

  // Render active page
  const renderPage = () => {
    switch (activePage) {
      case 'home': return <HomePage />;
      case 'explore': return <ExplorePage />;
      case 'live': return <LivePage />;
      case 'predictions': return <PredictionsPage />;
      case 'communities': return <CommunitiesPage />;
      case 'messages': return <MessagesPage />;
      case 'wallet': return <WalletPage />;
      case 'settings': return <SettingsPage />;
      case 'profile': return <ProfilePage />;
      case 'notifications': return <NotificationsPage />;
      case 'dashboard': return userRole !== 'user' ? <DashboardPage /> : <HomePage />;
      case 'admin': return userRole === 'admin' ? <AdminPage /> : <HomePage />;
      default: return <HomePage />;
    }
  };

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={handleNavigate}
    >
      {renderPage()}
    </MainLayout>
  );
}

export default App;
