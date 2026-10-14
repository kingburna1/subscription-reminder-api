import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { AlgorithmsService } from './algorithms.service.js';
import { FindDuplicatesDto, FindDuplicatesResponseDto } from './dto/find-duplicates.dto.js';
import { LongestSubstringDto, LongestSubstringResponseDto } from './dto/longest-substring.dto.js';
import { GroupAnagramsDto, GroupAnagramsResponseDto } from './dto/group-anagrams.dto.js';

@ApiTags('Algorithms')
@Public()
@Controller('algorithms')
export class AlgorithmsController {
  constructor(private readonly algorithmsService: AlgorithmsService) {}

  @Post('find-duplicates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find duplicate numbers in an integer array (Exercise 1)',
    description: 'Returns all numbers that appear more than once in O(n) time and O(n) space.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of duplicate numbers found',
    type: FindDuplicatesResponseDto,
  })
  findDuplicates(@Body() dto: FindDuplicatesDto): FindDuplicatesResponseDto {
    return this.algorithmsService.findDuplicates(dto.numbers);
  }

  @Post('longest-substring')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find length of longest substring without repeating characters (Exercise 2)',
    description: 'Calculates the maximum non-repeating substring length in O(n) time using sliding window.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Longest substring length result',
    type: LongestSubstringResponseDto,
  })
  longestSubstring(@Body() dto: LongestSubstringDto): LongestSubstringResponseDto {
    return this.algorithmsService.findLongestSubstring(dto.text);
  }

  @Post('group-anagrams')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Group anagram words (Exercise 3)',
    description: 'Groups an array of strings into sub-arrays where each word is an anagram of the others.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grouped anagram arrays',
    type: GroupAnagramsResponseDto,
  })
  groupAnagrams(@Body() dto: GroupAnagramsDto): GroupAnagramsResponseDto {
    return this.algorithmsService.groupAnagrams(dto.words);
  }
}
