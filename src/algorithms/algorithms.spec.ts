import { describe, it, expect } from 'vitest';
import { findDuplicates } from './find-duplicates.js';
import { lengthOfLongestSubstring } from './longest-substring.js';
import { groupAnagrams } from './group-anagrams.js';
import { AlgorithmsService } from './algorithms.service.js';
import { AlgorithmsController } from './algorithms.controller.js';

describe('Part 1 – Algorithmic Problems', () => {
  describe('Exercise 1: Find Duplicate Numbers', () => {
    it('should return numbers that appear more than once from prompt example 1', () => {
      const input = [1, 2, 3, 2, 4, 5, 1];
      const result = findDuplicates(input);
      expect(result.sort((a, b) => a - b)).toEqual([1, 2].sort((a, b) => a - b));
    });

    it('should return an empty array when there are no duplicates from prompt example 2', () => {
      const input = [1, 2, 3, 4];
      const result = findDuplicates(input);
      expect(result).toEqual([]);
    });

    it('should return each duplicate number only once even if it appears 3 or more times', () => {
      const input = [7, 7, 7, 8, 9, 8, 8];
      const result = findDuplicates(input);
      expect(result.sort((a, b) => a - b)).toEqual([7, 8].sort((a, b) => a - b));
    });

    it('should handle empty arrays', () => {
      expect(findDuplicates([])).toEqual([]);
    });

    it('should handle negative numbers and zero', () => {
      const input = [-1, 0, -1, 5, 0, -2];
      const result = findDuplicates(input);
      expect(result.sort((a, b) => a - b)).toEqual([-1, 0].sort((a, b) => a - b));
    });
  });

  describe('Exercise 2: Longest Substring Without Repeating Characters', () => {
    it('should return 3 for "abcabcbb" (prompt example 1)', () => {
      expect(lengthOfLongestSubstring('abcabcbb')).toBe(3);
    });

    it('should return 1 for "bbbbb" (prompt example 2)', () => {
      expect(lengthOfLongestSubstring('bbbbb')).toBe(1);
    });

    it('should return 3 for "pwwkew" (prompt example 3)', () => {
      expect(lengthOfLongestSubstring('pwwkew')).toBe(3);
    });

    it('should return 0 for an empty string', () => {
      expect(lengthOfLongestSubstring('')).toBe(0);
    });

    it('should return 1 for a single-character string', () => {
      expect(lengthOfLongestSubstring('a')).toBe(1);
    });

    it('should handle strings with spaces, symbols, and numbers', () => {
      expect(lengthOfLongestSubstring('ab c!d1ab')).toBe(7); // " c!d1ab" or "ab c!d1"
    });
  });

  describe('Exercise 3: Group Anagrams', () => {
    it('should group anagrams from prompt example', () => {
      const input = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
      const result = groupAnagrams(input);

      // Normalize result for comparison regardless of group ordering
      const normalizedResult = result
        .map((group) => [...group].sort())
        .sort((a, b) => a[0].localeCompare(b[0]));

      const expected = [
        ['ate', 'eat', 'tea'],
        ['nat', 'tan'],
        ['bat'],
      ]
        .map((group) => [...group].sort())
        .sort((a, b) => a[0].localeCompare(b[0]));

      expect(normalizedResult).toEqual(expected);
    });

    it('should handle empty input array', () => {
      expect(groupAnagrams([])).toEqual([]);
    });

    it('should handle single word', () => {
      expect(groupAnagrams(['hello'])).toEqual([['hello']]);
    });

    it('should handle words with no anagrams', () => {
      const input = ['cat', 'dog', 'bird'];
      const result = groupAnagrams(input);
      expect(result.length).toBe(3);
    });
  });

  describe('AlgorithmsService & AlgorithmsController', () => {
    const service = new AlgorithmsService();
    const controller = new AlgorithmsController(service);

    it('should find duplicates through controller', () => {
      const response = controller.findDuplicates({ numbers: [1, 2, 3, 2, 1] });
      expect(response.duplicates.sort((a, b) => a - b)).toEqual([1, 2].sort((a, b) => a - b));
    });

    it('should calculate longest substring through controller', () => {
      const response = controller.longestSubstring({ text: 'abcabcbb' });
      expect(response.length).toBe(3);
      expect(response.input).toBe('abcabcbb');
    });

    it('should group anagrams through controller', () => {
      const response = controller.groupAnagrams({ words: ['eat', 'tea', 'tan'] });
      expect(response.groups.length).toBe(2);
    });
  });
});

