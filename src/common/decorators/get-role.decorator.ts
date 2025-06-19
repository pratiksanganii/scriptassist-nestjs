import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UUID } from 'crypto';
import { UserRole } from '../../modules/users/user_role.enum';

export interface GetUserRole {
  id: UUID;
  email: string;
  name: string;
  role: UserRole;
}

export const GetRole = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest();
  return req?.user;
});
