// server/src/utils/textNormalizer.js
// Utility to normalize obfuscated text and detect masked keywords

/**
 * Normalizes text by removing common obfuscation characters
 * Handles patterns like: m*al, m**l, m-e-a-l, m_e_a_l, m.e.a.l, etc.
 * @param {string} text - The text to normalize
 * @returns {string} - Normalized text with obfuscation removed
 */
export const normalizeObfuscatedText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.toLowerCase();

  // Step 1: Remove common obfuscation characters between letters
  // Matches patterns like: m*al, m**l, m***l, m-e-a-l, m_e_a_l, m.e.a.l
  normalized = normalized
    .replace(/([a-z])[*\-_.\s]+([a-z])/gi, '$1$2') // Remove obfuscation between letters
    .replace(/([a-z])[*\-_.\s]+([a-z])/gi, '$1$2') // Run twice to catch consecutive patterns
    .replace(/([a-z])[*\-_.\s]+([a-z])/gi, '$1$2'); // Third pass for thorough cleaning

  // Step 2: Remove standalone obfuscation characters
  normalized = normalized.replace(/[*\-_.]+/g, '');

  // Step 3: Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

/**
 * Creates a regex pattern that matches obfuscated versions of a keyword
 * Handles: m*al, m**l, m-e-a-l, m_e_a_l, s*x, s-e-x, etc.
 * @param {string} keyword - The keyword to create pattern for
 * @returns {RegExp} - Regex pattern that matches obfuscated versions
 */
const createObfuscationPattern = (keyword) => {
  // Create pattern where each character can be:
  // 1. The actual character
  // 2. Replaced by obfuscation chars (*, -, _, ., space)
  // 3. Followed by additional obfuscation chars (for cases like p**n)

  const chars = keyword.toLowerCase().split('');
  const vowels = ['a', 'e', 'i', 'o', 'u'];

  const pattern = chars
    .map((char, index) => {
      const isVowel = vowels.includes(char.toLowerCase());

      if (index === 0) {
        // First character: exact match (optionally replaced if vowel), followed by obfuscation
        if (isVowel) {
          return `[${char}*][*\\-_. ]*`;
        }
        return `${char}[*\\-_. ]*`;
      } else if (index === chars.length - 1) {
        // Last character: can be replaced by * if vowel, or exact match
        if (isVowel) {
          return `[${char}*]`;
        }
        return char;
      } else {
        // Middle characters: can be replaced by * (especially vowels) or separated by obfuscation
        // Allow multiple obfuscation chars (e.g., ** instead of just *)
        if (isVowel) {
          return `[${char}*][*\\-_. ]*`;
        }
        return `${char}[*\\-_. ]*`;
      }
    })
    .join('');

  return new RegExp(pattern, 'i');
};

/**
 * Checks if text contains a keyword, accounting for obfuscation
 * Uses pattern matching to handle cases where characters are separated or replaced
 * @param {string} text - The text to search in
 * @param {string} keyword - The keyword to search for
 * @returns {boolean} - True if keyword is found (even if obfuscated)
 */
export const containsObfuscatedKeyword = (text, keyword) => {
  if (!text || !keyword) {
    return false;
  }

  const normalizedText = normalizeObfuscatedText(text).toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  // Method 1: Direct match after normalization
  if (normalizedText.includes(normalizedKeyword)) {
    return true;
  }

  // Method 2: Pattern matching on original text (before full normalization)
  const pattern = createObfuscationPattern(keyword);
  if (pattern.test(text)) {
    return true;
  }

  // Method 3: Consonant matching for heavy obfuscation (m**l → meal, p**n → porn)
  // Extract consonants from keyword
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  const keywordConsonants = normalizedKeyword
    .split('')
    .filter((c) => consonants.includes(c))
    .join('');

  if (keywordConsonants.length >= 1) {
    // Check each word in the text
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
      // Remove all non-letter characters to get the core letters
      const coreLetters = word.replace(/[^a-z]/gi, '');

      // Extract consonants from the word
      const wordConsonants = coreLetters
        .split('')
        .filter((c) => consonants.includes(c.toLowerCase()))
        .join('');

      // Exact consonant match - but require at least 3 consonants to avoid false positives
      // (e.g., "need" (nd) shouldn't match "nude" (nd))
      if (
        wordConsonants === keywordConsonants &&
        keywordConsonants.length >= 3 &&
        Math.abs(coreLetters.length - normalizedKeyword.length) <= 2 &&
        coreLetters.length >= 2
      ) {
        return true;
      }

      // For 2-consonant keywords, require very similar length and obfuscation characters
      if (
        wordConsonants === keywordConsonants &&
        keywordConsonants.length === 2 &&
        Math.abs(coreLetters.length - normalizedKeyword.length) <= 1 &&
        /[*\-_. ]/.test(word) // Must have obfuscation
      ) {
        return true;
      }

      // Partial match: first and last consonants match (for heavy obfuscation like p**n → porn)
      // Only match if there are obfuscation characters present (*, -, _, ., space)
      // This prevents false positives like "plan" matching "porn" or "need" matching "nude"
      const hasObfuscation = /[*\-_. ]/.test(word);

      if (hasObfuscation) {
        // For 3+ consonant keywords, require exact or near-exact consonant match
        if (
          keywordConsonants.length >= 3 &&
          wordConsonants.length >= 2 &&
          wordConsonants[0] === keywordConsonants[0] &&
          wordConsonants[wordConsonants.length - 1] ===
            keywordConsonants[keywordConsonants.length - 1] &&
          Math.abs(word.length - normalizedKeyword.length) <= 1
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Checks if text contains any keyword from a list, accounting for obfuscation
 * @param {string} text - The text to search in
 * @param {string[]} keywords - Array of keywords to search for
 * @returns {Object} - { found: boolean, matchedKeyword: string|null }
 */
export const containsAnyObfuscatedKeyword = (text, keywords) => {
  if (!text || !keywords || !Array.isArray(keywords)) {
    return { found: false, matchedKeyword: null };
  }

  for (const keyword of keywords) {
    if (containsObfuscatedKeyword(text, keyword)) {
      return { found: true, matchedKeyword: keyword };
    }
  }

  return { found: false, matchedKeyword: null };
};

/**
 * Checks if text matches a pattern, after normalizing obfuscation
 * @param {string} text - The text to test
 * @param {RegExp} pattern - The regex pattern to test
 * @returns {boolean} - True if pattern matches normalized text
 */
export const matchesObfuscatedPattern = (text, pattern) => {
  if (!text || !pattern) {
    return false;
  }

  const normalizedText = normalizeObfuscatedText(text);
  return pattern.test(normalizedText);
};

/**
 * Generates variations of a word with common obfuscation patterns
 * Useful for testing and validation
 * @param {string} word - The word to generate variations for
 * @returns {string[]} - Array of obfuscated variations
 */
export const generateObfuscatedVariations = (word) => {
  if (!word) {
    return [];
  }

  const variations = [word];
  const chars = word.split('');

  // Add variations with asterisks
  if (chars.length > 2) {
    // Replace middle characters with asterisks: m**l
    variations.push(chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1]);

    // Replace vowels with asterisks: m*al
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const asteriskVariation = chars
      .map((char) => (vowels.includes(char.toLowerCase()) ? '*' : char))
      .join('');
    variations.push(asteriskVariation);
  }

  // Add variations with dashes: m-e-a-l
  if (chars.length > 1) {
    variations.push(chars.join('-'));
  }

  // Add variations with underscores: m_e_a_l
  if (chars.length > 1) {
    variations.push(chars.join('_'));
  }

  // Add variations with dots: m.e.a.l
  if (chars.length > 1) {
    variations.push(chars.join('.'));
  }

  // Add variations with spaces: m e a l
  if (chars.length > 1) {
    variations.push(chars.join(' '));
  }

  return [...new Set(variations)]; // Remove duplicates
};

/**
 * Common NSFW/inappropriate keywords that should be filtered
 */
export const NSFW_KEYWORDS = [
  'sex',
  'sexual',
  'porn',
  'nude',
  'naked',
  'explicit',
  'adult',
  'xxx',
  'nsfw',
  // Add more as needed, but keep professional
];

/**
 * Meal-related keywords that should trigger meal plan redirect
 */
export const MEAL_PLAN_KEYWORDS = [
  'meal',
  'meals',
  'diet',
  'food',
  'menu',
  'breakfast',
  'lunch',
  'dinner',
  'eating',
  'nutrition',
  'recipe',
  'recipes',
];

/**
 * Checks if text contains obfuscated NSFW content
 * @param {string} text - The text to check
 * @returns {Object} - { isNSFW: boolean, matchedKeyword: string|null }
 */
export const checkForObfuscatedNSFW = (text) => {
  const result = containsAnyObfuscatedKeyword(text, NSFW_KEYWORDS);
  return {
    isNSFW: result.found,
    matchedKeyword: result.matchedKeyword,
  };
};

/**
 * Checks if text contains obfuscated meal plan keywords
 * @param {string} text - The text to check
 * @returns {Object} - { isMealPlan: boolean, matchedKeyword: string|null }
 */
export const checkForObfuscatedMealPlan = (text) => {
  const result = containsAnyObfuscatedKeyword(text, MEAL_PLAN_KEYWORDS);
  return {
    isMealPlan: result.found,
    matchedKeyword: result.matchedKeyword,
  };
};

export default {
  normalizeObfuscatedText,
  containsObfuscatedKeyword,
  containsAnyObfuscatedKeyword,
  matchesObfuscatedPattern,
  generateObfuscatedVariations,
  checkForObfuscatedNSFW,
  checkForObfuscatedMealPlan,
  NSFW_KEYWORDS,
  MEAL_PLAN_KEYWORDS,
};
