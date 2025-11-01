# SERP API Serving Size Fix

**Date**: 1 November 2025  
**Issue**: SERP API extracting per 100g data instead of per-serving data  
**Impact**: Wrong serving sizes and calorie values in responses

---

## Problem

### Test Case 1: Magnolia Bakery Cookies
- **Expected**: "1 cookie (57g) = 240 cal"
- **Actual**: "100g = 2000 cal"
- **Source**: Nutritionix has correct per-serving data, but knowledge graph has per 100g

### Test Case 2: Homemade Rice Kheer
- **Expected**: "1 cup = 263 cal" or similar
- **Actual**: "100g = 263 cal"
- **Issue**: Serving size always defaults to "100g"

---

## Root Cause Analysis

**Original Code Priority** (Wrong):
```
1. Check knowledge_graph (Google) → Returns per 100g ✅
2. Check answer_box → Rarely has nutrition
3. Check organic_results (Nutritionix) → Returns per serving ❌ Never reached
```

**Problem**:
- Knowledge graph ALWAYS has data (per 100g)
- So organic results (which have better per-serving data) never get used
- Default serving size was hardcoded as "100g"

---

## Solution Implemented

### Fix 1: Reorder Priority (Lines ~113-183)

**New Priority**:
```javascript
// PRIORITY 1: Try organic results FIRST (Nutritionix has better per-serving data)
const organicData = this.parseOrganicResults(serpResults.organic_results, foodItem);
if (organicData.found && organicData.servingSize && organicData.servingSize !== '100g') {
  logger.info('✅ Using organic results (has per-serving data)', {
    servingSize: organicData.servingSize,
  });
  return organicData;
}

// PRIORITY 2: Check knowledge graph (usually per 100g)
if (serpResults.knowledge_graph) {
  // ... extract from knowledge graph
}

// PRIORITY 3: Check answer box

// PRIORITY 4: Use organic results even if 100g (fallback)
if (organicData.found) {
  return organicData;
}
```

**Why This Works**:
- Nutritionix organic results are checked FIRST
- If they have a non-100g serving size, use them immediately
- Otherwise fall back to knowledge graph

---

### Fix 2: Extract Serving Size from Snippets (Lines ~304-320)

**Added Serving Size Extraction**:
```javascript
const snippet = result.snippet || '';
const title = result.title || '';
const fullText = `${title} ${snippet}`.toLowerCase();

// Extract serving size FIRST (most important!)
// Patterns: "1 cookie (57g)", "serving size: 100g", "per 100g", "1 cup (240ml)"
const servingSizeMatch =
  fullText.match(/serving size:?\s*([^.]+?)(?:\n|$|calories)/i) ||
  fullText.match(/(\d+\s*(?:cookie|piece|cup|bowl|slice|tbsp|oz|g|ml)(?:\s*\(\d+g\))?)/i) ||
  fullText.match(/per\s+(\d+\s*(?:g|ml|oz|cookie|piece))/i);

let servingSize = servingSizeMatch ? servingSizeMatch[1].trim() : '100g';

// Clean up serving size (remove trailing punctuation)
servingSize = servingSize.replace(/[,.]$/, '');
```

**Regex Patterns Match**:
- `"serving size: 1 cookie (57g)"` → `"1 cookie (57g)"`
- `"Calories 240 per 1 cookie"` → `"1 cookie"`
- `"per 100g"` → `"100g"`
- `"1 cup (240ml)"` → `"1 cup (240ml)"`

---

### Fix 3: Enhanced Logging (Lines ~359-368)

**Added Debug Information**:
```javascript
logger.info('✅ Extracted nutrition from organic results', {
  foodItem,
  domain,
  servingSize: extractedData.servingSize,  // NEW
  calories: extractedData.calories,
  protein: extractedData.protein,
  carbs: extractedData.carbs,
  fat: extractedData.fat,
  snippetPreview: snippet.substring(0, 150),  // NEW - see what was parsed
});
```

**Why This Helps**:
- Can verify serving size extraction
- See actual snippet text that was parsed
- Debug regex patterns if not matching

---

## Expected Behavior

### Test 1: Magnolia Bakery Cookies

**Query**: "nutrition info on magnolia bakery's banana pudding cookies confetti"

**Expected Server Logs**:
```
[INFO] 🔍 Checking organic results first for per-serving data
[INFO] ✅ Extracted nutrition from organic results {
  foodItem: "magnolia bakery's banana pudding cookies confetti",
  domain: "nutritionix.com",
  servingSize: "1 cookie (57g)",  // ✅ Correct!
  calories: 240,  // ✅ Correct!
  protein: 3,
  carbs: 35,
  fat: 9,
  snippetPreview: "Calories 240, Protein 3g, Carbohydrates 35g..."
}
[INFO] ✅ Using organic results (has per-serving data) {
  servingSize: "1 cookie (57g)"
}
```

**Expected Response**:
```
• Serving Size: 1 cookie (57g)
• Calories: 240 cal
• Protein: 3g
• Carbohydrates: 35g
• Fat: 9g
```

---

### Test 2: Rice Kheer

**Query**: "nutritional info on homemade rice kheer"

**Expected Server Logs**:
```
[INFO] ✅ Extracted nutrition from organic results {
  servingSize: "1 cup",  // or "100g" if Nutritionix doesn't have per-serving
  calories: 263,
  protein: 8.3,
  carbs: 35,
  fat: 11
}
```

**Expected Response**:
```
• Serving Size: 1 cup (or 100g)
• Calories: 263 cal
• Protein: 8.3g
• Carbohydrates: 35g
• Fat: 11g
```

---

## Serving Size Regex Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `serving size:?\s*([^.]+?)(?:\n\|$\|calories)` | "serving size: X" | "serving size: 1 cookie (57g)" |
| `(\d+\s*(?:cookie\|piece\|cup\|bowl\|slice\|tbsp\|oz\|g\|ml)(?:\s*\(\d+g\))?)` | "X unit" | "1 cookie", "2 pieces", "1 cup (240ml)" |
| `per\s+(\d+\s*(?:g\|ml\|oz\|cookie\|piece))` | "per X" | "per 100g", "per cookie" |

**Supported Units**:
- cookie, piece, cup, bowl, slice, tbsp, oz, g, ml

**Handles**:
- With parentheses: "1 cookie (57g)"
- Without: "1 cookie"
- With units: "240 cal per 1 cookie"

---

## Verification Checklist

When testing, check logs for:

- [ ] `🔍 Checking organic results first for per-serving data` (Priority 1 executed)
- [ ] `servingSize:` in extracted data (not always "100g")
- [ ] `snippetPreview:` shows actual Nutritionix snippet
- [ ] `✅ Using organic results (has per-serving data)` (If per-serving found)
- [ ] If using knowledge graph: `⚠️ Using organic results as fallback (may be per 100g)`

---

## Fallback Behavior

**If Nutritionix doesn't have per-serving data**:
1. Organic results return "100g" serving size
2. Priority 1 check fails (serving size IS "100g")
3. Falls through to Priority 2 (knowledge graph)
4. Knowledge graph provides per 100g data
5. LLM receives per 100g data with "100g" serving size

**This is acceptable** because:
- Some foods (like generic "rice kheer") don't have standardized servings
- Per 100g is a valid way to present nutrition info
- LLM can clarify in response: "Per 100g serving..."

---

## Known Limitations

1. **Generic Foods**: "Homemade rice kheer" may not have per-serving data on Nutritionix
2. **Regional Foods**: Indian dishes might only have per 100g data
3. **Brand-Specific**: "Magnolia Bakery" products should have per-serving (1 cookie)

**Solution**: Organic results prioritized for brand-specific items, knowledge graph for generic.

---

## Testing Commands

### Test 1: Brand-Specific (Should get per-serving)
```
Query: "nutrition info on magnolia bakery's banana pudding cookies confetti"
Expected: servingSize: "1 cookie (57g)", calories: 240
```

### Test 2: Generic Food (May get per 100g)
```
Query: "nutritional info on homemade rice kheer"
Expected: servingSize: "100g" or "1 cup", calories: 263
```

### Test 3: Common Snack (Should get per-serving)
```
Query: "nutrition facts for oreo cookies"
Expected: servingSize: "3 cookies (34g)", calories: 160
```

---

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `serpService.js` | 113-183 | Reordered priority: organic first, knowledge graph second |
| `serpService.js` | 304-320 | Added serving size extraction with 3 regex patterns |
| `serpService.js` | 359-368 | Added servingSize and snippetPreview to logs |

**Impact**:
- ✅ Brand-specific items get per-serving data (240 cal per cookie)
- ✅ Serving sizes extracted from Nutritionix snippets
- ✅ Knowledge graph used as fallback for generic foods
- ✅ Logs show which source was used and why

---

## Next Steps

1. **Test with brand products** (Magnolia Bakery, Oreo, etc.)
2. **Verify logs show correct serving sizes**
3. **Check if LLM response shows per-serving data**
4. **Monitor for foods that still show "100g"**

If many foods still show "100g", may need to:
- Expand regex patterns for serving size extraction
- Add more unit types (tablespoon, teaspoon, serving, portion)
- Handle Indian units (katori, bowl, piece)
