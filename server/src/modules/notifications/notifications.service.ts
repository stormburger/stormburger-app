import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

const STATUS_MESSAGES: Record<string, { title: string; body: (orderNumber: string) => string }> = {
  confirmed: {
    title: 'Order Confirmed ✅',
    body: (n) => `Your StormBurger order #${n} has been confirmed!`,
  },
  preparing: {
    title: 'Order Being Prepared 👨‍🍳',
    body: (n) => `Order #${n} is being prepared — won't be long!`,
  },
  ready: {
    title: 'Order Ready for Pickup! 🔔',
    body: (n) => `Order #${n} is ready. Come grab it!`,
  },
  cancelled: {
    title: 'Order Cancelled',
    body: (n) => `Order #${n} has been cancelled.`,
  },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getPreferences(userId: string) {
    const admin = this.supabase.getAdminClient();
    const { data } = await admin
      .from('notification_preferences')
      .select('order_updates, promotions, loyalty_updates')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      // Auto-create default preferences
      const defaults = { user_id: userId, order_updates: true, promotions: true, loyalty_updates: true };
      await admin.from('notification_preferences').insert(defaults);
      return { order_updates: true, promotions: true, loyalty_updates: true };
    }

    return { order_updates: data.order_updates, promotions: data.promotions, loyalty_updates: data.loyalty_updates };
  }

  async updatePreferences(userId: string, prefs: Partial<{ order_updates: boolean; promotions: boolean; loyalty_updates: boolean }>) {
    const admin = this.supabase.getAdminClient();

    const { data: existing } = await admin
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const defaults = { user_id: userId, order_updates: true, promotions: true, loyalty_updates: true, ...prefs };
      const { data, error } = await admin.from('notification_preferences').insert(defaults).select('order_updates, promotions, loyalty_updates').single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await admin
      .from('notification_preferences')
      .update({ ...prefs, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('order_updates, promotions, loyalty_updates')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Called after an order status transition. Looks up the user's active push tokens
   * and their notification preferences, then logs the delivery intent.
   *
   * Web Push (VAPID) delivery is stubbed here — add the actual push call once
   * VAPID keys are provisioned and a service worker is deployed.
   */
  async dispatchOrderNotification(userId: string, orderNumber: string, newStatus: string): Promise<void> {
    const template = STATUS_MESSAGES[newStatus];
    if (!template) return; // No notification defined for this status

    const admin = this.supabase.getAdminClient();

    // Check user preferences
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('order_updates')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefs && prefs.order_updates === false) return; // User opted out

    // Look up active push tokens for this user
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('token, platform, device_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      // No registered devices — in-app polling on OrderConfirmPage handles display
      return;
    }

    const title = template.title;
    const body = template.body(orderNumber);

    for (const { token, platform } of tokens) {
      // TODO: replace with actual push delivery per platform:
      //   - platform === 'web'     → Web Push API (VAPID)
      //   - platform === 'ios'     → APNs via Firebase Admin SDK or direct
      //   - platform === 'android' → FCM
      this.logger.log(`[Push] ${platform} token=${token.slice(0, 24)}… → "${title}": ${body}`);
    }
  }
}
