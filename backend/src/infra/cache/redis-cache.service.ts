import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ResultCache, YieldResult } from '@/core/ports/result-cache.port';

@Injectable()
export class RedisCacheService
  implements ResultCache, OnModuleInit, OnModuleDestroy
{
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => console.error('Redis error:', err));
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<YieldResult | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(
    key: string,
    value: YieldResult,
    ttlSeconds: number = 600,
  ): Promise<void> {
    await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
  }
}
