import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../config/supabase.config';
import { LoyaltyService } from '../loyalty/loyalty.service';
const Stripe = require('stripe');

@Injectable()
export class PaymentsService {
  private stripe: any;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly loyalty: LoyaltyService,
  ) {
    this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'));
  }

  /** Create a PaymentIntent for an order. Returns client_secret for the mobile app. */
  async createPaymentIntent(orderId: string, userId: string) {
    const admin = this.supabase.getAdminClient();

    // Get order
    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Order is not in pending status');
    }

    // Check if payment intent already exists for this order
    const { data: existingPayment } = await admin
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingPayment) {
      // Retrieve existing intent
      const existing = await this.stripe.paymentIntents.retrieve(
        existingPayment.stripe_payment_intent_id,
      );
      return {
        client_secret: existing.client_secret,
        payment_intent_id: existing.id,
      };
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: order.total, // already in cents
      currency: 'usd',
      metadata: {
        order_id: orderId,
        order_number: order.order_number,
        user_id: userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Save payment record
    await admin.from('payments').insert({
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: order.total,
      status: 'pending',
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishable_key: this.config.get('STRIPE_PUBLISHABLE_KEY'),
    };
  }

  /** Handle Stripe webhook events */
  async handleWebhook(body: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (isProd && !secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
    }

    if (!secret) {
      console.warn('[Payments] Stripe webhook secret not set — skipping signature verification (DEV ONLY)');
      return { received: true, verified: false };
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    const admin = this.supabase.getAdminClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await admin
          .from('payments')
          .update({ status: 'captured' })
          .eq('stripe_payment_intent_id', pi.id);

        // Confirm the order and award loyalty points
        const orderId = pi.metadata.order_id;
        const userId = pi.metadata.user_id;
        if (orderId) {
          await admin
            .from('orders')
            .update({ status: 'confirmed' })
            .eq('id', orderId)
            .eq('status', 'pending');

          // Award loyalty points (1 point per dollar)
          if (userId) {
            try {
              const result = await this.loyalty.awardPoints(userId, orderId, pi.amount);
              if (result) {
                await admin
                  .from('orders')
                  .update({ loyalty_points_earned: result.points_awarded })
                  .eq('id', orderId);
              }
            } catch (e) {
              // Points accrual is non-blocking — log and continue
              console.error('[Payments] Failed to award loyalty points:', e);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await admin
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.payment_intent) {
          await admin
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', charge.payment_intent);
        }
        break;
      }
    }

    return { received: true };
  }
}
