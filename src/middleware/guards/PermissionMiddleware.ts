// ── Backend Permission Middleware Examples ───────────────────────────────────
// Express.js middleware for enforcing RBAC permissions on API endpoints
// NEVER trust frontend role - always validate server-side

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../database/models/User';
import type { UserModel } from '../../database/models/User';
import { ROLE_PERMISSIONS } from '../../core/types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserModel;
    }
  }
}

// ── JWT Authentication Middleware ────────────────────────────────────────────
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; tokenVersion: number };

    // Fetch user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if token version matches (for token invalidation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ error: 'Token has been invalidated' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// ── Permission-Based Access Control Middleware ──────────────────────────────
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role];
    if (!userPermissions.includes(requiredPermission)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermission,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

// ── Role-Based Access Control Middleware ─────────────────────────────────────
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Role not authorized',
        allowedRoles,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

// ── Combined Auth + Permission Middleware ────────────────────────────────────
export const requireAuthAndPermission = (permission: string) => [
  authenticateToken,
  requirePermission(permission)
];

// ── Usage Examples ───────────────────────────────────────────────────────────
/*
// Auth endpoints (no auth required)
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/signup', signupHandler);

// Protected endpoints with authentication only
app.get('/api/auth/profile', authenticateToken, getProfileHandler);

// Protected endpoints with role requirements
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), getUsersHandler);

// Protected endpoints with specific permissions
app.post('/api/predictions', requireAuthAndPermission('create_predictions'), createPredictionHandler);
app.get('/api/predictions', requireAuthAndPermission('view_predictions'), getPredictionsHandler);

// Tipster-only endpoints
app.post('/api/tipsters/predictions', requireAuthAndPermission('create_predictions'), createTipsterPredictionHandler);

// Admin-only endpoints
app.post('/api/admin/verify-tipster', requireAuthAndPermission('verify_tipsters'), verifyTipsterHandler);
app.get('/api/admin/system-stats', requireAuthAndPermission('system_admin'), getSystemStatsHandler);
*/

// ── Error Handling Middleware ────────────────────────────────────────────────
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('API Error:', error);

  if (error.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation failed', details: error.errors });
    return;
  }

  if (error.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};