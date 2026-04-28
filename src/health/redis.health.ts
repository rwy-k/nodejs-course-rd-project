import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealth {
  constructor(
    private readonly configService: ConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck(): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check('redis');
    if (this.configService.get<string>('nodeEnv') === 'test') {
      return indicator.up({ message: 'skipped in test' });
    }
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');
    const redis = new Redis({
      host,
      port,
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.connect();
      const pong = await redis.ping();
      if (pong !== 'PONG') {
        return indicator.down({ message: 'unexpected PING response' });
      }
      return indicator.up();
    } catch (err) {
      return indicator.down({
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      redis.disconnect();
    }
  }
}
