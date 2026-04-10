import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

@Injectable()
export class LoyaltyService {
  constructor(private readonly supabase: SupabaseService) {}

  /** 1 point per dollar spent (floor). Called after payment succeeds. */
  async awardPoints(userId: string, orderId: string, totalCents: number) {
    const admin = this.supabase.getAdminClient();
    const pointsToAward = Math.floor(totalCents / 100);
    if (pointsToAward <= 0) return;

    // Get current account
    const { data: account } = await admin
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!account) return; // no loyalty account — skip silently

    const newBalance = account.points_balance + pointsToAward;
    const newLifetime = account.lifetime_points + pointsToAward;
    const newTier = this.calculateTier(newLifetime);

    // Update balance + insert transaction atomically
    await admin
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        lifetime_points: newLifetime,
        tier: newTier,
      })
      .eq('user_id', userId);

    await admin.from('loyalty_transactions').insert({
      account_id: account.id,
      order_id: orderId,
      type: 'earn',
      points: pointsToAward,
      balance_after: newBalance,
      description: `Earned ${pointsToAward} points on order`,
    });

    return { points_awarded: pointsToAward, new_balance: newBalance, tier: newTier };
  }

  /** Revoke points when an order is cancelled/refunded after pickup. */
  async revokePoints(userId: string, orderId: string, totalCents: number) {
    const admin = this.supabase.getAdminClient();
    const pointsToRevoke = Math.floor(totalCents / 100);
    if (pointsToRevoke <= 0) return;

    const { data: account } = await admin
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!account) return;

    const newBalance = Math.max(0, account.points_balance - pointsToRevoke);

    await admin
      .from('loyalty_accounts')
      .update({ points_balance: newBalance })
      .eq('user_id', userId);

    await admin.from('loyalty_transactions').insert({
      account_id: account.id,
      order_id: orderId,
      type: 'redeem',
      points: -pointsToRevoke,
      balance_after: newBalance,
      description: `Points revoked — order refunded`,
    });
  }

  /**
   * Validate and apply loyalty point redemption at checkout.
   * 100 points = $1.00 discount (100 cents).
   * Returns the discount in cents.
   */
  async redeemPoints(userId: string, pointsToRedeem: number): Promise<number> {
    if (pointsToRedeem <= 0) return 0;

    const admin = this.supabase.getAdminClient();

    const { data: account } = await admin
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!account) {
      throw new BadRequestException('No loyalty account found');
    }

    if (account.points_balance < pointsToRedeem) {
      throw new BadRequestException(
        `Insufficient points. You have ${account.points_balance}, tried to redeem ${pointsToRedeem}`,
      );
    }

    // 100 points = $1 = 100 cents
    const discountCents = Math.floor(pointsToRedeem); // 1 point = 1 cent

    const newBalance = account.points_balance - pointsToRedeem;

    await admin
      .from('loyalty_accounts')
      .update({ points_balance: newBalance })
      .eq('user_id', userId);

    await admin.from('loyalty_transactions').insert({
      account_id: account.id,
      type: 'redeem',
      points: -pointsToRedeem,
      balance_after: newBalance,
      description: `Redeemed ${pointsToRedeem} points for $${(discountCents / 100).toFixed(2)} off`,
    });

    return discountCents;
  }

  /** Get loyalty account with recent transactions */
  async getAccount(userId: string) {
    const admin = this.supabase.getAdminClient();

    const { data: account } = await admin
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!account) throw new NotFoundException('Loyalty account not found');

    const { data: transactions } = await admin
      .from('loyalty_transactions')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const nextTier = this.getNextTier(account.tier);

    return {
      points_balance: account.points_balance,
      lifetime_points: account.lifetime_points,
      tier: account.tier,
      next_tier: nextTier?.name || null,
      points_to_next_tier: nextTier
        ? nextTier.threshold - account.lifetime_points
        : 0,
      recent_transactions: transactions || [],
    };
  }

  private static readonly TIERS = [
    { name: 'bronze', threshold: 0 },
    { name: 'silver', threshold: 500 },
    { name: 'gold', threshold: 1000 },
    { name: 'platinum', threshold: 2500 },
  ];

  private calculateTier(lifetimePoints: number): string {
    let tier = 'bronze';
    for (const t of LoyaltyService.TIERS) {
      if (lifetimePoints >= t.threshold) tier = t.name;
    }
    return tier;
  }

  private getNextTier(currentTier: string) {
    const idx = LoyaltyService.TIERS.findIndex((t) => t.name === currentTier);
    if (idx < 0 || idx >= LoyaltyService.TIERS.length - 1) return null;
    return LoyaltyService.TIERS[idx + 1];
  }
}
