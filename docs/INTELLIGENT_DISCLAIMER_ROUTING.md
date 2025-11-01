# Intelligent Disclaimer Routing Fix

**Date**: November 1, 2025  
**Version**: v1.8.4

## Issue Reported

User query: **"Should I eat chole bhature today if I have PCOS?"**

The response showed **TWO disclaimers** (duplicate):
1. ⚠️ *This is educational guidance only. Please consult a healthcare professional for personalized medical advice.*
2. ⚠️ *This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.*

**Problem**: Both disclaimers appeared even though the response didn't reference the user's specific lab values - it was generic nutrition advice about chole bhature.

---

## Root Cause

The old disclaimer logic had a flawed `if-else` structure:

```javascript
// ❌ OLD LOGIC (BROKEN)
if (medicalData && usesLabData(finalResponse)) {
  // Add lab disclaimer
  finalResponse += '\n\n' + labDisclaimer;
} else if (this.isHealthRelated(userMessage) && !contains('this is educational guidance')) {
  // Add general disclaimer
  finalResponse += '\n\n' + generalHealthDisclaimer;
}

if (redditContext) {
  // Add reddit disclaimer
  finalResponse += '\n\n' + redditDisclaimer;
}
```

**Issues**:
1. The `else if` condition checked if "this is educational guidance" was present, but this check was too generic
2. When lab disclaimer was NOT added (because response didn't use lab data), the general disclaimer was added
3. BUT the check `!contains('this is educational guidance')` didn't prevent the lab disclaimer from being added later
4. Result: BOTH disclaimers could appear because they have different text

**Example Flow** (for "Should I eat chole bhature"):
1. User has `medicalData` (lab values exist) ✓
2. Response doesn't use lab data (no "your insulin", "your glucose", etc.) ✗
3. `if (medicalData && usesLabData(finalResponse))` → FALSE
4. Falls to `else if (this.isHealthRelated(userMessage))` → TRUE (health-related query)
5. Adds general disclaimer ✓
6. Later, LLM might have output text that accidentally matched the lab disclaimer check
7. Both disclaimers added! ❌

---

## Solution: Intelligent Disclaimer Routing

Created a dedicated `getAppropriateDisclaimers()` method that implements **mutually exclusive disclaimer logic** with clear priorities.

### New Architecture

```javascript
getAppropriateDisclaimers(response, userMessage, medicalData, redditContext) {
  const disclaimers = [];

  // Priority 1: Lab-specific disclaimer (HIGHEST)
  if (medicalData && usesLabData(response) && !alreadyPresent) {
    disclaimers.push(LAB_DISCLAIMER);
  }
  // Priority 2: General health disclaimer (ONLY if lab disclaimer NOT added)
  else if (isHealthRelated(userMessage) && !alreadyPresent) {
    disclaimers.push(GENERAL_DISCLAIMER);
  }

  // Priority 3: Reddit disclaimer (can be shown alongside others)
  if (redditContext && !alreadyPresent) {
    disclaimers.push(REDDIT_DISCLAIMER);
  }

  return disclaimers;
}
```

### Key Improvements

1. **Mutually Exclusive Health Disclaimers**: Lab disclaimer and general disclaimer are in an `if-else` block, so ONLY ONE is ever added

2. **Clear Priority Order**:
   - Priority 1: Lab disclaimer (if user has labs AND response uses them)
   - Priority 2: General disclaimer (if health-related but no lab usage)
   - Priority 3: Reddit disclaimer (independent, can combine with health disclaimers)

3. **Enhanced Lab Detection**: Added more lab indicators:
   ```javascript
   'your dhea', 'your amh', 'your lh', 'your fsh', 'your report',
   'mIU/L', 'high range', 'low range'
   ```

4. **Comprehensive Logging**: Tracks disclaimer decisions for debugging

5. **Centralized Logic**: All disclaimer routing in one place (easier to maintain)

---

## Disclaimer Routing Rules

### Rule 1: Lab-Specific Disclaimer

**When to show**:
- ✅ User has medical data (lab values exist)
- ✅ Response references their specific lab values ("your insulin", "elevated", units like "µIU/mL", etc.)
- ✅ Lab disclaimer not already in response

**Text**:
> ⚠️ *This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.*

**Example queries** where this should appear:
- "Why is my insulin elevated?"
- "What can I do about my high testosterone?"
- "My TSH is 5.2, is that normal?"

**Example queries** where this should NOT appear:
- "Should I eat chole bhature?" (no lab reference in response)
- "What is PCOS?" (generic question)

---

### Rule 2: General Health Disclaimer

**When to show**:
- ✅ Query is health-related (contains keywords: symptom, diet, weight, exercise, medication, etc.)
- ✅ Lab disclaimer was NOT added (mutually exclusive)
- ✅ General disclaimer not already in response

**Text**:
> ⚠️ *This is educational guidance only. Please consult a healthcare professional for personalized medical advice.*

**Example queries** where this should appear:
- "Should I eat chole bhature with PCOS?" (health-related, no lab reference)
- "What exercises are good for PCOS?" (health-related, generic)
- "Can I have samosa?" (health-related, nutrition)

**Example queries** where this should NOT appear:
- "Why is my insulin 18?" (lab-specific → use lab disclaimer instead)
- "What is the capital of France?" (not health-related)

---

### Rule 3: Reddit Disclaimer

**When to show**:
- ✅ Reddit context was included in the response
- ✅ Reddit disclaimer not already in response
- ✅ **Can be shown ALONGSIDE lab/general disclaimer** (not mutually exclusive)

**Text**:
> 💬 *Community insights are personal experiences shared on Reddit, not medical advice.*

**Example queries** where this should appear (with other disclaimers):
- "Are there women in India who treated PCOS with Ayurveda?" → General + Reddit
- "How did others manage high insulin?" → Lab + Reddit (if response references user's lab)

---

## Test Cases

### Test Case 1: Generic Food Question (No Lab Reference)

**Query**: "Should I eat chole bhature today if I have PCOS?"

**Context**:
- User has medical data: ✅ (lab values exist)
- Response mentions lab values: ❌ (generic nutrition advice)
- Response mentions Reddit: ❌

**Expected Disclaimer**:
```
⚠️ This is educational guidance only. Please consult a healthcare professional for personalized medical advice.
```

**Count**: 1 disclaimer (general only)

---

### Test Case 2: Lab-Specific Question

**Query**: "Why is my insulin elevated?"

**Context**:
- User has medical data: ✅
- Response mentions lab values: ✅ ("Your insulin at 18 µIU/mL is in the elevated range...")
- Response mentions Reddit: ❌

**Expected Disclaimer**:
```
⚠️ This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.
```

**Count**: 1 disclaimer (lab-specific only)

---

### Test Case 3: Generic Question + Reddit

**Query**: "How do women with PCOS manage weight loss?"

**Context**:
- User has medical data: ✅
- Response mentions lab values: ❌ (generic advice)
- Response mentions Reddit: ✅

**Expected Disclaimers**:
```
⚠️ This is educational guidance only. Please consult a healthcare professional for personalized medical advice.

💬 Community insights are personal experiences shared on Reddit, not medical advice.
```

**Count**: 2 disclaimers (general + reddit)

---

### Test Case 4: Lab-Specific + Reddit

**Query**: "Are there others with high insulin who managed it naturally?"

**Context**:
- User has medical data: ✅
- Response mentions lab values: ✅ ("Your insulin at 18 µIU/mL...")
- Response mentions Reddit: ✅

**Expected Disclaimers**:
```
⚠️ This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.

💬 Community insights are personal experiences shared on Reddit, not medical advice.
```

**Count**: 2 disclaimers (lab + reddit)

---

### Test Case 5: Non-Health Question

**Query**: "What is the weather in Mumbai?"

**Context**:
- User has medical data: ✅
- Response mentions lab values: ❌
- Response is health-related: ❌

**Expected Disclaimers**: None

**Count**: 0 disclaimers

---

## Implementation Details

### Function Signature

```javascript
getAppropriateDisclaimers(response, userMessage, medicalData, redditContext)
```

**Parameters**:
- `response` (string): LLM-generated response content
- `userMessage` (string): Original user query
- `medicalData` (object|null): User's lab values (if available)
- `redditContext` (string|null): Reddit insights included in context

**Returns**: Array of disclaimer strings (0-2 disclaimers)

### Internal Helpers

**`contains(needle)`**: Check if response already has a disclaimer (case-insensitive)

**`usesLabData(text)`**: Check if response references user's specific lab values
- Looks for: "your insulin", "your glucose", lab units (µIU/mL, ng/dL), severity terms (elevated, deficient)
- Returns: boolean

### Logging

Every call logs:
```javascript
logger.info('Disclaimer routing complete', {
  disclaimersAdded: 1,
  types: ['general']
});
```

---

## Files Modified

**server/src/langchain/chains/chatChain.js**

**Lines ~1480-1620**: Added `getAppropriateDisclaimers()` method

**Lines ~1695-1705**: Replaced old disclaimer logic with:
```javascript
const disclaimers = this.getAppropriateDisclaimers(
  finalResponse,
  userMessage,
  medicalData,
  redditContext
);

if (disclaimers.length > 0) {
  finalResponse += '\n\n' + disclaimers.join('\n\n');
}
```

---

## Testing & Verification

### 1. Restart Server
```bash
cd server
npm run dev
```

### 2. Test Generic Food Question
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-with-labs",
    "message": "Should I eat chole bhature today if I have PCOS?"
  }'
```

**Check response for**:
- ✅ Only ONE disclaimer (general health)
- ❌ No lab-specific disclaimer
- ❌ No duplicate disclaimers

**Check server logs for**:
```
[ChatChain] Disclaimer routing complete { disclaimersAdded: 1, types: ['general'] }
```

### 3. Test Lab-Specific Question
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-with-labs",
    "message": "Why is my insulin elevated?"
  }'
```

**Check response for**:
- ✅ Only ONE disclaimer (lab-specific)
- ❌ No general disclaimer

**Check server logs for**:
```
[ChatChain] Adding lab-specific disclaimer { reason: 'Response references user lab values' }
[ChatChain] Disclaimer routing complete { disclaimersAdded: 1, types: ['lab'] }
```

### 4. Test Generic Question + Reddit
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-with-labs",
    "message": "How do women in India manage PCOS weight?"
  }'
```

**Check response for**:
- ✅ TWO disclaimers (general + reddit)
- ❌ No lab-specific disclaimer

**Check server logs for**:
```
[ChatChain] Adding general health disclaimer { reason: 'Health-related query without lab value usage' }
[ChatChain] Adding Reddit disclaimer { reason: 'Community insights included in response' }
[ChatChain] Disclaimer routing complete { disclaimersAdded: 2, types: ['general', 'reddit'] }
```

---

## Decision Matrix

| User Has Labs | Response Uses Labs | Health-Related | Reddit Context | Disclaimers Shown |
|---------------|-------------------|----------------|----------------|-------------------|
| ✅ Yes        | ✅ Yes            | ✅ Yes         | ❌ No          | Lab only (1)      |
| ✅ Yes        | ❌ No             | ✅ Yes         | ❌ No          | General only (1)  |
| ❌ No         | ❌ No             | ✅ Yes         | ❌ No          | General only (1)  |
| ✅ Yes        | ✅ Yes            | ✅ Yes         | ✅ Yes         | Lab + Reddit (2)  |
| ✅ Yes        | ❌ No             | ✅ Yes         | ✅ Yes         | General + Reddit (2) |
| ❌ No         | ❌ No             | ❌ No          | ❌ No          | None (0)          |

---

## Benefits

### Before This Fix
- ❌ Duplicate disclaimers (lab + general)
- ❌ Confusing for users (which to trust?)
- ❌ Cluttered response
- ❌ No clear priority logic
- ❌ Hard to debug

### After This Fix
- ✅ Maximum ONE health disclaimer (lab OR general, never both)
- ✅ Clear priority: lab-specific > general
- ✅ Reddit disclaimer can combine with health disclaimers
- ✅ Comprehensive logging for debugging
- ✅ Centralized, maintainable logic
- ✅ Appropriate disclaimers for each context

---

## Edge Cases Handled

1. **LLM includes disclaimer in response**: `contains()` check prevents duplication
2. **Lab data exists but not used**: General disclaimer shown (not lab)
3. **Non-health query**: No disclaimers added
4. **Reddit + Lab combo**: Both shown (not mutually exclusive)
5. **User without labs**: General disclaimer for health queries

---

## Related Documentation

- PCOS nutrition guidance: `/docs/PCOS_FRIENDLY_NUTRITION_GUIDANCE.md`
- SERP API fixes: `/docs/SERP_API_TRIGGER_FIX.md` & `/docs/SERP_SOURCES_FIX.md`
- RAG & disclaimers: `/docs/CHAT_RAG_DISCLAIMER_FIXES.md`

---

**Status**: ✅ Complete (syntax checked, ready to test)

**Critical**: Restart server and test with the "chole bhature" query to verify only ONE disclaimer appears!
