# SERP API Not Triggering - Fix

**Date**: November 1, 2025  
**Version**: v1.8.3

## Issues Reported

When users asked nutrition-related questions, the SERP API was not being called:

1. **Query**: "Should I eat ragi mudde with PCOS?"
   - ❌ No SERP API call
   - ❌ No Google nutrition links in Sources
   - ✅ RAG/medical knowledge returned (good)

2. **Query**: "What is the macro breakdown of onion uttapam"
   - ❌ No SERP API call (even though "macro" is in the query)
   - ❌ No Google nutrition links in Sources
   - ✅ RAG/medical knowledge returned (good)

---

## Root Causes

### Issue 1: Limited Keyword Detection

The `needsNutritionData()` function had a very limited keyword list:

```javascript
// ❌ BEFORE: Only 9 keywords
const nutritionKeywords = [
  'calories',
  'nutrition',
  'protein',
  'carbs',
  'fat',
  'macros',  // Note: this was plural only
  'nutrients',
  'vitamin',
  'mineral',
];
```

**Problems**:
- Didn't match "macro" (singular)
- Didn't match "breakdown", "info", "information", "content", "value", "data", "facts"
- Didn't catch food questions like "Should I eat X?" or "Can I have Y?"
- Missed variations like "carb" (singular), "nutritional" (adjective), etc.

### Issue 2: No Logging

There was no logging to show:
- Whether `needsNutritionData()` triggered
- Whether SERP API was called
- If SERP API key was missing
- If SERP API call failed

This made debugging impossible.

### Issue 3: No API Key Check

The SERP service didn't check if the API key was configured before making requests. If the key was missing, it would fail silently or throw an unclear error.

---

## Solutions Implemented

### Fix 1: Expanded Keyword Detection

Enhanced `needsNutritionData()` to catch many more nutrition queries:

```javascript
// ✅ AFTER: 22 keywords + food question pattern
const nutritionKeywords = [
  'calories',
  'calorie',
  'nutrition',
  'nutritional',
  'protein',
  'carbs',
  'carb',
  'carbohydrate',
  'fat',
  'fats',
  'macro',        // ✅ Now includes singular
  'macros',
  'nutrients',
  'nutrient',
  'vitamin',
  'mineral',
  'breakdown',    // ✅ "macro breakdown", "nutritional breakdown"
  'info',         // ✅ "nutrition info"
  'information',  // ✅ "nutritional information"
  'content',      // ✅ "nutrition content"
  'value',        // ✅ "nutritional value"
  'data',         // ✅ "nutrition data"
  'facts',        // ✅ "nutrition facts"
];

// ✅ NEW: Also detect food-related questions
const foodQuestionPattern = /(should|can|is it (ok|okay|safe|good)|what about) (i |we )?(eat|have|consume)/i;
const isFoodQuestion = foodQuestionPattern.test(message);
```

**Now Matches**:
- "Should I eat ragi mudde with PCOS?" ✅ (food question pattern)
- "What is the macro breakdown of onion uttapam" ✅ ("macro" + "breakdown")
- "Can I have samosa?" ✅ (food question pattern)
- "What about eating pizza?" ✅ (food question pattern)
- "Nutrition info on dal dhokli" ✅ ("nutrition" + "info")
- "Nutritional value of idli" ✅ ("nutritional" + "value")
- "Tell me about the carb content" ✅ ("carb" + "content")

### Fix 2: Added Comprehensive Logging

**In `chatChain.js` - `needsNutritionData()`**:
```javascript
if (hasNutritionKeyword || isFoodQuestion) {
  logger.info('Nutrition data needed', { 
    hasNutritionKeyword, 
    isFoodQuestion,
    query: message 
  });
  return true;
}
```

**In `serpService.js` - `searchNutrition()`**:
```javascript
// Log API key status
logger.info('🔍 Fetching nutrition data from SERP API', { 
  foodItem, 
  hasApiKey: !!this.apiKey 
});

// Log success
logger.info('✅ Nutrition data fetched successfully', { 
  foodItem, 
  found: nutritionData.found,
  hasSourceUrl: !!nutritionData.sourceUrl 
});

// Enhanced error logging
logger.error('❌ SERP API nutrition search failed', {
  error: error.message,
  errorResponse: error.response?.data,
  statusCode: error.response?.status,
  foodItem,
  hasApiKey: !!this.apiKey,
});
```

### Fix 3: API Key Validation

Added check at the beginning of `searchNutrition()`:

```javascript
// Check if API key is configured
if (!this.apiKey) {
  logger.warn('SERP API key not configured - skipping nutrition fetch', { foodItem });
  return {
    foodItem,
    found: false,
    error: 'SERP API key not configured',
    source: null,
  };
}
```

---

## Testing

### Prerequisites

**1. Verify SERP API key is set**:

Check your `server/.env` file:
```bash
SERP_API_KEY=your_serp_api_key_here
```

If missing, get one from: https://serpapi.com/

**2. Restart server**:
```bash
cd server
npm run dev
```

### Test Cases

#### Test 1: Food Question (Should I eat...)

**Query**: "Should I eat ragi mudde with PCOS?"

**Expected in server logs**:
```
[ChatChain] Nutrition data needed { hasNutritionKeyword: false, isFoodQuestion: true, query: '...' }
[ChatChain] Fetching nutritional data
[SERPService] 🔍 Fetching nutrition data from SERP API { foodItem: '...', hasApiKey: true }
[SERPService] ✅ Nutrition data fetched successfully { foodItem: '...', found: true, hasSourceUrl: true }
```

**Expected in response**:
- ✅ Nutrition facts (from SERP + RAG)
- ✅ PCOS-friendly analysis
- ✅ Modifications/alternatives
- ✅ Sources include "nutrition" type with Google links

#### Test 2: Macro Breakdown Query

**Query**: "What is the macro breakdown of onion uttapam"

**Expected in server logs**:
```
[ChatChain] Nutrition data needed { hasNutritionKeyword: true, isFoodQuestion: false, query: '...' }
[ChatChain] Fetching nutritional data
[SERPService] 🔍 Fetching nutrition data from SERP API { foodItem: 'onion uttapam', hasApiKey: true }
[SERPService] ✅ Nutrition data fetched successfully { foodItem: 'onion uttapam', found: true }
```

**Expected in response**:
- ✅ Macros (calories, protein, carbs, fats)
- ✅ PCOS analysis
- ✅ Modifications
- ✅ Google nutrition links in Sources

#### Test 3: Nutrition Info Query

**Query**: "nutrition info on samosa"

**Expected**:
- ✅ Triggers `needsNutritionData()` ("nutrition" + "info")
- ✅ SERP API called
- ✅ Google links in Sources

#### Test 4: Missing API Key

If `SERP_API_KEY` is not set in `.env`:

**Expected in server logs**:
```
[SERPService] SERP API key not configured - skipping nutrition fetch { foodItem: '...' }
```

**Expected in response**:
- ✅ RAG nutrition data still works
- ❌ No Google sources (graceful degradation)
- ✅ Response still useful (from meal templates)

---

## Verification Commands

### Check if SERP API key is loaded:

In server terminal after starting:
```bash
# Look for this line in startup logs:
# [Config] Environment loaded: development
```

Or add temporary log in `server/src/services/serpService.js` constructor:
```javascript
constructor() {
  this.apiKey = env.SERP_API_KEY;
  console.log('🔑 SERP API Key configured:', !!this.apiKey); // ✅ Temporary debug
  // ...
}
```

### Test SERP API directly:

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "message": "What is the macro breakdown of onion uttapam"
  }' | jq '.sources[] | select(.type == "nutrition")'
```

Should return nutrition sources with links array.

---

## Files Modified

1. **server/src/langchain/chains/chatChain.js** (lines ~1382-1420)
   - Expanded `needsNutritionData()` keyword list (9 → 22 keywords)
   - Added food question pattern detection
   - Added logging when nutrition data is needed

2. **server/src/services/serpService.js** (lines ~18-80)
   - Added API key validation check
   - Enhanced success logging with emoji indicators
   - Enhanced error logging with response details and status codes

---

## Common Issues & Solutions

### Issue: "Nutrition data needed" log appears but no SERP API call

**Possible Causes**:
1. SERP_API_KEY not set in `.env`
2. SERP API request failing (network, API limits, invalid key)

**Debug**:
```javascript
// In chatChain.js processMessage(), add after line ~1540:
if (this.needsNutritionData(userMessage)) {
  logger.info('🔍 About to fetch nutrition, checking SERP service...');
  nutritionContext = await this.fetchNutritionContext(userMessage);
  logger.info('📊 Nutrition context result:', { 
    hasContext: !!nutritionContext,
    contextLength: nutritionContext?.length 
  });
}
```

### Issue: SERP API called but no data returned

**Possible Causes**:
1. Food item name not recognized by Google
2. Google doesn't have nutrition data for this dish
3. SERP API returned data but extraction failed

**Check Response**:
Look for this in logs:
```
[SERPService] ✅ Nutrition data fetched successfully { foodItem: '...', found: false }
```

If `found: false`, the API responded but no structured nutrition data was found. This is normal for obscure dishes.

### Issue: Sources show nutrition type but no links

**Possible Cause**: JSON parsing failed in `chatChain.js` sources compilation

**Debug**: Check logs for:
```
[ChatChain] Failed to parse nutrition data for sources { error: '...' }
```

---

## Impact

### Before These Fixes
- ❌ Many nutrition queries didn't trigger SERP API
- ❌ "Should I eat X?" questions had no Google nutrition data
- ❌ Singular keywords ("macro", "carb") not detected
- ❌ No visibility into why SERP wasn't called
- ❌ Silent failures if API key missing

### After These Fixes
- ✅ 22 nutrition keywords detected (vs 9 before)
- ✅ Food questions ("Should I eat...") trigger SERP API
- ✅ Comprehensive logging shows exactly what's happening
- ✅ Clear warnings if API key not configured
- ✅ Better error messages with response details
- ✅ Graceful degradation (RAG still works if SERP fails)

---

## Related Documentation

- SERP sources rendering: `/docs/SERP_SOURCES_FIX.md`
- PCOS nutrition guidance: `/docs/PCOS_FRIENDLY_NUTRITION_GUIDANCE.md`
- RAG & disclaimers: `/docs/CHAT_RAG_DISCLAIMER_FIXES.md`

---

**Status**: ✅ Complete (syntax checked, ready to test)

**Next Step**: Restart server and test with queries from the screenshots!
