import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { SupabaseModule } from './config/supabase.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { HealthModule } from './modules/health/health.module';
import { LocationsModule } from './modules/locations/locations.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,  // 1 minute window
        limit: 60,   // 60 req/min per IP for most routes
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,   // 10 auth attempts/min — brute-force guard
      },
    ]),
    SupabaseModule,
    AdminModule,
    AuthModule,
    CartModule,
    CheckoutModule,
    FavoritesModule,
    HealthModule,
    LocationsModule,
    MenuModule,
    OrdersModule,
    NotificationsModule,
    PaymentsModule,
    LoyaltyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
