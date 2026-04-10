import {
  Controller, Get, Post, Patch, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  registerToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { token: string; platform: string; device_id?: string },
  ) {
    return this.notificationsService.registerToken(user.id, body.token, body.platform, body.device_id);
  }

  @Post('token/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivateToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body('token') token: string,
  ) {
    return this.notificationsService.deactivateToken(user.id, token);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { order_updates?: boolean; promotions?: boolean; loyalty_updates?: boolean },
  ) {
    return this.notificationsService.updatePreferences(user.id, body);
  }
}
