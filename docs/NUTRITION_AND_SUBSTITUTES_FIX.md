# Nutrition Data & Ingredient Substitutes - Comprehensive Fix

**Date**: 1 November 2025  
**Issues**:
1. LLM converting gram values to percentages (e.g., "Carbohydrates: 60% of calories" instead of "35g")
2. Ingredient substitutes being retrieved but NOT shown in response
3. SERP API returning wrong serving sizes (100g instead of per serving)

---

## Problem Analysis

### Issue 1: LLM Converting Grams to Percentages

**User Query**: "nutrition info on magnolia bakery's banana pudding cookies confetti"

**Expected Output**:
```
- Calories: 240 cal
- Protein: 3g
- Carbohydrates: 35g
- Fat: 9g
```

**Actual Output** (Before Fix):
```
- Calories: 2000 cal
- Protein: 3g
- Carbohydrates: Approximately 60% of the calories
- Fat: Approximately 35% of the calories
```

**Root Cause**: LLM was not instructed to use exact gram values from the JSON data. It was calculating percentages on its own.

---

### Issue 2: Ingredient Substitutes Retrieved But Not Shown

**Server Logs**:
```
[INFO] ✅ Ingredient substitutes retrieved { docsRetrieved: 5 }
```

**Response**: No substitutes shown

**Root Cause**: 
1. Instructions were too weak - LLM ignored the substitute context
2. No explicit requirement to include a "PCOS-Friendly Modifications" section
3. Format examples weren't strong enough

---

### Issue 3: SERP API Wrong Serving Sizes

**Expected**: 1 cookie (57g) = 240 cal  
**Actual**: 100g = 2000 cal

**Root Cause**: Google's knowledge graph returns per 100g data by default. Need to check if per-serving data is available or parse from organic results.

---

## Solutions Implemented

### Fix 1: Force LLM to Use Exact Gram Values

**Location**: `server/src/langchain/chains/chatChain.js` (Lines ~2138-2167)

**Added CRITICAL Instructions**:
```javascript
context += `\n🚨 CRITICAL NUTRITION FORMATTING INSTRUCTIONS:\n`;
context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
context += `⚠️ YOU MUST USE EXACT VALUES IN GRAMS FROM THE DATA ABOVE!\n\n`;
context += `✅ REQUIRED FORMAT (Use exact numbers from JSON above):\n`;
context += `   • Serving Size: [value from servingSize]\n`;
context += `   • Calories: [value from calories] cal\n`;
context += `   • Protein: [value from protein]g\n`;
context += `   • Carbohydrates: [value from carbs]g\n`;
context += `   • Fat: [value from fat]g\n`;
context += `   • Fiber: [value from fiber]g (if available)\n\n`;
context += `❌ DO NOT:\n`;
context += `   ✗ Convert to percentages (e.g., "60% of calories")\n`;
context += `   ✗ Use approximations (e.g., "Approximately X%")\n`;
context += `   ✗ Say "around", "roughly", "about" for macro values\n`;
context += `   ✗ Calculate percentages unless specifically asked\n\n`;
```

**Impact**: LLM now MUST use exact values from JSON (35g, 3g, 9g) instead of calculating percentages.

---

### Fix 2: Expanded Food Item Detection

**Location**: `server/src/langchain/chains/chatChain.js` (Lines ~2003-2044)

**Added 22 New Food Items**:
```javascript
const foodItems = [
  // ... existing items ...
  'cookie', 'cookies',
  'biscuit', 'biscuits',
  'cake', 'pastry',
  'dessert', 'pudding',
  'chocolate', 'chips',
  'fries', 'pizza',
  'burger', 'sandwich',
  'wafer', 'mithai',
  'sweet', 'ladoo',
  'barfi', 'halwa',
  'jalebi', 'gulab jamun',
];
```

**Why This Matters**:
- Before: Query "nutrition info on cookies" → `needsIngredientSubstitutes()` → FALSE (no substitutes retrieved)
- After: Query "nutrition info on cookies" → `needsIngredientSubstitutes()` → TRUE (substitutes retrieved)

---

### Fix 3: MUCH Stronger Ingredient Substitute Instructions

**Location**: `server/src/langchain/chains/chatChain.js` (Lines ~2763-2800)

**Before** (Weak Instructions):
```javascript
enhancedContext += '⚠️ CRITICAL: PCOS-FRIENDLY INGREDIENT SUBSTITUTES\n';
enhancedContext += '🎯 PROVIDE INGREDIENT-LEVEL SUBSTITUTES\n';
```

**After** (MANDATORY Instructions):
```javascript
enhancedContext += '═══════════════════════════════════════════════════════════\n';
enhancedContext += '🚨 MANDATORY: PCOS-FRIENDLY INGREDIENT SUBSTITUTES 🚨\n';
enhancedContext += '═══════════════════════════════════════════════════════════\n\n';
enhancedContext += '⛔️ YOU MUST INCLUDE A SECTION TITLED "PCOS-Friendly Modifications" IN YOUR RESPONSE!\n\n';
enhancedContext += '🎯 RULES:\n';
enhancedContext += '1. Use ONLY the substitutes from the data below (DO NOT make up alternatives)\n';
enhancedContext += '2. Provide INGREDIENT-LEVEL substitutes (NOT whole meal alternatives)\n';
enhancedContext += '3. Use this EXACT format for EACH substitute:\n';
enhancedContext += '   "Instead of [ingredient], use [substitute] because [PCOS benefit]"\n\n';
```

**Key Changes**:
1. ✅ Word "MANDATORY" instead of "CRITICAL"
2. ✅ Explicit requirement: "YOU MUST INCLUDE A SECTION"
3. ✅ Numbered rules (more forceful than bullet points)
4. ✅ Exact format specification with examples
5. ✅ Warning: "FAILURE TO INCLUDE SPECIFIC SUBSTITUTES = INCOMPLETE RESPONSE!"

---

### Fix 4: Enhanced Logging

**Added Logging**:
```javascript
// Log substitute context preview
logger.info('✅ Ingredient substitutes retrieved', {
  docsRetrieved: substituteDocs.length,
  query: ingredientQuery,
  contextPreview: ingredientSubstituteContext.substring(0, 300), // NEW
});

// Log when adding to prompt
logger.info('➕ Adding ingredient substitute context to prompt', {
  contextLength: ingredientSubstituteContext.length, // NEW
});

// Log raw SERP nutrition data
logger.info('✅ Extracted nutrition from knowledge graph', {
  rawNutritionData: JSON.stringify(nutritionData).substring(0, 200), // NEW
});
```

**Why This Matters**: Can now verify that:
1. Substitutes are being retrieved from RAG
2. Context is being added to the prompt
3. SERP API is returning correct/incorrect data

---

## Expected Behavior After Fix

### Test Query: "nutrition info on magnolia bakery's banana pudding cookies confetti"

**Expected Response Format**:

```
Here's the nutritional information for Magnolia Bakery's Banana Pudding Cookies, Confetti:

**Nutritional Breakdown (Per Serving - 1 cookie/57g):**
• Calories: 240 cal
• Protein: 3g
• Carbohydrates: 35g
• Fat: 9g
• Fiber: 1g

**PCOS-Friendly Modifications:**

Instead of refined flour (maida), use almond flour or coconut flour because 
they have significantly lower carbs and won't spike blood sugar levels.

Instead of white sugar, use stevia, erythritol, or monk fruit sweetener 
because they are zero-calorie alternatives that don't affect insulin.

Instead of milk chocolate chips, use dark chocolate chips (85%+ cacao) 
because they contain less sugar and provide beneficial antioxidants.

Instead of butter, use coconut oil or ghee because they contain medium-chain 
triglycerides (MCTs) that support metabolism.

**📊 Nutrition Data Sources:**
- [Link to Nutritionix]
- [Link to Google source]

💬 **Nutritional information from Google's knowledge base.**
```

---

## Server Logs to Verify

**1. Ingredient Detection**:
```
[INFO] Ingredient substitutes needed {
  hasRecipeKeyword: false,
  hasFoodItem: true,  // ✅ 'cookies' detected
  query: "nutrition info on magnolia bakery's banana pudding cookies confetti"
}
```

**2. RAG Retrieval**:
```
[INFO] 🔍 Built ingredient substitute query {
  ingredientsFound: ['cookie', 'cookies', 'pudding']  // ✅ Detected
}
[INFO] ✅ Ingredient substitutes retrieved {
  docsRetrieved: 5,  // ✅ Retrieved
  contextPreview: "🔄 PCOS-FRIENDLY INGREDIENT SUBSTITUTES..."  // ✅ Has content
}
```

**3. Context Addition**:
```
[INFO] ➕ Adding ingredient substitute context to prompt {
  contextLength: 1500  // ✅ Added to prompt
}
```

**4. SERP Data**:
```
[INFO] ✅ Extracted nutrition from knowledge graph {
  servingSize: "100g",  // ⚠️ Wrong (should be "1 cookie (57g)")
  calories: 2000,       // ⚠️ Wrong (should be 240)
  rawNutritionData: {...}  // Check this to see what Google returned
}
```

---

## Remaining Issues to Debug

### Issue: SERP API Serving Size

**Problem**: Google returns per 100g, not per serving

**Possible Solutions**:

1. **Check if Google provides per-serving data**: 
   - Look at `rawNutritionData` log to see if serving info exists
   - Try extracting from `serving_size` field

2. **Parse from Organic Results (Nutritionix, USDA)**:
   ```javascript
   // In parseOrganicResults()
   const servingMatch = snippet.match(/serving size:?\s*(\d+\s*\w+)/i);
   const perServingCal = snippet.match(/(\d+)\s*cal.*per serving/i);
   ```

3. **Instruct LLM to Clarify**:
   ```javascript
   context += `⚠️ NOTE: Data may be per 100g. If so, clarify in response.\n`;
   ```

---

## Testing Checklist

### Before Testing:
- [x] Server restarted with changes
- [ ] Clear browser cache (Cmd+Shift+R)
- [ ] Open browser console to see API responses

### Test Cases:

**Test 1: Cookies**
- Query: "nutrition info on magnolia bakery's banana pudding cookies confetti"
- Expected:
  - [ ] Shows exact gram values (35g, 3g, 9g)
  - [ ] Shows "PCOS-Friendly Modifications" section
  - [ ] Lists 3-4 specific ingredient substitutes
  - [ ] Format: "Instead of X, use Y because Z"

**Test 2: Indian Sweet**
- Query: "nutritional information on gulab jamun"
- Expected:
  - [ ] Detects 'gulab jamun' as food item
  - [ ] Retrieves substitutes (jaggery → stevia, maida → almond flour)
  - [ ] Shows gram values, not percentages

**Test 3: Generic Food**
- Query: "share nutrition info on pizza"
- Expected:
  - [ ] Detects 'pizza' as food item
  - [ ] Shows substitutes for maida, cheese, toppings
  - [ ] Exact calorie/macro values

---

## Summary of Changes

| File | Lines Changed | What Changed |
|------|---------------|--------------|
| `chatChain.js` | 2138-2167 | Added CRITICAL nutrition formatting instructions |
| `chatChain.js` | 2003-2044 | Added 22 new food items to detection |
| `chatChain.js` | 2710-2715 | Added substitute context preview logging |
| `chatChain.js` | 2763-2800 | Made ingredient substitute instructions MANDATORY |
| `serpService.js` | 159-167 | Added rawNutritionData logging |

**Total Impact**:
- ✅ LLM forced to use exact gram values (not percentages)
- ✅ More food items trigger ingredient substitute retrieval
- ✅ Stronger instructions force LLM to include substitutes
- ✅ Better logging for debugging
- ⚠️ SERP serving size issue remains (needs investigation)

---

## Next Steps

1. **Test with the fixed code** - Try the cookie query again
2. **Check server logs** - Verify substitutes are in prompt
3. **Debug SERP data** - Look at `rawNutritionData` to see what Google returns
4. **Consider alternatives** - If Google doesn't provide per-serving, parse from Nutritionix organic results

---

## User's Original Request

> "Ideally for any dish, the LLM should google search nutrition info, extract common ingredients in that dish and then look into the RAG ingredient substitute file for substitute recommendations."

**Current Implementation**:
1. ✅ Google search nutrition info (via SERP API)
2. ❌ Extract common ingredients from dish name
3. ✅ Look into RAG for substitutes based on detected keywords

**What's Missing**:
The system currently searches for "cookie substitute" but doesn't extract actual ingredients (flour, sugar, butter) from the dish. This is a design limitation - we'd need:
- Ingredient extraction from dish names (complex NLP)
- OR: Rely on RAG to contain comprehensive substitutes for common dishes
- OR: Use LLM to extract ingredients first, then search RAG

**Recommendation**: 
Enhance the RAG knowledge base to include more dish-specific substitutes:
```
# Cookies (General)
Common ingredients: refined flour, white sugar, butter, chocolate chips
Substitutes:
- Flour: almond flour, coconut flour, oat flour
- Sugar: stevia, erythritol, monk fruit
- Butter: coconut oil, ghee
- Chocolate: dark chocolate 85%+
```
