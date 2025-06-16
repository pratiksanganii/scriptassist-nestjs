import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class CommonService {
  constructor() {}

  getMd5Hash(input: string): string {
    const hash = createHash('md5');
    hash.update(input);
    return hash.digest('hex');
  }
}
