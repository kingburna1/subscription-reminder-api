/**
 * Exercise 1: Find Duplicate Numbers
 *
 * Given an array of integers, returns all numbers that appear more than once.
 * Each duplicate appears only once in the result.
 *
 * Time Complexity: O(n) - Single pass through the array using hash sets.
 * Space Complexity: O(n) - Sets storing seen elements and unique duplicate elements.
 *
 * @param numbers - Array of integers
 * @returns Array containing numbers that appear more than once
 */
export function findDuplicates(numbers: number[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const num of numbers) {
    if (seen.has(num)) {
      duplicates.add(num);
    } else {
      seen.add(num);
    }
  }

  return Array.from(duplicates);
}
