import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { DatabaseService } from '../services';
import { Logger } from '../utils';

/**
 * Extended Request interface to include user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isActive: boolean;
    privacyLevel: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * JWT Payload interface
 */
interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */
export class AuthMiddleware {
  /**
   * Verify JWT token and authenticate user
   */
  public static async authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access denied. No token provided or invalid format.',
          error: 'MISSING_TOKEN',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Access denied. Token is empty.',
          error: 'EMPTY_TOKEN',
        });
        return;
      }

      // Verify the token
      let decoded: JWTPayload;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      } catch (jwtError) {
        Logger.warn('JWT verification failed', {
          error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
          token: token.substring(0, 10) + '...',
        });

        if (jwtError instanceof jwt.TokenExpiredError) {
          res.status(401).json({
            success: false,
            message: 'Token has expired.',
            error: 'TOKEN_EXPIRED',
          });
          return;
        }

        if (jwtError instanceof jwt.JsonWebTokenError) {
          res.status(401).json({
            success: false,
            message: 'Invalid token.',
            error: 'INVALID_TOKEN',
          });
          return;
        }

        res.status(401).json({
          success: false,
          message: 'Token verification failed.',
          error: 'TOKEN_VERIFICATION_FAILED',
        });
        return;
      }

      // Fetch user from database
      const prisma = DatabaseService.getInstance();
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          privacyLevel: true,
          createdAt: true,
          updatedAt: true,
          emailVerified: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        Logger.warn('User not found for valid token', {
          userId: decoded.userId,
          email: decoded.email,
        });

        res.status(401).json({
          success: false,
          message: 'User not found.',
          error: 'USER_NOT_FOUND',
        });
        return;
      }

      if (!user.isActive) {
        Logger.warn('Inactive user attempted to access protected route', {
          userId: user.id,
          email: user.email,
        });

        res.status(401).json({
          success: false,
          message: 'Account is deactivated.',
          error: 'ACCOUNT_DEACTIVATED',
        });
        return;
      }

      // Attach user to request object
      req.user = user;

      Logger.debug('User authenticated successfully', {
        userId: user.id,
        email: user.email,
      });

      next();
    } catch (error) {
      Logger.error('Authentication middleware error', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error during authentication.',
        error: 'AUTHENTICATION_ERROR',
      });
    }
  }

  /**
   * Optional authentication middleware
   * Authenticates if token is present, but doesn't fail if not
   */
  public static async optionalAuthenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // If token is provided, use the regular authentication
    await AuthMiddleware.authenticate(req, res, next);
  }

  /**
   * Role-based authorization middleware
   * Note: Can be extended when role system is implemented
   */
  public static requireRole(_requiredRole: string) {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
          error: 'NOT_AUTHENTICATED',
        });
        return;
      }

      // For now, we'll just check if user is active
      // This can be extended when role system is implemented
      // TODO: Use requiredRole parameter when role system is implemented
      if (req.user.isActive) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions.',
          error: 'INSUFFICIENT_PERMISSIONS',
        });
      }
    };
  }
}

// Export the middleware functions
export const authenticate = AuthMiddleware.authenticate;
export const optionalAuthenticate = AuthMiddleware.optionalAuthenticate;
export const requireRole = AuthMiddleware.requireRole;
