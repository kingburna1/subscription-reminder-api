import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class GroupAnagramsDto {
  @ApiProperty({
    description: 'Array of words to group by anagrams',
    example: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  words!: string[];
}

export class GroupAnagramsResponseDto {
  @ApiProperty({
    description: 'Grouped anagram words',
    example: [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']],
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
  })
  groups!: string[][];
}
