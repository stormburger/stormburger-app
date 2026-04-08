import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('stores/:storeId/checkout')
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * Preview the checkout — returns price breakdown without creating an order.
   * Call this when the checkout screen loads and whenever tip changes.
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('tip_amount') tipAmount?: number,
  ) {
    return this.checkoutService.preview(user.id, storeId, tipAmount || 0);
  }

  /**
   * Create the order and initiate payment.
   * Reads from the server-side cart — the client sends only the
   * idempotency key, optional tip, and optional instructions.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  checkout(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ) {
    return this.checkoutService.checkout(user.id, storeId, dto);
  }
}
