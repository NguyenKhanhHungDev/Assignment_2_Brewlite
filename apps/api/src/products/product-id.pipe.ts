import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

@Injectable()
export class ProductIdPipe implements PipeTransform<number, number> {
  transform(value: number): number {
    // PostgreSQL Int IDs must fit a positive signed 32-bit integer.
    if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
      throw new BadRequestException('Product id must be an integer from 1 to 2147483647');
    }
    return value;
  }
}
