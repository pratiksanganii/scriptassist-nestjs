// src/redis/redis.service.ts
import { HttpException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {} from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly configService: ConfigService;

  onModuleInit() {
    // use same redis config as in BullMQ
    const config = this.configService?.get('bull')?.connection;
    this.client = new Redis({ port: config?.port, host: config?.host });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  async rateLimitFixedWindow(md5Ip: string) {
    const key = `ratelimit:${md5Ip}`;
    const count = await this.client.incr(key);
    // set the key to expire after 1 minute
    if (count == 1) await this.client.expire(key, 60);
    if (count > 100) throw new HttpException('Too many requests!', 429);
    return true;
  }
}
