import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductIdPipe } from './product-id.pipe.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe, ProductIdPipe) id: number) {
    return this.productsService.findOne(id);
  }
}