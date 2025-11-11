# Post-Testing Meal Plan Fixes (Round 2)

**Date**: Dec 2024  
**Status**: ✅ Implemented  
**File Modified**: `server/src/langchain/chains/mealPlanChain.js`

---

## 🔍 **Testing Context**

After implementing the initial anti-hallucination fixes (limiting substitutes to 40, moving forbidden dishes to top, increasing meals to - ✅ Verify recipes use ginger powder (saunth) NOT fresh ginger root

---

## 🙏 **Jain Diet Comprehensive Coverage**

The ingredie### **New Functions**: ~150 lines (inferMealType + formatMealsByType)
- **Critical Constraints**: ~120 lines (5 comprehensive constraint blocks with diet-specific variations)
- **Context Building**: ~30 lines (grouped template sections)
- **Total**: ~300 lines added/modified

---iety fix now provides **complete Jain diet compliance** with explicit guidance for all food categories:

### **Jain Protein Sources** (Constraint 5️⃣-A)
- ✅ **Dairy**: Paneer, chhena, milk, yogurt, ghee, butter
- ✅ **Plant proteins**: Tofu, chickpeas, moong dal, urad dal, masoor dal, toor dal, above-ground beans
- ✅ **Nuts & Seeds**: Almonds, cashews, walnuts, pistachios, peanuts, sesame seeds, pumpkin seeds, sunflower seeds
- ❌ **Forbidden**: No eggs, no meat/fish (already covered by vegetarian base)

### **Jain Vegetables** (Constraint 5️⃣-B)
- ✅ **Above-ground only**: Cauliflower, broccoli, cabbage, bottle gourd (lauki), ridge gourd (turai), bitter gourd (karela), pumpkin, tomatoes, bell peppers (all colors), spinach, fenugreek (methi), zucchini, eggplant (brinjal), okra (bhindi), green beans, peas (pods only)
- ❌ **STRICTLY FORBIDDEN (root vegetables)**: 
  - NO potato, sweet potato, yam
  - NO onion, garlic, shallots, leek, scallions
  - NO ginger root (ginger powder/saunth is OK)
  - NO carrot, radish, beetroot, turnip
  - NO any underground bulbs, tubers, or roots

### **Jain Grains & Carbs** (Constraint 5️⃣-C)
- ✅ **Safe grains**: Rice (white/brown), wheat roti, bajra (pearl millet) roti, jowar (sorghum) roti, buckwheat (kuttu), amaranth (rajgira), water chestnut flour (singhara), sabudana (tapioca pearls)
- ✅ **Fasting grains**: Kuttu (buckwheat), rajgira (amaranth), singhara (water chestnut flour), sabudana - these are also used during Jain fasting

### **Jain Fats & Oils** (Constraint 5️⃣-D)
- ✅ **All fats allowed**: Ghee, butter, coconut oil, sesame oil, peanut oil, sunflower oil, olive oil, avocado, all nuts and seeds
- ✅ **Variety rotation**: Day 1 ghee, Day 2 coconut oil, Day 3 sesame oil, Day 4 peanut oil, Day 5 olive oil

### **Jain Flavor Enhancers** (Constraint 5️⃣-E) - CRITICAL
- ✅ **Onion/Garlic Replacements**:
  - **Hing (Asafoetida)**: MANDATORY in every savory dish's tempering/tadka (replaces onion/garlic)
  - **Ginger powder (saunth)**: Use this instead of fresh ginger root
  - **Curry leaves**: Add aroma without onion/garlic
  - **Fresh herbs**: Coriander, mint, basil (tulsi)
  
- ✅ **Souring agents**: Tomatoes, tamarind, kokum, amchur (dry mango powder), lemon/lime
  
- ✅ **Spices**: Cumin, coriander seeds, fennel seeds, ajwain (carom), fenugreek seeds, black pepper, green chili, turmeric, red chili powder
  
- ❌ **ABSOLUTELY FORBIDDEN**: 
  - NO onion in any form (raw, cooked, fried, powder)
  - NO garlic in any form (raw, cooked, paste, powder)
  - NO ginger root (fresh ginger) - only ginger powder allowed
  - NO leeks, scallions, shallots, chives

### **Jain Recipe Adaptation Example**

**Traditional Recipe**: Dal Tadka (North Indian)
```
❌ WRONG (non-Jain):
- Tempering: Heat ghee, add cumin, chopped onion, garlic, ginger paste
- Problem: Contains onion, garlic, fresh ginger (root vegetables)

✅ RIGHT (Jain-adapted):
- Tempering: Heat ghee, add generous pinch of hing (asafoetida), cumin seeds, curry leaves
- Flavor boost: Add ginger powder (saunth), green chili, tomatoes, lemon juice
- Result: Same depth of flavor using Jain-approved ingredients
```

### **Why This Matters**

1. **Religious Compliance**: Jain diet is not a preference but a religious practice based on principle of non-violence (ahimsa)
2. **Root Vegetables Forbidden**: Jains avoid root vegetables because harvesting them kills the entire plant and microorganisms in soil
3. **Hing is Essential**: Hing (asafoetida) is THE key ingredient that makes Jain food flavorful without onion/garlic
4. **Common Mistakes**: Many meal plans fail Jain requirements by including potato, onion, garlic, or fresh ginger

### **Impact on Meal Generation**

- ✅ **Before Fix**: LLM might include potato, onion, garlic, mushrooms in "Jain" meals (violations)
- ✅ **After Fix**: LLM has explicit lists of allowed/forbidden ingredients + hing requirement
- ✅ **Variety Ensured**: Rotation across paneer, dals (moong/urad/masoor/toor), above-ground vegetables
- ✅ **Authentic Flavor**: Hing + ginger powder + curry leaves create traditional Jain taste profile

---

### Test Case 3: Keto Grain Detection etc.), user tested the system with:

- **Cuisines**: Manipuri, Tripura, Arunachal Pradesh
- **Diet**: Vegan, Keto
- **Budget**: ₹500/day
- **Duration**: 3 days

---

## 🚨 **Issues Discovered in Testing**

### 1. **Tofu Overuse** (Lack of Protein Variety)
**Problem**: All 3 days featured tofu in almost every meal despite 40 substitute docs being retrieved
- Day 1: "Tofu Singju"
- Day 2: "Tofu Herb Wrap"
- Day 3: No variety in protein sources

**Root Cause**: No explicit protein rotation instructions in prompt

**User Impact**: 
- Monotonous meal plan
- Nutritional imbalance (missing variety of amino acids, micronutrients)
- User fatigue from repetitive ingredients

---

### 2. **Rice Soup Keto Hallucination**
**Problem**: "Chamthong Rice Soup (Manipuri)" appeared for breakfast despite keto diet
- Rice is FORBIDDEN in keto (grain = high carb)
- Soup with rice violates keto rules

**Root Cause**: Keto constraint only checked ingredients, NOT meal names for grain keywords

**User Impact**:
- Critical diet violation (rice triggers insulin spike, breaks ketosis)
- Loss of trust in system accuracy
- Dangerous for users with strict keto requirements

---

### 3. **Meal Type Mismatch**
**Problem**: Soup appeared for breakfast when breakfast templates should be used for breakfast slots
- "Chamthong Rice Soup" is a lunch/dinner item, NOT breakfast
- Indian breakfast = light items (idli, dosa, upma, paratha, poha)
- Soups = lunch/dinner items in Indian context

**Root Cause**: All meal templates (breakfast/lunch/dinner/snack) were mixed together in prompt with no clear separation

**User Impact**:
- Culturally inappropriate meal timing (soup for breakfast is unusual in Indian context)
- Wrong calorie distribution (heavy meal for breakfast slot)
- Digestion issues (heavy soup in morning vs light breakfast)

---

### 4. **Non-Vegan Meal Names**
**Problem**: Meal names still contained meat/seafood terms despite vegan ingredients
- "Herb Chicken Roast (Manipuri, Vegan Adaptation)" - has "Chicken" in name
- "Lite Prawn Stew (Tripuri)" - has "Prawn" in name
- Actual ingredients: tofu, chickpeas (vegan substitutes)

**Root Cause**: LLM adapted ingredients but kept original meal names intact

**User Impact**:
- Confusing for users (name says chicken, ingredients say tofu)
- Misleading for dietary restrictions (vegan user sees "chicken")
- Poor user experience (name doesn't match actual dish)

---

### 5. **Missing Accompaniments**
**Problem**: Accompaniments retrieved (5 docs logged) but NOT appearing in final meal output
- Logs show: "Found 5 accompaniment suggestions"
- Output: No chutneys, pickles, or sides in meal plan
- Incomplete meals (e.g., "Vegetable Stir Fry" alone vs "Vegetable Stir Fry with Coconut Chutney")

**Root Cause**: Accompaniments mentioned in prompt instructions (line 3224) but not MANDATED in critical constraints section

**User Impact**:
- Incomplete Indian meals (Indian cuisine always has chutneys/sides)
- Missing flavor variety
- Nutritional gaps (missing probiotics from curd, enzymes from pickles)

---

## ✅ **Solutions Implemented**

### **Fix 1: Comprehensive Ingredient Variety Instructions**
**Location**: `buildMealPlanPrompt()` → Critical Constraints Section (Line ~3057)

**Added** (Expanded from protein-only to ALL ingredient categories):
```
5️⃣ 🌈 INGREDIENT VARIETY (MANDATORY - ROTATE ALL FOOD CATEGORIES):

   A. PROTEIN VARIETY (NO repetition in consecutive meals):
   ✅ Vegan proteins: tofu, tempeh, chickpeas, black beans, kidney beans, lentils (red/green/black),
      mushrooms (button/shiitake/oyster), jackfruit, soya chunks, peanuts, almonds, walnuts, cashews
   ✅ Jain proteins (NO onion/garlic/root veg): paneer, chhena, tofu, chickpeas, moong dal,
      urad dal, masoor dal, toor dal, above-ground beans, pumpkin seeds, sunflower seeds,
      almonds, cashews, walnuts, pistachios, peanuts, sesame seeds
   ✅ Vegetarian proteins: paneer, chhena, tofu, eggs, chickpeas, black beans, kidney beans,
      lentils (red/green/black), mushrooms, peanuts, almonds, walnuts, cashews, Greek yogurt
   
   B. VEGETABLE VARIETY (NO repetition - use diverse colors/types):
   ✅ Jain vegetables (NO root veg/onion/garlic): cauliflower, broccoli, cabbage, bottle gourd (lauki),
      ridge gourd (turai), bitter gourd (karela), pumpkin, tomatoes, bell peppers, spinach, fenugreek,
      zucchini, eggplant, okra, green beans, peas (pods)
   ⚠️ Jain FORBIDDEN: NO potato, onion, garlic, carrot, radish, beetroot, ginger, turnip
   ✅ Mix colors daily: green, orange, red, white, purple, yellow vegetables
   
   C. GRAIN/CARB VARIETY (rotate across days):
   ✅ Jain grains: rice (white/brown), wheat roti, bajra roti, jowar roti, buckwheat (kuttu),
      amaranth (rajgira), water chestnut flour (singhara), sabudana (tapioca pearls)
   ✅ Keto carbs ONLY: cauliflower rice, zucchini noodles, almond flour roti, coconut flour bread
   ✅ Regular grains: brown rice, quinoa, millets (ragi/bajra/jowar), oats, whole wheat roti
   
   D. HEALTHY FAT VARIETY (rotate cooking oils and fat sources):
   ✅ Jain fats: ghee, butter, coconut oil, sesame oil, peanut oil, sunflower oil, olive oil,
      avocado, nuts (almonds/cashews/walnuts), seeds (sesame/pumpkin/sunflower)
   ✅ Vegan fats: coconut oil, olive oil, sesame oil, nuts, seeds, tahini, nut butters (NO ghee/butter)
   ✅ Vary cooking oils: Day 1 coconut oil, Day 2 ghee, Day 3 olive oil, Day 4 sesame oil
   
   E. FLAVOR ENHANCER VARIETY (avoid onion/garlic repetition for Jain):
   ✅ Jain flavor bases: hing (asafoetida), ginger powder (saunth), curry leaves, fresh herbs,
      tomatoes, tamarind, kokum, amchur, lemon/lime, cumin, coriander seeds, fennel, ajwain
   ⚠️ CRITICAL: ALWAYS use hing as onion/garlic replacement in tempering (tadka)
   ❌ ABSOLUTELY FORBIDDEN: NO onion, garlic, ginger root, leek, scallions, shallots
```

**Impact**:
- ✅ Forces LLM to vary proteins, vegetables, grains, fats, AND flavors
- ✅ **Jain-specific guidance**: Explicit lists of allowed ingredients (above-ground only)
- ✅ **Jain forbidden list**: Clear prohibition of root vegetables, onion, garlic
- ✅ **Jain alternatives**: Hing (asafoetida) as onion/garlic replacement in all dishes
- ✅ **Vegan-specific**: Separate lists for vegan fats (no ghee/butter)
- ✅ **Keto-specific**: Low-carb grain alternatives only
- ✅ Color variety for vegetables (rainbow nutrition)
- ✅ Oil rotation for balanced omega fatty acids

---

### **Fix 2: Keto Grain Detection in Meal Names**
**Location**: `buildMealPlanPrompt()` → Critical Constraints Section (Line ~2872)

**Added to Keto Mode**:
```
4️⃣ 🔥 KETOGENIC MODE (OVERRIDES STANDARD PCOS RULES):
   ❌ ZERO grains (rice, wheat, millets, oats)
   ❌ ZERO legumes/dals (too high in carbs)
   ❌ ZERO starchy vegetables (potato, corn, peas)
   ❌ NO RICE in meal names (check names: "Rice Soup", "Fish Rice", "Vegetable Rice" = FORBIDDEN)
   ❌ NO DAL/LENTILS in meal names or ingredients
   ❌ NO SOUP with grains (check names: "Rice Soup", "Dal Soup", "Wheat Soup" = FORBIDDEN)
   ✅ ADAPT templates: rice→cauliflower rice, roti→almond flour roti
   ✅ NET CARBS: Maximum 20-50g per day
```

**Impact**:
- ✅ Catches grain violations in meal NAMES (not just ingredients)
- ✅ Explicit examples: "Rice Soup", "Dal Soup" = FORBIDDEN
- ✅ Prevents keto violations before they reach output

---

### **Fix 3: Meal Type Filtering**
**Location**: `formatMealsByType()` → New Function (Line ~367) + `buildEnhancedContext()` (Line ~580)

**Implementation**:

1. **New Function**: `inferMealType(doc)`
   - Infers meal type from meal name keywords
   - Categories: breakfast, lunch/dinner, snack, unknown
   - Keywords:
     - Breakfast: poha, upma, idli, dosa, paratha, toast, oats, smoothie, egg
     - Snack: chaat, samosa, pakora, vada, cutlet, tikki
     - Lunch/Dinner: curry, biryani, pulao, dal, rice, soup, stew

2. **New Function**: `formatMealsByType(meals)`
   - Groups meals by inferred type
   - Returns: `{ breakfast: '', lunch: '', snack: '', unknown: '' }`
   - Logs distribution: "10 breakfast, 35 lunch/dinner, 8 snacks"

3. **Modified Context Building**:
```
🌅 BREAKFAST TEMPLATES (use for breakfast/morning meals only):
1. Poha (Maharashtra/western): ...
2. Upma (Karnataka/south): ...

🍛 LUNCH/DINNER TEMPLATES (use for lunch/dinner meals only):
1. Dal Tadka (Punjab/north): ...
2. Fish Curry (Bengal/east): ...

🥤 SNACK TEMPLATES (use for snack meals only):
1. Samosa (North Indian/north): ...
```

**Added to Critical Constraints**:
```
6️⃣ 🍽️ MEAL TYPE ENFORCEMENT (STRICT MATCHING):
   ✅ Use ONLY breakfast templates for breakfast slots (7-9 AM meals)
   ✅ Use ONLY lunch/dinner templates for lunch slots (12-2 PM meals)
   ✅ Use ONLY dinner/lunch templates for dinner slots (7-9 PM meals)
   ✅ Use ONLY snack templates for snack slots
   ❌ WRONG: Soup for breakfast, curry for snack, heavy meal for morning
   ❌ NO SOUP for breakfast (soups are lunch/dinner items)
   ❌ NO RICE DISHES for breakfast (rice is lunch/dinner)
   ❌ NO HEAVY CURRIES for breakfast (curries are lunch/dinner)
```

**Impact**:
- ✅ Separate template sections prevent LLM from using lunch items for breakfast
- ✅ Clear visual grouping improves LLM attention (breakfast templates at top for breakfast generation)
- ✅ Explicit constraint violations prevent soup/curry for breakfast

---

### **Fix 4: Vegan Name Adaptation Rule**
**Location**: `buildMealPlanPrompt()` → Critical Constraints Section (Line ~2895)

**Added (Vegan Mode Only)**:
```
7️⃣ 🌱 VEGAN MEAL NAME ADAPTATION (MANDATORY):
   ✅ If adapting non-vegan template, RENAME meal to reflect vegan protein used
   ❌ WRONG: "Herb Chicken Roast (Vegan Adaptation)" - still has "Chicken" in name
   ✅ RIGHT: "Herb Tofu Roast" or "Herb Chickpea Roast" - actual protein in name
   ❌ WRONG: "Lite Prawn Stew (Vegan)" - still has "Prawn" in name
   ✅ RIGHT: "Lite Mushroom Stew" or "Lite Jackfruit Stew" - actual protein in name
   
   📝 Name replacement guide:
      - Chicken/Fish/Prawn → Tofu, Chickpea, Mushroom, Jackfruit (based on actual substitute)
      - Mutton/Lamb → Jackfruit, Soya Chunks, Mushroom
      - Egg → Tofu Scramble, Chickpea Flour (based on dish type)
```

**Impact**:
- ✅ Meal names now match actual ingredients used
- ✅ Clear examples: "Chicken Roast" → "Tofu Roast"
- ✅ Conditional (only applies if dietType = vegan)

---

### **Fix 5: Accompaniments Mandate**
**Location**: `buildMealPlanPrompt()` → Critical Constraints Section (Line ~2910)

**Added**:
```
8️⃣ 🍛 ACCOMPANIMENTS MANDATE (COMPLETE MEALS ONLY):
   ✅ ALWAYS include chutneys, pickles, or sides with meals
   ✅ Breakfast: Main dish + chutney/curd/fruit
   ✅ Lunch/Dinner: Main dish + dal/curry + chutney + salad
   ❌ WRONG: "Vegetable Stir Fry" alone (incomplete, missing accompaniments)
   ✅ RIGHT: "Vegetable Stir Fry with Coconut Chutney and Cucumber Salad"
   📋 Include accompaniments in ingredients list and recipe steps
```

**Impact**:
- ✅ Mandates accompaniments in CRITICAL section (LLM reads this first)
- ✅ Specific examples for breakfast vs lunch/dinner
- ✅ Instructs to include in ingredients + recipe (not just name)

---

## 📊 **Expected Impact**

| Issue | Fix Applied | Expected Outcome |
|-------|-------------|------------------|
| **Ingredient Repetition** | Comprehensive variety rules for proteins, vegetables, grains, fats, flavors (constraint 5️⃣) | **All diets**: Varied proteins, vegetables, grains, oils across days<br>**Jain diet**: Above-ground vegetables only (NO root veg), hing instead of onion/garlic, proper dal rotation<br>**Vegan**: Plant-based fats only, diverse protein sources<br>**Keto**: Low-carb variety (cauliflower rice, zucchini noodles, almond flour) |
| **Rice Soup Keto** | Grain detection in names (constraint 4️⃣) | NO rice/dal/wheat in keto meal names; only cauliflower rice, almond flour roti |
| **Meal Type Mismatch** | Type-based template grouping (constraint 6️⃣) | Breakfast templates for breakfast, lunch/dinner templates for lunch/dinner, NO soups for breakfast |
| **Non-Vegan Names** | Vegan name adaptation rule (constraint 7️⃣) | "Herb Tofu Roast" instead of "Herb Chicken Roast (Vegan)", "Lite Mushroom Stew" instead of "Lite Prawn Stew (Vegan)" |
| **Missing Accompaniments** | Accompaniments mandate (constraint 8️⃣) | All meals include chutneys/sides: "Poha with Coconut Chutney", "Dal Tadka with Cucumber Salad" |

---

## 🧪 **Testing Recommendations**

### Test Case 1: Comprehensive Ingredient Variety (ALL DIETS)
**Setup**: Any diet type, 7-day plan, any cuisine  
**Expected for Vegetarian/Vegan**:
- Proteins: Day 1 tofu, Day 2 chickpeas, Day 3 lentils, Day 4 mushrooms, Day 5 paneer, Day 6 beans, Day 7 tempeh
- Vegetables: Different colors each day (green → orange → red → white → purple → yellow → mixed)
- Grains: Day 1 brown rice, Day 2 quinoa, Day 3 ragi, Day 4 oats, Day 5 wheat roti, Day 6 bajra, Day 7 jowar
- Oils: Day 1 coconut oil, Day 2 ghee, Day 3 olive oil, Day 4 sesame oil, Day 5 mustard oil, Day 6 peanut oil, Day 7 sunflower oil

**Expected for Jain Diet**:
- Proteins: Paneer, tofu, moong dal, urad dal, masoor dal, chickpeas, toor dal (rotate across days)
- Vegetables: ONLY above-ground (cauliflower, broccoli, cabbage, bottle gourd, pumpkin, spinach, bell peppers)
- ❌ NO root vegetables (potato, onion, garlic, carrot, radish, beetroot, ginger, turnip)
- Flavors: Hing in EVERY savory dish (replaces onion/garlic), curry leaves, tomatoes, tamarind
- Grains: Rice, wheat roti, bajra, jowar, buckwheat (kuttu), amaranth, sabudana

**Expected for Keto**:
- "Carbs": Cauliflower rice, zucchini noodles, almond flour roti, lettuce wraps (rotate daily)
- Proteins: High-fat proteins varied (paneer, eggs, chicken, fish if non-veg)
- Fats: Ghee, coconut oil, olive oil, butter, MCT oil (rotate oils)

**Validation**: 
- Check all ingredient lists for repetition across days
- Verify Jain meals have NO root vegetables or onion/garlic
- Verify Jain meals use hing in tempering
- Verify vegetable color variety (not all green or all white)
- Verify oil rotation in cooking instructions

### Test Case 2: Jain Diet Compliance
**Setup**: Jain diet, 7-day plan, any North/West Indian cuisine (Gujarati, Rajasthani, Maharashtrian)  
**Expected**:
- ✅ Proteins: Paneer, chhena, tofu, dals (moong/urad/masoor/toor), above-ground beans
- ✅ Vegetables: Cauliflower, broccoli, cabbage, lauki, turai, karela, pumpkin, tomatoes, peppers, spinach, methi, bhindi
- ✅ Grains: Rice, wheat roti, bajra, jowar, kuttu (buckwheat), rajgira (amaranth), sabudana
- ✅ Fats: Ghee, butter, coconut oil, sesame oil, peanut oil
- ✅ Flavors: Hing (asafoetida) in EVERY savory dish, curry leaves, tomatoes, tamarind, kokum, amchur, lemon
- ❌ FORBIDDEN: NO potato, onion, garlic, ginger root, carrot, radish, beetroot, turnip, mushrooms

**Validation**: 
- Search ALL ingredients for forbidden items (potato/onion/garlic/carrot/radish/beetroot/ginger/turnip)
- Verify hing appears in tempering/tadka for every savory meal
- Check that mushrooms are NOT included (Jain forbidden)
- Verify recipes use ginger powder (saunth) NOT fresh ginger root

### Test Case 3: Keto Grain Detection
**Setup**: Keto, Manipuri/Bengali (cuisines with rice dishes), 3-day plan  
**Expected**: NO "Rice Soup", "Fish Rice", "Dal" in meal names; only "Cauliflower Rice", "Almond Flour Roti"  
**Validation**: Search meal names for rice/dal/wheat keywords

### Test Case 3: Meal Type Enforcement
**Setup**: Any diet, 3 meals/day (breakfast/lunch/dinner), any cuisine  
**Expected**:
- Breakfast slot: Poha, Upma, Idli, Dosa, Paratha (NOT soup, curry, rice)
- Lunch/Dinner slot: Curry, Dal, Rice dishes, Soup (NOT breakfast items)
**Validation**: Check breakfast meals for soup/curry/heavy dishes

### Test Case 4: Vegan Name Adaptation
**Setup**: Vegan, cuisines with non-veg dishes (Bengali, Manipuri), 3-day plan  
**Expected**: 
- ✅ "Herb Tofu Roast", "Lite Mushroom Stew", "Jackfruit Curry"
- ❌ "Herb Chicken Roast (Vegan)", "Lite Prawn Stew (Vegan)"
**Validation**: Search meal names for chicken/fish/prawn/egg keywords

### Test Case 5: Accompaniments Inclusion
**Setup**: Any diet, any cuisine, 3-day plan  
**Expected**: 
- Breakfast: "Poha with Coconut Chutney and Curd"
- Lunch: "Dal Tadka with Jeera Rice, Cucumber Salad, and Pickle"
**Validation**: Check meal names/ingredients for chutney/salad/pickle/curd

---

## 📝 **Code Changes Summary**

### Files Modified
1. **`server/src/langchain/chains/mealPlanChain.js`** (5 sections modified)

### New Functions Added
1. `inferMealType(doc)` - Line ~323
2. `formatMealsByType(meals)` - Line ~367

### Modified Functions
1. `buildMealPlanPrompt()` - Line ~2990 (Critical Constraints Section)
   - Added constraints 5️⃣ (Protein Variety)
   - Enhanced constraint 4️⃣ (Keto grain detection)
   - Added constraint 6️⃣ (Meal Type Enforcement)
   - Added constraint 7️⃣ (Vegan Name Adaptation)
   - Added constraint 8️⃣ (Accompaniments Mandate)

2. `generateWithRAG()` - Line ~548
   - Changed from `formatMealsForLLM(mealTemplates)` to `formatMealsByType(mealTemplates)`
   - Modified context building to use grouped templates (breakfast/lunch/snack sections)

### Lines Added/Modified
- **New Functions**: ~150 lines (inferMealType + formatMealsByType)
- **Critical Constraints**: ~50 lines (5 new constraint blocks)
- **Context Building**: ~30 lines (grouped template sections)
- **Total**: ~230 lines added/modified

---

## 🔗 **Related Documentation**
- `ANTI_HALLUCINATION_FIXES.md` - Round 1 fixes (forbidden dishes, substitute limiting, meal templates increase)
- `RAG_PROMPT_AUDIT_REPORT.md` - Original prompt audit findings
- `PROMPT_LENGTH_EXPLOSION_ANALYSIS.md` - Token usage analysis

---

## 🎯 **Success Metrics**

### Before Fixes (Testing Round 1)
- ❌ Tofu in 100% of meals (3/3 days) - no protein variety
- ❌ Same vegetables repeated (spinach in all meals)
- ❌ White rice every day - no grain variety
- ❌ Coconut oil only - no fat variety
- ❌ Rice soup for keto breakfast (critical violation)
- ❌ Soup for breakfast (meal type mismatch)
- ❌ "Chicken"/"Prawn" in vegan meal names (2/3 days)
- ❌ No accompaniments in any meals (0/9 meals)
- ❌ Jain meals might include potato, onion, garlic (if tested)

### After Fixes (Expected)
**General Variety (All Diets)**:
- ✅ Protein variety: 7 different proteins over 7 days (tofu, chickpeas, lentils, paneer, mushrooms, tempeh, beans)
- ✅ Vegetable variety: Rainbow colors across week (green, orange, red, white, purple, yellow)
- ✅ Grain variety: 5+ different grains (brown rice, quinoa, ragi, oats, wheat, bajra, jowar)
- ✅ Fat variety: 5+ different oils (coconut, ghee, olive, sesame, mustard, peanut, sunflower)

**Jain-Specific**:
- ✅ NO root vegetables ever (potato, onion, garlic, carrot, radish, beetroot, ginger root)
- ✅ Hing (asafoetida) in every savory dish's tempering
- ✅ Above-ground vegetables only (cauliflower, broccoli, lauki, pumpkin, peppers, etc.)
- ✅ Protein rotation: paneer, tofu, moong dal, urad dal, masoor dal, chickpeas, toor dal
- ✅ Ginger powder (saunth) instead of fresh ginger root

**Keto-Specific**:
- ✅ Low-carb variety: cauliflower rice, zucchini noodles, almond flour roti (rotated daily)
- ✅ NO rice/dal in breakfast or any meal names

**Vegan-Specific**:
- ✅ Plant-based fat variety: coconut oil, olive oil, sesame oil, nut butters (NO ghee/butter)
- ✅ Vegan protein rotation: tofu, tempeh, chickpeas, lentils, beans, jackfruit, nuts

**Other Fixes**:
- ✅ Breakfast: Poha/Upma/Idli (NO soup/curry)
- ✅ Vegan names: "Tofu Roast", "Mushroom Stew" (NO chicken/prawn)
- ✅ Accompaniments: 100% of meals (9/9 meals with chutneys/sides)

---

**Next Steps**:
1. Deploy changes to server
2. Test with original failing case (Manipuri/Tripura/Arunachal, vegan, keto, ₹500)
3. Validate all 5 fixes are working
4. Monitor logs for "Meal type distribution" output
5. If successful, expand testing to other cuisine combinations

---

**Estimated Testing Time**: 15 minutes  
**Confidence Level**: High (all fixes target root causes identified in testing)  
**Risk Level**: Low (changes are additive, no breaking changes)
