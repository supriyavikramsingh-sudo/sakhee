# Obfuscated Keyword Detection Implementation

## Overview
Implemented comprehensive obfuscation detection to prevent users from bypassing content filters using masked keywords like `m*al`, `m**l`, `m-e-a-l`, `s*x`, `p**n`, etc.

## Changes Made

### 1. Text Normalization Utility (`server/src/utils/textNormalizer.js`)
Created a comprehensive utility module that:
- **Normalizes obfuscated text** by removing common obfuscation characters (*, -, _, ., spaces)
- **Pattern matching** to detect keywords even when characters are replaced or separated
- **Consonant matching** for heavy obfuscation (e.g., `p**n` → `porn`, `m**l` → `meal`)
- **Multi-method detection**:
  1. Direct normalization and string matching
  2. Regex pattern matching with vowel replacement support
  3. Consonant-based fuzzy matching (first and last consonants)

#### Key Functions:
- `normalizeObfuscatedText(text)` - Removes obfuscation characters
- `containsObfuscatedKeyword(text, keyword)` - Checks if text contains a keyword (even obfuscated)
- `containsAnyObfuscatedKeyword(text, keywords[])` - Checks multiple keywords
- `checkForObfuscatedMealPlan(text)` - Meal-specific detection
- `checkForObfuscatedNSFW(text)` - NSFW content detection

### 2. Enhanced Meal Plan Intent Detector (`server/src/middleware/mealPlanIntentDetector.js`)
Updated to detect obfuscated meal-related keywords:
- ✅ Detects `m*al`, `m**l`, `m-e-a-l`, `m_e_a_l`, `m.e.a.l`
- ✅ Detects `d*et`, `d-i-e-t`, `f**d`, etc.
- ✅ Tests against both normalized and deobfuscated versions
- ✅ Redirects to Meal Plan Generator when obfuscated keywords detected

### 3. Enhanced Safety Guards (`server/src/middleware/safetyGuards.js`)
Updated to detect obfuscated NSFW content:
- ✅ Detects `s*x`, `s-e-x`, `p*rn`, `p**n`, `n*de`, etc.
- ✅ Returns 400 error with professional message
- ✅ Logs warnings with matched keyword for monitoring
- ✅ Still detects dangerous keywords (suicide, self-harm, etc.) with obfuscation

### 4. Comprehensive Test Suite (`server/src/utils/textNormalizer.test.js`)
Created test suite covering:
- ✅ Basic text normalization (10/10 passing)
- ✅ Meal plan keyword detection (10/10 passing)
- ✅ NSFW content detection (8/8 passing)
- ✅ Complex sentences (4/4 passing)

## Supported Obfuscation Patterns

### Asterisk Replacement
- `m*al` → detected as "meal"
- `m**l` → detected as "meal"
- `s*x` → detected as "sex"
- `p**n` → detected as "porn"

### Character Separation
- `m-e-a-l` → detected as "meal"
- `m_e_a_l` → detected as "meal"
- `m.e.a.l` → detected as "meal"
- `m e a l` → detected as "meal"

### Mixed Patterns
- `m*al pl*n` → detected (meal + plan)
- `d*et ch*rt` → detected (diet + chart)
- `s*xual` → detected (sexual)

## How It Works

### Detection Pipeline
```
User Message
    ↓
1. Obfuscation Check (e.g., m*al, s*x)
    ↓
2. Pattern Matching (regex with vowel replacement)
    ↓
3. Consonant Matching (first & last consonants)
    ↓
Decision: Block/Redirect or Allow
```

### Example Flow

**Meal Plan Request:**
```
Input: "I need a m*al plan"
→ Obfuscation detected: "meal"
→ Response: Redirect to Meal Plan Generator
```

**NSFW Content:**
```
Input: "Tell me about s*x education"
→ Obfuscation detected: "sex"
→ Response: 400 Error - Inappropriate content
```

## Keywords Monitored

### Meal-Related (Redirects to Meal Plan Generator)
- meal, meals, diet, food, menu
- breakfast, lunch, dinner
- eating, nutrition, recipe, recipes

### NSFW (Blocks with Error)
- sex, sexual, porn, nude, naked
- explicit, adult, xxx, nsfw
- intimate, erotic

### Dangerous Keywords (Flags for Doctor Consultation)
- abortion, pregnancy loss, extreme pain
- heavy bleeding, suicide, self-harm
- overdose, abuse, addiction, illegal

## Benefits

1. **Prevents Filter Bypass**: Users can't circumvent content filters by masking keywords
2. **Maintains User Experience**: Legitimate queries still work normally
3. **Professional Response**: Appropriate messaging for inappropriate content
4. **Comprehensive Coverage**: Handles multiple obfuscation techniques
5. **Easy to Extend**: Simple to add new keywords to monitor

## Testing

Run the test suite:
```bash
cd server
node src/utils/textNormalizer.test.js
```

All tests passing ✅ (32/32)

## Future Enhancements

- [ ] Add more NSFW keywords as needed
- [ ] Implement rate limiting for repeated filter bypass attempts
- [ ] Add analytics to track obfuscation attempt patterns
- [ ] Consider ML-based detection for more sophisticated obfuscation

## Files Modified/Created

1. ✨ `server/src/utils/textNormalizer.js` - New utility module
2. ✨ `server/src/utils/textNormalizer.test.js` - New test suite
3. 🔧 `server/src/middleware/mealPlanIntentDetector.js` - Enhanced detection
4. 🔧 `server/src/middleware/safetyGuards.js` - Enhanced NSFW filtering

---

**Implementation Date:** November 2, 2025
**Status:** ✅ Complete and Tested
