# Multi-Cuisine Balancing - Quick Reference

## 🎯 Distribution Formulas

### Retrieval Quota (70 total templates)

| Cuisines | Per Cuisine | Distribution          |
|----------|-------------|-----------------------|
| 1        | 70          | [70]                  |
| 2        | 35          | [35, 35]              |
| 3        | 23-24       | [23, 23, 24]          |
| 4        | 17-18       | [17, 17, 18, 18]      |
| 5        | 14          | [14, 14, 14, 14, 14]  |

### Meal Type Split (per cuisine)

| Type          | % of Quota | Example (35 quota) |
|---------------|------------|--------------------|
| Breakfast     | 25%        | 9 templates        |
| Lunch/Dinner  | 60%        | 21 templates       |
| Snacks        | 10%        | 4 templates        |
| General       | 5%         | 1 template         |

## 📊 Final Meal Plan Distribution

### Example: 3 Cuisines, 7 Days (21 meals)

**Target**: 7 meals per cuisine  
**Acceptable**: 6-8 meals per cuisine (±2 variance)

**Rotation Pattern**:
```
Day 1: [A, B, C]
Day 2: [B, C, A]
Day 3: [C, A, B]
Day 4: [A, B, C]
Day 5: [B, C, A]
Day 6: [C, A, B]
Day 7: [A, B, C]
```

**Result**: 7 A, 7 B, 7 C ✅

## 🚫 Frontend Validation

**Max Cuisines**: 5  
**User Tries 6**: Alert → "Maximum 5 cuisines allowed for balanced meal distribution"  
**Visual Indicator**: "5/5 cuisines selected - Maximum reached" (orange text)

## 🔍 Debugging Checklist

### Uneven Distribution?
1. Check LLM prompt has cuisine targets
2. Verify deduplication maintains balance
3. Count meals per cuisine in final plan
4. Expected variance: ±2 meals

### Wrong Meal Type?
1. Verify `inferMealType()` accuracy
2. Check meal type filtering logic
3. Add debug logs: `console.log(\`Query: \${queryMealType}, Template: \${mealType}\`)`

### Retrieval Issues?
1. Verify quota calculation: `TOTAL_TEMPLATES / cuisineCount`
2. Check meal type split sums to quota
3. Confirm topK values in queries
4. Log template counts per cuisine

## 📁 Modified Files

1. **Backend**: `server/src/langchain/chains/mealPlanChain.js`
   - Lines 1275-1365: Quota-based retrieval
   - Lines 1440-1465: Meal type filtering
   - Lines 3497-3560: LLM distribution guidance

2. **Frontend**: `frontend/src/components/meal/MealPlanGenerator.tsx`
   - Lines 60-68: Type definition for formData
   - Lines 420-445: Max 5 cuisine validation
   - Lines 446-448: Visual indicators

3. **Documentation**: `Important Docs/MULTI_CUISINE_BALANCING.md`

## ✅ Testing Scenarios

| Test | Cuisines | Days | Expected Meals/Cuisine | Variance |
|------|----------|------|------------------------|----------|
| 1    | 2        | 3    | 4-5                    | ±1       |
| 2    | 3        | 7    | 7                      | ±2       |
| 3    | 4        | 5    | 3-4                    | ±1       |
| 4    | 5        | 5    | 3                      | ±1       |
| 5    | 6 attempt| -    | Limited to 5           | -        |

## 🔗 Related Docs

- Full Documentation: `MULTI_CUISINE_BALANCING.md`
- Allergen Substitution: `ALLERGEN_INTELLIGENT_SUBSTITUTION.md`
- RAG Optimizations: `RAG_OPTIMIZATIONS_GUIDE.md`
