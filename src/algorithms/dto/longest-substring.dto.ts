import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LongestSubstringDto {
  @ApiProperty({
    description: 'Input string to analyze for the longest substring without repeating characters',
    example: 'abcabcbb',
  })
  @IsString()
  text!: string;
}

export class LongestSubstringResponseDto {
  @ApiProperty({
    description: 'Length of the longest substring without repeating characters',
    example: 3,
  })
  length!: number;

  @ApiProperty({
    description: 'The analyzed input string',
    example: 'abcabcbb',
  })
  input!: string;
}
