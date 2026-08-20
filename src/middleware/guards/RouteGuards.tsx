// src/middleware/guards/RouteGuards.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/AuthContext';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-[#ef4444] border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-white tracking-wider">Loading Arena...</p>
      </div>
    </div>
  );
}

// Protects authenticated routes - redirects to /auth if not logged in
export function RouteGuard({ user, children, allowedRoles }: { user: any; children: React.ReactNode; allowedRoles?: string[] }) {
  const { loading } = useAuth();

  // CRITICAL: Show loading while Firebase checks auth state
  // This prevents redirect to /auth on refresh
  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/auth" replace />;
  
  // Check role if allowedRoles specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user as any)?.role || 'user';
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

// Protects auth routes - redirects to / if already logged in
export function AuthGuard({ user, children }: { user: any; children: React.ReactNode }) {
  const { loading } = useAuth();

  // Wait for auth to initialize before redirecting
  if (loading) return <LoadingScreen />;

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
