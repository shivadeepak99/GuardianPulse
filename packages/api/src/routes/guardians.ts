import { Router } from 'express';
import { GuardianController } from '../controllers/guardianController';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

// Apply authentication middleware to all guardian routes
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Guardians
 *     description: Guardian and ward relationship management endpoints
 */

// Guardian invitation routes - Prompt #8 Requirements
router.post('/invite', GuardianController.invite); // POST /api/v1/guardian/invite
router.get('/invitations', GuardianController.getInvitations); // GET /api/v1/guardian/invitations
router.post('/invitations/:invitationId/accept', GuardianController.acceptInvitation); // POST /api/v1/guardian/invitations/:invitationId/accept
router.post('/invitations/:invitationId/decline', GuardianController.declineInvitation); // POST /api/v1/guardian/invitations/:invitationId/decline

// Guardian/Ward relationship routes
router.get('/wards', GuardianController.getWards); // GET /api/v1/guardian/wards
router.get('/guardians', GuardianController.getGuardians); // GET /api/v1/guardian/guardians

export default router;
