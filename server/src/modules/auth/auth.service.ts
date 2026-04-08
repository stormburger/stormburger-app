import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Creates a new customer account.
   *
   * This is intentionally handled server-side (not client → Supabase directly)
   * because we need to create three rows atomically:
   * 1. auth.users (via Supabase Auth)
   * 2. public.users (our user record)
   * 3. public.user_profiles (extended profile)
   * 4. public.loyalty_accounts (loyalty enrollment)
   *
   * If the client called Supabase Auth directly and then failed on step 2-4,
   * we'd have an orphaned auth user with no profile.
   */
  async signup(dto: SignupDto) {
    const client = this.supabase.getClient();
    const admin = this.supabase.getAdminClient();

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        data: { display_name: dto.display_name },
      },
    });

    if (authError) {
      if (authError.message?.includes('already registered')) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new InternalServerErrorException(
        `Account creation failed: ${authError.message}`,
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new InternalServerErrorException('Auth user created but no ID returned');
    }

    // 2-4. Create application records using service key (bypasses RLS)
    try {
      // Users table
      const { error: userError } = await admin.from('users').insert({
        id: userId,
        email: dto.email,
        phone: dto.phone || null,
        role: 'customer',
      });
      if (userError) throw userError;

      // User profile
      const { error: profileError } = await admin
        .from('user_profiles')
        .insert({
          user_id: userId,
          display_name: dto.display_name,
          marketing_opt_in: dto.marketing_opt_in ?? false,
        });
      if (profileError) throw profileError;

      // Loyalty account — every customer is auto-enrolled
      const { error: loyaltyError } = await admin
        .from('loyalty_accounts')
        .insert({
          user_id: userId,
          points_balance: 0,
          lifetime_points: 0,
          tier: 'bronze',
        });
      if (loyaltyError) throw loyaltyError;
    } catch (dbError: any) {
      // If profile/loyalty creation fails, we have an orphaned auth user.
      // Clean it up to maintain consistency.
      await admin.auth.admin.deleteUser(userId);

      if (dbError.code === '23505') {
        throw new ConflictException('An account with this email already exists');
      }
      throw new InternalServerErrorException(
        `Profile creation failed: ${dbError.message}`,
      );
    }

    return this.buildAuthResponse(authData);
  }

  /**
   * Authenticates an existing user.
   *
   * Mediated through the backend so we can bundle profile + loyalty
   * data in a single response instead of requiring 3 client-side calls.
   */
  async signin(dto: SigninDto) {
    const { data, error } = await this.supabase
      .getClient()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      // Don't reveal whether the email exists — use generic message
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(data);
  }

  /**
   * Exchanges a refresh token for new access + refresh tokens.
   */
  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase
      .getClient()
      .auth.refreshSession({ refresh_token: refreshToken });

    if (error) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    };
  }

  /**
   * Signs out the current session.
   */
  async signout(accessToken: string) {
    // Sign out using the user's token scope
    const userClient = this.supabase.getClientForUser(accessToken);
    await userClient.auth.signOut();
    return { signed_out: true };
  }

  /**
   * Returns the authenticated user's full profile with loyalty info.
   */
  async getMe(userId: string) {
    const admin = this.supabase.getAdminClient();

    const [userResult, profileResult, loyaltyResult] = await Promise.all([
      admin.from('users').select('*').eq('id', userId).single(),
      admin.from('user_profiles').select('*').eq('user_id', userId).single(),
      admin.from('loyalty_accounts').select('*').eq('user_id', userId).single(),
    ]);

    if (!userResult.data) {
      throw new NotFoundException('User not found');
    }

    const loyalty = loyaltyResult.data;
    const nextTier = this.getNextTier(loyalty?.tier);

    return {
      id: userResult.data.id,
      email: userResult.data.email,
      phone: userResult.data.phone,
      role: userResult.data.role,
      profile: profileResult.data
        ? {
            display_name: profileResult.data.display_name,
            avatar_url: profileResult.data.avatar_url,
            date_of_birth: profileResult.data.date_of_birth,
            marketing_opt_in: profileResult.data.marketing_opt_in,
            total_orders: profileResult.data.total_orders,
            total_spent: profileResult.data.total_spent,
            last_order_at: profileResult.data.last_order_at,
          }
        : null,
      loyalty: loyalty
        ? {
            points_balance: loyalty.points_balance,
            lifetime_points: loyalty.lifetime_points,
            tier: loyalty.tier,
            next_tier: nextTier?.name || null,
            points_to_next_tier: nextTier
              ? nextTier.threshold - loyalty.lifetime_points
              : 0,
          }
        : null,
    };
  }

  /**
   * Updates the user's profile fields.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const admin = this.supabase.getAdminClient();

    const updateData: Record<string, any> = {};
    if (dto.display_name !== undefined) updateData.display_name = dto.display_name;
    if (dto.date_of_birth !== undefined) updateData.date_of_birth = dto.date_of_birth;
    if (dto.marketing_opt_in !== undefined) updateData.marketing_opt_in = dto.marketing_opt_in;
    if (dto.push_token !== undefined) updateData.push_token = dto.push_token;

    if (Object.keys(updateData).length === 0) {
      return this.getMe(userId);
    }

    const { error } = await admin
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      throw new InternalServerErrorException(`Profile update failed: ${error.message}`);
    }

    return this.getMe(userId);
  }

  // --- Private helpers ---

  private async buildAuthResponse(authData: any) {
    const userId = authData.user?.id;
    if (!userId) {
      throw new InternalServerErrorException('No user ID in auth response');
    }

    const profile = await this.getMe(userId);

    return {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at
          ? new Date(authData.session.expires_at * 1000).toISOString()
          : null,
      },
      profile: profile.profile,
      loyalty: profile.loyalty,
    };
  }

  private static readonly TIERS = [
    { name: 'bronze', threshold: 0 },
    { name: 'silver', threshold: 500 },
    { name: 'gold', threshold: 1000 },
    { name: 'platinum', threshold: 2500 },
  ];

  private getNextTier(currentTier?: string) {
    const currentIndex = AuthService.TIERS.findIndex(
      (t) => t.name === currentTier,
    );
    if (currentIndex < 0 || currentIndex >= AuthService.TIERS.length - 1) {
      return null; // already at max tier or unknown
    }
    return AuthService.TIERS[currentIndex + 1];
  }
}
