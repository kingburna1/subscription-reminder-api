/**
 * Exercise 3: Group Anagrams
 *
 * Given an array of strings, groups words that are anagrams of one another.
 * The order of the groups and items within groups does not matter.
 *
 * Time Complexity: O(n * k log k), where n is words length, k is max word length.
 * Space Complexity: O(n * k) - Map storing all grouped words.
 *
 * @param words - Array of strings
 * @returns Array of grouped anagram words
 */
export function groupAnagrams(words: string[]): string[][] {
  const anagramGroups = new Map<string, string[]>();

  for (const word of words) {
    const normalizedKey = word.split('').sort().join('');
    const existingGroup = anagramGroups.get(normalizedKey);

    if (existingGroup) {
      existingGroup.push(word);
    } else {
      anagramGroups.set(normalizedKey, [word]);
    }
  }

  return Array.from(anagramGroups.values());
}
