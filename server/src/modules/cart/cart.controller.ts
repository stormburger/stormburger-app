import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('stores/:storeId/cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cartService.getCart(user.id, storeId);
  }

  @Post('items')
  addItem(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(user.id, storeId, dto);
  }

  @Patch('items/:cartItemId')
  updateItem(
    @Param('storeId') storeId: string,
    @Param('cartItemId') cartItemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, storeId, cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  removeItem(
    @Param('storeId') storeId: string,
    @Param('cartItemId') cartItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cartService.removeItem(user.id, storeId, cartItemId);
  }

  @Delete()
  clearCart(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cartService.clearCart(user.id, storeId);
  }
}
