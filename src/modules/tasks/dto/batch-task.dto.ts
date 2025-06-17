import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class BatchTaskDto {
  @ApiProperty({
    example: `[{id:'123e4567-e89b-12d3-a456-426614174000', action:'update'}]`,
    required: true,
  })
  @IsArray()
  tasks: { id: string; action: string }[];
}
