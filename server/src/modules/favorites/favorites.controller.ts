import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.getFavorites(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Body('menu_item_id') menuItemId: string,
  ) {
    return this.favoritesService.addFavorite(user.id, menuItemId);
  }

  @Delete(':menuItemId')
  removeFavorite(
    @Param('menuItemId') menuItemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.favoritesService.removeFavorite(user.id, menuItemId);
  }
}
