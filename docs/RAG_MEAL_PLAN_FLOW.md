# 🍽️ Sakhee Meal Plan Generation & RAG Architecture

## Overview

Sakhee generates personalized PCOS-friendly meal plans using **RAG (Retrieval-Augmented Generation)**. The system combines:

- 🧠 **LLM** (GPT-4o-mini) for intelligent meal generation
- 🔍 **Vector Store** (HNSWLib) for semantic search
- 📚 **Knowledge Base** (meal templates, nutrition guidelines, lab-specific guidance)
- 🏥 **User Data** (medical reports, symptoms, preferences)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MEAL PLAN GENERATION FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

USER REQUEST (Client)
│
├─ Duration: 1-7 days
├─ Meals per day: 2-4
├─ Region: North/South/East/West India
├─ Diet type: Vegetarian/Vegan/Non-veg
├─ Restrictions: Gluten/Dairy/etc.
├─ Budget: ₹ per day
└─ Health context: Symptoms, Goals, Lab values

         │
         ▼
    [Server]
    POST /api/meals/generate

         │
         ▼
    ┌──────────────────────────────────────────────┐
    │   MEALPLANCHAIN.GENERATEWITHRAG()            │
    │                                              │
    │   Step 1: Fetch User Medical Report (Lab)   │
    │   Step 2: Build RAG Queries                 │
    │   Step 3: Retrieve Knowledge Base           │
    │   Step 4: Build Enhanced Prompt             │
    │   Step 5: Invoke LLM                        │
    │   Step 6: Validate & Adjust                 │
    │   Step 7: Return to Client                  │
    └──────────────────────────────────────────────┘

         │
         ▼
    MEAL PLAN JSON + RAG METADATA
    (days, meals, calories, sources used)
```

---

## Detailed Generation Flow (7 Steps)

### **Step 1: Fetch User Medical Report (Lab Values)**

```javascript
// If user has uploaded a medical report
const labValues = healthContext.medicalData?.labValues;

Example labValues structure:
{
  "glucose_fasting": { "value": 105, "unit": "mg/dL", "severity": "high" },
  "insulin_fasting": { "value": 15, "unit": "µIU/mL", "severity": "high" },
  "homa_ir": { "value": 3.9, "unit": "", "severity": "high" },
  "cholesterol_total": { "value": 220, "unit": "mg/dL", "severity": "high" },
  "triglycerides": { "value": 180, "unit": "mg/dL", "severity": "high" },
  "hdl_cholesterol": { "value": 35, "unit": "mg/dL", "severity": "low" },
  "testosterone_total": { "value": 65, "unit": "ng/dL", "severity": "high" },
  "vitamin_d": { "value": 22, "unit": "ng/mL", "severity": "low" }
}
```

**Why it matters**: Lab values help the RAG system retrieve hyper-personalized dietary guidance.

---

### **Step 2: Build RAG Queries**

The system creates **4 separate RAG queries** to retrieve different types of knowledge:

#### **Query A: Meal Templates**

```
Query: "north india vegetarian breakfast lunch dinner PCOS meal templates
        hormone balance low glycemic index"

Purpose: Find meal template examples similar to user's region/diet preferences
```

#### **Query B: Nutrition Guidelines**

```
Query: "PCOS nutrition guidelines weight loss hormone balance
        insulin resistance low glycemic index"

Purpose: Retrieve evidence-based PCOS nutritional guidance
```

#### **Query C: Lab-Specific Dietary Guidance** ⭐ (NEW)

```
Query built from abnormal labs:

IF user has high fasting glucose + high insulin:
  Query: "LAB glucose fasting insulin fasting HOMA-IR SEVERITY
          dietary focus Indian ingredients substitutes PCOS"

IF user has low Vitamin D:
  Query: "LAB vitamin D SEVERITY dietary focus Indian ingredients
          substitutes PCOS"

IF user has high testosterone:
  Query: "LAB testosterone total SEVERITY dietary focus Indian
          ingredients substitutes PCOS"

Purpose: Get specific food recommendations for their abnormal labs
```

#### **Query D: Symptom-Specific Recommendations**

```
Query: "PCOS dietary recommendations for irregular-periods acne
        weight-changes management"

Purpose: Include foods that address their specific symptoms
```

---

### **Step 3: Retrieve Knowledge Base (Vector Store)**

```
┌─────────────────────────────────────────────────┐
│         HNSWLib VECTOR STORE                    │
│     (~94 documents indexed)                     │
│                                                  │
│  Types of documents:                            │
│  • Meal templates (regional variations)         │
│  • PCOS nutrition guidelines                    │
│  • Lab value dietary guidance                   │
│  • Ingredient substitutions                     │
│  • Symptom management foods                     │
│  • Cooking tips & meal planning principles      │
└─────────────────────────────────────────────────┘

For each query, retrieve TOP-K most similar documents:

Query A (Meal Templates):    Retrieve 8 documents
Query B (Nutrition):         Retrieve 5 documents
Query C (Lab Guidance):      Retrieve 10 documents
Query D (Symptoms):          Retrieve 3 documents

Total context: ~25 documents providing evidence-based guidance
```

**Similarity Search**: Uses semantic matching to find relevant meals/guidance based on query meaning (not just keyword matching).

---

### **Step 4: Build Enhanced Prompt**

The system combines all retrieved knowledge into a comprehensive prompt:

```
[SECTION A] MEAL TEMPLATES FROM KNOWLEDGE BASE
├─ Retrieved 8 meal templates (region/diet matched)
├─ Example: "Besan Chilla with Vegetables - 15g protein, 45g carbs,
│           12g fats, 360 kcal, Low GI"
└─ Purpose: Show LLM what good PCOS meals look like

[SECTION B] PCOS NUTRITION GUIDELINES
├─ Retrieved 5 documents on nutrition
├─ Example: "Low GI foods (GI < 55), anti-inflammatory spices
│           (turmeric, cinnamon), hormone-balancing seeds (flaxseeds),
│           adequate protein (15-20g per meal)"
└─ Purpose: Ensure generated meals follow evidence-based guidelines

[SECTION C] LAB-SPECIFIC DIETARY GUIDANCE ⭐
├─ Retrieved 10 lab-specific recommendations
├─ Example for high glucose:
│           "Focus on low-GI foods: bajra, oats, brown rice,
│           lentils, chickpeas, leafy greens. Increase fiber
│           to slow glucose absorption. Avoid white rice,
│           refined flour, sugary items."
├─ Example for low Vitamin D:
│           "Include fortified milk, egg yolks, mushrooms, fatty
│           fish if non-veg. Sunlight exposure. Consider supplements."
└─ Purpose: Personalize meals to address their specific lab abnormalities

[SECTION D] SYMPTOM-SPECIFIC RECOMMENDATIONS
├─ Retrieved 3 documents
├─ Example for irregular periods: "Include flaxseeds, sesame seeds,
│           leafy greens, whole grains"
└─ Purpose: Address their top symptoms

[SECTION E] USER PREFERENCES
├─ Region: North India
├─ Diet Type: Vegetarian
├─ Restrictions: No dairy
├─ Budget: ₹300/day
├─ Medical Report Details:
│   ├─ Fasting Glucose: 105 mg/dL [HIGH] → Use low-GI foods
│   ├─ Fasting Insulin: 15 µIU/mL [HIGH] → Increase fiber
│   ├─ Vitamin D: 22 ng/mL [LOW] → Add fortified foods
│   └─ Testosterone: 65 ng/dL [HIGH] → Use anti-androgenic foods
└─ Purpose: Provide personalization context

[SECTION F] CRITICAL REQUIREMENTS
├─ Generate 7 days × 3 meals = 21 unique meals
├─ NO meal repetition across any days
├─ EACH meal: protein, carbs, fats, calories, GI, time, tip
├─ DAILY TOTAL: ~2000 kcal (1900-2100 acceptable range)
├─ Per meal calories: ~667 kcal (with ±15% tolerance)
├─ Calculate calories: (protein × 4) + (carbs × 4) + (fats × 9)
├─ PRIORITIZE lab-specific guidance over generic guidelines
└─ Output as JSON only
```

---

### **Step 5: Invoke LLM**

```javascript
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.8,        // Some creativity (0 = deterministic, 1 = random)
  maxTokens: 8192,         // Room for detailed meal descriptions
  response_format: { type: 'json_object' }  // Force JSON output
});

const response = await llm.invoke(comprehensivePrompt);

// Response: JSON object with meal plan structure
{
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Bajra Khichdi with Moong Dal & Spinach",
          "ingredients": [
            "100g bajra",
            "50g moong dal",
            "150g spinach",
            "1 tsp ghee",
            "salt, turmeric"
          ],
          "protein": 18,
          "carbs": 50,
          "fats": 8,
          "calories": 362,
          "gi": "Low",
          "time": "25 mins",
          "tip": "Cook bajra until soft. Bajra's low GI helps manage insulin spikes."
        },
        // ... 2 more meals (lunch, dinner)
      ]
    },
    // ... 6 more days
  ]
}
```

**Why GPT-4o-mini**:

- Cheaper than GPT-4 (~$0.30 per meal plan generation vs $3+)
- Still intelligent enough for meal planning
- Supports JSON mode for structured output

---

### **Step 6: Validate & Adjust Calories**

The backend validates and adjusts the LLM output:

```javascript
// Validation checks:
✓ Has 7 days (if requested)
✓ Each day has 3 meals
✓ Each meal has required fields (name, protein, carbs, fats, etc.)
✓ Daily calorie total is 1900-2100 kcal

// If calories are off, scale proportionally:
if (dailyTotal < 1900 || dailyTotal > 2100) {
  scaleFactor = 2000 / dailyTotal;

  day.meals.forEach(meal => {
    meal.protein = Math.round(meal.protein × scaleFactor);
    meal.carbs = Math.round(meal.carbs × scaleFactor);
    meal.fats = Math.round(meal.fats × scaleFactor);
    meal.calories = recalculate;  // (protein×4) + (carbs×4) + (fats×9)
  });
}

// If still off by a few calories, adjust largest meal's carbs
```

---

### **Step 7: Return Enhanced Response**

```javascript
{
  "days": [ /* 7 days of meals */ ],

  "ragMetadata": {
    "mealTemplatesUsed": 8,
    "nutritionGuidelinesUsed": 5,
    "labGuidanceUsed": 10,           // ⭐ NEW: Lab-specific guidance count
    "symptomSpecificRecommendations": true,
    "retrievalQuality": "high",      // Based on total docs retrieved
    "retrievalQualityLevels": {
      "high": "5+ templates, comprehensive guidelines",
      "medium": "2-4 templates, partial guidelines",
      "low": "0-1 templates, fallback mode"
    }
  }
}
```

This metadata is shown to the user in `MealPlanDisplay.jsx` to build transparency and trust.

---

## Chunked Generation (For Longer Plans)

If user requests **> 3 days**, the system breaks it into chunks:

```
Request: 7-day meal plan

Split into:
├─ Chunk 1: Days 1-3 (call RAG + LLM)
├─ Chunk 2: Days 4-6 (call RAG + LLM)
└─ Chunk 3: Day 7   (call RAG + LLM)

Why:
- Prevents LLM token overload
- Improves consistency (3-day chunk has higher quality)
- Each chunk gets fresh RAG context
- More reliable than single 7-day generation

Combined Result: 7-day meal plan from 3 separate LLM calls
```

---

## Fallback Strategy

If RAG retrieval fails or LLM generation errors:

```
Level 1 (Preferred): RAG + LLM generation (shown above)
         ▼ [fails]
Level 2: Use predefined regional templates (no RAG)
         - Hardcoded meal templates for each region
         - Still includes protein, carbs, fats, calories
         - No personalization by lab values
         ▼ [fails]
Level 3: Single meal per meal type
         - Minimal PCOS-friendly meal
         - Generic guidance
         - Last resort
```

---

## Lab-Specific Dietary Guidance (NEW in v1.7.0)

The lab guidance feature maps abnormal lab values to dietary interventions:

```javascript
// Example: User has high fasting glucose + high HOMA-IR

buildLabGuidanceQuery() detects:
├─ glucose_fasting: 105 (HIGH)
├─ homa_ir: 3.9 (HIGH)
└─ insulin_fasting: 15 (HIGH)

Maps to query terms:
└─ "glucose fasting", "insulin fasting", "HOMA-IR insulin resistance"

Retrieves from RAG:
├─ "For high fasting glucose: Choose low-GI foods (GI < 55):
│   bajra, oats, brown rice, whole wheat, lentils, chickpeas"
├─ "Increase soluble fiber to slow carb absorption"
├─ "Avoid white rice, refined flour, sugary fruits"
├─ "Pair carbs with protein and healthy fats to reduce glucose spike"
└─ "Indian low-GI foods: dosa (ragi), upma (oats), idli (semolina + rice)"

Injects into prompt:
└─ "🔬 LAB-SPECIFIC DIETARY GUIDANCE:
    For user's elevated fasting glucose and insulin resistance:
    - Prioritize low-GI meals (GI < 55)
    - [... full guidance ...]"

LLM uses this in meal generation:
└─ "Breakfast: Ragi Dosa (ragi flour, low-GI staple)
          + Sambar (vegetable protein) instead of white-rice dosa"
```

---

## RAG Metrics & Transparency

Every meal plan includes transparency metrics:

```json
{
  "personalizationSources": {
    "onboarding": true, // User data from signup
    "medicalReport": true, // Lab values from medical report
    "userOverrides": false, // Manual region/diet change
    "ragQuality": "high", // Retrieval quality score
    "ragSources": {
      "mealTemplates": 8,
      "nutritionGuidelines": 5,
      "labGuidance": 10,
      "symptomRecommendations": true
    }
  }
}
```

**Quality Levels**:

- **High**: 5+ templates, 5+ guidelines, 5+ lab-specific docs
- **Medium**: 2-4 templates, 2-4 guidelines
- **Low**: <2 templates, minimal context
- **None**: Fallback templates only

---

## Key Files & Functions

### **Server-Side**

| File               | Key Function                  | Purpose                                       |
| ------------------ | ----------------------------- | --------------------------------------------- |
| `mealPlanChain.js` | `generateWithRAG()`           | Main RAG + LLM orchestration                  |
| `mealPlanChain.js` | `buildLabGuidanceQuery()`     | Create query for abnormal labs                |
| `mealPlanChain.js` | `categorizeLabs()`            | Group labs by health domain                   |
| `mealPlanChain.js` | `buildUserContextWithLabs()`  | Detailed user context with lab interpretation |
| `mealPlanChain.js` | `validateAndAdjustCalories()` | Ensure 2000 kcal daily total                  |
| `retriever.js`     | `retrieve()`                  | Semantic search in vector store               |
| `retriever.js`     | `formatContextFromResults()`  | Format RAG results for LLM                    |
| `vectorStore.js`   | `similaritySearch()`          | HNSWLib similarity search                     |

### **Client-Side**

| File                     | Component | Purpose                                         |
| ------------------------ | --------- | ----------------------------------------------- |
| `MealPlanGenerator.jsx`  | Form      | Collect user preferences & fetch medical report |
| `MealPlanDisplay.jsx`    | Display   | Show generated meals + RAG metadata             |
| `RAGMetadataDisplay.jsx` | Info card | Display retrieval quality & sources             |
| `MealCard.jsx`           | Meal card | Show individual meal with nutrition             |

---

## Performance Characteristics

```
Metrics:
├─ RAG retrieval time: ~200-500ms (HNSWLib similarity search)
├─ LLM generation time: ~2-5 seconds (API call + token generation)
├─ Validation + adjustment: ~100-200ms
├─ Total end-to-end: ~3-7 seconds per 3-day chunk
├─ 7-day plan (3 chunks): ~10-15 seconds
└─ API call count: 3 (one per chunk for 7-day)

Optimization:
├─ HNSWLib is fast in-memory HANN (Hierarchical Navigable Small World)
├─ topK=5-10 retrieval is balanced (not too many, not too few)
├─ 3-day chunks prevent token overload
├─ Temperature=0.8 balances creativity vs consistency
└─ Vector embeddings cached in memory (no re-embedding)
```

---

## Example: End-to-End Meal Plan Generation

```
┌─────────────────────────────────────────────────────┐
│  USER CLICKS "GENERATE MEAL PLAN"                   │
└─────────────────────────────────────────────────────┘

Input:
├─ Duration: 7 days
├─ Meals/day: 3
├─ Region: North India
├─ Diet: Vegetarian
├─ Restrictions: Gluten
├─ Symptoms: Irregular periods, acne
├─ Medical Report: Uploaded (High glucose, low Vitamin D)
└─ Budget: ₹300/day

         │
         ▼
    ┌──────────────────────────────────┐
    │  CHECK DURATION > 3?              │
    │  YES → generateInChunks()         │
    └──────────────────────────────────┘
         │
    ┌────┴────┐
    │ CHUNK 1  │  (Days 1-3)
    │ CHUNK 2  │  (Days 4-6)
    │ CHUNK 3  │  (Day 7)
    └────┬────┘
         │
         ▼
    ┌──────────────────────────────────────────┐
    │  FOR EACH CHUNK: generateWithRAG()       │
    │                                          │
    │  Step 1: Retrieve lab values             │
    │  ├─ Glucose: 105 [HIGH]                  │
    │  ├─ Vitamin D: 22 [LOW]                  │
    │  └─ Testosterone: 65 [HIGH]              │
    │                                          │
    │  Step 2: Build 4 RAG queries             │
    │  ├─ Meal templates (8 docs)              │
    │  ├─ Nutrition guidelines (5 docs)        │
    │  ├─ Lab guidance (10 docs)               │
    │  └─ Symptom guidance (3 docs)            │
    │                                          │
    │  Step 3: Retrieve from vector store      │
    │  ├─ Query 1: 8 docs retrieved            │
    │  ├─ Query 2: 5 docs retrieved            │
    │  ├─ Query 3: 10 docs retrieved           │
    │  └─ Query 4: 3 docs retrieved            │
    │                                          │
    │  Step 4: Build comprehensive prompt      │
    │  ├─ Meal templates section               │
    │  ├─ Nutrition guidelines section         │
    │  ├─ Lab guidance section (HIGH PRIORITY) │
    │  ├─ Symptom guidance section             │
    │  └─ Requirements (calories, JSON, etc.)  │
    │                                          │
    │  Step 5: Call LLM                        │
    │  └─ GPT-4o-mini returns 3-day JSON       │
    │                                          │
    │  Step 6: Validate structure              │
    │  ├─ Check: 3 days × 3 meals = 9 meals   │
    │  ├─ Check: Each meal has all fields      │
    │  └─ Check: Calories are reasonable       │
    │                                          │
    │  Step 7: Validate & adjust calories      │
    │  ├─ Day 1 total: 1950 kcal [OK]          │
    │  ├─ Day 2 total: 2080 kcal [ADJUST DOWN]│
    │  └─ Day 3 total: 1920 kcal [OK]          │
    │                                          │
    │  Step 8: Add RAG metadata                │
    │  ├─ mealTemplatesUsed: 8                 │
    │  ├─ nutritionGuidelinesUsed: 5           │
    │  ├─ labGuidanceUsed: 10                  │
    │  ├─ symptomSpecific: true                │
    │  └─ retrievalQuality: "high"             │
    └──────────────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │          │          │          │
    ▼          ▼          ▼          ▼
  DAY 1      DAY 2      DAY 3      DAY 4
   [+]        [+]        [+]        [+]

   ... repeat for Chunks 2 & 3 ...

         │
         ▼
    ┌──────────────────────────────────────┐
    │  COMBINE ALL CHUNKS                  │
    │  7-day meal plan ready!              │
    └──────────────────────────────────────┘
         │
         ▼
    SEND TO CLIENT
    ├─ days: [7 days × 3 meals = 21 meals]
    ├─ ragMetadata: {sources, quality}
    └─ personalizationSources: {data used}
         │
         ▼
    CLIENT DISPLAYS
    ├─ MealPlanDisplay.jsx
    ├─ RAGMetadataDisplay.jsx (transparency)
    ├─ MealCard.jsx (individual meals)
    └─ PDF Export button
```

---

## Debugging & Monitoring

Check RAG health:

```bash
npm run vector:health
# ✓ Vector Store Exists
# ✓ OpenAI API Key
# ✓ File Permissions
# ✓ Vector Store Loading
# Approximate document count: 94
```

View RAG status:

```bash
curl http://localhost:5000/api/rag/status
# Returns: vector store size, templates indexed, health info
```

Check meal plan logs:

```bash
# Server logs show:
# - RAG queries built
# - Documents retrieved (counts)
# - LLM invocation details
# - Calorie validation/adjustments
# - RAG metadata compiled
```

---

## Summary

**Sakhee's RAG meal plan generation**:

1. ✅ Retrieves 25-30 relevant documents from vector store
2. ✅ Prioritizes lab-specific dietary guidance for abnormal values
3. ✅ Combines with user preferences (region, diet, symptoms, goals)
4. ✅ Sends comprehensive prompt to GPT-4o-mini
5. ✅ LLM generates personalized 3-day chunk (or full plan in chunks)
6. ✅ Validates structure and adjusts calories to 2000 kcal target
7. ✅ Returns meal plan + transparency metadata to user
8. ✅ Shows what sources influenced each plan (trust building)

**Why this approach works**:

- 🎯 **Personalization**: Lab values + symptoms + preferences all guide meal selection
- 📚 **Evidence-based**: All recommendations come from curated knowledge base
- 🧠 **Scalable**: RAG allows easy addition of new meal templates or guidelines
- ⚡ **Reliable**: Chunking + validation + fallbacks ensure consistent output
- 🔍 **Transparent**: Users see exactly what influenced their plan
