import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { DatabaseService } from '../services';
import { Logger, ResponseHelper } from '../utils';
import { registerUserSchema, loginUserSchema, RegisterUserInput, LoginUserInput } from '../utils/validation';
import { ConflictError, ErrorFactory } from '../utils/errors';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * User Controller
 * Handles user authentication and profile management
 */
export class UserController {
  /**
   * Register a new user
   * POST /api/v1/users/register
   */
  public static registerUser: any = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validationResult = registerUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw ErrorFactory.fromZodError(validationResult.error);
    }

    const userData: RegisterUserInput = validationResult.data;
    const prisma = DatabaseService.getInstance();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists', { email: userData.email });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        privacyLevel: userData.privacyLevel || 'standard',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        privacyLevel: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info('New user registered', {
      userId: newUser.id,
      email: newUser.email,
    });

    res.status(201).json(
      ResponseHelper.success(
        {
          user: newUser,
          message: 'Registration successful. Please verify your email address.',
        },
        'User registered successfully',
      ),
    );
  });

  /**
   * Login user
   * POST /api/v1/users/login
   */
  public static loginUser: any = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validationResult = loginUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw ErrorFactory.fromZodError(validationResult.error);
    }

    const loginData: LoginUserInput = validationResult.data;
    const prisma = DatabaseService.getInstance();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: loginData.email },
    });

    if (!user) {
      res.status(401).json(ResponseHelper.error('Invalid email or password'));
      return;
    }

    if (!user.isActive) {
      res.status(401).json(ResponseHelper.error('Account is deactivated. Please contact support.'));
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);

    if (!isPasswordValid) {
      Logger.warn('Failed login attempt', {
        email: loginData.email,
        timestamp: new Date().toISOString(),
      });

      res.status(401).json(ResponseHelper.error('Invalid email or password'));
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      config.jwt.secret as string,
    );

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user data (without password) and token
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      privacyLevel: user.privacyLevel,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    Logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    res.status(200).json(
      ResponseHelper.success(
        {
          user: userResponse,
          token,
        },
        'Login successful',
      ),
    );
  });

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  public static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json(ResponseHelper.error('Authentication required'));
        return;
      }

      const prisma = DatabaseService.getInstance();

      // Fetch fresh user data from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          privacyLevel: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        res.status(404).json(ResponseHelper.error('User not found'));
        return;
      }

      Logger.debug('User profile retrieved', {
        userId: user.id,
        email: user.email,
      });

      res.status(200).json(ResponseHelper.success(user, 'User profile retrieved successfully'));
    } catch (error) {
      Logger.error('Failed to get current user', error);

      res
        .status(500)
        .json(ResponseHelper.error('Failed to retrieve user profile', { timestamp: new Date().toISOString() }));
    }
  }

  /**
   * Update user profile
   * PUT /api/v1/users/me
   */
  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, phoneNumber } = req.body;
      const prisma = DatabaseService.getInstance();

      // Validate input
      if (!firstName && !lastName && !phoneNumber) {
        res.status(400).json(ResponseHelper.error('At least one field is required for update'));
        return;
      }

      // Validate phone number format if provided
      if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
        res.status(400).json(ResponseHelper.error('Invalid phone number format'));
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phoneNumber && { phoneNumber }),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          privacyLevel: true,
        },
      });

      Logger.info(`User profile updated`, { userId });

      res.status(200).json(ResponseHelper.success(updatedUser, 'Profile updated successfully'));
    } catch (error) {
      Logger.error('Failed to update user profile', { userId: req.user?.id, error });
      res.status(500).json(ResponseHelper.error('Failed to update profile'));
    }
  }

  /**
   * Change user password
   * PUT /api/v1/users/me/password
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const prisma = DatabaseService.getInstance();

      // Validate required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(400).json(ResponseHelper.error('Current password, new password, and confirmation are required'));
        return;
      }

      // Validate new password matches confirmation
      if (newPassword !== confirmPassword) {
        res.status(400).json(ResponseHelper.error('New password and confirmation do not match'));
        return;
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        res.status(400).json(ResponseHelper.error('New password must be at least 8 characters long'));
        return;
      }

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });

      if (!user) {
        res.status(404).json(ResponseHelper.error('User not found'));
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        res.status(400).json(ResponseHelper.error('Current password is incorrect'));
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      });

      Logger.info(`User password changed`, { userId });

      res.status(200).json(ResponseHelper.success(null, 'Password changed successfully'));
    } catch (error) {
      Logger.error('Failed to change user password', { userId: req.user?.id, error });
      res.status(500).json(ResponseHelper.error('Failed to change password'));
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  public static async getUserStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const prisma = DatabaseService.getInstance();

      const stats = await prisma.user.aggregate({
        _count: {
          id: true,
        },
        where: {
          isActive: true,
        },
      });

      const inactiveCount = await prisma.user.count({
        where: {
          isActive: false,
        },
      });

      const verifiedCount = await prisma.user.count({
        where: {
          emailVerified: true,
          isActive: true,
        },
      });

      res.status(200).json(
        ResponseHelper.success(
          {
            totalActiveUsers: stats._count.id,
            inactiveUsers: inactiveCount,
            verifiedUsers: verifiedCount,
            unverifiedUsers: stats._count.id - verifiedCount,
          },
          'User statistics retrieved successfully',
        ),
      );
    } catch (error) {
      Logger.error('Failed to get user stats', error);

      res
        .status(500)
        .json(ResponseHelper.error('Failed to retrieve user statistics', { timestamp: new Date().toISOString() }));
    }
  }
}
