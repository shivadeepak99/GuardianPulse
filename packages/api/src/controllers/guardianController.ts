import { Response } from 'express';
import { DatabaseService } from '../services';
import { Logger } from '../utils';
import { createGuardianInvitationSchema } from '../utils/validation';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const db = DatabaseService.getInstance();

export class GuardianController {
  /**
   * POST /api/v1/guardian/invite
   * Send a guardian invitation to another user by email
   */
  static async invite(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const validatedData = createGuardianInvitationSchema.parse(req.body);
      const { inviteeEmail, message } = validatedData;

      // Check if user is trying to invite themselves
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user?.email === inviteeEmail) {
        return res.status(409).json({
          message: 'You cannot invite yourself as a guardian',
        });
      }

      // Check if invitation already exists
      const existingInvitation = await db.guardianInvitation.findFirst({
        where: {
          inviterId: userId,
          inviteeEmail: inviteeEmail,
          status: 'PENDING',
        },
      });

      if (existingInvitation) {
        return res.status(409).json({
          message: 'Invitation already sent to this email',
        });
      }

      // Create invitation
      const invitation = await db.guardianInvitation.create({
        data: {
          inviterId: userId,
          inviteeEmail: inviteeEmail,
          message: message || null,
          status: 'PENDING',
        },
        include: {
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      Logger.info(`Guardian invitation sent from user ${userId} to ${inviteeEmail}`);

      return res.status(201).json({
        success: true,
        message: 'Guardian invitation sent successfully',
        data: { invitation },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.issues,
        });
      }

      Logger.error('Error sending guardian invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/guardian/invitations
   * Get all pending invitations sent by the current user
   */
  static async getInvitations(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Only get pending invitations sent by current user
      const invitations = await db.guardianInvitation.findMany({
        where: {
          inviterId: userId,
          status: 'PENDING',
        },
        include: {
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        data: { invitations },
      });
    } catch (error) {
      Logger.error('Error fetching guardian invitations:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/guardian/invitations/:invitationId/accept
   * Accept a guardian invitation
   */
  static async acceptInvitation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const invitationId = req.params['invitationId'];

      if (!userId || !userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          message: 'Invitation ID is required',
        });
      }

      // Find the invitation
      const invitation = await db.guardianInvitation.findFirst({
        where: {
          id: invitationId,
          inviteeEmail: userEmail,
          status: 'PENDING',
        },
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found or already responded to',
        });
      }

      // Update invitation status and create guardian relationship
      const [updatedInvitation, relationship] = await Promise.all([
        db.guardianInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED' },
          include: {
            inviter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        db.guardianRelationship.create({
          data: {
            wardId: invitation.inviterId,
            guardianId: userId,
            isActive: true,
            permissions: ['VIEW_LOCATION', 'RECEIVE_ALERTS'],
          },
          include: {
            ward: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      ]);

      Logger.info(`Guardian invitation ${invitationId} accepted by user ${userId}`);

      return res.json({
        success: true,
        message: 'Invitation accepted successfully',
        data: {
          invitation: updatedInvitation,
          relationship,
        },
      });
    } catch (error) {
      Logger.error('Error accepting guardian invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/v1/guardian/invitations/:invitationId/decline
   * Decline a guardian invitation
   */
  static async declineInvitation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const invitationId = req.params['invitationId'];

      if (!userId || !userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!invitationId) {
        return res.status(400).json({
          success: false,
          message: 'Invitation ID is required',
        });
      }

      // Find the invitation
      const invitation = await db.guardianInvitation.findFirst({
        where: {
          id: invitationId,
          inviteeEmail: userEmail,
          status: 'PENDING',
        },
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found or already responded to',
        });
      }

      // Update invitation status
      const updatedInvitation = await db.guardianInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' },
        include: {
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      Logger.info(`Guardian invitation ${invitationId} declined by user ${userId}`);

      return res.json({
        success: true,
        message: 'Invitation declined successfully',
        data: {
          invitation: updatedInvitation,
        },
      });
    } catch (error) {
      Logger.error('Error declining guardian invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/guardian/wards
   * Get all users the current user is a guardian for
   */
  static async getWards(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const relationships = await db.guardianRelationship.findMany({
        where: {
          guardianId: userId,
          isActive: true,
        },
        include: {
          ward: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const wards = relationships.map((rel: any) => rel.ward);

      return res.json({
        success: true,
        data: { wards },
      });
    } catch (error) {
      Logger.error('Error fetching wards:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/guardian/guardians
   * Get all guardians for the current user
   */
  static async getGuardians(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const relationships = await db.guardianRelationship.findMany({
        where: {
          wardId: userId,
          isActive: true,
        },
        include: {
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const guardians = relationships.map((rel: any) => rel.guardian);

      return res.json({
        success: true,
        data: { guardians },
      });
    } catch (error) {
      Logger.error('Error fetching guardians:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}
