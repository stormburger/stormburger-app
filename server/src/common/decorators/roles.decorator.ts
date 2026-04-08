import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts an endpoint to specific roles.
 * Must be used with RolesGuard.
 *
 * Usage:
 *   @Roles('manager', 'admin')
 *   @Patch('items/:id')
 *   updateItem() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
