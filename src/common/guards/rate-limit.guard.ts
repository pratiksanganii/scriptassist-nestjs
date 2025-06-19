import { CommonService } from '../services/common.service';
import { RedisService } from '../../database/redis/redis.service';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly commonService: CommonService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const md5 = this.commonService.getMd5Hash(req.ip);
    return await this.redisService.rateLimitFixedWindow(md5);
  }
}
