import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const ADMIN_EMAILS = ['your-admin-email@gmail.com'];

function AppContent() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        if (user.emailVerified || isGoogle) {
          setAuthed(true);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'user');
          }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ef4444]/30">
            <img src="/logo.jpg" alt="Arena" className="w-full h-full object-cover" />
          </div>
          <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!authed) {
    return <AuthPage onComplete={() => setAuthed(true)} />;
  }

  return (
    <MainLayout userRole={userRole}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route
          path="/dashboard"
          element={
            userRole === 'tipster' || userRole === 'admin'
              ? <DashboardPage />
              : <Navigate to="/" replace />
          }
        />
        <Route
          path="/admin"
          element={
            userRole === 'admin'
              ? <AdminPage />
              : <Navigate to="/" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
