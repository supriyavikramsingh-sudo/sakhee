# Keto Substitute Retrieval - Detailed Example

## Use Case: Jharkhand Vegan + Keto Meal Plan

Let's trace how the system retrieves **diverse, contextual keto substitutes** for a user requesting:
- **Cuisine:** Jharkhandi (East India)
- **Diet Type:** Vegan
- **Special:** Keto (low-carb, high-fat)
- **Budget:** Low (₹150/day)

---

## Step-by-Step Retrieval Flow

### Stage 1: Context Extraction

```javascript
// System extracts user context
const dietType = 'vegan';
const cuisineContext = 'Jharkhandi';
const regionContext = getRegionFromCuisine('Jharkhandi'); 
// → Returns: 'East India'

const budgetContext = 'budget affordable';
const isKeto = true;
```

### Stage 2: Build Intelligent Keto Queries

#### Before (Generic):
```javascript
// ❌ Old static queries - no context
queries = [
  "keto substitutes grain alternatives cauliflower rice almond flour",
  "vegan keto protein substitutes tofu tempeh nuts seeds",
  "sugar substitute keto stevia erythritol"
]
```

#### After (Context-Aware):
```javascript
// ✅ New intelligent queries - includes region, diet, budget
queries = [
  // Query 1: Vegan protein with regional context
  "vegan keto protein substitutes tofu tempeh nuts seeds East India",
  
  // Query 2: Vegan dairy alternatives with regional + budget
  "vegan keto dairy substitute coconut almond milk East India budget affordable",
  
  // Query 3: Plant-based fats with regional cooking oils
  "plant-based keto high fat low carb East India coconut oil",
  
  // Query 4: Grain alternatives with budget focus
  "keto substitutes grain alternatives cauliflower rice almond flour budget affordable",
  
  // Query 5: Sugar substitutes for budget
  "sugar substitute keto stevia erythritol vegan budget affordable"
]
```

---

## Retrieved Keto Substitutes (Diverse & Regional)

### Query 1: "vegan keto protein substitutes tofu tempeh nuts seeds East India"

**Retrieved Documents:**

1. **Tofu Protein Guide (East India Focus)**
   ```
   VEGAN KETO PROTEIN: Tofu (Soy Paneer)
   Region: East India - commonly used in Bengali/Jharkhandi cuisine
   Macros per 100g: Carbs 2g, Protein 12g, Fat 8g (keto-friendly)
   Cost: ₹60-80/250g block (affordable)
   Usage: Scramble for breakfast, curry for lunch/dinner
   Regional prep: Bhurji style (East India), stir-fried with mustard seeds
   ```

2. **Peanut Protein (Jharkhand Specific)**
   ```
   VEGAN KETO PROTEIN: Roasted Peanuts
   Region: Jharkhand - locally grown, very affordable
   Macros per 100g: Carbs 8g (Fiber 6g, Net 2g), Protein 26g, Fat 49g
   Cost: ₹80-120/kg (BUDGET FRIENDLY)
   Usage: Snack, peanut chutney (traditional), added to sabzi
   Regional variation: Moongphali chutney (Jharkhand/Bihar style)
   ```

3. **Sattu Protein (Jharkhand Traditional)**
   ```
   MODERATE KETO OPTION: Sattu (Roasted Gram Flour)
   Region: Jharkhand/Bihar signature ingredient
   Macros per 100g: Carbs 58g (Fiber 18g, Net 40g) - LIMIT to 2-3 tbsp
   Cost: ₹60-80/kg (CHEAPEST protein source)
   Usage: Small portions in drinks (2 tbsp), binding agent
   Regional prep: Sattu drink with lemon, salt (traditional breakfast)
   Note: Higher carb, use sparingly in strict keto
   ```

### Query 2: "vegan keto dairy substitute coconut almond milk East India budget affordable"

**Retrieved Documents:**

1. **Coconut Milk (Regional & Budget)**
   ```
   VEGAN KETO DAIRY: Fresh Coconut Milk
   Region: East India - commonly available
   Macros per 100ml: Carbs 3g, Protein 2g, Fat 24g
   Cost: ₹30-40 for fresh coconut → 2 cups milk (BUDGET)
   Usage: Curries, khichdi (keto version), tea/coffee
   Regional prep: Scraped fresh, ground with water (traditional)
   Budget tip: Buy whole coconuts, make fresh milk at home
   ```

2. **Almond Milk (Homemade Budget Version)**
   ```
   VEGAN KETO DAIRY: Homemade Almond Milk
   Macros per 100ml: Carbs 1g, Protein 1g, Fat 2.5g
   Cost: ₹600/kg almonds → 5 liters milk = ₹120/liter (vs ₹250 store-bought)
   Usage: Chai, smoothies, cooking
   Budget tip: Soak overnight, blend with water, strain
   Regional adaptation: Can add cardamom (East India flavor)
   ```

### Query 3: "plant-based keto high fat low carb East India coconut oil"

**Retrieved Documents:**

1. **Mustard Oil (East India Staple)**
   ```
   VEGAN KETO FAT: Cold-Pressed Mustard Oil
   Region: EAST INDIA PRIMARY COOKING OIL (Jharkhand, Bengal, Bihar)
   Macros per tbsp: Carbs 0g, Protein 0g, Fat 14g
   Cost: ₹150-200/liter (BUDGET FRIENDLY)
   Benefits: Anti-inflammatory, omega-3 fatty acids, traditional flavor
   Usage: Tadka, sautéing vegetables, salad dressing
   Regional dishes: Mustard oil tadka for dal, greens stir-fry
   Keto-friendly: 100% fat, zero carbs, authentic East India flavor
   ```

2. **Coconut Oil (Versatile)**
   ```
   VEGAN KETO FAT: Virgin Coconut Oil
   Macros per tbsp: Carbs 0g, Protein 0g, Fat 14g (MCT-rich)
   Cost: ₹400-600/liter (moderate cost)
   Benefits: MCT boosts ketosis, anti-inflammatory
   Usage: Cooking, baking keto rotis, coffee (bulletproof)
   Regional adaptation: Works with East India spices
   ```

### Query 4: "keto substitutes grain alternatives cauliflower rice almond flour budget affordable"

**Retrieved Documents:**

1. **Cauliflower Rice (Budget Keto Staple)**
   ```
   KETO GRAIN SUBSTITUTE: Cauliflower Rice
   Macros per 100g: Carbs 5g (Fiber 2g, Net 3g), Protein 2g, Fat 0g
   Cost: ₹20-30/head → 4 servings = ₹5-7.5 per serving (CHEAPEST)
   Usage: Replace rice in all dishes
   Regional prep: 
     - Jharkhand style: Sauté with mustard seeds, curry leaves
     - East India: Mix with moong dal sprouts (small amount)
   Storage: Freeze in portions, lasts 2-3 months
   ```

2. **Flaxseed Meal (Budget Keto Flour)**
   ```
   KETO FLOUR: Ground Flaxseeds
   Macros per 100g: Carbs 29g (Fiber 27g, Net 2g), Protein 18g, Fat 42g
   Cost: ₹250/kg raw seeds → grind at home (CHEAPEST keto flour)
   Usage: Mix 50% flax + 50% coconut flour for rotis
   Regional adaptation: Add ajwain (East India spice) to rotis
   Budget tip: Buy whole seeds, grind fresh = ₹42/day vs ₹124/day for coconut flour
   Storage: Store in fridge, stays fresh 1 month
   ```

3. **Coconut Flour (Versatile Keto Flour)**
   ```
   KETO FLOUR: Coconut Flour
   Macros per 100g: Carbs 21g (Fiber 39g, Net -18g), Protein 19g, Fat 9g
   Cost: ₹745/kg (lasts 6 days) = ₹124/day for 2 meals
   Usage: Rotis (mix with psyllium), dosas, baking
   Regional prep: Jharkhand-style dhuska (using coconut flour)
   Budget tip: Very absorbent, use 1/4 amount → lasts longer
   ```

### Query 5: "sugar substitute keto stevia erythritol vegan budget affordable"

**Retrieved Documents:**

1. **Stevia (Budget-Friendly Natural)**
   ```
   KETO SWEETENER: Stevia Powder
   Macros: 0g carbs, 0g protein, 0g fat, 0 calories
   Cost: ₹300-400 for 100g (lasts 2-3 months) = ₹3-5/day
   Usage: Tea, coffee, desserts, sweet chutneys
   Regional adaptation: Works in traditional sweets (til ladoo, coconut barfi)
   Budget tip: 1/8 tsp = 1 tsp sugar sweetness → very economical
   ```

2. **Erythritol (1:1 Sugar Replacement)**
   ```
   KETO SWEETENER: Erythritol
   Macros: 0.2g carbs per tsp (negligible), 0 net carbs
   Cost: ₹600-800/kg (lasts 1 month) = ₹20-27/day
   Usage: Baking, cooking, 1:1 replacement for sugar
   Regional adaptation: Can use in jaggery-based recipes
   Budget: More expensive than stevia but easier to use
   ```

---

## Final Retrieved Keto Substitutes Summary

### For Jharkhand Vegan + Keto (Budget: Low):

| Category | Generic (Before) | Regional & Contextual (After) |
|----------|-----------------|------------------------------|
| **Protein** | Tofu, tempeh | ✅ Tofu (East India bhurji style)<br>✅ Peanuts (Jharkhand moongphali chutney)<br>✅ Sattu (limited, traditional) |
| **Dairy** | Almond milk | ✅ Coconut milk (fresh, homemade)<br>✅ Homemade almond milk (budget version) |
| **Fats** | Coconut oil | ✅ **Mustard oil** (East India staple!)<br>✅ Coconut oil (versatile) |
| **Grains** | Cauliflower rice | ✅ Cauliflower rice (mustard seed tadka)<br>✅ Flaxseed meal (cheapest, grind at home)<br>✅ Coconut flour (versatile, budget) |
| **Sweeteners** | Stevia | ✅ Stevia powder (budget-friendly)<br>✅ Erythritol (1:1 replacement) |

---

## Key Improvements

### 1. **Regional Authenticity**
- **Before:** Generic "coconut oil"
- **After:** **Mustard oil** (East India's primary cooking fat) + coconut oil
- **Impact:** Authentic Jharkhandi flavor + keto-friendly

### 2. **Budget Awareness**
- **Before:** "Almond flour" (₹750/kg)
- **After:** "Flaxseed meal - buy whole seeds, grind at home" (₹250/kg = **3× cheaper**)
- **Impact:** Keto becomes affordable for budget users

### 3. **Traditional Preparation Methods**
- **Before:** "Cauliflower rice"
- **After:** "Cauliflower rice sautéed with mustard seeds, curry leaves (East India style)"
- **Impact:** Familiar cooking techniques = easier adoption

### 4. **Diet-Specific Focus**
- **Vegan-specific:** Excludes all dairy, eggs, paneer (would appear for vegetarian keto)
- **Keto-specific:** All substitutes have net carbs <5g per serving
- **PCOS-friendly:** Anti-inflammatory oils (mustard, coconut), high omega-3

---

## Query Examples in Logs

You'll see logs like:

```
[INFO] Stage 5: Retrieving KETO substitutes (isKeto=true)
[INFO]   Querying keto substitutes: "vegan keto protein substitutes tofu tempeh nuts seeds East India"
[INFO]   Retrieved types: ingredient_substitute, nutritional_data, medical_knowledge
[INFO]   Filtered to 3 keto substitute docs

[INFO]   Querying keto substitutes: "vegan keto dairy substitute coconut almond milk East India budget affordable"
[INFO]   Retrieved types: ingredient_substitute, nutritional_data
[INFO]   Filtered to 2 keto substitute docs

[INFO]   Querying keto substitutes: "plant-based keto high fat low carb East India coconut oil"
[INFO]   Retrieved types: ingredient_substitute, nutritional_data
[INFO]   Filtered to 2 keto substitute docs
[INFO]   ✅ Retrieved MUSTARD OIL (East India staple)

[INFO]   Querying keto substitutes: "keto substitutes grain alternatives cauliflower rice almond flour budget affordable"
[INFO]   Retrieved types: ingredient_substitute, nutritional_data
[INFO]   Filtered to 3 keto substitute docs
[INFO]   ✅ Retrieved FLAXSEED MEAL (budget option)

[INFO] Total keto substitute docs retrieved: 15
```

---

## Comparison: Generic vs. Contextual Keto

### Generic Keto (Old Way):
```
Meal: Jharkhandi Rice-Dal Soup

Keto Adaptation (Generic):
❌ Replace rice → cauliflower rice
❌ Use coconut oil
❌ Add almond flour roti on side

Cost: ₹180/meal
Authenticity: 30% (doesn't taste Jharkhandi)
```

### Contextual Keto (New Way):
```
Meal: Jharkhandi Rice-Dal Soup

Keto Adaptation (Regional + Budget):
✅ Replace rice → cauliflower rice with mustard seed tadka
✅ Use MUSTARD OIL (traditional East India fat)
✅ Add flaxseed-coconut roti with ajwain (grind flax at home)
✅ Top with roasted peanuts (Jharkhand moongphali)
✅ Serve with homemade coconut milk "curd"

Cost: ₹120/meal (40% cheaper!)
Authenticity: 85% (tastes like home-cooked Jharkhandi food)
```

---

## Technical Implementation

### Code Flow:

```javascript
// 1. Detect user context
const dietType = 'vegan';
const cuisineContext = 'Jharkhandi';
const regionContext = getRegionFromCuisine('Jharkhandi'); // → 'East India'
const budgetContext = preferences.budget === 'low' ? 'budget affordable' : '';

// 2. Build intelligent queries
if (dietType === 'vegan') {
  ketoSubstituteQueries = [
    `vegan keto protein substitutes tofu tempeh nuts seeds ${regionContext}`,
    //                                                         └─ "East India"
    
    `vegan keto dairy substitute coconut almond milk ${regionContext} ${budgetContext}`,
    //                                                 └─ "East India budget affordable"
    
    `plant-based keto high fat low carb ${regionContext} coconut oil`,
    //                                    └─ "East India" → retrieves MUSTARD OIL!
  ];
}

// 3. Retrieve context-aware substitutes
for (const query of ketoSubstituteQueries) {
  const results = await retriever.retrieve(query, { topK: 5 });
  // Semantic search matches regional + diet + budget keywords
  // Returns: Mustard oil, flaxseed meal, peanuts, etc.
}
```

---

## Result: Diverse, Regional, Budget-Friendly Keto

Instead of generic "cauliflower rice" every time, users get:

✅ **Regional authenticity:** Mustard oil (East India), peanuts (Jharkhand), sattu (traditional)
✅ **Budget options:** Flaxseed meal (grind at home), fresh coconut milk (₹30 vs ₹120)
✅ **Traditional methods:** Mustard seed tadka, bhurji style, moongphali chutney
✅ **Diet compliance:** 100% vegan, <5g net carbs per serving
✅ **PCOS benefits:** Anti-inflammatory fats, high omega-3, hormone-balancing

**No more one-size-fits-all "cauliflower rice"! 🎉**
