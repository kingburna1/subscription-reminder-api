import { Injectable } from '@nestjs/common';
import { findDuplicates } from './find-duplicates.js';
import { lengthOfLongestSubstring } from './longest-substring.js';
import { groupAnagrams } from './group-anagrams.js';
import { FindDuplicatesResponseDto } from './dto/find-duplicates.dto.js';
import { LongestSubstringResponseDto } from './dto/longest-substring.dto.js';
import { GroupAnagramsResponseDto } from './dto/group-anagrams.dto.js';

@Injectable()
export class AlgorithmsService {
  findDuplicates(numbers: number[]): FindDuplicatesResponseDto {
    return {
      duplicates: findDuplicates(numbers),
    };
  }

  findLongestSubstring(text: string): LongestSubstringResponseDto {
    return {
      length: lengthOfLongestSubstring(text),
      input: text,
    };
  }

  groupAnagrams(words: string[]): GroupAnagramsResponseDto {
    return {
      groups: groupAnagrams(words),
    };
  }
}
