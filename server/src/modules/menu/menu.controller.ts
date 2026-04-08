import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** Get full menu for a location */
  @Get('location/:locationId')
  getMenuForLocation(@Param('locationId') locationId: string) {
    return this.menuService.getMenuForLocation(locationId);
  }

  /** Get a single menu item with its modifiers */
  @Get('items/:id')
  getItem(@Param('id') id: string, @Query('location_id') locationId?: string) {
    return this.menuService.getItemWithModifiers(id, locationId);
  }
}
