import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartValidatorService } from './cart-validator.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartValidatorService],
  exports: [CartService, CartValidatorService],
})
export class CartModule {}
