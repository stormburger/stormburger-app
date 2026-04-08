import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user from the request.
 * Must be used with AuthGuard — the guard attaches the user.
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   @Get('me')
 *   getMyId(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);

export class AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    total_orders: number;
    total_spent: number;
  };
}
