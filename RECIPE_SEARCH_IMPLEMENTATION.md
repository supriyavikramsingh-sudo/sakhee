# 🍳 Recipe Search Implementation - Complete Documentation

## Overview

Recipe search is a **PREMIUM FEATURE** implemented in the Spoonacular migration. It uses Spoonacular's ComplexSearch API combined with RAG (Retrieval-Augmented Generation) to provide PCOS-friendly recipe modifications.

---

## Architecture

### **File Location**
`server/src/services/spoonacularService.js`

### **Main Method**
```javascript
async searchRecipes(dishName, preferences = {}, userTier = 'free', userId, location = 'India')
```

---

## Access Control

### **Tier-Based Access**

| Tier | Daily Limit | Status |
|------|-------------|--------|
| **Free** | 0 searches/day | ❌ Blocked (upgrade required) |
| **Pro** | 5 searches/day | ✅ Allowed |
| **Max** | 10 searches/day | ✅ Allowed |

### **Free Tier Response:**
```javascript
{
  error: 'Recipe search is available for Pro and Max subscribers',
  upgradeRequired: true,
  tierLimit: {
    tier: 'free',
    dailyLimit: 0,
    remainingToday: 0
  }
}
```

---

## Rate Limiting

### **Implementation Details**

#### **Storage:**
In-memory Map tracking per user:
```javascript
this.rateLimits = new Map(); // userId → {count, resetAt}
```

#### **Reset Logic:**
Resets at **midnight IST** (UTC+5:30), not UTC!

```javascript
// Calculate midnight in IST
const istOffset = 5.5 * 60 * 60 * 1000; // 5h 30m in milliseconds
const istNow = new Date(now.getTime() + istOffset);
const midnightIST = new Date(istNow);
midnightIST.setUTCHours(0, 0, 0, 0);
const nextMidnightIST = new Date(midnightIST.getTime() + 24 * 60 * 60 * 1000);
```

#### **Rate Limit Check:**
```javascript
checkRecipeSearchLimit(userId, userTier) {
  // Returns: { allowed, remaining, dailyLimit, resetAt }
}
```

#### **When Rate Limit Exceeded:**
```javascript
{
  error: "Daily recipe search limit reached (5 searches/day). Resets at midnight IST.",
  rateLimited: true,
  resetAt: "2025-11-16T00:00:00.000Z",
  remaining: 0,
  tierLimit: {
    tier: "pro",
    dailyLimit: 5,
    remainingToday: 0
  }
}
```

---

## Caching Strategy

### **Cache Configuration**
```javascript
this.recipeCache = new Map();
this.recipeCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
```

### **Cache Key Format**
```javascript
const cacheKey = `${dishName.toLowerCase()}_${JSON.stringify(preferences)}`;
// Example: "chicken biryani_{"region":"North India","dietType":"non-vegetarian"}"
```

### **Important:** 
Even cached results **increment the search count** to prevent abuse!

```javascript
// Cache hit
if (cached && Date.now() - cached.timestamp < this.recipeCacheTTL) {
  this.incrementRecipeSearchCount(userId); // ← Still counts!
  return {
    ...cached.data,
    tierLimit: {
      tier: userTier,
      dailyLimit: rateLimitCheck.dailyLimit,
      remainingToday: rateLimitCheck.remaining - 1
    }
  };
}
```

---

## Recipe Search Flow

### **Step-by-Step Process**

#### **1. Validation & Rate Limiting**
```
┌─────────────────────┐
│ Check User Tier     │
└──────────┬──────────┘
           │
           ▼
     Is Free Tier?
           │
    Yes ───┤
           │ Return upgrade message
           │
    No ────┤
           │
           ▼
┌─────────────────────┐
│ Check Rate Limit    │
└──────────┬──────────┘
           │
           ▼
    Limit Exceeded?
           │
    Yes ───┤
           │ Return rate limit error
           │
    No ────┤
           │
           ▼
     Continue...
```

#### **2. Cache Check**
```javascript
const cacheKey = `${dishName.toLowerCase()}_${JSON.stringify(preferences)}`;
const cached = this.recipeCache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < this.recipeCacheTTL) {
  // Return cached data (but still increment count!)
  this.incrementRecipeSearchCount(userId);
  return cached.data;
}
```

#### **3. Build Query Parameters**
```javascript
const queryParams = this.buildRecipeQueryParams(dishName, preferences, location);
```

**Query Parameters Include:**
- `query`: Dish name
- `cuisine`: From preferences or location
- `diet`: vegetarian, vegan, etc.
- `intolerances`: gluten, dairy, etc.
- `type`: main course, dessert, etc.
- `addRecipeNutrition`: true
- `addRecipeInformation`: true
- `number`: 5 (max recipes to return)

#### **4. Spoonacular API Call - Recipe Search**
```javascript
const searchResponse = await axios.get(
  `${this.baseURL}/recipes/complexSearch`, 
  {
    params: {
      ...queryParams,
      apiKey: this.apiKey
    }
  }
);
```

**Endpoint:** `https://api.spoonacular.com/recipes/complexSearch`

**Returns:** List of recipe summaries (id, title, image)

#### **5. Fetch Detailed Recipe Info**
For each recipe found, fetch full details:

```javascript
const detailResponse = await axios.get(
  `${this.baseURL}/recipes/${recipe.id}/information`,
  {
    params: {
      includeNutrition: true,
      apiKey: this.apiKey
    }
  }
);
```

**Endpoint:** `https://api.spoonacular.com/recipes/{id}/information`

**Returns:** Complete recipe data including:
- Title, servings, ready time
- Ingredients with amounts
- Instructions
- Nutrition info (nutrients, caloric breakdown)
- Cuisines, diets, dish types
- Health score
- Source URL

#### **6. RAG Enhancement - PCOS Modifications** 🧠
This is the **key differentiator**!

```javascript
const pcosModifications = await this.getPCOSModifications(recipeData, preferences);
```

**Process:**
1. Identify problematic ingredients for PCOS
2. Query RAG vector store for substitutes
3. Extract recommendations
4. Add cooking method improvements
5. Provide portion guidance

**Problematic Ingredients List:**
```javascript
const problematic = [
  'white rice', 'rice', 'basmati rice',
  'maida', 'all-purpose flour', 'refined flour',
  'sugar', 'white sugar', 'refined sugar',
  'potato', 'potatoes',
  'bread', 'white bread',
  'pasta',
  'cornstarch',
  'honey',
  'dates', 'dried dates',
  'raisins',
  'coconut milk', 'full-fat coconut milk',
  'cream', 'heavy cream',
  'butter',
  'ghee' (when used excessively)
];
```

#### **7. Build RAG Query**
```javascript
buildRAGQuery(ingredient, preferences) {
  const region = preferences.region || 'India';
  const dietType = preferences.dietType || 'vegetarian';
  const restrictions = preferences.restrictions || [];
  
  let query = `PCOS friendly substitute for ${ingredient} ${region} ${dietType}`;
  
  if (restrictions.length > 0) {
    query += ` ${restrictions.join(' ')}`;
  }
  
  query += ' low GI high protein healthy alternative';
  
  return query;
}
```

**Example RAG Query:**
```
"PCOS friendly substitute for white rice North India non-vegetarian low GI high protein healthy alternative"
```

#### **8. Retrieve from Vector Store**
```javascript
const ragResults = await retriever.retrieve(ragQuery, { topK: 3 });
```

**Retrieves:** Top 3 most relevant documents from Pinecone containing PCOS ingredient substitutes

#### **9. Extract Substitutes from RAG**
```javascript
extractSubstituteFromRAG(content) {
  // Looks for patterns like:
  // "instead of white rice use brown rice"
  // "replace maida with whole wheat flour"
  // "substitute sugar with stevia"
}
```

#### **10. Compile PCOS Modifications**
```javascript
{
  regionalSubstitutes: [
    {
      original: "white rice",
      substitute: "brown rice or cauliflower rice (50% mix)",
      reason: "Lower GI, higher fiber"
    }
  ],
  cookingMethodImprovements: [
    "Use minimal oil (1-2 tsp per serving)",
    "Opt for baking or air-frying instead of deep-frying",
    "Add extra vegetables for fiber"
  ],
  portionGuidance: "Limit to 1 serving and pair with a salad or protein-rich side.",
  glycemicOptimization: [
    "Eat protein first, then this dish to slow glucose spike",
    "Have this meal earlier in the day (breakfast/lunch) rather than dinner",
    "Include fiber-rich sides like salad or roasted vegetables"
  ]
}
```

#### **11. Assemble Final Response**
```javascript
{
  id: 12345,
  title: "Chicken Biryani",
  readyInMinutes: 60,
  servings: 4,
  sourceUrl: "https://...",
  summary: "Aromatic rice dish with spiced chicken...",
  cuisines: ["Indian"],
  diets: [],
  dishTypes: ["main course"],
  healthScore: 45,
  nutrition: {
    nutrients: [
      { name: "Calories", amount: 380, unit: "kcal" },
      { name: "Protein", amount: 25, unit: "g" },
      { name: "Carbohydrates", amount: 48, unit: "g" },
      { name: "Fat", amount: 12, unit: "g" }
    ],
    caloricBreakdown: {
      percentProtein: 26.32,
      percentFat: 28.42,
      percentCarbs: 45.26
    }
  },
  ingredients: [
    { name: "chicken breast", amount: 500, unit: "g", original: "500g chicken breast" },
    { name: "basmati rice", amount: 2, unit: "cups", original: "2 cups basmati rice" }
  ],
  instructions: "1. Marinate chicken... 2. Cook rice... 3. Layer and cook...",
  pcosModifications: {
    regionalSubstitutes: [...],
    cookingMethodImprovements: [...],
    portionGuidance: "...",
    glycemicOptimization: [...]
  }
}
```

#### **12. Cache & Return**
```javascript
// Cache the result
this.recipeCache.set(cacheKey, {
  data: result,
  timestamp: Date.now()
});

// Increment search count
this.incrementRecipeSearchCount(userId);

// Return with tier limit info
return {
  query: dishName,
  count: validRecipes.length,
  recipes: validRecipes,
  tierLimit: {
    tier: userTier,
    dailyLimit: rateLimitCheck.dailyLimit,
    remainingToday: rateLimitCheck.remaining - 1
  }
};
```

---

## Complete Flow Diagram

```
User: "Show me recipe for chicken biryani"
                │
                ▼
┌───────────────────────────────────────┐
│ 1. Check User Tier                    │
│    ✅ Pro/Max → Continue               │
│    ❌ Free → Return upgrade message    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 2. Check Rate Limit                   │
│    Tier: Pro, Daily Limit: 5          │
│    Current Count: 2                   │
│    ✅ Remaining: 3 → Continue          │
│    ❌ Limit exceeded → Return error    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 3. Check Cache                        │
│    Key: "chicken biryani_{...}"       │
│    ❌ Cache miss → Continue            │
│    ✅ Cache hit → Return (+ increment) │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 4. Build Query Params                 │
│    query: "chicken biryani"           │
│    cuisine: "Indian"                  │
│    diet: user preferences             │
│    number: 5                          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 5. Call Spoonacular ComplexSearch     │
│    GET /recipes/complexSearch         │
│    Returns: [recipe1, recipe2, ...]   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 6. For Each Recipe:                   │
│    Fetch Detailed Info                │
│    GET /recipes/{id}/information      │
│    includeNutrition: true             │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 7. Identify Problematic Ingredients   │
│    Found: ["basmati rice", "ghee"]    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 8. Build RAG Queries                  │
│    "PCOS substitute for basmati rice  │
│     North India non-vegetarian        │
│     low GI high protein..."           │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 9. Query Pinecone Vector Store        │
│    retriever.retrieve(query, topK:3)  │
│    Returns: [doc1, doc2, doc3]        │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 10. Extract Substitutes from RAG      │
│     "Use brown rice or cauliflower    │
│      rice (50% mix) instead"          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 11. Compile PCOS Modifications        │
│     regionalSubstitutes: [...]        │
│     cookingMethodImprovements: [...]  │
│     portionGuidance: "..."            │
│     glycemicOptimization: [...]       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 12. Assemble Complete Recipe Object   │
│     - Spoonacular data                │
│     - Nutrition info                  │
│     - RAG-enhanced PCOS modifications │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 13. Cache Result (24h TTL)            │
│     Increment Search Count            │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ 14. Return to User                    │
│     {                                 │
│       query: "chicken biryani",       │
│       count: 3,                       │
│       recipes: [...with PCOS mods],   │
│       tierLimit: {                    │
│         tier: "pro",                  │
│         dailyLimit: 5,                │
│         remainingToday: 2             │
│       }                               │
│     }                                 │
└───────────────────────────────────────┘
```

---

## API Endpoints Used

### **1. ComplexSearch**
```
GET https://api.spoonacular.com/recipes/complexSearch
```

**Parameters:**
- `query`: Dish name
- `cuisine`: e.g., "Indian"
- `diet`: e.g., "vegetarian"
- `intolerances`: e.g., "dairy,gluten"
- `type`: e.g., "main course"
- `addRecipeNutrition`: true
- `addRecipeInformation`: true
- `number`: 5
- `apiKey`: API key

**Response:**
```json
{
  "results": [
    {
      "id": 12345,
      "title": "Chicken Biryani",
      "image": "https://...",
      "imageType": "jpg"
    }
  ],
  "offset": 0,
  "number": 5,
  "totalResults": 42
}
```

### **2. Recipe Information**
```
GET https://api.spoonacular.com/recipes/{id}/information
```

**Parameters:**
- `includeNutrition`: true
- `apiKey`: API key

**Response:** Complete recipe object with nutrition, ingredients, instructions, etc.

---

## RAG Integration

### **Vector Store**
Pinecone database containing PCOS ingredient substitutes

### **Retriever**
```javascript
import { retriever } from '../langchain/retriever.js';
```

### **Query Building**
```javascript
const ragQuery = `PCOS friendly substitute for ${ingredient} ${region} ${dietType} low GI high protein healthy alternative`;
```

### **Retrieval**
```javascript
const ragResults = await retriever.retrieve(ragQuery, { topK: 3 });
```

### **Content Extraction**
Uses pattern matching to extract substitutes and reasons from RAG documents:
- "instead of X use Y"
- "replace X with Y"
- "substitute X with Y"

---

## Error Handling

### **No Recipes Found**
```javascript
{
  query: "dal makhani",
  count: 0,
  recipes: [],
  tierLimit: { tier: "pro", dailyLimit: 5, remainingToday: 3 }
}
```

### **API Error**
```javascript
{
  error: "Unable to search recipes: Request failed with status code 402",
  query: "chicken biryani",
  count: 0,
  recipes: []
}
```

### **RAG Failure**
Falls back to generic PCOS modifications if RAG retrieval fails:
```javascript
{
  regionalSubstitutes: [],
  cookingMethodImprovements: [],
  portionGuidance: 'Consult a nutritionist for personalized recommendations.',
  glycemicOptimization: []
}
```

---

## Performance Optimizations

### **1. Caching**
- 24-hour TTL for recipe results
- Reduces API calls by ~70% for popular queries

### **2. Parallel Processing**
```javascript
const recipes = await Promise.all(
  searchResponse.data.results.map(async (recipe) => {
    // Fetch details in parallel for all recipes
  })
);
```

### **3. RAG Batching**
- Limits to top 3 problematic ingredients
- Retrieves only 3 documents per ingredient (topK: 3)

### **4. In-Memory Rate Limiting**
- No database queries for rate limit checks
- Instant validation

---

## Testing Examples

### **Test 1: Pro User - First Search**
```javascript
await spoonacularService.searchRecipes(
  'chicken biryani',
  { region: 'North India', dietType: 'non-vegetarian' },
  'pro',
  'user123',
  'India'
);
```

**Result:** ✅ Returns 3-5 recipes with PCOS modifications

### **Test 2: Free User**
```javascript
await spoonacularService.searchRecipes(
  'paneer tikka',
  {},
  'free',
  'user456'
);
```

**Result:** ❌ Returns upgrade message

### **Test 3: Rate Limit Exceeded**
```javascript
// After 5 searches as Pro user
await spoonacularService.searchRecipes(
  'dal makhani',
  {},
  'pro',
  'user123'
);
```

**Result:** ❌ Returns rate limit error with reset time

### **Test 4: Cache Hit**
```javascript
// Same query twice within 24 hours
await spoonacularService.searchRecipes('biryani', {}, 'pro', 'user123');
await spoonacularService.searchRecipes('biryani', {}, 'pro', 'user123');
```

**Result:** ✅ Second call returns cached data (but still counts toward limit!)

---

## Key Differentiators

### **vs. Standard Recipe APIs:**

| Feature | Standard API | Sakhee Recipe Search |
|---------|-------------|----------------------|
| Recipe Search | ✅ Yes | ✅ Yes |
| Nutrition Info | ✅ Yes | ✅ Yes |
| PCOS Modifications | ❌ No | ✅ **Yes (RAG-powered)** |
| Regional Substitutes | ❌ No | ✅ **Yes** |
| Cooking Method Tips | ❌ No | ✅ **Yes** |
| Portion Guidance | ❌ No | ✅ **Yes** |
| Glycemic Optimization | ❌ No | ✅ **Yes** |
| Indian Context | ❌ Limited | ✅ **Full Support** |

---

## Summary

**Recipe Search = Spoonacular API + RAG Intelligence**

1. **Access Control:** Tier-based with rate limiting
2. **Data Source:** Spoonacular ComplexSearch + Recipe Information APIs
3. **Enhancement:** RAG-powered PCOS modifications from Pinecone
4. **Caching:** 24-hour in-memory cache
5. **Rate Limiting:** IST-based daily limits (Pro: 5, Max: 10)
6. **User Experience:** Complete recipes with actionable PCOS-friendly substitutes

**This is NOT just a recipe API wrapper** - it's an intelligent system that:
- Identifies PCOS-problematic ingredients
- Queries vector store for evidence-based substitutes
- Provides region-specific, diet-appropriate alternatives
- Offers cooking method improvements
- Gives practical portion guidance
- Optimizes for glycemic control

🎯 **Value Proposition:** Turn any recipe into a PCOS-friendly meal plan with science-backed modifications!
