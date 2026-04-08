import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

/**
 * Validates the Supabase JWT from the Authorization header.
 * Attaches the authenticated user (id, email, role) to request.user.
 *
 * We call supabase.auth.getUser() rather than decoding the JWT locally
 * because getUser() checks if the session has been revoked. A locally
 * decoded JWT would remain valid after sign-out until expiry.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    // Validate token with Supabase — this catches revoked sessions
    const {
      data: { user },
      error,
    } = await this.supabase.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Fetch role from our users table via the security-definer function
    // This avoids RLS recursion and gives us the role without a full table scan
    const { data: roleData } = await this.supabase
      .getAdminClient()
      .rpc('get_user_role', { uid: user.id });

    request.user = {
      id: user.id,
      email: user.email,
      role: roleData || 'customer',
    };

    // Store the raw token so downstream services can make user-scoped queries
    request.accessToken = token;

    return true;
  }
}
