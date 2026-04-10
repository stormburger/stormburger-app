import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('store_id') storeId?: string,
  ) {
    return this.favoritesService.getFavorites(user.id, storeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.addFavorite(user.id, dto);
  }

  @Patch(':id')
  updateFavorite(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { custom_name?: string; quantity?: number },
  ) {
    return this.favoritesService.updateFavorite(user.id, id, body);
  }

  @Delete(':menuItemId')
  removeFavorite(
    @Param('menuItemId') menuItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.favoritesService.removeFavorite(user.id, menuItemId);
  }

  @Get(':id/cart-payload')
  getCartPayload(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.favoritesService.favoriteToCartPayload(user.id, id);
  }
}
