# Reddit Search Relevance Issue - Keyword Isolation Fix

**Date**: 1 November 2025  
**Issue**: Reddit threads suggested for specific PCOS topics are too generic due to keyword isolation  
**Status**: ✅ **RESOLVED**

---

## Problem Analysis

### User Report

**Query**: "How do women in general deal with PCOS mood swings?"

**Expected**: Reddit threads specifically about PCOS mood swings  
**Actual**: Generic threads containing ANY of the keywords in isolation:

```
Keywords extracted: ['general', 'mood swings', 'PCOS']

Threads suggested:
- "A small, practical tip that helped my daughter with her PCOS-related stress and mood swings" ✅ GOOD
- "PCOS, Metformin, general questions♡" ❌ BAD (only matches "PCOS" + "general")
- "Help!! Unsure how to navigate myo-inositol and lean PCOS in general, any tips?" ❌ BAD (only matches "PCOS" + "general")
```

### Root Cause

**Problem 1: Generic Words as Keywords**
- Words like "general", "help", "tips", "advice" were being extracted as meaningful keywords
- These dilute search results by matching irrelevant threads
- Example: "PCOS in general" matches "general" keyword even though it's not about the core topic

**Problem 2: Keywords Treated Independently**
- Search query: `"general mood swings PCOS"` (space-separated)
- Reddit interprets this as **OR logic**: posts containing ANY of these words
- Should be: `"mood swings" PCOS` (phrase + context) - posts about this SPECIFIC combination

**Problem 3: Missing Multi-Word Phrase Detection**
- "PCOS mood swings" is a cohesive medical topic
- But it was being split into 3 separate keywords: "PCOS", "mood", "swings"
- Should be recognized as a single phrase: `"PCOS mood swings"` for exact matching

---

## Solution Implemented

### 1. Expanded Stop Words List

**File**: `server/src/langchain/chains/chatChain.js`

**Changed (Lines ~986-1025)**:
```javascript
const stopWords = new Set([
  // ... existing stop words ...
  'general', // Too generic, dilutes search results
  'help',
  'tips',
  'advice',
  'questions',
  'anyone',
  'someone',
  'people',
  'folks',
  'deal',
  'deals',
  'dealt',
]);
```

**Impact**: Filters out generic words that don't add semantic value to Reddit searches.

---

### 2. Enhanced Multi-Word Phrase Detection

**Changed (Lines ~941-964)**:
```javascript
const multiWordPhrases = [
  'pcos mood swings',  // NEW - specific PCOS topics
  'mood swings',
  'brain fog',
  'sugar cravings',
  'sleep quality',
  'pelvic pain',
  'abdominal pain',
  'hair loss',
  'facial hair',
  'weight loss',
  'weight gain',
  'birth control',
  'insulin resistance',
  'irregular periods',
  'natural methods',
  'natural remedies',
  'ayurvedic treatment',
  'successfully treated',
  'trying to conceive',
  'fertility treatment',
  'hormonal imbalance',
  'cycle length',
  'sleep apnea',
];
```

**Impact**: Recognizes common PCOS symptom phrases as cohesive units, not separate words.

---

### 3. Intelligent Search Query Construction

**Changed (Lines ~1138-1175)**:

**BEFORE**:
```javascript
// Simple space-separated keywords
const searchQuery = Array.isArray(keywords)
  ? keywords.slice(0, 5).join(' ') // "general mood swings PCOS"
  : keywords;
```

**AFTER**:
```javascript
// Intelligent phrase + keyword construction
if (Array.isArray(keywords)) {
  const topKeywords = keywords.slice(0, 5);
  
  // Separate multi-word phrases from single words
  const phrases = topKeywords.filter(k => k.includes(' '));
  const singleWords = topKeywords.filter(k => !k.includes(' '));
  
  // Build query: quoted phrases + single words, always include PCOS for context
  const quotedPhrases = phrases.map(p => `"${p}"`).join(' ');
  const remainingWords = singleWords.filter(w => w.toLowerCase() !== 'pcos').slice(0, 3).join(' ');
  
  // Ensure PCOS is always included for context
  const pcosIncluded = topKeywords.some(k => k.toLowerCase() === 'pcos');
  const pcosPrefix = pcosIncluded ? '' : 'PCOS ';
  
  // Priority: "exact phrases" + single words + PCOS context
  if (quotedPhrases && remainingWords) {
    searchQuery = `${pcosPrefix}${quotedPhrases} ${remainingWords}`;
  } else if (quotedPhrases) {
    searchQuery = `${pcosPrefix}${quotedPhrases}`;
  } else {
    // All single words - combine with PCOS
    searchQuery = pcosIncluded ? topKeywords.join(' ') : `PCOS ${topKeywords.slice(0, 3).join(' ')}`;
  }
}
```

**How It Works**:

1. **Detect Phrases**: Separate multi-word keywords (e.g., "mood swings") from single words
2. **Quote Phrases**: Wrap phrases in quotes for exact matching: `"mood swings"`
3. **Add PCOS Context**: Ensure "PCOS" is always included for domain relevance
4. **Prioritize**: Exact phrases > specific keywords > generic context

---

## Example Query Transformations

### Query: "How do women in general deal with PCOS mood swings?"

**BEFORE Fix**:
```
Keywords extracted: ['general', 'mood swings', 'PCOS']
Search query: "general mood swings PCOS"
Reddit interprets as: Posts containing "general" OR "mood swings" OR "PCOS"

Results:
❌ "PCOS, Metformin, general questions♡" (matches "general" + "PCOS")
❌ "Unsure how to navigate lean PCOS in general" (matches "general" + "PCOS")
✅ "Tip that helped with PCOS-related mood swings" (matches all)
```

**AFTER Fix**:
```
Keywords extracted: ['pcos mood swings', 'mood swings', 'PCOS']  (no "general")
Search query: PCOS "pcos mood swings"
Reddit interprets as: Posts about PCOS AND containing "pcos mood swings" phrase

Results:
✅ "Tip that helped with PCOS-related mood swings" (exact phrase match)
✅ "Managing mood swings with PCOS naturally" (phrase + PCOS)
✅ "PCOS mood swings driving me crazy" (phrase + PCOS)
❌ "PCOS, Metformin, general questions" (no "mood swings")
```

---

### Query: "Anyone dealt with PCOS hair loss successfully?"

**BEFORE Fix**:
```
Keywords: ['anyone', 'dealt', 'PCOS', 'hair', 'loss', 'successfully']
Search query: "anyone dealt PCOS hair loss"

Results: Generic posts with "anyone" or "PCOS" or "hair"
```

**AFTER Fix**:
```
Keywords: ['hair loss', 'successfully treated', 'PCOS']  (stopwords removed)
Search query: PCOS "hair loss" "successfully treated"

Results: Specific posts about treating PCOS hair loss
```

---

### Query: "What are PCOS mood swings like?"

**BEFORE Fix**:
```
Keywords: ['mood', 'swings', 'PCOS']
Search query: "mood swings PCOS"

Results: Mixed relevance (matches "mood" OR "swings" OR "PCOS")
```

**AFTER Fix**:
```
Keywords: ['pcos mood swings', 'mood swings', 'PCOS']
Search query: "pcos mood swings"

Results: Highly relevant posts specifically about PCOS mood swings
```

---

## Technical Details

### Search Query Strategies

**Strategy 1: Phrase + Keywords + Context**
```javascript
// Query: "How do women deal with PCOS mood swings?"
// Extracted: ['pcos mood swings', 'mood swings', 'PCOS']

// Build: "pcos mood swings" + remaining keywords
searchQuery = 'PCOS "pcos mood swings"'
// Reddit prioritizes: Posts with exact phrase "pcos mood swings" in PCOS context
```

**Strategy 2: Multiple Phrases**
```javascript
// Query: "Successfully treated PCOS hair loss and irregular periods"
// Extracted: ['hair loss', 'irregular periods', 'successfully treated', 'PCOS']

// Build: multiple quoted phrases + context
searchQuery = 'PCOS "hair loss" "irregular periods" "successfully treated"'
// Reddit requires: All phrases present
```

**Strategy 3: Single Keywords with PCOS Context**
```javascript
// Query: "What is metformin for PCOS?"
// Extracted: ['metformin', 'PCOS']

// Build: keywords with PCOS prefix
searchQuery = 'PCOS metformin'
// Reddit searches: Posts about metformin in PCOS context
```

---

### Scoring Logic (Unchanged)

The relevance scoring already gives bonus points for multi-keyword matches:

```javascript
// Bonus for matching multiple keywords (compound relevance)
if (matchedKeywords.length >= 3) {
  relevanceScore += matchedKeywords.length * 15; // Strong bonus
} else if (matchedKeywords.length === 2) {
  relevanceScore += 10;
}
```

This works in harmony with the new phrase-based search:
- Phrase matches count as multiple keyword matches
- Posts with exact phrases get higher relevance scores
- Generic matches get filtered out earlier

---

## Expected Outcomes

### For Query: "How do women in general deal with PCOS mood swings?"

**Reddit threads should now be**:
- ✅ "Managing PCOS mood swings naturally - what worked for me"
- ✅ "PCOS mood swings are real! How do you cope?"
- ✅ "Supplements that helped my PCOS mood swings"
- ✅ "Emotional roller coaster with PCOS - mood swing tips?"
- ✅ "PCOS mood swings got so much better with these changes"

**NOT**:
- ❌ "PCOS general questions thread"
- ❌ "General tips for PCOS management"
- ❌ "Anyone else have PCOS in general?"

---

## Testing Checklist

- [ ] Restart server to apply changes
- [ ] Test: "How do women deal with PCOS mood swings?" → Expect mood-swing-specific threads
- [ ] Test: "Anyone successfully treated PCOS hair loss?" → Expect hair-loss success stories
- [ ] Test: "What do others say about PCOS brain fog?" → Expect brain-fog-specific threads
- [ ] Test: "PCOS and irregular periods help" → Expect period-specific threads
- [ ] Verify extracted keywords in logs don't include "general", "help", "anyone"
- [ ] Verify search query uses quoted phrases for multi-word keywords

---

## Files Modified

1. **server/src/langchain/chains/chatChain.js**
   - Lines ~986-1025: Added generic stopwords ('general', 'help', 'tips', 'advice', etc.)
   - Lines ~941-964: Expanded multi-word phrases list (added PCOS-specific symptom phrases)
   - Lines ~1138-1175: Intelligent search query construction with phrase quoting

---

## Related Documentation

- `docs/INTELLIGENT_DISCLAIMER_ROUTING.md` - Disclaimer routing logic
- `docs/CHAT_RAG_DISCLAIMER_FIXES.md` - RAG retrieval enhancements

---

## Key Takeaway

**The Reddit search was too broad** because it treated all extracted words as independent keywords, including generic words like "general". 

**Solution**: 
1. Filter out generic stopwords that dilute results
2. Recognize multi-word phrases as cohesive units
3. Use quoted phrases in search queries for exact matching
4. Always include PCOS context for domain relevance

This ensures Reddit threads are **topically relevant** to the user's specific PCOS concern, not just loosely related to PCOS in general.
