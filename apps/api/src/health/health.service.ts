import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthDatabase } from './health.database.js';

export interface HealthResponse {
  status: 'ok' | 'error';
  service: 'api';
  database: 'up' | 'down';
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly database: HealthDatabase) {}

  async check(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();
    try {
      await this.database.ping();
      return {
        status: 'ok',
        service: 'api',
        database: 'up',
        timestamp,
      };
    } catch (error) {
      const rawReason = error instanceof Error ? error.message : 'Unknown error';
      const sanitizedReason = rawReason.replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]');
      this.logger.error(`Database health check failed: ${sanitizedReason}`);
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'api',
        database: 'down',
        timestamp,
      } satisfies HealthResponse);
    }
  }
}
