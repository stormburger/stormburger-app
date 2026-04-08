import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** All active orders — staff+ can view */
  @Get('orders')
  @Roles('staff')
  getOrders(
    @Query('store_id') storeId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(storeId, status);
  }

  /** Toggle menu item active/inactive — manager+ */
  @Patch('menu/items/:id/toggle')
  @Roles('manager')
  toggleMenuItem(@Param('id') id: string) {
    return this.adminService.toggleMenuItem(id);
  }

  /** Update menu item price — manager+ */
  @Patch('menu/items/:id/price')
  @Roles('manager')
  updatePrice(
    @Param('id') id: string,
    @Body('price') price: number,
    @Body('store_id') storeId?: string,
  ) {
    return this.adminService.updateMenuItemPrice(id, price, storeId);
  }

  /** Update menu item fields (name, description, image, etc.) — manager+ */
  @Patch('menu/items/:id')
  @Roles('manager')
  updateMenuItem(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      image_url?: string;
      category?: string;
      is_featured?: boolean;
      sort_order?: number;
    },
  ) {
    return this.adminService.updateMenuItem(id, body);
  }
}
