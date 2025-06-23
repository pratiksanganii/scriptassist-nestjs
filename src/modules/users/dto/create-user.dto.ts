import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user_role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class FindAllDto {
  @ApiProperty({ example: '1' })
  @IsOptional()
  page: string;

  @ApiProperty({ example: '10' })
  @IsOptional()
  limit: string;
}
