import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Checks the authenticated user's role against the @Roles() decorator.
 * Must be used AFTER AuthGuard (which attaches request.user).
 *
 * Role hierarchy: admin > manager > marketing > staff > customer
 * Higher roles inherit lower role access.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private static readonly HIERARCHY: Record<string, number> = {
    customer: 0,
    staff: 1,
    marketing: 2,
    manager: 3,
    admin: 4,
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator = open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No user context');
    }

    const userLevel = RolesGuard.HIERARCHY[user.role] ?? 0;

    // User passes if their level is >= any of the required roles
    const passes = requiredRoles.some((role) => {
      const requiredLevel = RolesGuard.HIERARCHY[role] ?? 0;
      return userLevel >= requiredLevel;
    });

    if (!passes) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
