import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/user_role.enum';

export class CommonAuthDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @Length(8)
  password: string;
}

export class LoginDto extends CommonAuthDto {}

export class RegisterDto extends CommonAuthDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export interface GenerateTokenPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
