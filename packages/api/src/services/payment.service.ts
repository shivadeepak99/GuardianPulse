/**
 * Universal Payment Service
 * Supports multiple payment providers with fallback mechanism
 * MAINTAINS BACKWARD COMPATIBILITY with existing StripeService
 */

import { StripeService } from './stripe.service';
import { Logger } from '../utils';

// Payment provider types
export enum PaymentProvider {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
}

// Universal payment interfaces
export interface PaymentOptions {
  provider?: PaymentProvider;
  fallbackProvider?: PaymentProvider;
  enableFallback?: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
  provider: PaymentProvider;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  session?: CheckoutSession;
  provider: PaymentProvider;
  error?: string;
}

/**
 * Universal Payment Service with Provider Fallback
 *
 * Migration Strategy:
 * 1. Starts with existing StripeService (no breaking changes)
 * 2. Allows gradual migration to Razorpay
 * 3. Supports A/B testing between providers
 * 4. Zero downtime migration path
 */
export class PaymentService {
  private primaryProvider: PaymentProvider;
  private fallbackProvider: PaymentProvider | undefined;
  private enableFallback: boolean;

  constructor(options: PaymentOptions = {}) {
    // Default to Stripe for backward compatibility
    this.primaryProvider = options.provider || PaymentProvider.STRIPE;
    this.fallbackProvider = options.fallbackProvider;
    this.enableFallback = options.enableFallback ?? true;

    Logger.info(`Payment service initialized with provider: ${this.primaryProvider}`);
    if (this.enableFallback && this.fallbackProvider) {
      Logger.info(`Fallback payment provider configured: ${this.fallbackProvider}`);
    }
  }

  /**
   * Create checkout session with provider fallback
   * BACKWARD COMPATIBLE: Uses existing StripeService by default
   */
  async createCheckoutSession(userId: string, successUrl: string, cancelUrl: string): Promise<PaymentResult> {
    try {
      // Try primary provider first
      const result = await this.createSessionWithProvider(this.primaryProvider, userId, successUrl, cancelUrl);

      if (result.success) {
        return result;
      }

      // Fallback to secondary provider if enabled
      if (this.enableFallback && this.fallbackProvider && this.fallbackProvider !== this.primaryProvider) {
        Logger.warn(`Primary payment provider ${this.primaryProvider} failed, trying fallback`);

        return await this.createSessionWithProvider(this.fallbackProvider, userId, successUrl, cancelUrl);
      }

      return result;
    } catch (error) {
      Logger.error('Payment service checkout failed:', error);
      return {
        success: false,
        provider: this.primaryProvider,
        error: error instanceof Error ? error.message : 'Unknown payment error',
      };
    }
  }

  /**
   * Create session with specific provider
   */
  private async createSessionWithProvider(
    provider: PaymentProvider,
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<PaymentResult> {
    switch (provider) {
      case PaymentProvider.STRIPE:
        try {
          // Use existing StripeService (zero breaking changes)
          const session = await StripeService.createCheckoutSession(userId, successUrl, cancelUrl);

          return {
            success: true,
            session: {
              id: session.id,
              url: session.url!,
              provider: PaymentProvider.STRIPE,
              metadata: { stripeSessionId: session.id },
            },
            provider: PaymentProvider.STRIPE,
          };
        } catch (error) {
          return {
            success: false,
            provider: PaymentProvider.STRIPE,
            error: error instanceof Error ? error.message : 'Stripe payment failed',
          };
        }

      case PaymentProvider.RAZORPAY:
        // TODO: Implement Razorpay (Phase 2)
        return {
          success: false,
          provider: PaymentProvider.RAZORPAY,
          error: 'Razorpay not yet implemented',
        };

      default:
        return {
          success: false,
          provider,
          error: `Unsupported payment provider: ${provider}`,
        };
    }
  }

  /**
   * Verify webhook signature (provider-specific)
   */
  async verifyWebhook(rawBody: string, signature: string, provider?: PaymentProvider): Promise<boolean> {
    const targetProvider = provider || this.primaryProvider;

    switch (targetProvider) {
      case PaymentProvider.STRIPE:
        try {
          // Use existing Stripe webhook verification
          StripeService.verifyWebhookSignature(rawBody, signature);
          return true;
        } catch {
          return false;
        }

      case PaymentProvider.RAZORPAY:
        // TODO: Implement Razorpay webhook verification
        Logger.warn('Razorpay webhook verification not yet implemented');
        return false;

      default:
        Logger.error(`Webhook verification not supported for provider: ${targetProvider}`);
        return false;
    }
  }

  /**
   * Health check for payment providers
   */
  async healthCheck(): Promise<{ [key in PaymentProvider]?: boolean }> {
    const health: { [key in PaymentProvider]?: boolean } = {};

    // Check Stripe health
    try {
      const client = StripeService.getClient();
      // Simple test - retrieve account info
      await client.accounts.retrieve();
      health[PaymentProvider.STRIPE] = true;
    } catch {
      health[PaymentProvider.STRIPE] = false;
    }

    // TODO: Add Razorpay health check

    return health;
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(provider?: PaymentProvider): Record<string, any> {
    const targetProvider = provider || this.primaryProvider;

    switch (targetProvider) {
      case PaymentProvider.STRIPE:
        return {
          provider: 'stripe',
          publicKey: process.env['STRIPE_PUBLISHABLE_KEY'],
          currency: 'usd',
          features: ['subscriptions', 'one-time-payments', 'webhooks'],
        };

      case PaymentProvider.RAZORPAY:
        return {
          provider: 'razorpay',
          publicKey: process.env['RAZORPAY_KEY_ID'],
          currency: 'inr',
          features: ['subscriptions', 'one-time-payments', 'upi', 'netbanking', 'wallets'],
        };

      default:
        return {};
    }
  }
}

// Export singleton instance for backward compatibility
export const paymentService = new PaymentService();
