# Recipe Search Backend Endpoint - Complete Documentation

## Endpoint Details

### Base URL
```
POST /api/recipes/search
GET  /api/recipes/usage/:userId
```

---

## POST /api/recipes/search

### Purpose
Search for PCOS-friendly recipes using Spoonacular API enhanced with RAG-powered ingredient modifications.

### Request

#### Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>" // Optional: if using auth middleware
}
```

#### Body
```json
{
  "dishName": "chicken biryani",
  "preferences": {
    "region": "North India",
    "dietType": "non-vegetarian",
    "restrictions": ["gluten-free"]
  },
  "userId": "user123",
  "userTier": "pro",
  "location": "India"
}
```

#### Request Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `dishName` | string | ✅ Yes | Name of dish to search (2-100 chars) | "chicken biryani" |
| `preferences` | object | ❌ No | User dietary preferences | `{ region: "North India" }` |
| `preferences.region` | string | ❌ No | Regional cuisine preference | "North India", "South India" |
| `preferences.dietType` | string | ❌ No | Diet type | "vegetarian", "non-vegetarian", "vegan" |
| `preferences.restrictions` | string[] | ❌ No | Dietary restrictions | `["gluten-free", "dairy-free"]` |
| `userId` | string | ✅ Yes | Unique user identifier | "user123" |
| `userTier` | string | ✅ Yes | Subscription tier | "free", "pro", "max" |
| `location` | string | ❌ No | User location (defaults to "India") | "India" |

---

## Response Types

### 1. Success Response (200 OK)

**When:** Recipe search successful

```json
{
  "success": true,
  "data": {
    "query": "chicken biryani",
    "count": 3,
    "recipes": [
      {
        "id": 716429,
        "title": "Chicken Biryani",
        "readyInMinutes": 60,
        "servings": 4,
        "healthScore": 45,
        "sourceUrl": "https://spoonacular.com/recipes/chicken-biryani-716429",
        "summary": "Aromatic rice dish with spiced chicken...",
        "cuisines": ["Indian"],
        "diets": [],
        "dishTypes": ["main course"],
        "nutrition": {
          "nutrients": [
            {
              "name": "Calories",
              "amount": 380,
              "unit": "kcal"
            },
            {
              "name": "Protein",
              "amount": 25,
              "unit": "g"
            },
            {
              "name": "Carbohydrates",
              "amount": 48,
              "unit": "g"
            },
            {
              "name": "Fat",
              "amount": 12,
              "unit": "g"
            }
          ],
          "caloricBreakdown": {
            "percentProtein": 26.32,
            "percentFat": 28.42,
            "percentCarbs": 45.26
          }
        },
        "ingredients": [
          {
            "name": "chicken breast",
            "amount": 500,
            "unit": "g",
            "original": "500g chicken breast, cut into pieces"
          },
          {
            "name": "basmati rice",
            "amount": 2,
            "unit": "cups",
            "original": "2 cups basmati rice"
          }
        ],
        "instructions": "1. Marinate chicken with yogurt and spices...",
        "pcosModifications": {
          "regionalSubstitutes": [
            {
              "original": "white rice",
              "substitute": "brown basmati rice or cauliflower rice (50% mix)",
              "reason": "Lower GI (50 vs 73), better for insulin sensitivity",
              "howTo": "Soak brown rice for 4 hours, pressure cook for 3 whistles"
            },
            {
              "original": "ghee",
              "substitute": "olive oil or minimal ghee (1 tsp per serving)",
              "reason": "Anti-inflammatory omega-3, lower saturated fat",
              "howTo": "Use for tempering, not deep frying"
            }
          ],
          "cookingMethodImprovements": [
            "Use minimal oil (1-2 tsp per serving) instead of deep frying",
            "Bake or air-fry chicken pieces instead of frying",
            "Add extra vegetables like peas, carrots for fiber"
          ],
          "portionGuidance": "Limit to 1 serving (1 cup) and pair with a fresh salad or raita.",
          "glycemicOptimization": [
            "Eat protein (chicken) first, then rice to slow glucose spike",
            "Have this meal earlier in the day (breakfast/lunch) rather than dinner",
            "Include fiber-rich sides like cucumber salad or roasted vegetables"
          ]
        }
      }
    ],
    "tierLimit": {
      "tier": "pro",
      "dailyLimit": 5,
      "remainingToday": 4
    }
  },
  "meta": {
    "responseTime": "1234ms",
    "timestamp": "2025-11-15T10:30:00.000Z"
  }
}
```

---

### 2. Upgrade Required (403 Forbidden)

**When:** FREE tier user attempts recipe search

```json
{
  "success": false,
  "error": "Recipe search is available for Pro and Max subscribers",
  "upgradeRequired": true,
  "tierLimit": {
    "tier": "free",
    "dailyLimit": 0,
    "remainingToday": 0
  }
}
```

**Frontend Action:** Show upgrade modal/tooltip

---

### 3. Rate Limit Exceeded (429 Too Many Requests)

**When:** User exceeds daily search limit

```json
{
  "success": false,
  "error": "Daily recipe search limit reached (5 searches/day). Resets at midnight IST.",
  "rateLimited": true,
  "resetAt": "2025-11-16T00:00:00.000Z",
  "remaining": 0,
  "tierLimit": {
    "tier": "pro",
    "dailyLimit": 5,
    "remainingToday": 0
  }
}
```

**Frontend Action:** Show countdown timer to reset time

---

### 4. No Recipes Found (200 OK)

**When:** Spoonacular returns 0 results

**IMPORTANT:** This does NOT count against user's daily limit!

```json
{
  "success": true,
  "data": {
    "query": "xyz123notarealrecipe",
    "count": 0,
    "recipes": [],
    "tierLimit": {
      "tier": "pro",
      "dailyLimit": 5,
      "remainingToday": 4  // ← Notice: count NOT decremented!
    }
  },
  "meta": {
    "responseTime": "856ms",
    "timestamp": "2025-11-15T10:30:00.000Z"
  }
}
```

**Frontend Action:** Show "No recipes found" message with helpful tips

---

### 5. Validation Error (400 Bad Request)

**When:** Invalid request data

```json
{
  "success": false,
  "error": "Dish name must be between 2 and 100 characters",
  "details": "Current length: 1 characters"
}
```

**Possible validation errors:**
- Missing `dishName`
- `dishName` too short (< 2 chars) or too long (> 100 chars)
- Missing `userId`
- Invalid `userTier` (not "free", "pro", or "max")

---

### 6. Service Unavailable (503)

**When:** Spoonacular API quota exceeded or config error

```json
{
  "success": false,
  "error": "Recipe search service temporarily unavailable",
  "details": "API quota exceeded. Please try again later.",
  "code": "QUOTA_EXCEEDED"
}
```

**Or:**

```json
{
  "success": false,
  "error": "Recipe search service configuration error",
  "details": "Please contact support.",
  "code": "CONFIG_ERROR"
}
```

---

### 7. Internal Server Error (500)

**When:** Unexpected error occurs

```json
{
  "success": false,
  "error": "Unable to search recipes",
  "details": "Error message details",
  "code": "INTERNAL_ERROR"
}
```

---

## GET /api/recipes/usage/:userId

### Purpose
Get current recipe search usage statistics for a user

### Request

#### URL Parameters
- `userId` (required): User identifier

#### Query Parameters
- `userTier` (optional): User subscription tier ("free", "pro", "max")
  - Defaults to "free" if not provided

#### Example
```
GET /api/recipes/usage/user123?userTier=pro
```

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "tier": "pro",
    "dailyLimit": 5,
    "remainingToday": 3,
    "resetAt": "2025-11-16T00:00:00.000Z",
    "allowed": true
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User identifier |
| `tier` | string | Subscription tier |
| `dailyLimit` | number | Total searches allowed per day |
| `remainingToday` | number | Searches remaining today |
| `resetAt` | string | ISO timestamp when limit resets (midnight IST) |
| `allowed` | boolean | Whether user can make another search now |

---

## Rate Limiting Details

### Tier Limits

| Tier | Daily Limit |
|------|-------------|
| Free | 0 (blocked) |
| Pro  | 5 searches  |
| Max  | 10 searches |

### Reset Time
- Resets at **midnight IST** (UTC+5:30)
- NOT at midnight UTC!

### Cache Behavior
- Cached results still count toward daily limit
- This prevents abuse (users repeatedly searching same dish)
- Cache TTL: 24 hours

### What Counts vs What Doesn't

**COUNTS toward limit:**
- ✅ Successful recipe search (recipes found)
- ✅ Cache hit (returning cached results)

**DOES NOT count:**
- ❌ No recipes found (count: 0)
- ❌ Validation errors (400)
- ❌ API errors (500)
- ❌ User cancels/closes

---

## Frontend Integration

### Basic Usage

```typescript
import apiClient from '../services/apiClient';

// Search for recipe
const searchRecipe = async (dishName: string, userTier: string, userId: string) => {
  try {
    const response = await apiClient.searchRecipe({
      dishName,
      preferences: {
        region: 'North India',
        dietType: 'vegetarian',
      },
      userId,
      userTier,
    });

    if (response.success) {
      // Handle success
      const recipes = response.data.recipes;
      const remaining = response.data.tierLimit.remainingToday;
      console.log(`Found ${recipes.length} recipes. ${remaining} searches left today.`);
    }
  } catch (error) {
    // Handle errors
    if (error.status === 403) {
      // Upgrade required
      showUpgradeModal();
    } else if (error.status === 429) {
      // Rate limited
      showRateLimitMessage(error.response.resetAt);
    } else {
      // Other error
      showErrorMessage(error.message);
    }
  }
};

// Get usage info
const checkUsage = async (userId: string, userTier: string) => {
  try {
    const response = await apiClient.getRecipeUsage(userId, userTier);
    
    if (response.success) {
      console.log(`${response.data.remainingToday}/${response.data.dailyLimit} searches remaining`);
    }
  } catch (error) {
    console.error('Failed to get usage:', error);
  }
};
```

---

## Error Handling Best Practices

### Frontend Checklist

1. **Before Search:**
   - Check if user tier is "free" → show upgrade modal immediately
   - Optionally: Check usage count → disable button if 0 remaining

2. **During Search:**
   - Show loading state
   - Disable input and buttons

3. **After Search - Success:**
   - Display recipe cards
   - Update usage counter in UI
   - Clear loading state

4. **After Search - No Results:**
   - Show friendly "not found" message
   - **Don't decrement usage counter** (backend handles this)
   - Suggest alternatives or spelling corrections
   - Provide "Try Again" button

5. **After Search - Upgrade Required (403):**
   - Show upgrade modal
   - Highlight Pro/Max benefits
   - Provide upgrade buttons

6. **After Search - Rate Limited (429):**
   - Show rate limit message
   - Display countdown to reset time
   - Optionally: Suggest upgrading to Max for more searches

7. **After Search - API Error (500/503):**
   - Show generic error message
   - Provide "Try Again" button
   - Don't show technical details to user

---

## Testing Scenarios

### Test 1: Pro User - First Search
```bash
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "chicken biryani",
    "preferences": {"region": "North India"},
    "userId": "testuser1",
    "userTier": "pro"
  }'
```

**Expected:** 200 OK with recipes, `remainingToday: 4`

---

### Test 2: Free User
```bash
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "paneer tikka",
    "userId": "testuser2",
    "userTier": "free"
  }'
```

**Expected:** 403 Forbidden with `upgradeRequired: true`

---

### Test 3: Rate Limit Check
```bash
# Make 5 searches as Pro user
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/recipes/search \
    -H "Content-Type: application/json" \
    -d "{
      \"dishName\": \"dish$i\",
      \"userId\": \"testuser3\",
      \"userTier\": \"pro\"
    }"
done

# 6th search should fail
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "dish6",
    "userId": "testuser3",
    "userTier": "pro"
  }'
```

**Expected:** 429 Too Many Requests with `rateLimited: true`

---

### Test 4: Not Found (doesn't count)
```bash
# Check usage first
curl http://localhost:3000/api/recipes/usage/testuser4?userTier=pro

# Search for non-existent dish
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "xyznotreal",
    "userId": "testuser4",
    "userTier": "pro"
  }'

# Check usage again - should be SAME as before
curl http://localhost:3000/api/recipes/usage/testuser4?userTier=pro
```

**Expected:** Usage count unchanged

---

### Test 5: Validation Error
```bash
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "a",
    "userId": "testuser5",
    "userTier": "pro"
  }'
```

**Expected:** 400 Bad Request (dish name too short)

---

### Test 6: Cache Hit
```bash
# First search
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "dal makhani",
    "userId": "testuser6",
    "userTier": "pro"
  }'
# remainingToday: 4

# Same search again (cache hit)
curl -X POST http://localhost:3000/api/recipes/search \
  -H "Content-Type: application/json" \
  -d '{
    "dishName": "dal makhani",
    "userId": "testuser6",
    "userTier": "pro"
  }'
# remainingToday: 3 (still counts!)
```

**Expected:** Both searches count toward limit

---

## Implementation Files

### Backend
- **Route:** `server/src/routes/recipes.js`
- **Service:** `server/src/services/spoonacularService.js`
- **Main Server:** `server/src/index.js` (route registered)

### Frontend
- **API Client:** `frontend/src/services/apiClient.ts`
  - `apiClient.searchRecipe()`
  - `apiClient.getRecipeUsage()`

---

## Next Steps

1. ✅ Backend endpoint created and registered
2. ✅ Frontend API methods added
3. ⏳ Test endpoints with curl commands
4. ⏳ Create UI components (Tasks 1-6 from main instructions)
5. ⏳ Integration testing with real users

---

## Related Documentation

- `RECIPE_SEARCH_IMPLEMENTATION.md` - Backend technical details
- `RECIPE_SEARCH_UI_IMPLEMENTATION_SUMMARY.md` - Frontend UI tasks
- `SPOONACULAR_MIGRATION_SUMMARY.md` - Migration overview

---

**Status:** ✅ Backend endpoint complete and ready for testing!
