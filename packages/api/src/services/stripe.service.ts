/**
 * Stripe Service
 * Handles payment processing and subscription management
 */

import Stripe from 'stripe';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/Logger';
import { SubscriptionStatus } from '../generated/prisma';

export class StripeService {
  private static stripe: Stripe;

  /**
   * Initialize Stripe client
   */
  static initialize(): void {
    const secretKey = process.env['STRIPE_SECRET_KEY'];
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
      typescript: true,
    });

    Logger.info('Stripe service initialized');
  }

  /**
   * Get Stripe client instance
   */
  static getClient(): Stripe {
    if (!this.stripe) {
      this.initialize();
    }
    return this.stripe;
  }

  /**
   * Create a checkout session for premium subscription
   */
  static async createCheckoutSession(
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const db = DatabaseService.getInstance();
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, stripeCustomerId: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });

        customerId = customer.id;

        // Update user with Stripe customer ID
        await db.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customerId },
        });

        Logger.info('Created new Stripe customer', { userId, customerId });
      }

      const priceId = process.env['STRIPE_PREMIUM_PRICE_ID'];
      if (!priceId) {
        throw new Error('STRIPE_PREMIUM_PRICE_ID is required');
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
          },
        },
      });

      Logger.info('Created checkout session', { userId, sessionId: session.id });
      return session;
    } catch (error) {
      Logger.error('Failed to create checkout session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create customer portal session for subscription management
   */
  static async createCustomerPortalSession(userId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const db = DatabaseService.getInstance();
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        throw new Error('User does not have a Stripe customer ID');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      Logger.info('Created customer portal session', { userId, sessionId: session.id });
      return session;
    } catch (error) {
      Logger.error('Failed to create customer portal session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle successful subscription checkout
   */
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.['userId'];
      if (!userId) {
        Logger.error('No userId in checkout session metadata', { sessionId: session.id });
        return;
      }

      const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);

      // Update user subscription status
      const db = DatabaseService.getInstance();
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.PREMIUM,
          subscriptionId: subscription.id,
          subscriptionEnd: new Date((subscription as any).current_period_end * 1000),
        },
      });

      Logger.info('Updated user subscription to premium', {
        userId,
        subscriptionId: subscription.id,
        periodEnd: new Date((subscription as any).current_period_end * 1000),
      });
    } catch (error) {
      Logger.error('Failed to handle checkout completed', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle subscription deletion/cancellation
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.['userId'];
      if (!userId) {
        Logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
        return;
      }

      // Update user subscription status to free
      const db = DatabaseService.getInstance();
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: SubscriptionStatus.FREE,
          subscriptionId: null,
          subscriptionEnd: null,
        },
      });

      Logger.info('Updated user subscription to free after cancellation', {
        userId,
        subscriptionId: subscription.id,
      });
    } catch (error) {
      Logger.error('Failed to handle subscription deletion', {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle subscription updates (e.g., renewal)
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.['userId'];
      if (!userId) {
        Logger.error('No userId in subscription metadata', { subscriptionId: subscription.id });
        return;
      }

      const subscriptionStatus =
        subscription.status === 'active' ? SubscriptionStatus.PREMIUM : SubscriptionStatus.FREE;

      // Update user subscription details
      const db = DatabaseService.getInstance();
      await db.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus,
          subscriptionEnd:
            subscription.status === 'active' ? new Date((subscription as any).current_period_end * 1000) : null,
        },
      });

      Logger.info('Updated subscription details', {
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        periodEnd: subscription.status === 'active' ? new Date((subscription as any).current_period_end * 1000) : null,
      });
    } catch (error) {
      Logger.error('Failed to handle subscription update', {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      Logger.error('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get subscription status for user
   */
  static async getUserSubscription(userId: string): Promise<{
    status: SubscriptionStatus;
    subscriptionEnd?: Date | undefined;
    isActive: boolean;
  }> {
    const db = DatabaseService.getInstance();
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionEnd: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isActive =
      user.subscriptionStatus === SubscriptionStatus.PREMIUM &&
      (!user.subscriptionEnd || user.subscriptionEnd > new Date());

    return {
      status: user.subscriptionStatus,
      subscriptionEnd: user.subscriptionEnd ?? undefined,
      isActive,
    };
  }

  /**
   * Check if user has premium features
   */
  static async hasPremiumFeatures(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return subscription.isActive;
  }
}

// Initialize Stripe on module load
// StripeService.initialize(); // Temporarily disabled to test if this causes hanging
