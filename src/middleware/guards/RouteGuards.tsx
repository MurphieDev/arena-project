// ── Route Guards ──────────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom';
import type { AppUser, UserRole } from '../../core/types';
import { ROUTE_ACCESS } from '../../core/types';

interface RouteGuardProps {
  children: React.ReactNode;
  user: AppUser | null;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  user,
  requiredRole,
  allowedRoles,
}) => {
  const location = useLocation();

  // If no user, redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check route access patterns
  const userRoutes = ROUTE_ACCESS[user.role];
  const currentPath = location.pathname;

  const hasAccess = userRoutes.some((route: string) => {
    if (route.endsWith('/*')) {
      const baseRoute = route.slice(0, -2);
      return currentPath.startsWith(baseRoute);
    }
    return route === currentPath;
  });

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const AuthGuard: React.FC<{ children: React.ReactNode; user: AppUser | null }> = ({
  children,
  user,
}) => {
  const location = useLocation();

  if (user) {
    // Redirect authenticated users away from auth pages
    if (location.pathname.startsWith('/auth')) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export const RoleBasedRedirect: React.FC<{ user: AppUser }> = ({ user }) => {
  switch (user.role) {
    case 'tipster':
      return <Navigate to="/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};
