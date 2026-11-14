import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthDatabase } from './health.database.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthDatabase, HealthService],
})
export class HealthModule {}
