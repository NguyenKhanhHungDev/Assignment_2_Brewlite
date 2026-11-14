import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import type { HealthDatabase } from './health.database.js';
import { HealthService } from './health.service.js';

describe('HealthService & HealthController', () => {
  it('returns status ok and database up when ping succeeds', async () => {
    const ping = vi.fn().mockResolvedValue(undefined);
    const database = { ping } as unknown as HealthDatabase;
    const controller = new HealthController(new HealthService(database));

    const result = await controller.check();

    expect(ping).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
    expect(result.database).toBe('up');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('throws 503 ServiceUnavailableException without leaking connection secrets when ping fails', async () => {
    const database = {
      ping: vi
        .fn()
        .mockRejectedValue(
          new Error('connect ECONNREFUSED postgresql://secret:pass@db:5432/app'),
        ),
    } as unknown as HealthDatabase;
    const controller = new HealthController(new HealthService(database));

    let thrown: unknown;
    try {
      await controller.check();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ServiceUnavailableException);
    const body = (thrown as ServiceUnavailableException).getResponse();
    expect(body).toMatchObject({
      status: 'error',
      service: 'api',
      database: 'down',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('postgresql://');
  });
});
