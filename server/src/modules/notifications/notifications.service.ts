import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../config/supabase.config';

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Notification service handles push token management, preferences,
 * and dispatching notifications. In dev mode, logs to console.
 * In production, sends via FCM/APNs.
 */
@Injectable()
export class NotificationsService {
  private isProd: boolean;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  // --- Push Token Management ---

  async registerToken(userId: string, token: string, platform: string, deviceId?: string) {
    const admin = this.supabase.getAdminClient();

    // Upsert — same user+token combo updates, new combo inserts
    const { data, error } = await admin
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, device_id: deviceId || null, is_active: true },
        { onConflict: 'user_id,token' },
      )
      .select()
      .single();

    if (error) throw error;
    return { registered: true, id: data.id };
  }

  async deactivateToken(userId: string, token: string) {
    await this.supabase.getAdminClient()
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('token', token);

    return { deactivated: true };
  }

  // --- Preferences ---

  async getPreferences(userId: string) {
    const admin = this.supabase.getAdminClient();

    const { data } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      // Create default preferences
      const { data: created } = await admin
        .from('notification_preferences')
        .insert({ user_id: userId })
        .select()
        .single();

      return {
        order_updates: created?.order_updates ?? true,
        promotions: created?.promotions ?? true,
        loyalty_updates: created?.loyalty_updates ?? true,
      };
    }

    return {
      order_updates: data.order_updates,
      promotions: data.promotions,
      loyalty_updates: data.loyalty_updates,
    };
  }

  async updatePreferences(
    userId: string,
    updates: { order_updates?: boolean; promotions?: boolean; loyalty_updates?: boolean },
  ) {
    const admin = this.supabase.getAdminClient();

    // Ensure row exists
    await admin
      .from('notification_preferences')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });

    return this.getPreferences(userId);
  }

  // --- Dispatch ---

  /**
   * Send a notification to a user.
   * In dev: logs to console.
   * In production: sends via FCM (requires FCM_SERVICE_KEY in env).
   */
  async send(payload: NotificationPayload) {
    const admin = this.supabase.getAdminClient();

    // Check user preferences
    const prefs = await this.getPreferences(payload.userId);
    const category = payload.data?.category || 'order_updates';

    if (category === 'order_updates' && !prefs.order_updates) return { sent: false, reason: 'disabled' };
    if (category === 'promotions' && !prefs.promotions) return { sent: false, reason: 'disabled' };
    if (category === 'loyalty_updates' && !prefs.loyalty_updates) return { sent: false, reason: 'disabled' };

    // Get active push tokens
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', payload.userId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      return { sent: false, reason: 'no_tokens' };
    }

    if (!this.isProd) {
      // Dev mode: log instead of sending
      console.log(`[Notification] → ${payload.userId.slice(0, 8)}...`);
      console.log(`  Title: ${payload.title}`);
      console.log(`  Body: ${payload.body}`);
      console.log(`  Tokens: ${tokens.length} (${tokens.map((t: any) => t.platform).join(', ')})`);
      return { sent: true, mode: 'dev_log', token_count: tokens.length };
    }

    // Production: send via FCM
    // TODO: Implement FCM sending when FCM_SERVICE_KEY is configured
    // For now, log a warning
    console.warn('[Notification] FCM not configured — notification queued but not sent');
    return { sent: false, reason: 'fcm_not_configured' };
  }

  // --- Convenience methods for common notification types ---

  async sendOrderConfirmed(userId: string, orderNumber: string) {
    return this.send({
      userId,
      title: 'Order Confirmed',
      body: `Your order ${orderNumber} has been accepted!`,
      data: { category: 'order_updates', order_number: orderNumber },
    });
  }

  async sendOrderPreparing(userId: string, orderNumber: string) {
    return this.send({
      userId,
      title: 'Being Prepared',
      body: `Your order ${orderNumber} is being made!`,
      data: { category: 'order_updates', order_number: orderNumber },
    });
  }

  async sendOrderReady(userId: string, orderNumber: string, storeName: string) {
    return this.send({
      userId,
      title: 'Ready for Pickup!',
      body: `Your order ${orderNumber} is ready! Head to ${storeName}.`,
      data: { category: 'order_updates', order_number: orderNumber },
    });
  }

  async sendPaymentFailed(userId: string, orderNumber: string) {
    return this.send({
      userId,
      title: 'Payment Failed',
      body: `Payment for order ${orderNumber} couldn't be processed. Please try again.`,
      data: { category: 'order_updates', order_number: orderNumber },
    });
  }

  async sendPointsEarned(userId: string, points: number) {
    return this.send({
      userId,
      title: 'Points Earned!',
      body: `You earned ${points} points on your order!`,
      data: { category: 'loyalty_updates' },
    });
  }
}
