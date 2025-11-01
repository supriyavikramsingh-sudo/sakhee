# PCOS-Friendly Nutrition Guidance Enhancement

**Date**: November 1, 2025  
**Version**: v1.8.2

## Issue

When users ask about nutritional information for dishes (e.g., "What are the nutritional breakdown of dal dhokli?"), the bot provides:
- ✅ Nutrition facts (calories, protein, carbs, fats)
- ✅ Source links (Google SERP)
- ❌ **Missing: PCOS-friendly alternatives and ingredient substitutions**

This is a critical gap because:
- Many Indian dishes are high-carb, low-protein, or fried - not ideal for PCOS
- Users need **actionable guidance** on how to make dishes PCOS-friendly
- Simply providing nutrition facts doesn't help users manage PCOS symptoms
- Users might avoid healthy traditional dishes thinking they're "bad" when simple modifications can make them PCOS-friendly

---

## Solution

Enhanced the system prompt with **mandatory PCOS-friendly modification guidelines** for ALL nutrition queries.

### New Requirements for LLM

Every nutrition response must now include:

1. **Nutrition Facts** - Macros (calories, protein, carbs, fats, GI)

2. **PCOS Analysis** - Classify the dish:
   - ✅ **PCOS-Friendly**: High protein (>15g), low GI, moderate healthy fats, fiber-rich
   - ⚠️ **Needs Modification**: High carb, low protein, high refined carbs, fried
   - ❌ **Not Recommended**: Very high GI, mostly refined carbs, minimal protein, trans fats

3. **🔄 PCOS-Friendly Modifications** - MANDATORY section with:
   
   **To Reduce GI & Carbs:**
   - Replace white rice → brown rice, quinoa, cauliflower rice
   - Replace wheat flour → chickpea flour (besan), almond flour, multigrain atta
   - Replace refined sugar → stevia, erythritol, dates (minimal)
   - Add flaxseed/chia seeds for fiber

   **To Boost Protein:**
   - Add paneer, tofu, Greek yogurt
   - Include dal/lentils as side
   - Add boiled egg or roasted chickpeas
   - Mix protein powder into batters

   **To Reduce Unhealthy Fats:**
   - Bake or air-fry instead of deep-frying
   - Use minimal ghee/oil (1-2 tsp max)
   - Replace with olive oil, mustard oil
   - Skip or reduce tempering/tadka

   **Portion Control Tips:**
   - Pair with fiber-rich sides
   - Eat protein first, then carbs
   - Limit portion size
   - Have it earlier in the day

4. **Better Alternatives** - For clearly unhealthy foods, suggest complete replacements

5. **Meal Plan Feature Mention** - Redirect users to personalized meal planning

---

## Example Enhanced Responses

### Example 1: High-Carb Traditional Dish (Dal Dhokli)

**User Query**: "What are the nutritional breakdown of dal dhokli?"

**Enhanced Response** (what LLM should generate):

```
Dal Dhokli is a nutritious Gujarati dish! Here's the breakdown per serving:

**Nutrition Facts (per 100g):**
- Calories: 330-366
- Protein: 10.5-12.29g
- Carbs: 49.2-52.38g
- Fats: 8.7-14.5g
- GI: Medium-High ⭐⭐

**PCOS Analysis:** ⚠️ Needs Modification
While dal dhokli provides protein from lentils, the refined wheat flour makes it high in carbs and medium-high GI, which can spike blood sugar and insulin.

**🔄 PCOS-Friendly Modifications:**

**To Reduce GI & Boost Fiber:**
- Replace 50% wheat flour with chickpea flour (besan) or ragi flour
- Add 2 tbsp ground flaxseed to the dough
- Use whole wheat atta instead of refined flour

**To Boost Protein:**
- Increase dal quantity by 50% (more protein, fewer wheat pieces)
- Add 50g crumbled paneer or 1 boiled egg on top
- Serve with Greek yogurt raita (extra protein)

**To Control Portions:**
- Limit to 1 bowl (200g max)
- Eat a side salad first
- Have it for lunch, not dinner
- Add extra vegetables (spinach, fenugreek) for fiber

**Better Alternative:** Try 100% chickpea flour (besan dhokli) + double the dal for higher protein and lower GI!

💡 **Want more PCOS-friendly Indian meal ideas?** Check out our Meal Plan feature for weekly plans customized to your needs!

[Sources from Google]
```

---

### Example 2: Fried/Unhealthy Food (Samosa)

**User Query**: "nutritional info on samosa"

**Enhanced Response**:

```
Samosa (per piece, ~100g):
- Calories: 250-300
- Protein: 4-5g (LOW)
- Carbs: 35-40g (HIGH, refined flour)
- Fats: 12-15g (HIGH, deep-fried)
- GI: High ⭐

**PCOS Analysis:** ❌ Not Recommended
Samosas are deep-fried in refined oil, made with maida (refined flour), and have minimal protein. This causes rapid blood sugar spikes and inflammation - not ideal for PCOS.

**🔄 PCOS-Friendly Alternatives:**

**Instead of Samosa, Try:**
1. **Baked Whole Wheat Samosa** - Use whole wheat flour, bake instead of fry, fill with protein-rich moong dal
2. **Paneer Tikka** - High protein, grilled, flavorful
3. **Baked Chickpea Cutlets** - Protein-rich, fiber-loaded, crispy when baked
4. **Air-Fried Veg Kebabs** - Mixed with besan and veggies

**If You Must Have Samosa:**
- Limit to 1 piece (special occasions)
- Bake or air-fry instead of deep fry
- Use whole wheat + chickpea flour mix
- Fill with protein (paneer, sprouted moong)
- Eat with big salad and protein side
- Have it early in the day, not evening

**Better PCOS Snacks:**
- Roasted chickpeas
- Sprouts chaat
- Greek yogurt with nuts
- Boiled egg with veggies
- Paneer cubes with cucumber

💡 **Want satisfying snack recipes?** Our Meal Plan feature includes PCOS-friendly snack ideas!

[Sources from Google]
```

---

### Example 3: Already PCOS-Friendly (Grilled Chicken Salad)

**User Query**: "nutrition of grilled chicken salad"

**Enhanced Response**:

```
Grilled Chicken Salad (per serving):
- Calories: 250-300
- Protein: 30-35g (HIGH)
- Carbs: 10-15g (LOW)
- Fats: 10-12g (healthy fats)
- GI: Low ⭐⭐⭐

**PCOS Analysis:** ✅ Excellent Choice!
This is a perfect PCOS-friendly meal - high protein helps stabilize blood sugar, low carbs prevent insulin spikes, and healthy fats support hormone balance.

**✨ Optional Enhancements:**

**To Make It Even Better:**
- Add 2 tbsp nuts/seeds (almonds, pumpkin seeds) for extra protein and omega-3s
- Use Greek yogurt-based dressing (adds protein, probiotics)
- Include chickpeas (extra fiber and plant protein)
- Add avocado slices (healthy fats for satiety)

**Similar PCOS-Friendly Meals:**
- Paneer tikka with quinoa salad
- Fish curry with cauliflower rice
- Egg bhurji with multigrain roti
- Dal with mixed vegetable sabzi

💡 **Want a full week of meals like this?** Our Meal Plan feature creates personalized plans with PCOS-friendly recipes!

[Sources from Google]
```

---

## Implementation Details

### Changes Made

**File**: `server/src/langchain/chains/chatChain.js`  
**Section**: `buildEnhancedSystemPrompt()` - Added new section after Reddit guidelines

**New Guidelines Added** (lines ~150-230):

```javascript
## CRITICAL: Nutrition Query Guidelines

When users ask about nutritional information for ANY food/dish:

### ALWAYS Provide PCOS-Friendly Analysis & Alternatives

1. **Nutrition Facts First**
2. **PCOS-Friendliness Assessment** (Friendly/Needs Modification/Not Recommended)
3. **MANDATORY: Ingredient Substitutions Section**
   - To Reduce GI & Carbs
   - To Boost Protein
   - To Reduce Unhealthy Fats
   - Portion Control Tips
4. **Example Enhanced Response Format** (3 examples provided)

## MANDATORY SECTIONS for ALL Nutrition Queries:
1. Nutrition Facts (macros)
2. PCOS Analysis
3. Modifications OR Alternatives
4. Portion tips
5. Meal Plan feature mention
```

---

## Testing

### Test Case 1: High-Carb Traditional Dish

**Input**: "What are the nutritional breakdown of dal dhokli?"

**Expected**:
- ✅ Nutrition facts provided
- ✅ "PCOS Analysis: ⚠️ Needs Modification" section
- ✅ Ingredient substitutions (besan for wheat flour, add flaxseed, etc.)
- ✅ Protein-boosting tips (paneer, egg, Greek yogurt)
- ✅ Portion control advice
- ✅ Better alternative suggested (100% besan dhokli)
- ✅ Meal Plan feature mention

### Test Case 2: Fried/Junk Food

**Input**: "nutritional info on samosa"

**Expected**:
- ✅ Nutrition facts showing LOW protein, HIGH carbs/fats
- ✅ "PCOS Analysis: ❌ Not Recommended"
- ✅ Complete alternatives suggested (paneer tikka, baked cutlets, etc.)
- ✅ "If You Must Have" modifications (bake, whole wheat, protein filling)
- ✅ Better PCOS snack options list
- ✅ Meal Plan feature mention

### Test Case 3: Already PCOS-Friendly

**Input**: "nutrition of grilled chicken salad"

**Expected**:
- ✅ Nutrition facts showing HIGH protein, LOW carbs
- ✅ "PCOS Analysis: ✅ Excellent Choice"
- ✅ Optional enhancements (nuts, Greek yogurt dressing, chickpeas)
- ✅ Similar PCOS-friendly meal ideas
- ✅ Meal Plan feature mention

### Test Case 4: Regional/Ethnic Dish

**Input**: "nutritional info on nagaland fish curry"

**Expected**:
- ✅ Nutrition facts (from RAG meal templates + SERP)
- ✅ PCOS Analysis (likely: ✅ Friendly - fish is high protein, low GI)
- ✅ Enhancements if needed (pair with brown rice, add veggies)
- ✅ Regional context maintained
- ✅ Meal Plan feature mention

---

## Impact

### Before This Change
- ❌ Users got nutrition facts only
- ❌ No guidance on PCOS-friendliness
- ❌ No ingredient substitutions
- ❌ No actionable modifications
- ❌ Users might avoid traditional foods unnecessarily
- ❌ No clear path to better alternatives

### After This Change
- ✅ Every nutrition query includes PCOS analysis
- ✅ Ingredient substitutions provided for ALL non-optimal dishes
- ✅ Actionable modifications (reduce GI, boost protein, healthier fats)
- ✅ Portion control guidance
- ✅ Better alternatives suggested
- ✅ Users empowered to make PCOS-friendly versions of favorite foods
- ✅ Redirected to Meal Plan feature for comprehensive planning

---

## User Benefits

1. **Empowerment**: Users can still enjoy traditional foods with simple modifications
2. **Clarity**: Clear classification of PCOS-friendliness (Friendly/Needs Modification/Not Recommended)
3. **Actionable**: Specific ingredient swaps and cooking method changes
4. **Culturally Sensitive**: Maintains Indian cuisine context while improving health outcomes
5. **Comprehensive**: Covers all scenarios (healthy, needs modification, unhealthy)
6. **Educational**: Explains WHY modifications help (GI reduction, blood sugar control, etc.)

---

## Edge Cases Handled

1. **Dish with No Issues**: Provide optional enhancements instead of modifications
2. **Very Unhealthy Food**: Suggest complete alternatives rather than just modifications
3. **Regional Dishes**: Maintain cultural context while providing PCOS guidance
4. **Mixed Dishes**: Address each component (e.g., dal is good, dhokli needs modification)

---

## Related Documentation

- Main nutrition guidance: This document
- SERP sources fix: `/docs/SERP_SOURCES_FIX.md`
- RAG & disclaimer fixes: `/docs/CHAT_RAG_DISCLAIMER_FIXES.md`
- README: `/README.md` (section: Key Features → Personalized Meal Planning)

---

## Future Enhancements

1. **RAG Integration**: Add PCOS-friendly recipe variations to meal templates
2. **Swap Database**: Build a comprehensive ingredient substitution database
3. **GI Calculator**: Automatically estimate GI reduction from substitutions
4. **Regional Variations**: Provide region-specific PCOS modifications
5. **Shopping Lists**: Generate ingredient lists for PCOS-friendly versions
6. **Video Tutorials**: Link to cooking demos for modified recipes

---

**Status**: ✅ Complete (syntax check passed, ready to test)

**Next Steps**:
1. Restart server
2. Test with various nutrition queries (high-carb, fried, healthy, regional)
3. Verify LLM includes all mandatory sections
4. Monitor user feedback on helpfulness of modifications
