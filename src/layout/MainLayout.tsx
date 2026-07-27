// ── Main Layout ───────────────────────────────────────────────────────────────

import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Zap, Target, Plus, User } from 'lucide-react';
import { useAuth } from '../auth/hooks/AuthContext';
import { useDetailView } from '../contexts/DetailViewContext';
import { cn } from '../lib/utils';
import { RouteGuard } from '../middleware/guards/RouteGuards';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { RightSidebar } from '../layout/RightSidebar';
import { FeedProvider } from '../stores/feedStore';
import TipsterDashboard from '../dashboard/tipster/TipsterDashboard';
import { AdminRoutes } from '../admin/AdminRoutes';

// Lazy load page components
const HomePage = React.lazy(() => import('../users/pages/HomePage').then(m => ({ default: m.HomePage })));
const LivePage = React.lazy(() => import('../users/pages/LivePage').then(m => ({ default: m.LivePage })));
const FeedPage = React.lazy(() => import('../pages/FeedPage').then(m => ({ default: m.FeedPage })));
const VideoPage = React.lazy(() => import('../pages/VideoPage').then(m => ({ default: m.VideoPage })));
const PredictionsPage = React.lazy(() => import('../users/pages/PredictionsPage').then(m => ({ default: m.PredictionsPage })));
const CommunitiesPage = React.lazy(() => import('../users/pages/CommunitiesPage').then(m => ({ default: m.CommunitiesPage })));
const MessagesPage = React.lazy(() => import('../users/pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const NotificationsPage = React.lazy(() => import('../users/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage = React.lazy(() => import('../users/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const WalletPage = React.lazy(() => import('../users/pages/WalletPage').then(m => ({ default: m.WalletPage })));
const SettingsPage = React.lazy(() => import('../users/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BookmarksPage = React.lazy(() => import('../users/pages/BookmarksPage').then(m => ({ default: m.BookmarksPage })));
const UserProfileView = React.lazy(() => import('../users/pages/UserProfileView').then(m => ({ default: m.UserProfileRoute })));
const BecomeTipsterPage = React.lazy(() => import('../users/pages/BecomeTipsterPage'));

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


// ── Mobile Bottom Navigation ──────────────────────────────────────
function MobileBottomNav({ visible }: { visible: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showDetailView } = useDetailView();

  // Pages where bottom nav should NOT appear at all
  const hideOnPaths = ['/auth', '/auth/otp', '/admin'];
  
  // Hide if on hidden paths or if a detail view is open
  const shouldShow = 
    visible &&
    !hideOnPaths.includes(location.pathname) && 
    !showDetailView;

  if (!shouldShow) {
    return null;
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Zap, label: 'Live', path: '/live' },
    { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const handleCreatePost = () => {
    navigate('/');
    window.dispatchEvent(new CustomEvent('openPostModal'));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#09090c]/95 backdrop-blur-md border-t border-[#1f1f1f] pb-safe">
      <div className="flex items-stretch justify-around min-h-app-nav max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 transition-colors duration-200 min-h-touch',
                isActive ? 'text-[#ef4444]' : 'text-[#71767b] active:text-white'
              )}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-semibold truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleCreatePost}
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 text-[#71767b] active:text-[#ef4444] transition-colors duration-200 min-h-touch"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ef4444] flex items-center justify-center shadow-lg shadow-red-500/40 shrink-0">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold">Create</span>
        </button>
      </div>
    </nav>
  );
}

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  if (!user) {
    return <div>Loading...</div>; // Or redirect to auth
  }

  const location = useLocation();
  const { showDetailView } = useDetailView();

  const hideMobileNavAndHeaderPaths = [
    '/messages',
    '/become-tipster',
  ];

  const hideOnMobile = hideMobileNavAndHeaderPaths.some(path => location.pathname.startsWith(path)) || showDetailView;
  const shouldShowGlobalHeader = !mobileView || !hideOnMobile;
  const shouldShowBottomNav = !sidebarOpen && (!mobileView || !hideOnMobile);

  const isFullBleedLayout = ['/messages', '/predictions', '/profile', '/user'].some(path => location.pathname.startsWith(path));
  const needsMobileNavPadding = mobileView && !hideOnMobile && !sidebarOpen;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col overflow-x-hidden">
      {shouldShowGlobalHeader && (
        <Header
          title="Arena"
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />
      )}

      {/* 3-Column Layout with Fixed Sidebar */}
      <div className="flex flex-1 overflow-hidden pr-0 xl:pr-80 min-h-0">
        {/* Left Sidebar - Desktop */}
        <div className="hidden md:block md:w-64 lg:w-72 md:border-r md:border-[#1f1f1f] md:h-app-content md:overflow-hidden shrink-0">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            userRole={user.role}
            appUser={user}
          />
        </div>

        {/* Mobile Sidebar - drawer only, no duplicate overlay */}
        <div className="md:hidden">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            userRole={user.role}
            appUser={user}
          />
        </div>

        {/* Center + Right Container */}
        <div className={cn(
          "flex flex-1 relative min-w-0",
          shouldShowGlobalHeader ? "h-app-content" : "h-app-content-full"
        )}>
          {/* Center Main Feed - Scrollable */}
          <main 
            className={cn(
              "flex-1 border-r border-[#1f1f1f] min-w-0",
              (location.pathname.startsWith('/messages') || location.pathname.startsWith('/predictions'))
                ? "h-full overflow-hidden flex flex-col"
                : "overflow-y-auto scrollbar-none",
              needsMobileNavPadding && "pb-mobile-nav"
            )} 
          >
            <div 
              className={cn(
                'w-full', 
                isFullBleedLayout ? 'w-full' : 'max-w-2xl mx-auto',
                (location.pathname.startsWith('/messages') || location.pathname.startsWith('/predictions')) && 'h-full flex flex-col'
              )}
            >
              <div 
                className={cn(
                  "px-4 py-6 sm:px-6", 
                  isFullBleedLayout && "px-0 py-0 sm:px-0",
                  (location.pathname.startsWith('/messages') || location.pathname.startsWith('/predictions')) && 'h-full flex flex-col flex-1'
                )}
              >
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public Routes (accessible by all authenticated users) */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/feed" element={<FeedProvider><FeedPage /></FeedProvider>} />
                    <Route path="/videos" element={<VideoPage />} />
                    <Route path="/predictions" element={<PredictionsPage />} />
                    <Route path="/communities" element={<CommunitiesPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/bookmarks" element={<BookmarksPage />} />
                    <Route path="/wallet" element={<WalletPage userRole={user.role} />} />
                    <Route path="/settings/*" element={<SettingsPage userRole={user.role} />} />
                    <Route path="/profile" element={<ProfilePage appUser={user} />} />
                    <Route path="/user/:name" element={<UserProfileView />} />
                    <Route path="/become-tipster" element={<BecomeTipsterPage />} />

                    {/* Tipster-only Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <RouteGuard user={user} allowedRoles={['tipster']}>
                          <TipsterDashboard />
                        </RouteGuard>
                      }
                    />

                    {/* Admin-only Routes */}
                    <Route
                      path="/admin/*"
                      element={
                        <RouteGuard user={user} allowedRoles={['admin']}>
                          <AdminRoutes />
                        </RouteGuard>
                      }
                    />

                    {/* Fallback / Unauthorized */}
                    <Route path="/unauthorized" element={
                      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4 px-6">
                        <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                          <span className="text-3xl">🚫</span>
                        </div>
                        <h1 className="text-xl font-black text-white">Access Denied</h1>
                        <p className="text-sm text-[#71767b] text-center">You don't have permission to view this page.</p>
                        <button
                          onClick={() => window.history.back()}
                          className="px-6 py-2.5 bg-[#ef4444] rounded-full text-sm font-bold text-white hover:bg-[#dc2626] transition-colors"
                        >
                          Go Back
                        </button>
                      </div>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </div>
            </div>
          </main>

          {/* Right Sidebar - Fully Independent Scrolling */}
          <div className="hidden xl:flex xl:fixed xl:top-app-header xl:right-0 xl:w-80 xl:h-app-content xl:overflow-y-auto xl:border-l xl:border-[#1f1f1f] xl:bg-[#050505] scrollbar-none">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav visible={shouldShowBottomNav} />
    </div>
  );
};

export default MainLayout;
