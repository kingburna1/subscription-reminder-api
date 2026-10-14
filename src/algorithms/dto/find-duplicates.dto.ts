import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class FindDuplicatesDto {
  @ApiProperty({
    description: 'Array of integer numbers to find duplicates from',
    example: [1, 2, 3, 2, 4, 5, 1],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  numbers!: number[];
}

export class FindDuplicatesResponseDto {
  @ApiProperty({
    description: 'Array containing unique numbers that appear more than once',
    example: [1, 2],
    type: [Number],
  })
  duplicates!: number[];
}
