import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.createOrder(dto, user.id);
  }

  @Get('mine')
  getMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.getUserOrders(user.id);
  }

  @Get(':id')
  getOrder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getOrder(id, user.id);
  }

  @Post(':id/reorder')
  reorder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('store_id') storeId: string,
  ) {
    return this.ordersService.reorder(id, user.id, storeId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('staff')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatus(id, status);
  }
}
