# PROMPT LENGTH EXPLOSION - CRITICAL ANALYSIS

**Date**: 2025-01-11  
**Issue**: Prompt length exploded to 267,410 characters (267KB) - 3x larger than expected  
**Impact**: Token wastage, slow generation, potential context overflow  
**Status**: 🚨 **CRITICAL BUG**

---

## 📊 **Prompt Breakdown Analysis**

### Current Prompt Composition (267KB total)

| Component | Expected Size | Actual Size | Status |
|-----------|--------------|-------------|---------|
| **System Instructions** | 20-30KB | ~30KB | ✅ OK |
| **Meal Templates (40 meals)** | 15-20KB (compressed) | ~15KB | ✅ OK |
| **Symptom Guidance (6 docs)** | 5-10KB | ~8KB | ✅ OK |
| **Lab Guidance (2 docs)** | 3-5KB | ~4KB | ✅ OK |
| **Ingredient Substitutes (116 docs)** | 15-20KB | **~200KB** | ❌ **CRITICAL!** |
| **Nutrition Guidelines (5 docs)** | 5-10KB | ~10KB | ✅ OK |

**Problem**: Ingredient substitutes are consuming **200KB** (75% of total prompt)!

---

## 🔍 **Root Cause Analysis**

### Where Did 116 Substitute Docs Come From?

Based on logs, the breakdown is:

#### **Stage 4: PCOS Ingredient Substitutes** (~40 docs)
```log
[INFO] Found 13 PCOS-problematic ingredients: sugar, cream, sweetened, packaged, maida, refined flour, refined, white rice, polished rice, jaggery, potato, white bread, kachori
[INFO]   Querying PCOS substitute: "sugar PCOS substitute alternative vegan Northeast India weight-gain hair-loss"
[INFO]   Querying PCOS substitute: "cream PCOS substitute alternative vegan Northeast India weight-gain hair-loss"
... (5 queries shown in logs)
[INFO] Total substitute docs: 40
```

**Analysis**: 
- 5 problematic ingredients × topK=3 = 15 docs
- 2 priority substitutes × topK=2 = 4 docs
- **Actual: 40 docs** (more queries than expected!)

#### **Stage 5: Keto Substitutes** (58 docs)
```log
[INFO] Stage 5: Retrieving KETO substitutes (isKeto=true)
[INFO]   Querying keto substitutes: "vegan keto protein substitutes tofu tempeh nuts seeds Northeast India"
[INFO]   Querying keto substitutes: "vegan keto dairy substitute coconut almond milk Northeast India"
[INFO]   Querying keto substitutes: "plant-based keto high fat low carb Northeast India coconut oil"
[INFO]   Querying keto substitutes: "keto substitutes grain alternatives cauliflower rice almond flour"
[INFO]   Querying keto substitutes: "sugar substitute keto stevia erythritol vegan"
[INFO] Total keto substitute docs retrieved: 58
```

**Analysis**: 
- Vegan keto mode: 5 queries configured
- Each query: topK=5 docs
- **Expected: 5 × 5 = 25 docs**
- **Actual: 58 docs** (some queries retrieving more than topK!)

#### **Stage 6: Allergy Substitutes** (~65 docs)
```log
[INFO] Stage 6: Retrieving allergy substitutes for 5 restrictions
[INFO]   Querying allergy substitutes for: "gluten"
[INFO]   Querying allergy substitutes for: "eggs"
[INFO]   Querying allergy substitutes for: "dairy"
[INFO]   Querying allergy substitutes for: "eggs"  // ❌ DUPLICATE!
[WARN]   Skipping unsupported allergy: "honey"
[INFO] Total allergy substitute docs retrieved: 116
```

**Analysis**:
- **Gluten**: 3 queries × 5 docs = 15 docs
- **Eggs (first)**: 3 queries × 5 docs = 15 docs
- **Dairy**: 4 queries × 5 docs = 20 docs
- **Eggs (second)**: 3 queries × 5 docs = 15 docs ❌ **DUPLICATE!**
- **Total: 65 docs**

**CRITICAL BUG**: `restrictions: ['gluten', 'eggs', 'dairy', 'eggs', 'honey']`
- **"eggs" appears TWICE** in the restrictions array!
- This causes 30 unnecessary docs to be retrieved

---

## 🚨 **Critical Issues Identified**

### 1. **Duplicate Restrictions** (CRITICAL)
**Problem**: User has `['gluten', 'eggs', 'dairy', 'eggs', 'honey']`
- "eggs" appears twice → 2× retrieval (30 extra docs)

**Solution**: Deduplicate restrictions array before processing
```javascript
const uniqueRestrictions = [...new Set(restrictions)]; // ['gluten', 'eggs', 'dairy', 'honey']
```

### 2. **Too Many Queries Per Category** (HIGH)
**Problem**: 
- Allergy queries: 3-4 queries per allergy × 4 allergies = 12-16 queries
- Keto queries: 5 queries
- PCOS queries: 5+ queries
- **Total: 20+ RAG queries just for substitutes!**

**Solution**: Reduce query count
```javascript
// BEFORE (dairy = 4 queries)
const allergyQueries = {
  dairy: [
    'dairy-free milk substitute coconut almond',
    'paneer substitute tofu tempeh dairy-free',
    'dairy-free yogurt coconut cashew',
    'ghee substitute coconut oil vegan',
  ],
  // ...
};

// AFTER (dairy = 2 queries)
const allergyQueries = {
  dairy: [
    'dairy-free milk paneer ghee substitute vegan coconut tofu',
    'dairy allergy alternatives Indian cuisine',
  ],
  // ...
};
```

### 3. **High topK Values** (MEDIUM)
**Problem**: 
- Most queries use topK=5
- Some use topK=3
- With 20+ queries, this accumulates to 100+ docs

**Solution**: Reduce topK based on diet complexity
```javascript
// Jain/Vegan/Keto combo = complex → reduce topK
const topK = (dietType === 'jain' || isVeganKeto) ? 2 : 3;
```

### 4. **No Deduplication of Substitute Docs** (HIGH)
**Problem**: Same substitute doc can be retrieved multiple times from different queries

**Example**:
- Query 1: "sugar substitute keto stevia" → Returns "stevia_guide.txt"
- Query 2: "keto sugar alternatives" → Returns "stevia_guide.txt" again
- **Result**: Duplicate content in prompt!

**Solution**: Deduplicate substitute docs by content hash or ID
```javascript
const uniqueSubstitutes = this.deduplicateDocuments(retrievalResults.ingredientSubstitutes);
```

### 5. **Full PageContent Inclusion** (CRITICAL)
**Problem**: Line 444 concatenates ALL 116 docs with FULL content
```javascript
const substituteContext = ingredientSubstituteDocs
  .map((doc) => doc.pageContent || doc.content)  // ❌ FULL CONTENT
  .join('\n\n');
```

**Solution**: Truncate or summarize substitute docs
```javascript
const substituteContext = ingredientSubstituteDocs
  .map((doc) => {
    const content = doc.pageContent || doc.content;
    // Truncate to first 500 characters or extract only key substitution rules
    return content.substring(0, 500) + (content.length > 500 ? '...' : '');
  })
  .join('\n\n');
```

---

## 📏 **Expected vs Actual Retrieval**

| Stage | Category | Queries | TopK | Expected Docs | Actual Docs | Bloat |
|-------|----------|---------|------|---------------|-------------|-------|
| 4 | PCOS Substitutes | 5 | 3 | 15 | 40 | +167% |
| 5 | Keto Substitutes | 5 | 5 | 25 | 58 | +132% |
| 6 | Gluten | 3 | 5 | 15 | ~15 | 0% |
| 6 | Eggs (1st) | 3 | 5 | 15 | ~15 | 0% |
| 6 | Dairy | 4 | 5 | 20 | ~20 | 0% |
| 6 | Eggs (2nd) ❌ | 3 | 5 | 0 | ~15 | **+∞%** |
| **TOTAL** | | **23** | | **90** | **163** | **+81%** |

**Note**: Logs show 116 total, but breakdown suggests ~163 before deduplication. System may have some internal dedup.

---

## 🔧 **Immediate Fixes Required**

### Priority 1: Deduplicate Restrictions (5 min fix)
**File**: `server/src/langchain/chains/mealPlanChain.js` ~line 1850
```javascript
// BEFORE
if (restrictions && restrictions.length > 0) {
  logger.info(`Stage 6: Retrieving allergy substitutes for ${restrictions.length} restrictions`);
  
  for (const restriction of restrictions) {
    // Process each restriction...
  }
}

// AFTER
if (restrictions && restrictions.length > 0) {
  // ⚡ OPTIMIZATION: Remove duplicates
  const uniqueRestrictions = [...new Set(restrictions)];
  logger.info(`Stage 6: Retrieving allergy substitutes for ${uniqueRestrictions.length} unique restrictions (original: ${restrictions.length})`);
  
  for (const restriction of uniqueRestrictions) {
    // Process each restriction...
  }
}
```

**Impact**: Reduces 116 → 101 docs (-13%)

---

### Priority 2: Reduce Allergy Queries (10 min fix)
**File**: `server/src/langchain/chains/mealPlanChain.js` ~line 1870
```javascript
// BEFORE (4 queries per allergy)
const allergyQueries = {
  dairy: [
    'dairy-free milk substitute coconut almond',
    'paneer substitute tofu tempeh dairy-free',
    'dairy-free yogurt coconut cashew',
    'ghee substitute coconut oil vegan',
  ],
  gluten: [
    'gluten-free flour besan ragi jowar',
    'gluten-free roti millet alternatives',
    'celiac disease gluten substitute',
  ],
  nuts: [
    'nut-free substitutes seeds sunflower pumpkin',
    'nut allergy nut-free fat sources',
    'nut-free protein sources seeds',
  ],
  eggs: [
    'egg substitute flax chia egg-free',
    'egg-free binding baking alternatives',
    'egg allergy protein substitute',
  ],
};

// AFTER (2 queries per allergy)
const allergyQueries = {
  dairy: [
    'dairy-free milk paneer ghee yogurt substitute coconut tofu almond',
    'dairy allergy vegan alternatives Indian cuisine PCOS',
  ],
  gluten: [
    'gluten-free flour roti bread besan ragi jowar millet',
    'celiac gluten allergy substitute alternatives',
  ],
  nuts: [
    'nut-free substitutes seeds sunflower pumpkin protein fat',
    'nut allergy safe alternatives PCOS',
  ],
  eggs: [
    'egg substitute flax chia binding vegan baking',
    'egg allergy protein alternatives PCOS',
  ],
};
```

**Impact**: Reduces 12-16 queries → 8 queries, saves ~20-30 docs

---

### Priority 3: Reduce Keto Queries (10 min fix)
**File**: `server/src/langchain/chains/mealPlanChain.js` ~line 1750
```javascript
// BEFORE (5 queries for vegan keto)
ketoSubstituteQueries = [
  `vegan keto protein substitutes tofu tempeh nuts seeds ${regionContext}`,
  `vegan keto dairy substitute coconut almond milk ${regionContext} ${budgetContext}`,
  `plant-based keto high fat low carb ${regionContext} coconut oil`,
  `keto substitutes grain alternatives cauliflower rice almond flour ${budgetContext}`,
  `sugar substitute keto stevia erythritol vegan ${budgetContext}`,
];

// AFTER (3 queries for vegan keto)
ketoSubstituteQueries = [
  `vegan keto protein tofu tempeh nuts seeds dairy coconut ${regionContext}`,
  `vegan keto grains cauliflower rice almond flour coconut ${budgetContext}`,
  `keto sugar substitute stevia erythritol monk fruit ${budgetContext}`,
];
```

**Impact**: Reduces 5 queries → 3 queries, saves ~10 docs

---

### Priority 4: Add Document Deduplication (15 min fix)
**File**: `server/src/langchain/chains/mealPlanChain.js` ~line 1900
```javascript
// After all stages, deduplicate before adding to context
logger.info(`Total substitute docs before deduplication: ${retrievalResults.ingredientSubstitutes.length}`);

// Deduplicate by content hash
const seenHashes = new Set();
retrievalResults.ingredientSubstitutes = retrievalResults.ingredientSubstitutes.filter((doc) => {
  const content = doc.pageContent || doc.content || '';
  const hash = content.substring(0, 100); // Simple hash: first 100 chars
  
  if (seenHashes.has(hash)) {
    return false; // Duplicate
  }
  
  seenHashes.add(hash);
  return true;
});

logger.info(`Total substitute docs after deduplication: ${retrievalResults.ingredientSubstitutes.length}`);
```

**Impact**: Reduces duplicates by ~10-20%

---

### Priority 5: Truncate Substitute Content (20 min fix)
**File**: `server/src/langchain/chains/mealPlanChain.js` ~line 444
```javascript
// BEFORE
const substituteContext = ingredientSubstituteDocs
  .map((doc) => doc.pageContent || doc.content)
  .join('\n\n');

// AFTER
const substituteContext = ingredientSubstituteDocs
  .map((doc) => {
    const content = doc.pageContent || doc.content || '';
    
    // Extract only the most relevant part (first 800 chars)
    // Most substitute docs have the key info in the first section
    const truncated = content.substring(0, 800);
    
    // If truncated, add marker
    return truncated + (content.length > 800 ? '\n[... additional details omitted for brevity ...]' : '');
  })
  .join('\n\n');

logger.info(`💾 Compressed ${ingredientSubstituteDocs.length} substitute docs (saved ~${Math.round((ingredientSubstituteDocs.length * 1200) / 1000)}KB)`);
```

**Impact**: Reduces substitute section from ~200KB → ~80KB (-60%)

---

## 📊 **Expected Results After Fixes**

| Metric | Before | After Fix 1-5 | Improvement |
|--------|--------|---------------|-------------|
| **Total Substitute Docs** | 116 | ~60 | **-48%** |
| **Substitute Section Size** | 200KB | 60KB | **-70%** |
| **Total Prompt Size** | 267KB | 127KB | **-52%** |
| **LLM Cost** | High | Medium | **-50%** |
| **Generation Speed** | Slow | Fast | **+100%** |

---

## 🎯 **Recommended Implementation Order**

1. **Fix 1 (5 min)**: Deduplicate restrictions array → Immediate -13% reduction
2. **Fix 4 (15 min)**: Add document deduplication → -10-20% reduction
3. **Fix 5 (20 min)**: Truncate substitute content → -60% size reduction
4. **Fix 2 (10 min)**: Reduce allergy queries → -20-30 docs
5. **Fix 3 (10 min)**: Reduce keto queries → -10 docs

**Total time**: 60 minutes  
**Expected result**: Prompt size reduced from 267KB → 100-120KB

---

## ⚠️ **Additional Issues Found**

### Cuisine Validation Failures
```log
[ERROR] [CuisineValidation] 🚨 CUISINE VALIDATION FAILED: 2 meals from WRONG cuisines!
  violations: [
    'Day 2 breakfast: Coconut Flour Dosa with Spinach (Tripuri Keto) - Contains south-indian dish (forbidden)',
    'Day 3 breakfast: Cauliflower Upma (Tripuri Keto) - Contains south-indian dish (forbidden)'
  ]
```

**Problem**: Keto contradiction fix (lines 2604-2618) didn't fully work. LLM still creating South Indian dishes for Naga/Tripuri cuisines.

**Root Cause**: Keto substitute docs likely contain "Coconut Flour Dosa" and "Cauliflower Upma" as examples, and LLM is still treating them as valid meal options despite warnings.

### Allergen Filtering Bug
```log
[ERROR] [MultiStageRetrieval] 🚨 CRITICAL BUG: ALLERGEN VALIDATION FAILED IN STAGE 1! Found 13 meals with allergens
  message: 'This indicates a bug in the Stage 1 allergen filtering logic. Removing meals as fallback.'
```

**Problem**: Stage 1 allergen filtering is not working correctly. Meals with eggs/gluten/dairy are getting through to the LLM.

**Impact**: LLM receives 13 meals it shouldn't, wastes context, may generate invalid meals.

---

## 📝 **Summary**

**Root Causes**:
1. ❌ Duplicate restrictions in user data ("eggs" twice)
2. ❌ Too many RAG queries per category (3-4 queries × 4 allergies = 12-16 queries)
3. ❌ High topK values (5 docs per query)
4. ❌ No deduplication of substitute documents
5. ❌ Full pageContent inclusion (no truncation)

**Recommended Fixes**:
1. ✅ Deduplicate restrictions array
2. ✅ Reduce queries: 3-4 → 2 per allergy
3. ✅ Add document deduplication
4. ✅ Truncate substitute content to 800 chars max
5. ✅ Reduce keto queries: 5 → 3

**Expected Impact**: **267KB → 100-120KB** (53% reduction)

**Status**: Ready for implementation

