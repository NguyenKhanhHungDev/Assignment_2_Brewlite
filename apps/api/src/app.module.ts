import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [ProductsModule, AuthModule, OrdersModule, PaymentsModule],
})
export class AppModule {}
