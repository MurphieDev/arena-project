import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/hooks/AuthContext';
import { DetailViewProvider } from './contexts/DetailViewContext';
import { RouteGuard, AuthGuard } from './middleware/guards/RouteGuards';
import MainLayout from './layout/MainLayout';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
        <p className="text-sm font-bold tracking-wider">Loading Arena...</p>
      </div>
    </div>
  );
}

// Lazy load pages
const AuthPage = lazy(() => import('./auth/pages/AuthPage').then(m => ({ default: m.AuthPage })));
const OTPPage = lazy(() => import('./auth/pages/OTPPage').then(m => ({ default: m.OTPPage })));
const ForgotPasswordPage = lazy(() => import('./auth/pages/ForgotPasswordPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));

// ── Mobile back button handler ────────────────────────────────
function MobileBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Push a state so back button doesn't exit app
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Main pages - don't go back, just stay
      const mainPages = ['/', '/live', '/predictions', '/messages', '/profile'];
      if (mainPages.includes(location.pathname)) {
        // Push state again to prevent exit
        window.history.pushState(null, '', window.location.href);
      } else {
        // For sub-pages, go back normally
        navigate(-1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate]);

  return null;
}

// ── App Content ───────────────────────────────────────────────
function AppContent() {
  const { user } = useAuth();

  return (
    <>
      <MobileBackHandler />
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth" element={
          <AuthGuard user={user}>
            <Suspense fallback={<LoadingFallback />}>
              <AuthPage />
            </Suspense>
          </AuthGuard>
        } />
        <Route path="/auth/otp" element={
          <AuthGuard user={user}>
            <Suspense fallback={<LoadingFallback />}>
              <OTPPage />
            </Suspense>
          </AuthGuard>
        } />
        <Route path="/auth/forgot-password" element={
          <AuthGuard user={user}>
            <Suspense fallback={<LoadingFallback />}>
              <ForgotPasswordPage />
            </Suspense>
          </AuthGuard>
        } />
        <Route path="/privacy" element={
          <Suspense fallback={<LoadingFallback />}>
            <PrivacyPolicyPage />
          </Suspense>
        } />

        {/* Protected Routes */}
        <Route path="/*" element={
          <RouteGuard user={user}>
            <DetailViewProvider>
              <MainLayout />
            </DetailViewProvider>
          </RouteGuard>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
