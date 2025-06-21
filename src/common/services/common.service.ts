import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { GetUserRole } from '../decorators/get-role.decorator';
import { UserRole } from '../../modules/users/user_role.enum';

@Injectable()
export class CommonService {
  constructor() {}

  getMd5Hash(input: string): string {
    const hash = createHash('md5');
    hash.update(input);
    return hash.digest('hex');
  }

  checkAdmin(user: GetUserRole) {
    if (user.role != UserRole.ADMIN) throw new Error('Only admin can access this resource');
  }

  getEnumValues<T extends object>(e: T): T[keyof T][] {
    return Object.values(e).filter(v => typeof v !== 'string') as T[keyof T][];
  }
}
