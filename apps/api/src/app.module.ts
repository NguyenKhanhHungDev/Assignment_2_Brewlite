import { Module } from '@nestjs/common';
import { RecipesModule } from './recipes/recipes.module.js';
import { ProductsModule } from './products/products.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [
    RecipesModule,
    ProductsModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
