import { Module } from '@nestjs/common';
import { RecipesPrismaAdapter } from './recipes.prisma-adapter.js';

// Only menu persistence is mounted here; Admin Recipes/Auth belong to later issues.
@Module({
  providers: [RecipesPrismaAdapter],
  exports: [RecipesPrismaAdapter],
})
export class RecipesModule {}
