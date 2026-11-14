import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class HealthDatabase implements OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is missing');
    this.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
  }

  async ping(timeoutMs = 3000): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Database health check timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
