import { Router } from 'express';
import { StripeService } from '../services/stripe.service';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Logger } from '../utils/Logger';

const router: Router = Router();

/**
 * @swagger
 * /subscription/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe price ID for the subscription plan
 *               successUrl:
 *                 type: string
 *                 description: URL to redirect after successful payment
 *               cancelUrl:
 *                 type: string
 *                 description: URL to redirect when payment is cancelled
 *             required:
 *               - priceId
 *               - successUrl
 *               - cancelUrl
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Checkout session URL
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/checkout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Success URL and cancel URL are required' });
    }

    const session = await StripeService.createCheckoutSession(userId, successUrl, cancelUrl);

    return res.json({ url: session.url });
  } catch (error) {
    Logger.error('Checkout session creation failed', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * @swagger
 * /subscription/portal:
 *   post:
 *     summary: Get customer portal URL
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 description: URL to redirect when leaving portal
 *             required:
 *               - returnUrl
 *     responses:
 *       200:
 *         description: Customer portal URL retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Customer portal URL
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.post('/portal', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { returnUrl } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!returnUrl) {
      return res.status(400).json({ error: 'Return URL is required' });
    }

    const session = await StripeService.createCustomerPortalSession(userId, returnUrl);

    return res.json({ url: session.url });
  } catch (error) {
    Logger.error('Customer portal session creation failed', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error && error.message === 'Customer not found') {
      return res.status(404).json({ error: 'Customer not found' });
    }

    return res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

/**
 * @swagger
 * /subscription/status:
 *   get:
 *     summary: Get user subscription status
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [FREE, PREMIUM]
 *                   description: Current subscription status
 *                 subscriptionEnd:
 *                   type: string
 *                   format: date-time
 *                   description: Subscription end date (if applicable)
 *                   nullable: true
 *                 isActive:
 *                   type: boolean
 *                   description: Whether subscription is currently active
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subscription = await StripeService.getUserSubscription(userId);

    return res.json(subscription);
  } catch (error) {
    Logger.error('Failed to get subscription status', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * @swagger
 * /subscription/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Subscription]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Webhook processing failed
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Verify webhook signature and process event
    const event = StripeService.verifyWebhookSignature(JSON.stringify(req.body), signature);

    // Handle the event based on its type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await StripeService.handleSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await StripeService.handleSubscriptionDeleted(event.data.object as any);
        break;
      case 'invoice.payment_succeeded':
        // Handle successful payment
        Logger.info('Payment succeeded', {
          subscriptionId: (event.data.object as any).subscription,
        });
        break;
      case 'invoice.payment_failed':
        // Handle payment failure
        Logger.warn('Payment failed', {
          subscriptionId: (event.data.object as any).subscription,
        });
        break;
      default:
        Logger.info('Unhandled webhook event', { type: event.type });
    }

    return res.json({ received: true });
  } catch (error) {
    Logger.error('Webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Error && error.message.includes('Invalid signature')) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
