/**
 * Exercise 2: Longest Substring Without Repeating Characters
 *
 * Given a string, finds the length of the longest substring without repeated characters.
 * Implements an optimal sliding window approach with character index lookup.
 *
 * Time Complexity: O(n) - Linear traversal across string length n.
 * Space Complexity: O(min(n, m)) - Map stores unique characters in current window (m = alphabet size).
 *
 * @param s - Input string
 * @returns Length of the longest substring without repeating characters
 */
export function lengthOfLongestSubstring(s: string): number {
  let maxLength = 0;
  let windowStart = 0;
  const charLastIndexMap = new Map<string, number>();

  for (let windowEnd = 0; windowEnd < s.length; windowEnd++) {
    const currentChar = s[windowEnd];
    const previousIndex = charLastIndexMap.get(currentChar);

    if (previousIndex !== undefined && previousIndex >= windowStart) {
      windowStart = previousIndex + 1;
    }

    charLastIndexMap.set(currentChar, windowEnd);
    maxLength = Math.max(maxLength, windowEnd - windowStart + 1);
  }

  return maxLength;
}
