import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UUID } from 'crypto';

export interface UserRole {
  id: UUID;
  email: string;
  name: string;
  role: string;
}

export const GetRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest()?.user,
);
