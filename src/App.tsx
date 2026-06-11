import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
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

function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen to Firebase auth state — persists across page refreshes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setAuthed(true);
      } else if (user && !user.emailVerified) {
        // Google users are always verified
        // Email/password users must verify
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        setAuthed(isGoogleUser);
      } else {
        setAuthed(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = () => {
    setAuthed(false);
  };

  // Show spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#ef4444]">
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
    <MainLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/"              element={<HomePage />} />
        <Route path="/explore"       element={<ExplorePage />} />
        <Route path="/live"          element={<LivePage />} />
        <Route path="/predictions"   element={<PredictionsPage />} />
        <Route path="/communities"   element={<CommunitiesPage />} />
        <Route path="/messages"      element={<MessagesPage />} />
        <Route path="/wallet"        element={<WalletPage />} />
        <Route path="/settings"      element={<SettingsPage />} />
        <Route path="/profile"       element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/admin"         element={<AdminPage />} />
        <Route path="*"              element={<HomePage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
