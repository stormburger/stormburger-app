import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
      // Users table — display_name and marketing_opt_in live here (no user_profiles table)
      const { error: userError } = await admin.from('users').insert({
        id: userId,
        email: dto.email,
        phone: dto.phone || null,
        role: 'customer',
        display_name: dto.display_name,
        marketing_opt_in: dto.marketing_opt_in ?? false,
      });
      if (userError) throw userError;

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

    const [userResult, loyaltyResult] = await Promise.all([
      admin.from('users').select('*').eq('id', userId).single(),
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
      display_name: userResult.data.display_name ?? null,
      preferred_store_id: userResult.data.preferred_store_id ?? null,
      profile: {
        display_name: userResult.data.display_name ?? null,
        marketing_opt_in: userResult.data.marketing_opt_in ?? false,
      },
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
    if (dto.marketing_opt_in !== undefined) updateData.marketing_opt_in = dto.marketing_opt_in;
    if ((dto as any).preferred_store_id !== undefined) updateData.preferred_store_id = (dto as any).preferred_store_id;

    // Only update users table if there are profile fields to change
    if (Object.keys(updateData).length > 0) {
      const { error } = await admin
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        throw new InternalServerErrorException(`Profile update failed: ${error.message}`);
      }
    }

    // Handle push token separately (push_tokens table).
    if (dto.push_token !== undefined) {
      this.logger.log(`[push_tokens] registering token for user=${userId} platform=${dto.push_platform ?? 'web'}`);

      // Check if token already exists for this user
      const { data: existing, error: selectErr } = await admin
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', dto.push_token)
        .maybeSingle();

      if (selectErr) {
        this.logger.error(`[push_tokens] select failed: ${selectErr.message} code=${selectErr.code}`);
      }

      if (existing) {
        this.logger.log(`[push_tokens] updating existing row id=${existing.id}`);
        const { error: updateErr } = await admin.from('push_tokens').update({
          platform: dto.push_platform ?? 'web',
          device_id: dto.push_device_id ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (updateErr) {
          this.logger.error(`[push_tokens] update failed: ${updateErr.message} code=${updateErr.code}`);
        } else {
          this.logger.log(`[push_tokens] update OK`);
        }
      } else {
        this.logger.log(`[push_tokens] inserting new row`);
        const { error: insertErr, data: insertData } = await admin.from('push_tokens').insert({
          user_id: userId,
          token: dto.push_token,
          platform: dto.push_platform ?? 'web',
          device_id: dto.push_device_id ?? null,
          is_active: true,
        }).select();
        if (insertErr) {
          this.logger.error(`[push_tokens] insert failed: ${insertErr.message} code=${insertErr.code}`);
        } else {
          this.logger.log(`[push_tokens] insert OK, rows=${JSON.stringify(insertData)}`);
        }
      }
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
      display_name: profile.display_name,
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
