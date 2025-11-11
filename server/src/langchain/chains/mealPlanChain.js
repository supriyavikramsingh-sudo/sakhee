// server/src/langchain/chains/mealPlanChain.js
import { ChatOpenAI } from '@langchain/openai';
import { env } from '../../config/env.js';
import { retriever } from '../retriever.js';
import { Logger } from '../../utils/logger.js';
import { deduplicator } from '../../utils/deduplicator.js';
import { HybridReRanker } from '../reranker.js';
import { performanceMetrics } from '../../utils/performanceMetrics.js';

const logger = new Logger('MealPlanChain');

/**
 * Map cuisines to their parent regions for cuisine contamination prevention
 * Used by buildForbiddenDishList and validation methods
 */
const CUISINE_TO_REGION_MAP = {
  // South Indian cuisines
  tamil: 'south-indian',
  telugu: 'south-indian',
  kerala: 'south-indian',
  karnataka: 'south-indian',
  andhra: 'south-indian',
  puducherry: 'south-indian',

  // East Indian cuisines
  bengali: 'east-indian',
  odia: 'east-indian',
  assamese: 'east-indian',
  manipuri: 'east-indian',
  bihari: 'east-indian',
  mizo: 'east-indian',
  naga: 'east-indian',
  sikkimese: 'east-indian',
  meghalayan: 'east-indian',
  jharkhandi: 'east-indian',
  arunachali: 'east-indian',
  tripuri: 'east-indian',

  // North Indian cuisines
  punjabi: 'north-indian',
  rajasthani: 'north-indian',
  'uttar pradesh': 'north-indian',
  uttarakhand: 'north-indian',
  haryanvi: 'north-indian',
  kashmiri: 'north-indian',
  himachali: 'north-indian',

  // West Indian cuisines
  gujarati: 'west-indian',
  maharashtrian: 'west-indian',
  goan: 'west-indian',

  // Central Indian cuisines
  chhattisgarh: 'central-indian',
  'madhya pradesh': 'central-indian',
};

/**
 * Helper function to get meal structure description based on meals per day
 */
function getMealStructure(mealsPerDay) {
  const structures = {
    2: 'Breakfast + Dinner (2 large meals)',
    3: 'Breakfast + Lunch + Dinner',
    4: 'Breakfast + Lunch + Snack + Dinner',
  };
  return structures[mealsPerDay] || structures[3];
}

/**
 * Calculate breakfast calorie target based on total daily calories and meals per day
 */
function getBreakfastCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: dailyCalories * 0.4, // 40% for 2 meals
    3: dailyCalories * 0.3, // 30% for 3 meals
    4: dailyCalories * 0.25, // 25% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.3);
}

/**
 * Calculate lunch calorie target based on total daily calories and meals per day
 */
function getLunchCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: 0, // No lunch in 2-meal plan
    3: dailyCalories * 0.4, // 40% for 3 meals
    4: dailyCalories * 0.35, // 35% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.35);
}

/**
 * Calculate dinner calorie target based on total daily calories and meals per day
 */
function getDinnerCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: dailyCalories * 0.6, // 60% for 2 meals
    3: dailyCalories * 0.3, // 30% for 3 meals
    4: dailyCalories * 0.25, // 25% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.35);
}

/**
 * Calculate snack calorie target based on total daily calories and meals per day
 */
function getSnackCalories(dailyCalories, mealsPerDay) {
  const snackCalories = {
    2: 0, // No snack in 2-meal plan
    3: 0, // No snack in 3-meal plan
    4: dailyCalories * 0.15, // 15% for 1 snack in 4-meal plan
  };
  return Math.round(snackCalories[mealsPerDay] || 0);
}

/**
 * Validate breakfast meal to ensure it's breakfast-appropriate
 */
function validateBreakfast(breakfast) {
  const issues = [];
  const inappropriateKeywords = [
    'curry',
    'gravy',
    'masala',
    'biryani',
    'pulao',
    'rice',
    'chole',
    'rajma',
    'kadhi',
  ];

  // Check for inappropriate breakfast items
  const mealName = breakfast.name?.toLowerCase() || '';
  inappropriateKeywords.forEach((keyword) => {
    if (mealName.includes(keyword)) {
      issues.push(`Inappropriate breakfast item detected: "${keyword}" found in meal name`);
    }
  });

  // Check component count
  const components = breakfast.components || breakfast.ingredients || [];
  if (components.length < 2) {
    issues.push('Breakfast should have at least 2 components (main + accompaniment/beverage)');
  }

  // Check for inflated calories in single component
  components.forEach((component) => {
    if (component.calories > 400) {
      issues.push(
        `Component "${component.item || component.name}" has unusually high calories (${
          component.calories
        }). Consider splitting or adding variety.`
      );
    }
  });

  return issues;
}

/**
 * Validate lunch/dinner meal
 */
function validateMeal(meal, mealType) {
  const issues = [];

  // Check component count
  const components = meal.components || meal.ingredients || [];
  if (components.length < 2) {
    issues.push(`${mealType} should have at least 2 components for balanced nutrition`);
  }

  // Check for inflated calories in single component
  components.forEach((component) => {
    // Simple heuristic check
    if (component.calories > 500) {
      issues.push(
        `Component "${component.item || component.name}" has unusually high calories (${
          component.calories
        }). Consider adding accompaniments instead of inflating.`
      );
    }
  });

  return issues;
}

/**
 * Validate snack
 */
function validateSnack(snack) {
  const issues = [];

  // Snacks should be light
  if (snack.calories > 300) {
    issues.push(`Snack calories (${snack.calories}) too high. Snacks should be 100-250 kcal.`);
  }

  // Snacks should be simple
  const components = snack.components || snack.ingredients || [];
  if (components.length > 3) {
    issues.push('Snack too complex. Keep snacks simple with 1-2 components.');
  }

  return issues;
}

/**
 * Validate entire meal plan for calorie accuracy and meal appropriateness
 */
function validateMealPlan(mealPlan, dailyCalories, mealsPerDay) {
  const issues = [];

  mealPlan.days.forEach((day, dayIndex) => {
    let dayTotalCalories = 0;

    // Validate each meal based on type
    day.meals?.forEach((meal, mealIndex) => {
      const mealType = meal.mealType?.toLowerCase();
      let mealIssues = [];

      if (mealType === 'breakfast') {
        mealIssues = validateBreakfast(meal);
      } else if (mealType === 'snack') {
        mealIssues = validateSnack(meal);
      } else if (mealType === 'lunch' || mealType === 'dinner') {
        mealIssues = validateMeal(meal, mealType);
      }

      if (mealIssues.length > 0) {
        issues.push({
          day: dayIndex + 1,
          meal: `${mealType}_${mealIndex + 1}`,
          mealName: meal.name,
          issues: mealIssues,
        });
      }

      dayTotalCalories += meal.calories || 0;
    });

    // Validate daily calorie total (±3% tolerance)
    const minAcceptableCalories = Math.round(dailyCalories * 0.97);
    const maxAcceptableCalories = Math.round(dailyCalories * 1.03);

    if (dayTotalCalories < minAcceptableCalories || dayTotalCalories > maxAcceptableCalories) {
      issues.push({
        day: dayIndex + 1,
        meal: 'daily_total',
        issues: [
          `Daily calories (${dayTotalCalories}) outside strict ±3% range (${minAcceptableCalories} - ${maxAcceptableCalories} kcal)`,
        ],
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues: issues,
  };
}

class MealPlanChain {
  constructor() {
    this.structuredLLM = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 8192,
      openAIApiKey: env.OPENAI_API_KEY,
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    });

    // Initialize hybrid re-ranker for improved meal recommendations
    this.reranker = new HybridReRanker();
  }

  /**
   * ✅ OPTIMIZATION: Compress meal template to compact format for LLM
   * Reduces from ~340 tokens to ~80 tokens per meal
   * Impact: -54% context size, -53% costs ($570/year saved)
   */
  compressMealForLLM(doc) {
    const m = doc.metadata || {};

    // ⚡ ANTI-HALLUCINATION OPTIMIZED FORMAT:
    // Keeps CRITICAL fields for LLM to reference: meal name, state, region, ingredients
    // Compresses less critical fields: macros (abbreviated), budget (range), type (abbrev)
    // Format: "Name (State/Region): Ingredients | Macros | GI | Budget | Type"

    const mealName = m.mealName || 'Unknown Meal';
    const state = m.state || 'Unknown';
    const region = m.region || '';
    const ingredients = m.ingredients || 'N/A';

    // Include region in parentheses for better cuisine context
    // Example: "Jadoh (Meghalaya/east-indian)" instead of just "(Meghalaya)"
    const stateLabel = region ? `${state}/${region}` : state;

    return [
      mealName, // ✅ KEEP FULL - Critical for anti-hallucination
      `(${stateLabel})`, // ✅ KEEP FULL - Critical for cuisine validation
      ':',
      ingredients, // ✅ KEEP FULL - Critical for adaptation
      '|',
      `P${m.protein || 0}g C${m.carbs || 0}g F${m.fats || 0}g`, // ⚡ Compressed
      '|',
      `${m.gi || 'Med'}GI`, // ⚡ Compressed: "Low" → "Low", "Medium" → "Med"
      '|',
      `₹${m.budgetMin || 0}-${m.budgetMax || 999}`, // ⚡ Compressed
      '|',
      m.dietType || 'Veg', // ⚡ Abbreviated
    ].join(' ');
  }

  /**
   * 🔍 Infer meal type from meal name (since metadata doesn't have mealType field)
   * Returns: 'breakfast', 'lunch', 'dinner', 'snack', or 'unknown'
   */
  inferMealType(doc) {
    const metadata = doc.metadata || {};
    const mealName = (metadata.mealName || '').toLowerCase();
    const content = (doc.pageContent || doc.content || '').toLowerCase();

    // Check for explicit meal type in content
    if (content.includes('meal type: breakfast') || content.includes('mealtype: breakfast')) {
      return 'breakfast';
    }
    if (
      content.includes('meal type: lunch') ||
      content.includes('mealtype: lunch') ||
      content.includes('meal type: dinner') ||
      content.includes('mealtype: dinner')
    ) {
      return 'lunch'; // Group lunch and dinner together (interchangeable)
    }
    if (content.includes('meal type: snack') || content.includes('mealtype: snack')) {
      return 'snack';
    }

    // Infer from meal name keywords
    const breakfastKeywords = [
      'poha',
      'upma',
      'idli',
      'dosa',
      'paratha',
      'toast',
      'oats',
      'smoothie',
      'egg',
      'uttapam',
      'chilla',
      'dhokla',
      'pancake',
      'porridge',
      'cheela',
    ];
    const snackKeywords = [
      'snack',
      'chaat',
      'samosa',
      'pakora',
      'vada',
      'cutlet',
      'tikki',
      'chips',
      'namkeen',
      'mixture',
    ];
    const lunchDinnerKeywords = [
      'curry',
      'biryani',
      'pulao',
      'dal',
      'rice',
      'roti',
      'sabzi',
      'thali',
      'khichdi',
      'soup',
      'stew',
    ];

    // Check breakfast keywords
    if (breakfastKeywords.some((keyword) => mealName.includes(keyword))) {
      return 'breakfast';
    }

    // Check snack keywords
    if (snackKeywords.some((keyword) => mealName.includes(keyword))) {
      return 'snack';
    }

    // Check lunch/dinner keywords
    if (lunchDinnerKeywords.some((keyword) => mealName.includes(keyword))) {
      return 'lunch';
    }

    // Default: assume lunch/dinner if can't determine
    return 'unknown';
  }

  /**
   * ✅ OPTIMIZATION: Format all meals for LLM context (compressed)
   * Impact: -54% token usage vs full formatting
   */
  formatMealsForLLM(meals) {
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return '';
    }

    const compressed = meals.map((meal, idx) => `${idx + 1}. ${this.compressMealForLLM(meal)}`);

    logger.info(
      `💾 Compressed ${meals.length} meals for LLM (saved ~${meals.length * 260} tokens)`
    );
    return compressed.join('\n');
  }

  /**
   * 🆕 Format meals grouped by meal type for better LLM guidance
   * Returns: Object with breakfast, lunch, snack, unknown meal lists
   */
  formatMealsByType(meals) {
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
      return { breakfast: '', lunch: '', snack: '', unknown: '' };
    }

    // Group meals by inferred type
    const grouped = {
      breakfast: [],
      lunch: [],
      snack: [],
      unknown: [],
    };

    meals.forEach((meal) => {
      const type = this.inferMealType(meal);
      if (type === 'breakfast') {
        grouped.breakfast.push(meal);
      } else if (type === 'snack') {
        grouped.snack.push(meal);
      } else if (type === 'lunch') {
        grouped.lunch.push(meal);
      } else {
        grouped.unknown.push(meal);
      }
    });

    logger.info(
      `📊 Meal type distribution: ${grouped.breakfast.length} breakfast, ${grouped.lunch.length} lunch/dinner, ${grouped.snack.length} snacks, ${grouped.unknown.length} unknown`
    );

    // Format each group
    const formatted = {
      breakfast: grouped.breakfast
        .map((meal, idx) => `${idx + 1}. ${this.compressMealForLLM(meal)}`)
        .join('\n'),
      lunch: grouped.lunch
        .map((meal, idx) => `${idx + 1}. ${this.compressMealForLLM(meal)}`)
        .join('\n'),
      snack: grouped.snack
        .map((meal, idx) => `${idx + 1}. ${this.compressMealForLLM(meal)}`)
        .join('\n'),
      unknown: grouped.unknown
        .map((meal, idx) => `${idx + 1}. ${this.compressMealForLLM(meal)}`)
        .join('\n'),
    };

    return formatted;
  }

  /**
   * Main entry point for meal plan generation
   */
  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan with RAG-enhanced context + lab values', {
        duration: preferences.duration,
        regions: preferences.regions,
        cuisines: preferences.cuisines,
        cuisineCount: preferences.cuisines?.length || 0,
        dietType: preferences.dietType,
        hasLabValues: !!preferences.healthContext?.medicalData?.labValues,
      });

      const duration = parseInt(preferences.duration) || 7;

      // Use chunked generation for longer plans
      if (duration > 3) {
        return await this.generateInChunks(preferences);
      }

      return await this.generateWithRAG(preferences);
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message, stack: error.stack });
      return this.getFallbackPlan(preferences);
    }
  }

  /**
   * Generate meal plan with RAG retrieval (UPDATED for multiple cuisines)
   */
  async generateWithRAG(preferences) {
    // Start overall timing
    const overallTimer = performanceMetrics.startTimer('meal_plan_generation');

    const duration = parseInt(preferences.duration) || 3;
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const restrictions = preferences.restrictions || [];
    const cuisines = preferences.cuisines || [];
    const healthContext = preferences.healthContext || {};
    const userOverrides = preferences.userOverrides || {};

    logger.info('Fetching RAG context for meal generation', {
      restrictions: restrictions.length,
      cuisines: cuisines.length,
      cuisineList: cuisines,
      hasSymptoms: !!healthContext.symptoms?.length,
      hasLabValues: !!healthContext.medicalData?.labValues,
    });

    // ===== STEP 1: MULTI-STAGE RAG RETRIEVAL (ENHANCED) =====
    logger.info('Performing multi-stage RAG retrieval');
    const ragTimer = performanceMetrics.startTimer('rag_retrieval');
    const retrievalResults = await this.performMultiStageRetrieval(preferences, healthContext);
    const ragMetrics = performanceMetrics.endTimer(ragTimer);

    // Extract results
    const mealTemplates = retrievalResults.mealTemplates || [];
    const symptomGuidanceDocs = retrievalResults.symptomGuidance || [];
    const labGuidanceDocs = retrievalResults.labGuidance || [];
    const ingredientSubstituteDocs = retrievalResults.ingredientSubstitutes || [];

    logger.info('RAG retrieval complete', {
      mealTemplates: mealTemplates.length,
      symptomGuidance: symptomGuidanceDocs.length,
      labGuidance: labGuidanceDocs.length,
      ingredientSubstitutes: ingredientSubstituteDocs.length,
    });

    // ✅ OPTIMIZATION: Use compressed format grouped by meal type
    // Impact: Better LLM guidance by separating breakfast/lunch/dinner/snack templates
    const mealsByType = this.formatMealsByType(mealTemplates);

    // ===== STEP 2: RETRIEVE PCOS NUTRITION GUIDELINES =====
    const nutritionQuery = this.buildNutritionQuery(healthContext);
    logger.info('Retrieving PCOS nutrition guidelines', { query: nutritionQuery });

    const nutritionGuidelines = await retriever.retrieve(nutritionQuery, { topK: 5 });
    const nutritionContext = retriever.formatContextFromResults(nutritionGuidelines);

    // ===== STEP 3: RETRIEVE SYMPTOM-SPECIFIC RECOMMENDATIONS =====
    // (Now handled by multi-stage retrieval above)

    // ===== STEP 4: BUILD COMPREHENSIVE CONTEXT =====
    let enhancedContext = '';

    // Build meal templates context with type grouping
    if (mealTemplates.length > 0) {
      enhancedContext += '📋 MEAL TEMPLATES FROM KNOWLEDGE BASE:\n';

      // ⭐ KETO MODE: Add special instructions for adapting high-carb meals
      if (preferences.isKeto) {
        const mealsNeedingAdaptation = mealTemplates.filter(
          (doc) => doc.metadata?.needsKetoAdaptation === true
        );

        enhancedContext += '🚨 CRITICAL: MEAL TEMPLATE USAGE RULES:\n';
        enhancedContext += `REQUESTED CUISINES: ${cuisines.join(', ')}\n`;
        enhancedContext += 'YOU MUST:\n';
        enhancedContext += `  1. ✅ SELECT MEALS ONLY FROM THE "${mealTemplates.length} MEAL TEMPLATES" SECTION BELOW\n`;
        enhancedContext += `  2. ✅ EVERY MEAL MUST BE FROM: ${cuisines.join(' OR ')}\n`;
        enhancedContext += '  3. ❌ DO NOT create meals from scratch\n';
        enhancedContext +=
          '  4. ❌ DO NOT use meal examples from the INGREDIENT SUBSTITUTION section as full meals\n';
        enhancedContext +=
          '  5. ❌ DO NOT use generic Indian meals (dosa, idli, upma) unless they appear in the MEAL TEMPLATES section with the correct state label\n\n';

        if (mealsNeedingAdaptation.length > 0) {
          enhancedContext += '⚡ KETO ADAPTATION INSTRUCTIONS:\n';
          enhancedContext += `${mealsNeedingAdaptation.length} meals below contain high-carb ingredients (rice, dal, wheat, potato).\n`;
          enhancedContext += 'ADAPT them for keto by:\n';
          enhancedContext +=
            '  1. REPLACE rice → cauliflower rice (pulse raw cauliflower in food processor)\n';
          enhancedContext +=
            '  2. REPLACE dal/lentils → high-fat protein (paneer, chicken, fish, eggs)\n';
          enhancedContext += '  3. REPLACE roto/bread → almond flour roti or coconut flour bread\n';
          enhancedContext += '  4. REPLACE potato → cauliflower, zucchini, turnip\n';
          enhancedContext += '  5. ADD extra fat (2-3 tbsp ghee, coconut oil, butter per meal)\n';
          enhancedContext +=
            '  6. KEEP the cooking method, spices, and authentic regional flavors\n';
          enhancedContext += '  7. VERIFY final meal has <20g net carbs, >70% fat\n';
          enhancedContext +=
            '  8. PRESERVE the state/regional origin (Jharkhand → still Jharkhandi, Sikkim → still Sikkimese)\n\n';
        }
      } else {
        // Non-keto mode also needs cuisine adherence rules
        enhancedContext += '🚨 CRITICAL: MEAL TEMPLATE USAGE RULES:\n';
        enhancedContext += `REQUESTED CUISINES: ${cuisines.join(', ')}\n`;
        enhancedContext += 'YOU MUST:\n';
        enhancedContext += `  1. ✅ SELECT MEALS ONLY FROM THE "${mealTemplates.length} MEAL TEMPLATES" SECTION BELOW\n`;
        enhancedContext += `  2. ✅ EVERY MEAL MUST BE FROM: ${cuisines.join(' OR ')}\n`;
        enhancedContext += '  3. ❌ DO NOT create meals from scratch\n';
        enhancedContext += '  4. ❌ DO NOT use meals from other regional cuisines\n\n';
      }

      enhancedContext +=
        '(Adapt the templates below to user preferences while maintaining regional authenticity)\n\n';

      // 🆕 Group templates by meal type for better LLM understanding
      if (mealsByType.breakfast) {
        enhancedContext += '🌅 BREAKFAST TEMPLATES (use for breakfast/morning meals only):\n';
        enhancedContext += mealsByType.breakfast + '\n\n';
      }

      if (mealsByType.lunch) {
        enhancedContext += '🍛 LUNCH/DINNER TEMPLATES (use for lunch/dinner meals only):\n';
        enhancedContext += mealsByType.lunch + '\n\n';
      }

      if (mealsByType.snack) {
        enhancedContext += '🥤 SNACK TEMPLATES (use for snack meals only):\n';
        enhancedContext += mealsByType.snack + '\n\n';
      }

      if (mealsByType.unknown) {
        enhancedContext += '🍽️ OTHER MEAL TEMPLATES (flexible usage):\n';
        enhancedContext += mealsByType.unknown + '\n\n';
      }
    }

    if (nutritionContext) {
      enhancedContext += '📚 PCOS NUTRITION GUIDELINES:\n';
      enhancedContext += nutritionContext + '\n\n';
    }

    // NEW: Add symptom-specific guidance
    if (symptomGuidanceDocs.length > 0) {
      const symptomContext = symptomGuidanceDocs
        .map((doc) => doc.pageContent || doc.content)
        .join('\n\n');

      enhancedContext += '� SYMPTOM-SPECIFIC RECOMMENDATIONS:\n';
      enhancedContext += "(Prioritize these ingredients for the user's primary symptoms)\n\n";
      enhancedContext += symptomContext + '\n\n';
    }

    // NEW: Add lab-specific guidance
    if (labGuidanceDocs.length > 0) {
      const labContext = labGuidanceDocs.map((doc) => doc.pageContent || doc.content).join('\n\n');

      enhancedContext += '🔬 LAB MARKER-SPECIFIC GUIDANCE:\n';
      enhancedContext += '(Address these abnormal lab values through ingredient selection)\n\n';
      enhancedContext += labContext + '\n\n';
    }

    // NEW: Add ingredient substitutes
    if (ingredientSubstituteDocs.length > 0) {
      // ⚡ OPTIMIZATION: Truncate substitute docs to avoid prompt bloat
      // ⚡ CRITICAL FIX: Remove meal example lines before truncation
      const substituteContext = ingredientSubstituteDocs
        .map((doc) => {
          let content = doc.pageContent || doc.content || '';

          // 🔥 REMOVE MEAL EXAMPLES to prevent LLM confusion
          // These patterns match meal names in substitute docs that LLM might treat as valid templates
          const mealExamplePatterns = [
            // Match capitalized dish names with common meal keywords
            /- [A-Z][a-z]+ [A-Z][a-z]+ (?:Dosa|Idli|Upma|Chilla|Paratha|Roti|Biryani|Khichdi|Pulao)/gi,
            /- [A-Z][a-z]+ (?:Flour|Rice) (?:Dosa|Idli|Upma|Chilla|Paratha|Roti)/gi,

            // Match "Example:" or "Example dishes:" lines
            /Example dishes?:.*$/gim,
            /Examples?:.*$/gim,
            /Try:.*$/gim,

            // Match arrows with capitalized dish names
            /→ [A-Z][a-z]+ [A-Z]?[a-z]* (?:dosa|idli|upma|chilla|paratha|roti|biryani|khichdi)/gi,
            /→ [A-Z][a-z]+ (?:flour|rice) (?:dosa|idli|upma|chilla|paratha)/gi,

            // Match "Try <Meal Name>" patterns
            /Try [A-Z][a-z]+ [a-z]+ (?:dosa|idli|upma|chilla|paratha|roti)/gi,

            // Match dish variations like "Cauliflower Upma", "Coconut Dosa"
            /\b(?:Cauliflower|Coconut|Almond|Ragi|Jowar) (?:Upma|Dosa|Idli|Chilla|Paratha|Roti)\b/gi,

            // Match "South Indian style:" or similar regional mentions with dishes
            /(?:South Indian|North Indian|Regional) style:.*(?:upma|dosa|idli)/gi,

            // Match bullet points with dish names
            /• [A-Z][a-z]+ (?:Upma|Dosa|Idli|Chilla|Paratha|Roti)/gi,
          ];

          // Apply all patterns to remove meal examples
          mealExamplePatterns.forEach((pattern) => {
            content = content.replace(pattern, '');
          });

          // Clean up multiple newlines left by removals
          content = content.replace(/\n{3,}/g, '\n\n');

          // Extract only the most relevant part (first 800 chars after cleaning)
          const truncated = content.substring(0, 800);

          // If truncated, add marker
          return (
            truncated +
            (content.length > 800 ? '\n[... additional details omitted for brevity ...]' : '')
          );
        })
        .join('\n\n');

      const originalSize = ingredientSubstituteDocs.reduce((sum, doc) => {
        return sum + (doc.pageContent || doc.content || '').length;
      }, 0);

      const savedTokens = Math.round((originalSize - substituteContext.length) / 4); // ~4 chars per token

      logger.info(
        `💾 Compressed ${ingredientSubstituteDocs.length} substitute docs (saved ~${savedTokens} tokens, removed meal examples)`
      );

      enhancedContext += '🔄 INGREDIENT SUBSTITUTION GUIDE:\n';
      enhancedContext += '⚠️⚠️⚠️ CRITICAL INSTRUCTIONS - READ CAREFULLY:\n';
      enhancedContext += '1. ❌ These are INGREDIENT SUBSTITUTES ONLY - NOT meal templates!\n';
      enhancedContext +=
        '2. ❌ DO NOT use any dish names mentioned here (e.g., "Cauliflower upma", "Coconut dosa")\n';
      enhancedContext +=
        '3. ❌ These examples show HOW to substitute ingredients, NOT WHAT meals to cook\n';
      enhancedContext += '4. ✅ ALWAYS select meals from "📋 MEAL TEMPLATES" section above FIRST\n';
      enhancedContext +=
        '5. ✅ THEN apply these ingredient substitutions to those template meals\n';
      enhancedContext +=
        '6. ✅ Example: Template "Jharkhandi Rice Curry" → Apply substitute: rice→cauliflower rice → "Jharkhandi Cauliflower Rice Curry"\n';
      enhancedContext +=
        '7. ⚠️  Any meal name NOT in templates section = FORBIDDEN (even if it seems adapted)\n\n';
      enhancedContext += substituteContext + '\n\n';
    }

    if (!enhancedContext) {
      enhancedContext = this.getFallbackGuidelines();
    }

    // ===== STEP 6: BUILD PROMPT WITH MULTI-CUISINE INSTRUCTIONS =====
    const prompt = this.buildMealPlanPrompt(preferences, healthContext, enhancedContext);

    // ===== STEP 7: INVOKE LLM =====
    logger.info('Invoking LLM for meal plan generation', {
      promptLength: prompt.length,
      cuisineCount: cuisines.length,
    });

    const llmTimer = performanceMetrics.startTimer('llm_invocation');
    const response = await this.structuredLLM.invoke(prompt);
    const llmMetrics = performanceMetrics.endTimer(llmTimer, {
      promptLength: prompt.length,
      model: 'gpt-4o-mini',
    });

    const rawContent = response.content || response;

    logger.info('LLM response received', {
      responseLength: rawContent.length,
      duration: `${llmMetrics.duration.toFixed(0)}ms`,
    });

    // ===== STEP 8: PARSE AND VALIDATE =====
    const parsingTimer = performanceMetrics.startTimer('json_parsing');
    let parsed = this.parseJSON(rawContent);

    if (!parsed || !this.validateStructure(parsed, duration, mealsPerDay)) {
      logger.warn('Invalid structure detected, attempting fix');
      parsed = this.fixStructure(parsed, duration, mealsPerDay);
    }

    if (!parsed || !this.validateStructure(parsed, duration, mealsPerDay)) {
      logger.error('Structure validation failed after fixes');
      throw new Error('Invalid meal plan structure');
    }
    const parsingMetrics = performanceMetrics.endTimer(parsingTimer);

    // ===== STEP 8.5: VALIDATE CUISINE ADHERENCE (NEW) =====
    if (cuisines && cuisines.length > 0) {
      this.validateCuisineAdherence(parsed, cuisines, preferences.dietType);
    }

    // ===== STEP 9: VALIDATE AND ADJUST CALORIES =====
    const validationTimer = performanceMetrics.startTimer('calorie_validation');
    const targetCalories = preferences.userCalories || 2000;
    this.validateAndAdjustCalories(parsed, targetCalories);
    const validationMetrics = performanceMetrics.endTimer(validationTimer);

    // ===== STEP 9.5: VALIDATE MEAL TYPES AND CALORIE INFLATION =====
    logger.info('Validating meal types and calorie distribution');
    const mealValidation = validateMealPlan(parsed, targetCalories, mealsPerDay);

    if (!mealValidation.isValid) {
      logger.warn('Meal plan validation issues detected', {
        issueCount: mealValidation.issues.length,
        issues: mealValidation.issues,
      });

      // Log specific issues for monitoring
      mealValidation.issues.forEach((issue) => {
        logger.warn(
          `Day ${issue.day}, Meal ${issue.meal}${issue.mealName ? ` (${issue.mealName})` : ''}:`,
          {
            issues: issue.issues,
          }
        );
      });
    } else {
      logger.info('✅ Meal plan validation passed - all meals are appropriate and realistic');
    }

    // ===== STEP 10: COMPILE RAG METADATA (ENHANCED) =====
    const overallMetrics = performanceMetrics.endTimer(overallTimer);

    // Record detailed metrics
    performanceMetrics.recordMealPlanGeneration({
      totalDuration: overallMetrics.duration,
      llmDuration: llmMetrics.duration,
      ragDuration: ragMetrics.duration,
      parsingDuration: parsingMetrics.duration,
      validationDuration: validationMetrics.duration,
      duration,
      mealsPerDay,
      cuisineCount: cuisines.length,
      hasHealthContext: !!healthContext.symptoms?.length || !!healthContext.medicalData?.labValues,
      success: true,
    });

    // Record LLM-specific metrics
    performanceMetrics.recordLLMCall({
      duration: llmMetrics.duration,
      model: 'gpt-4o-mini',
      promptLength: prompt.length,
      responseLength: rawContent.length,
      operation: 'meal_plan_generation',
      success: true,
    });

    // Record RAG retrieval metrics
    performanceMetrics.recordRAGRetrieval({
      duration: ragMetrics.duration,
      stage: 'multi_stage_retrieval',
      documentsRetrieved:
        mealTemplates.length +
        nutritionGuidelines.length +
        symptomGuidanceDocs.length +
        labGuidanceDocs.length,
      query: 'multi-stage',
      success: true,
    });

    const ragMetadata = {
      mealTemplates: mealTemplates.length,
      nutritionGuidelines: nutritionGuidelines.length,
      symptomGuidance: symptomGuidanceDocs.length, // NEW
      labGuidance: labGuidanceDocs.length, // NEW
      ingredientSubstitutes: ingredientSubstituteDocs.length, // NEW
      symptomRecommendations: symptomGuidanceDocs.length > 0,
      retrievalQuality: this.assessRetrievalQuality(
        mealTemplates,
        nutritionGuidelines,
        labGuidanceDocs
      ),
      cuisinesUsed: cuisines,
      multiCuisine: cuisines.length > 1,
    };

    logger.info('Meal plan generated successfully with RAG', {
      days: parsed.days.length,
      ragMetadata,
      performanceMetrics: {
        total: `${overallMetrics.duration.toFixed(0)}ms`,
        llm: `${llmMetrics.duration.toFixed(0)}ms (${(
          (llmMetrics.duration / overallMetrics.duration) *
          100
        ).toFixed(1)}%)`,
        rag: `${ragMetrics.duration.toFixed(0)}ms (${(
          (ragMetrics.duration / overallMetrics.duration) *
          100
        ).toFixed(1)}%)`,
        parsing: `${parsingMetrics.duration.toFixed(0)}ms`,
        validation: `${validationMetrics.duration.toFixed(0)}ms`,
      },
    });

    return {
      ...parsed,
      ragMetadata,
      validationWarnings: mealValidation.issues.length > 0 ? mealValidation.issues : null,
      performanceMetrics: {
        totalDuration: Math.round(overallMetrics.duration),
        llmDuration: Math.round(llmMetrics.duration),
        ragDuration: Math.round(ragMetrics.duration),
        parsingDuration: Math.round(parsingMetrics.duration),
        validationDuration: Math.round(validationMetrics.duration),
        llmPercentage: Math.round((llmMetrics.duration / overallMetrics.duration) * 100),
        ragPercentage: Math.round((ragMetrics.duration / overallMetrics.duration) * 100),
      },
    };
  }

  /**
   * NEW: Identify problematic ingredients from retrieved meal templates
   */
  identifyProblematicIngredients(mealTemplates) {
    const problematic = new Set();

    const problematicKeywords = [
      'white rice',
      'polished rice',
      'maida',
      'refined flour',
      'deep fried',
      'deep-fried',
      'fried',
      'sugar',
      'jaggery',
      'full-fat milk',
      'cream',
      'malai',
      'potato',
      'white bread',
      'refined',
      'puris',
      'kachori',
      'excessive ghee',
      'jalebi',
      'gulab jamun',
      'sweetened',
      'packaged',
    ];

    mealTemplates.forEach((template) => {
      const content = (template.pageContent || template.content || '').toLowerCase();
      problematicKeywords.forEach((keyword) => {
        if (content.includes(keyword)) {
          problematic.add(keyword);
        }
      });
    });

    return Array.from(problematic);
  }

  /**
   * ⭐ NEW: Get region from cuisine name for context-aware substitute retrieval
   */
  getRegionFromCuisine(cuisine) {
    const regionMap = {
      // North India
      Punjabi: 'North India',
      Haryanvi: 'North India',
      Himachali: 'North India',
      Uttarakhandi: 'North India',
      Kashmiri: 'North India',

      // South India
      Tamil: 'South India',
      Karnataka: 'South India',
      Kerala: 'South India',
      Andhra: 'South India',
      Telangana: 'South India',

      // East India
      Bengali: 'East India',
      Odia: 'East India',
      Assamese: 'East India',
      Jharkhandi: 'East India',
      Bihari: 'East India',

      // West India
      Gujarati: 'West India',
      Maharashtrian: 'West India',
      Goan: 'West India',
      Rajasthani: 'West India',

      // Northeast
      Sikkimese: 'Northeast India',
      Manipuri: 'Northeast India',
      Naga: 'Northeast India',
      Tripuri: 'Northeast India',
      Mizo: 'Northeast India',
      Arunachali: 'Northeast India',
      Meghalayan: 'Northeast India',
    };

    return regionMap[cuisine] || '';
  }

  /**
   * ⭐ NEW: Identify priority substitutes based on user's symptoms and lab values
   * This diversifies substitute retrieval beyond just problematic meal ingredients
   */
  identifyPrioritySubstitutes(healthContext) {
    const priorities = [];
    const symptoms = healthContext?.symptoms || [];
    const labValues = healthContext?.labValues || {};

    // Symptom-based substitute priorities
    if (symptoms.includes('weight-gain')) {
      priorities.push({
        ingredient: 'high calorie oils healthy fats',
        reason: 'weight management low calorie',
      });
    }

    if (symptoms.includes('hair-loss')) {
      priorities.push({
        ingredient: 'iron-rich protein biotin',
        reason: 'hair growth nutrient-rich',
      });
    }

    if (symptoms.includes('acne')) {
      priorities.push({
        ingredient: 'anti-inflammatory omega-3',
        reason: 'skin health inflammation',
      });
    }

    if (symptoms.includes('irregular-periods') || symptoms.includes('mood-swings')) {
      priorities.push({
        ingredient: 'hormone-balancing adaptogenic',
        reason: 'hormone balance mood stabilizing',
      });
    }

    // Lab-based substitute priorities
    if (labValues.ferritin && labValues.ferritin.value < 15) {
      priorities.push({
        ingredient: 'iron-rich foods heme iron',
        reason: 'anemia iron deficiency',
      });
    }

    if (labValues.vitamin_d && labValues.vitamin_d.value < 30) {
      priorities.push({
        ingredient: 'vitamin D sources fortified',
        reason: 'vitamin D deficiency',
      });
    }

    if (labValues.glucose_fasting && labValues.glucose_fasting.value > 100) {
      priorities.push({
        ingredient: 'low glycemic complex carbs',
        reason: 'blood sugar control insulin',
      });
    }

    return priorities;
  }

  /**
   * NEW: Identify abnormal lab markers from user's medical data
   * Uses flexible keyword matching to handle variations in test names
   */
  identifyAbnormalLabMarkers(labValues) {
    const logger = new Logger('LabMarkerDetection');
    const abnormal = [];

    logger.info(`Starting lab marker analysis for ${Object.keys(labValues).length} tests`);

    // Reference ranges with flexible matching
    const referenceRanges = {
      // Glucose tests (various names)
      glucose: {
        keywords: ['glucose', 'fasting glucose', 'fasting blood sugar', 'fbs', 'blood sugar'],
        max: 100,
        severity: 'prediabetes',
      },
      insulin: {
        keywords: ['insulin', 'fasting insulin'],
        max: 10,
        severity: 'elevated',
      },
      homa: {
        keywords: ['homa', 'homa-ir', 'homa ir'],
        max: 2.5,
        severity: 'insulin resistance',
      },
      cholesterol: {
        keywords: ['total cholesterol', 'cholesterol', 'tc', 'cholesterol_total'],
        max: 200,
        severity: 'borderline high',
      },
      ldl: {
        keywords: ['ldl', 'ldl cholesterol', 'bad cholesterol', 'ldl_cholesterol'],
        max: 100,
        severity: 'elevated',
      },
      hdl: {
        keywords: ['hdl', 'hdl cholesterol', 'good cholesterol', 'hdl_cholesterol'],
        min: 50,
        severity: 'low (protective HDL)',
      },
      triglycerides: {
        keywords: ['triglycerides', 'tg', 'trigs'],
        max: 150,
        severity: 'high',
      },
      testosterone: {
        keywords: [
          'testosterone',
          'testosterone total',
          'total testosterone',
          'testosterone_total',
        ],
        max: 80,
        severity: 'elevated',
      },
      tsh: {
        keywords: ['tsh', 'thyroid stimulating hormone'],
        min: 0.4,
        max: 4.0,
        severity: 'abnormal',
      },
      // ⭐ NEW: Iron-related markers
      ferritin: {
        keywords: ['ferritin', 'serum ferritin'],
        min: 15,
        severity: 'iron deficiency',
      },
      iron: {
        keywords: ['iron', 'serum iron'],
        min: 60,
        severity: 'iron deficiency',
      },
      // ⭐ NEW: Vitamin markers
      vitaminD: {
        keywords: ['vitamin d', 'vitamin_d', '25-hydroxyvitamin d', '25(oh)d'],
        min: 30,
        severity: 'vitamin D deficiency',
      },
      vitaminB12: {
        keywords: ['vitamin b12', 'vitamin_b12', 'b12', 'cobalamin'],
        min: 200,
        severity: 'vitamin B12 deficiency',
      },
      // ⭐ NEW: Hormone markers
      dheas: {
        keywords: ['dheas', 'dhea-s', 'dehydroepiandrosterone'],
        max: 350,
        severity: 'elevated androgens',
      },
      prolactin: {
        keywords: ['prolactin', 'prl'],
        max: 25,
        severity: 'elevated prolactin',
      },
    };

    Object.entries(labValues).forEach(([testName, testData]) => {
      const value = parseFloat(testData.value);
      if (isNaN(value)) return;

      const testNameLower = testName.toLowerCase();

      // Find matching reference range
      for (const [markerKey, ref] of Object.entries(referenceRanges)) {
        const matches = ref.keywords.some((keyword) => testNameLower.includes(keyword));

        if (matches) {
          let isAbnormal = false;
          let reason = '';

          if (ref.max && value > ref.max) {
            isAbnormal = true;
            reason = `value ${value} > max ${ref.max}`;
          }
          if (ref.min && value < ref.min) {
            isAbnormal = true;
            reason = `value ${value} < min ${ref.min}`;
          }

          // ⭐ DEBUG: Log all checked markers for troubleshooting
          if (
            markerKey === 'ferritin' ||
            markerKey === 'iron' ||
            markerKey === 'vitaminD' ||
            markerKey === 'vitaminB12'
          ) {
            logger.info(
              `Checked ${testName}: value=${value}, min=${ref.min || 'none'}, max=${
                ref.max || 'none'
              }, abnormal=${isAbnormal}, reason=${reason || 'within range'}`
            );
          }

          if (isAbnormal) {
            abnormal.push({
              name: markerKey, // Use normalized name for querying
              displayName: testName, // Keep original for display
              value: value,
              severity: ref.severity,
            });
            break; // Don't match the same test to multiple ranges
          }
        }
      }
    });

    logger.info(`Lab analysis complete: ${abnormal.length} abnormal markers found`, {
      abnormalMarkers: abnormal.map((m) => `${m.displayName}=${m.value} (${m.severity})`),
    });

    return abnormal;
  }

  /**
   * NEW: Identify problematic ingredients from retrieved meal templates
   */
  identifyProblematicIngredients(mealTemplates) {
    const problematic = new Set();

    const problematicKeywords = [
      'white rice',
      'polished rice',
      'maida',
      'refined flour',
      'deep fried',
      'deep-fried',
      'fried',
      'sugar',
      'jaggery',
      'full-fat milk',
      'cream',
      'malai',
      'potato',
      'white bread',
      'refined',
      'puris',
      'kachori',
      'excessive ghee',
      'jalebi',
      'gulab jamun',
      'sweetened',
      'packaged',
    ];

    mealTemplates.forEach((template) => {
      const content = (template.pageContent || template.content || '').toLowerCase();
      problematicKeywords.forEach((keyword) => {
        if (content.includes(keyword)) {
          problematic.add(keyword);
        }
      });
    });

    return Array.from(problematic);
  }

  /**
   * Perform multi-stage RAG retrieval for enhanced personalization
   */
  async performMultiStageRetrieval(preferences, healthContext) {
    const logger = new Logger('MultiStageRetrieval');
    const retrievalResults = {
      mealTemplates: [],
      symptomGuidance: [],
      labGuidance: [],
      ingredientSubstitutes: [],
    };

    try {
      const cuisines = preferences.cuisines || [];
      const dietType = preferences.dietType || 'vegetarian';
      const restrictions = preferences.restrictions || [];

      // ===== STAGE 1: Retrieve meal templates =====
      logger.info('Stage 1: Retrieving meal templates');
      if (cuisines.length > 0) {
        // ⚠️ CRITICAL FIX: DO NOT add "keto" to meal template queries!
        // Problem: Adding "keto low-carb" causes vector search to return ONLY keto docs
        //          But most regional cuisines (Bengali, South Indian) have NO keto-specific docs
        //          Result: Vector search returns 0 relevant docs or docs from wrong cuisines
        // Solution: Retrieve traditional regional meals → Filter by cuisine → LLM adapts for keto
        // The keto keywords ARE used in Stage 5 (keto substitutes) which is the right place

        const templateQueries = cuisines.flatMap((cuisine) => [
          // Enhanced queries with more specific keywords for better RAG retrieval
          `${cuisine} breakfast meals dishes regional ${dietType}`,
          `${cuisine} lunch traditional recipes authentic ${dietType}`,
          `${cuisine} dinner evening meal main course ${dietType}`, // Improved: added "evening" and "main course"
          `${cuisine} snacks traditional dishes ${dietType}`,
          // Also include cuisine-specific context (helps with unique regional terms)
          `${cuisine} cuisine traditional regional specialties`,
        ]);

        for (const query of templateQueries) {
          // ⭐ TWO-PHASE RETRIEVAL: Add documentType filter at Pinecone query level
          // This prevents substitute/medical docs from even being retrieved
          // More efficient than post-retrieval filtering
          const results = await retriever.retrieve(query, {
            topK: 25, // Increased to 25 for better coverage
            filter: { documentType: 'meal_template' }, // ⭐ PINECONE METADATA FILTER
          });

          // ⭐ FILTER: By cuisine/region AND diet type AND keto/allergens
          const filteredResults = results.filter((doc) => {
            const content = doc.pageContent || doc.content || '';
            const contentLower = content.toLowerCase();
            const metadata = doc.metadata || {};

            // 🔍 PRIORITY CHECK: Only accept meal_template documents in Stage 1
            // This prevents ingredient substitute docs from contaminating meal template retrieval
            // NOTE: With Pinecone filter above, this is now a backup check
            const docType = (metadata.documentType || metadata.type || '').toLowerCase();
            if (docType && docType !== 'meal_template') {
              logger.debug(
                `  ⏭️  Skipping non-template document type: ${docType} - "${
                  metadata.mealName || metadata.title || 'Unknown'
                }"`
              );
              return false; // Reject substitute docs, medical_knowledge docs, etc.
            }

            // 🔍 FIRST: Filter by cuisine/region match
            // Check if document matches the requested cuisine(s)
            const cuisineMatch = cuisines.some((cuisine) => {
              const cuisineLower = cuisine.toLowerCase();

              // ⭐ FIX: Handle both "Sikkimese" (cuisine) and "Sikkim" (state) variations
              // Map cuisine names to possible variations
              const cuisineVariations = [cuisineLower];

              // Add state name variations (e.g., "Sikkimese" → also match "Sikkim")
              if (cuisineLower.endsWith('ese')) {
                // Sikkimese → Sikkim, Assamese → Assam
                cuisineVariations.push(cuisineLower.replace(/ese$/, ''));
              }

              // ⭐ COMPREHENSIVE CUISINE → STATE MAPPINGS
              // Map all cuisine names to their corresponding state names
              const cuisineToStateMap = {
                // East Indian
                manipuri: 'manipur',
                bihari: 'bihar',
                odia: 'odisha',
                bengali: 'west bengal',
                jharkhandi: 'jharkhand',
                meghalayan: 'meghalaya',
                mizo: 'mizoram',
                naga: 'nagaland',
                tripuri: 'tripura',
                arunachali: 'arunachal pradesh',

                // North Indian
                rajasthani: 'rajasthan',
                punjabi: 'punjab',
                haryanvi: 'haryana',

                // West Indian
                gujarati: 'gujarat',
                maharashtrian: 'maharashtra',
                goan: 'goa',

                // Central Indian
                chhattisgarh: 'chhattisgarhi', // Also accepts Chhattisgarh as-is

                // South Indian
                tamil: 'tamil nadu',
                andhra: 'andhra pradesh',
              };

              // Add mapped state name if exists
              if (cuisineToStateMap[cuisineLower]) {
                cuisineVariations.push(cuisineToStateMap[cuisineLower]);
                // Also add shortened versions (e.g., "bengal" for "west bengal")
                const stateParts = cuisineToStateMap[cuisineLower].split(' ');
                if (stateParts.length > 1) {
                  cuisineVariations.push(stateParts[stateParts.length - 1]); // "bengal", "nadu", "pradesh"
                }
              }

              // Check if ANY variation matches
              const matches = cuisineVariations.some((variation) => {
                // Check metadata fields
                const regionMatch = (metadata.regionalSection || '')
                  .toLowerCase()
                  .includes(variation);
                const stateMatch = (metadata.state || '').toLowerCase().includes(variation);
                const mealNameMatch = (metadata.mealName || '').toLowerCase().includes(variation);
                // Check content (but be more specific to avoid false positives)
                // Look for "State: Sikkim" or "Cuisine: Sikkimese" patterns
                const contentStateMatch = contentLower.includes(`state: ${variation}`);
                const contentCuisineMatch = contentLower.includes(`cuisine: ${variation}`);
                const contentMentionMatch =
                  contentLower.includes(` ${variation} `) ||
                  contentLower.includes(`${variation}-style`) ||
                  contentLower.includes(`${variation} style`);

                return (
                  regionMatch ||
                  stateMatch ||
                  mealNameMatch ||
                  contentStateMatch ||
                  contentCuisineMatch ||
                  contentMentionMatch
                );
              });

              return matches;
            });

            // If no cuisine match, skip this document
            if (!cuisineMatch) {
              // ⭐ DEBUG: Log rejected meals to help diagnose retrieval issues
              if (metadata.mealName) {
                logger.debug(
                  `  ⏭️  Skipping "${metadata.mealName}" - doesn't match cuisines [${cuisines.join(
                    ', '
                  )}]`,
                  { state: metadata.state, region: metadata.regionalSection }
                );
              }
              return false;
            }

            // 🔍 SECOND: Filter by ALLERGENS (if any restrictions)
            // ⭐ CRITICAL: Check for user's allergies/intolerances BEFORE diet type
            if (restrictions && restrictions.length > 0) {
              // ⭐ FIX: Check BOTH meal name AND ingredients AND full content for allergens
              // Bug: "Egg Paratha" has "Egg" in the name, not just ingredients
              // Solution: Check meal name first, then ingredients, then full content as fallback
              const mealNameLower = (metadata.mealName || '').toLowerCase();

              // ⭐ IMPROVED: Try multiple ingredient extraction patterns
              let ingredientsText = '';

              // Pattern 1: Standard "Ingredients:" section
              let ingredientsMatch = content.match(/Ingredients:\s*(.+?)(?:\n\n|\n[A-Z]|$)/s);
              if (ingredientsMatch) {
                ingredientsText = ingredientsMatch[1].toLowerCase();
              } else {
                // Pattern 2: Try finding ingredients list without colon
                ingredientsMatch = content.match(/Ingredients\s+(.+?)(?:\n\n|\n[A-Z]|$)/s);
                if (ingredientsMatch) {
                  ingredientsText = ingredientsMatch[1].toLowerCase();
                } else {
                  // Pattern 3: Fallback to content if no clear ingredients section
                  logger.debug(
                    `  ⚠️  No "Ingredients:" section found in "${metadata.mealName}" - using full content for allergen check`
                  );
                  ingredientsText = contentLower;
                }
              }

              // ⭐ FIX: Use word boundaries to prevent false matches
              // "buckwheat" should NOT match "wheat", "protein" should NOT match "roti"
              const allergenMap = {
                dairy: [
                  'milk',
                  'paneer',
                  'cheese',
                  'curd',
                  'yogurt',
                  'dahi',
                  'ghee',
                  'butter',
                  'cream',
                  'khoya',
                  'malai',
                ],
                // Use word boundaries (\b) to match whole words only
                gluten: [
                  '\\bwheat\\b',
                  '\\bmaida\\b',
                  '\\batta\\b',
                  '\\broti\\b',
                  '\\bchapati\\b',
                  '\\bparatha\\b',
                  '\\bbread\\b',
                  '\\bnaan\\b',
                ],
                nuts: [
                  'almond',
                  'cashew',
                  'walnut',
                  'pistachio',
                  'peanut',
                  'hazelnut',
                  'pecan',
                  'badam',
                  'kaju',
                ],
                eggs: ['\\begg\\b', '\\bomelette\\b', '\\banda\\b'],
              };

              // Check each restriction
              for (const restriction of restrictions) {
                const normalizedRestriction = restriction.toLowerCase().trim();
                const allergens = allergenMap[normalizedRestriction];

                if (allergens) {
                  // ⭐ IMPROVED: Use regex for word boundary matching
                  const hasAllergen = allergens.some((allergen) => {
                    // Create regex with word boundaries for gluten/eggs (marked with \b)
                    // For others, use simple includes
                    const useRegex = allergen.includes('\\b');

                    if (useRegex) {
                      const regex = new RegExp(allergen, 'i');

                      // Check meal name
                      if (regex.test(mealNameLower)) {
                        logger.debug(
                          `  🔍 Allergen "${allergen}" found in meal name: "${metadata.mealName}"`
                        );
                        return true;
                      }

                      // Check ingredients section
                      if (regex.test(ingredientsText)) {
                        logger.debug(
                          `  🔍 Allergen "${allergen}" found in ingredients: "${metadata.mealName}"`
                        );
                        return true;
                      }
                    } else {
                      // Simple includes for dairy/nuts
                      if (mealNameLower.includes(allergen)) return true;
                      if (ingredientsText.includes(allergen)) return true;
                    }

                    return false;
                  });

                  if (hasAllergen) {
                    logger.info(
                      `  ❌ Filtered out "${
                        metadata.mealName || 'Unknown'
                      }" - contains ${normalizedRestriction} allergen`
                    );
                    return false; // Reject this meal template
                  }
                }
              }
            }

            // 🔍 THIRD: Filter by KETO requirements (if isKeto=true)
            // ⚠️ IMPORTANT: In KETO mode, we DON'T reject high-carb meals at retrieval stage
            // Instead, we RETRIEVE them as examples and let the LLM ADAPT them using keto substitutes
            // Reason: Many regional cuisines (Bengali, South Indian) are rice/dal-heavy
            //         Rejecting all of them = 0 templates = LLM has no cuisine examples
            // Strategy: Retrieve traditional meals → LLM replaces rice with cauliflower rice, etc.

            if (preferences.isKeto) {
              // Check ingredients for high-carb items
              const ingredientsMatch = content.match(/Ingredients:\s*(.+?)(?:\n\n|\n[A-Z]|$)/s);
              const ingredientsText = ingredientsMatch
                ? ingredientsMatch[1].toLowerCase()
                : contentLower;

              // High-carb keywords to identify (but NOT reject yet)
              const highCarbKeywords = [
                'rice',
                'ragi',
                'jowar',
                'bajra',
                'wheat',
                'roti',
                'chapati',
                'bread',
                'idli',
                'dosa',
                'upma',
                'poha',
                'puttu',
                'appam',
                'dal',
                'lentil',
                'chickpea',
                'chana',
                'moong',
                'masoor',
                'toor',
                'urad',
                'potato',
                'sweet potato',
                'corn',
                'peas',
              ];

              const hasHighCarb = highCarbKeywords.some((keyword) =>
                ingredientsText.includes(keyword)
              );

              if (hasHighCarb) {
                // ⭐ NEW STRATEGY: Mark this meal as "needs keto adaptation" but ACCEPT it
                // Add metadata flag so we know it needs substitution
                doc.metadata = doc.metadata || {};
                doc.metadata.needsKetoAdaptation = true;
                doc.metadata.highCarbIngredients = highCarbKeywords.filter((k) =>
                  ingredientsText.includes(k)
                );

                logger.info(
                  `  ⚡ Accepting for keto adaptation: "${
                    metadata.mealName || 'Unknown'
                  }" - contains ${doc.metadata.highCarbIngredients.join(
                    ', '
                  )} (will be substituted by LLM)`
                );
                // Don't reject - let it through for LLM adaptation
              }
            }

            // 🔍 FOURTH: Filter by diet type
            // ⭐ IMPROVED: Check the Type: field in content FIRST (most reliable)
            // Note: RAG content uses "Type: Vegetarian" format (not markdown **Type:**)
            const hasVegetarianTag = /Type:\s*Vegetarian/i.test(content);
            const hasNonVegTag = /Type:\s*Non-Vegetarian/i.test(content);

            if (dietType === 'jain') {
              // ⭐ JAIN STRATEGY: Fetch BOTH vegetarian AND non-vegetarian templates
              // The LLM will adapt them using ingredient substitutes from RAG
              // Similar to vegan strategy - provides variety and allows adaptation of popular dishes
              // Non-veg proteins (chicken, fish, eggs) → Paneer, tofu, legumes
              // Prohibited ingredients (root vegetables, mushrooms, etc.) → Allowed vegetables

              // Accept ALL templates (veg and non-veg) - LLM will substitute
              // No filtering for prohibited ingredients here - LLM handles substitutions
              logger.info(
                `    ✅ Jain mode: Accepting template "${
                  metadata.mealName || 'Unknown'
                }" for LLM adaptation`
              );
              return true; // Accept all templates for Jain adaptation
            } else if (dietType === 'vegan') {
              // ⭐ VEGAN STRATEGY: Fetch BOTH vegetarian AND non-vegetarian templates
              // The LLM will adapt them using ingredient substitutes from RAG
              // This gives more variety and allows adaptation of popular non-veg dishes

              // Accept ALL templates (veg and non-veg) - LLM will substitute
              // We don't filter by dairy here because LLM will substitute paneer→tofu, milk→almond milk, etc.
              logger.info(
                `    ✅ Vegan mode: Accepting template "${
                  metadata.mealName || 'Unknown'
                }" for LLM adaptation`
              );
              return true; // Accept all templates for vegan adaptation
            } else if (dietType === 'vegetarian') {
              // Vegetarian: Just check the Type: tag
              if (hasVegetarianTag && !hasNonVegTag) {
                return true;
              }

              // Fallback: If no tag found, log warning and skip
              if (!hasVegetarianTag && !hasNonVegTag) {
                logger.info(`    ⚠️  No diet type tag found: ${metadata.mealName || 'Unknown'}`);
              }
              return false;
            } else if (dietType === 'non-vegetarian') {
              // ⭐ NON-VEG MODE: Accept BOTH vegetarian AND non-vegetarian meals
              // Strategy: Fetch all meals, LLM will create 70% non-veg + 30% veg mix
              // Reason: Non-veg people DO eat vegetarian meals, they're not exclusive

              // Accept explicitly tagged non-veg meals
              if (hasNonVegTag) {
                logger.info(`    ✅ Non-veg meal accepted: "${metadata.mealName || 'Unknown'}"`);
                return true;
              }

              // ⭐ ALSO accept vegetarian meals (for the 30% vegetarian component)
              if (hasVegetarianTag) {
                logger.info(
                  `    ✅ Vegetarian meal accepted for non-veg plan: "${
                    metadata.mealName || 'Unknown'
                  }"`
                );
                return true;
              }

              // No tag found - ACCEPT IT (assume it can be adapted)
              logger.info(
                `    ✅ Accepting "${
                  metadata.mealName || 'Unknown'
                }" - no diet tag, assuming adaptable`
              );
              return true;
            }

            return true; // Allow all for other diet types
          });

          // ⭐ Enhanced logging for keto mode
          if (preferences.isKeto) {
            const ketoCompatibleCount = filteredResults.filter((doc) => {
              const content = (doc.pageContent || doc.content || '').toLowerCase();
              return !['rice', 'ragi', 'jowar', 'bajra', 'wheat', 'dal', 'potato'].some((k) =>
                content.includes(k)
              );
            }).length;

            logger.info(
              `  Query: "${query}" - Retrieved ${results.length}, filtered to ${filteredResults.length} ${dietType} meals (${ketoCompatibleCount} keto-compatible)`
            );
          } else {
            logger.info(
              `  Query: "${query}" - Retrieved ${results.length}, filtered to ${filteredResults.length} ${dietType} meals`
            );
          }

          retrievalResults.mealTemplates.push(...filteredResults);
        }
      }

      // ===== STAGE 1.5: Retrieve accompaniments and complete meal suggestions =====
      logger.info('Stage 1.5: Retrieving accompaniment suggestions');

      const accompanimentQueries = [
        `PCOS-friendly beverage options low calorie herbal tea`,
        `healthy accompaniments Indian meals side dishes`,
        `low GI side dishes grains brown rice quinoa`,
        `PCOS-friendly snacks nuts seeds healthy fats`,
        `complete meal structure balanced nutrition Indian cuisine`,
        `healthy salads Indian raita cucumber vegetables`,
        `chutneys pickles Indian condiments low calorie`,
      ];

      for (const query of accompanimentQueries) {
        try {
          const results = await retriever.retrieve(query, { topK: 5 });

          // Filter for nutritional guidance, not full meal templates
          const accompanimentDocs = results.filter((doc) => {
            const type = doc.metadata?.type;
            // Accept nutritional data, ingredient info, but not full meal templates
            return (
              type === 'nutritional_data' ||
              type === 'ingredient_substitute' ||
              type === 'medical_info' ||
              type === 'medical_knowledge'
            );
          });

          if (accompanimentDocs.length > 0) {
            logger.info(
              `  Found ${accompanimentDocs.length} accompaniment suggestions for "${query}"`
            );
            // Add to meal templates so they're available in context
            retrievalResults.mealTemplates.push(...accompanimentDocs);
          }
        } catch (error) {
          logger.warn(`Failed to retrieve accompaniments for "${query}":`, error.message);
        }
      }

      // ===== STAGE 2: Retrieve symptom-specific guidance =====
      // ✅ OPTIMIZED: Parallel query execution for -95% latency
      logger.info('Stage 2: Retrieving symptom guidance (parallel)');
      const symptoms = healthContext?.symptoms || [];

      if (symptoms.length > 0) {
        const primarySymptoms = symptoms.slice(0, 3);

        // Build all symptom queries
        const symptomQueries = primarySymptoms.map((symptom) => ({
          symptom,
          query: `${symptom} PCOS dietary recommendations nutrition foods`,
        }));

        logger.info(`🚀 Executing ${symptomQueries.length} symptom queries in parallel`);

        // ✅ Execute all queries in parallel
        const symptomResults = await Promise.all(
          symptomQueries.map(async ({ symptom, query }) => {
            logger.info(`  Querying symptom: "${query}"`);
            // ⚡ OPTIMIZED: topK=4 per symptom (was using default 15!)
            // Rationale: 3 symptoms × 4 docs = 12 total (vs 45 before)
            const results = await retriever.retrieve(query, { topK: 4 });

            // Log what we got
            logger.info(`  Retrieved ${results.length} results for ${symptom}`);
            const types = results.map((r) => r.metadata?.type).filter(Boolean);
            logger.info(`  Document types: ${types.join(', ')}`);

            // ⭐ FIX: Very lenient filtering for symptoms - accept medical/nutritional content
            const symptomDocs = results.filter((doc) => {
              const type = doc.metadata?.type;
              const content = (doc.pageContent || doc.content || '').toLowerCase();
              const symptomKeywords = symptom.toLowerCase().replace(/-/g, ' ');

              // Exclude meal templates (too specific)
              if (type === 'meal_template') return false;

              // Accept any medical/nutritional content that mentions the symptom OR dietary advice
              if (
                type === 'symptom_guidance' ||
                type === 'medical_info' ||
                type === 'lab_guidance' ||
                type === 'nutritional_data' ||
                type === 'medical_knowledge'
              ) {
                // Accept if it contains symptom keywords OR general PCOS dietary terms
                return (
                  content.includes(symptomKeywords) ||
                  content.includes('pcos') ||
                  content.includes('hormone') ||
                  content.includes('insulin')
                );
              }

              return false;
            });

            logger.info(`  Filtered to ${symptomDocs.length} symptom-related docs`);
            return symptomDocs;
          })
        );

        // Flatten all results
        retrievalResults.symptomGuidance.push(...symptomResults.flat());
        logger.info(`✅ Total symptom guidance docs: ${retrievalResults.symptomGuidance.length}`);
      }

      // ===== STAGE 3: Retrieve lab-marker guidance =====
      logger.info('Stage 3: Retrieving lab marker guidance');
      const labValues = healthContext?.medicalData?.labValues || {};

      // ⭐ DEBUG: Log what lab values we have
      logger.info(`Lab values available: ${Object.keys(labValues).join(', ')}`);

      // ⭐ DEBUG: Log critical values for troubleshooting
      if (labValues.ferritin) {
        logger.info(
          `[DEBUG] Ferritin: ${labValues.ferritin.value} ${
            labValues.ferritin.unit || ''
          } (ref min: 15)`
        );
      }
      if (labValues.vitamin_d) {
        logger.info(
          `[DEBUG] Vitamin D: ${labValues.vitamin_d.value} ${
            labValues.vitamin_d.unit || ''
          } (ref min: 30)`
        );
      }
      if (labValues.iron) {
        logger.info(
          `[DEBUG] Iron: ${labValues.iron.value} ${labValues.iron.unit || ''} (ref min: 60)`
        );
      }

      const abnormalMarkers = this.identifyAbnormalLabMarkers(labValues);

      if (abnormalMarkers.length > 0) {
        logger.info(
          `Processing ${abnormalMarkers.length} abnormal markers: ${abnormalMarkers
            .map((m) => m.name)
            .join(', ')}`
        );

        logger.info(`🚀 Executing ${abnormalMarkers.length} lab marker queries in parallel`);

        // ✅ Execute all lab marker queries in parallel
        const labResults = await Promise.all(
          abnormalMarkers.map(async (marker) => {
            // ⭐ IMPROVED: More specific query
            const query = `${marker.name} PCOS dietary guidance nutrition recommendations`;
            logger.info(`  Querying lab marker: "${query}"`);

            // ⚡ OPTIMIZED: topK=3 per lab marker (was using default 15!)
            // Rationale: Usually 1-2 abnormal markers, 3 docs each = 3-6 total
            const results = await retriever.retrieve(query, { topK: 3 });

            // Log what we got
            const types = results.map((r) => r.metadata?.type).filter(Boolean);
            logger.info(`  Retrieved types: ${types.join(', ')}`);

            // ⭐ FIX: More lenient filtering - accept multiple medical document types
            const labDocs = results.filter((doc) => {
              const type = doc.metadata?.type;

              // Exclude meal templates
              if (type === 'meal_template') return false;

              // Accept any medical/nutritional content
              return (
                type === 'lab_guidance' ||
                type === 'medical_info' ||
                type === 'nutritional_data' ||
                type === 'medical_knowledge'
              );
            });

            logger.info(`  Filtered to ${labDocs.length} lab guidance docs`);
            return labDocs;
          })
        );

        // Flatten all results
        retrievalResults.labGuidance.push(...labResults.flat());
        logger.info(`✅ Total lab guidance docs: ${retrievalResults.labGuidance.length}`);
      } else {
        logger.info('No abnormal lab markers detected - skipping Stage 3');
      }

      // ===== STAGE 4: Retrieve ingredient substitutes =====
      logger.info('Stage 4: Retrieving ingredient substitutes');

      // ⭐ NEW: For vegan/vegetarian/jain diets, ALWAYS retrieve animal protein substitutes
      // This enables the LLM to adapt non-veg dishes to the requested diet
      const needsProteinSubstitutes = ['vegan', 'vegetarian', 'jain'].includes(dietType);

      if (needsProteinSubstitutes) {
        logger.info(
          `Diet type '${dietType}' requires protein substitutes - retrieving animal protein alternatives`
        );

        // ⚠️ OPTIMIZATION: Reduce queries for Jain to avoid token limit (especially with Keto)
        // LLM already has comprehensive Jain prompts, so fewer examples needed
        const proteinSubstituteQueries =
          dietType === 'jain'
            ? [
                // Core protein substitutes (combined query for efficiency)
                `fish chicken egg meat protein substitute jain paneer tofu PCOS`,
                // Root vegetables and prohibited ingredients (combined)
                `potato onion garlic mushroom substitute jain hing cauliflower`,
              ]
            : [
                // Non-Jain diets get more detailed queries
                `fish tofu paneer substitute ${dietType} PCOS`,
                `chicken paneer soy substitute ${dietType} PCOS`,
                `prawn seafood vegetarian substitute ${dietType}`,
                `egg tofu besan substitute ${dietType} PCOS`,
                `meat mutton jackfruit soy substitute ${dietType}`,
                `animal protein plant-based substitute ${dietType} PCOS`,
              ];

        for (const query of proteinSubstituteQueries) {
          logger.info(`  Querying protein substitutes: "${query}"`);

          // ⚠️ OPTIMIZATION: Reduce topK for Jain (has comprehensive prompts already)
          const topK = dietType === 'jain' ? 3 : 5;
          const results = await retriever.retrieve(query, { topK });

          // Log what we got
          const types = results.map((r) => r.metadata?.type).filter(Boolean);
          logger.info(`  Retrieved types: ${types.join(', ')}`);

          // Filter to get substitute-related docs
          const substituteDocs = results.filter((doc) => {
            const type = doc.metadata?.type;

            // Exclude meal templates (we want substitutes, not recipes)
            if (type === 'meal_template') return false;

            // Accept substitute and nutritional guidance
            return (
              type === 'ingredient_substitute' ||
              type === 'medical_info' ||
              type === 'nutritional_data' ||
              type === 'medical_knowledge'
            );
          });

          logger.info(`  Filtered to ${substituteDocs.length} substitute docs`);
          retrievalResults.ingredientSubstitutes.push(...substituteDocs);
        }

        logger.info(
          `Total protein substitute docs retrieved: ${retrievalResults.ingredientSubstitutes.length}`
        );
      }

      // Also check for PCOS-problematic ingredients in retrieved meals
      const problematicIngredients = this.identifyProblematicIngredients(
        retrievalResults.mealTemplates
      );

      if (problematicIngredients.length > 0) {
        logger.info(
          `Found ${
            problematicIngredients.length
          } PCOS-problematic ingredients: ${problematicIngredients.join(', ')}`
        );

        // ⚠️ OPTIMIZATION: Limit to top ingredients based on diet
        const maxIngredients = dietType === 'jain' ? 2 : 5;
        const topIngredients = problematicIngredients.slice(0, maxIngredients);

        // ⭐ INTELLIGENT: Build context-aware queries with region, diet, and symptom info
        const cuisineContext = preferences.cuisines?.[0] || '';
        const regionContext = this.getRegionFromCuisine(cuisineContext);
        const symptomContext = (healthContext?.symptoms || []).slice(0, 2).join(' ');

        for (const ingredient of topIngredients) {
          // ⭐ IMPROVED: Context-rich query for diverse, relevant substitutes
          // Includes: ingredient, diet type, region, and symptom keywords
          const queryParts = [ingredient, 'PCOS substitute alternative', dietType];

          // Add regional context for location-specific alternatives
          if (regionContext) {
            queryParts.push(regionContext);
          }

          // Add symptom-specific context (e.g., "anti-inflammatory" for acne)
          if (symptomContext) {
            queryParts.push(symptomContext);
          }

          const query = queryParts.join(' ');
          logger.info(`  Querying PCOS substitute: "${query}"`);

          // ⚠️ OPTIMIZATION: Reduce topK for Jain (2 instead of 3)
          const topK = dietType === 'jain' ? 2 : 3;
          const results = await retriever.retrieve(query, { topK });

          // Filter to substitute docs
          const substituteDocs = results.filter((doc) => {
            const type = doc.metadata?.type;
            return (
              type === 'ingredient_substitute' ||
              type === 'nutritional_data' ||
              type === 'medical_knowledge'
            );
          });

          logger.info(`  Retrieved ${substituteDocs.length} PCOS substitute docs`);
          retrievalResults.ingredientSubstitutes.push(...substituteDocs);
        }
      }

      // ⭐ NEW: Diversify substitutes based on symptom/lab priorities
      // Instead of only querying problematic ingredients from meals,
      // also proactively retrieve substitutes for user's specific health priorities
      const prioritySubstitutes = this.identifyPrioritySubstitutes(healthContext);

      if (prioritySubstitutes.length > 0) {
        logger.info(
          `🎯 Retrieving priority substitutes for health goals: ${prioritySubstitutes.join(', ')}`
        );

        for (const priority of prioritySubstitutes.slice(0, 2)) {
          const query = `${priority.ingredient} substitute ${dietType} ${priority.reason} PCOS`;
          logger.info(`  Querying priority substitute: "${query}"`);

          const results = await retriever.retrieve(query, { topK: 2 });
          const substituteDocs = results.filter(
            (doc) =>
              doc.metadata?.type === 'ingredient_substitute' ||
              doc.metadata?.type === 'nutritional_data'
          );

          retrievalResults.ingredientSubstitutes.push(...substituteDocs);
        }
      }

      logger.info(`Total substitute docs: ${retrievalResults.ingredientSubstitutes.length}`);

      // ===== STAGE 5: Retrieve KETO substitutes (if isKeto enabled) =====
      if (preferences.isKeto) {
        logger.info('Stage 5: Retrieving KETO substitutes (isKeto=true)');

        // ⚠️ OPTIMIZATION: Reduce queries for Jain Keto to avoid token limit
        // Jain already has comprehensive prompts (70+ lines), so fewer RAG examples needed
        const isJainKeto = dietType === 'jain';

        // ⭐ INTELLIGENT: Build context-aware keto queries
        const cuisineContext = preferences.cuisines?.[0] || '';
        const regionContext = this.getRegionFromCuisine(cuisineContext);
        const budgetContext = preferences.budget === 'low' ? 'budget affordable' : '';

        // Comprehensive keto substitute queries covering all food categories
        let ketoSubstituteQueries = [];

        if (isJainKeto) {
          // JAIN KETO: Consolidated queries with regional context
          ketoSubstituteQueries = [
            // Core keto substitutes with regional awareness
            `keto substitutes cauliflower rice almond flour Indian cuisine ${regionContext}`,
            // Jain-specific keto (no root vegetables, no onion/garlic)
            `jain keto paneer tofu cauliflower low carb no root vegetables ${budgetContext}`,
            // Sugar substitutes
            `sugar substitute stevia erythritol keto Indian ${budgetContext}`,
          ];
        } else if (dietType === 'vegan') {
          // VEGAN KETO: Plant-based keto with regional options
          ketoSubstituteQueries = [
            // Vegan protein sources
            `vegan keto protein substitutes tofu tempeh nuts seeds ${regionContext}`,
            // Vegan dairy alternatives
            `vegan keto dairy substitute coconut almond milk ${regionContext} ${budgetContext}`,
            // Plant-based fats
            `plant-based keto high fat low carb ${regionContext} coconut oil`,
            // General keto grains
            `keto substitutes grain alternatives cauliflower rice almond flour ${budgetContext}`,
            // Sugar substitutes
            `sugar substitute keto stevia erythritol vegan ${budgetContext}`,
          ];
        } else if (dietType === 'vegetarian') {
          // VEGETARIAN KETO: Includes dairy and eggs
          ketoSubstituteQueries = [
            // Vegetarian keto proteins
            `vegetarian keto paneer cheese eggs low carb ${regionContext}`,
            // Indian vegetarian keto
            `vegetarian ketogenic diet Indian high fat ${regionContext} ${budgetContext}`,
            // Grain replacements
            `rice substitute keto cauliflower rice low carb ${regionContext}`,
            `roti chapati bread substitute keto almond flour coconut flour ${budgetContext}`,
            // Sugar substitutes
            `sugar substitute keto stevia erythritol monk fruit ${budgetContext}`,
          ];
        } else {
          // NON-VEGETARIAN KETO: Most flexible options
          ketoSubstituteQueries = [
            // General keto substitutes with regional context
            `keto substitutes grain alternatives cauliflower rice almond flour ${regionContext}`,
            // Protein sources
            `keto non-vegetarian fatty fish chicken thighs ${regionContext}`,
            `ketogenic meat protein high fat low carb ${regionContext}`,
            // Grain replacements
            `rice substitute keto cauliflower rice low carb ${regionContext}`,
            `roti chapati bread substitute keto almond flour coconut flour ${budgetContext}`,
            // Vegetable replacements
            `potato substitute keto cauliflower zucchini turnip ${regionContext}`,
            // Sugar and condiments
            `sugar substitute keto stevia erythritol monk fruit ${budgetContext}`,
            // Fat sources
            `keto healthy fats ghee coconut oil MCT ${regionContext} ${budgetContext}`,
          ];
        }

        // Execute keto substitute queries
        for (const query of ketoSubstituteQueries) {
          logger.info(`  Querying keto substitutes: "${query}"`);

          // ⚠️ OPTIMIZATION: Reduce topK for Jain Keto
          const topK = isJainKeto ? 3 : 5;
          const results = await retriever.retrieve(query, { topK });

          // Log what we got
          const types = results.map((r) => r.metadata?.type).filter(Boolean);
          logger.info(`  Retrieved types: ${types.join(', ')}`);

          // Filter to get keto substitute docs
          const ketoSubstituteDocs = results.filter((doc) => {
            const type = doc.metadata?.type;
            const content = (doc.pageContent || doc.content || '').toLowerCase();

            // Exclude meal templates (we want substitutes, not recipes)
            if (type === 'meal_template') return false;

            // Accept substitute and nutritional guidance
            // Also check content for "keto" keyword to ensure relevance
            const isSubstituteDoc =
              type === 'ingredient_substitute' ||
              type === 'medical_info' ||
              type === 'nutritional_data' ||
              type === 'medical_knowledge';

            const hasKetoContent =
              content.includes('keto') ||
              content.includes('ketogenic') ||
              content.includes('low carb') ||
              content.includes('cauliflower rice') ||
              content.includes('almond flour');

            return isSubstituteDoc && hasKetoContent;
          });

          logger.info(`  Filtered to ${ketoSubstituteDocs.length} keto substitute docs`);
          retrievalResults.ingredientSubstitutes.push(...ketoSubstituteDocs);
        }

        logger.info(
          `Total keto substitute docs retrieved: ${retrievalResults.ingredientSubstitutes.length}`
        );
      } else {
        logger.info('Stage 5: Skipping keto substitutes (isKeto=false)');
      }

      // ===== STAGE 6: ALLERGY & INTOLERANCE SUBSTITUTES =====
      if (restrictions && restrictions.length > 0) {
        logger.info(
          `Stage 6: Retrieving allergy substitutes for ${restrictions.length} restrictions`
        );

        // Map restriction names to query terms
        // ONLY 4 SUPPORTED ALLERGIES: dairy, gluten, nuts, eggs
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

        // Supported allergies list
        const supportedAllergies = ['dairy', 'gluten', 'nuts', 'eggs'];

        // ⚡ OPTIMIZATION: Remove duplicate restrictions to avoid redundant RAG queries
        const uniqueRestrictions = [...new Set(restrictions)];
        if (uniqueRestrictions.length < restrictions.length) {
          logger.warn(
            `  ⚠️  Removed ${
              restrictions.length - uniqueRestrictions.length
            } duplicate restrictions (${restrictions.length} → ${uniqueRestrictions.length})`
          );
        }

        for (const restriction of uniqueRestrictions) {
          const normalizedRestriction = restriction.toLowerCase().trim();

          // Only process if it's one of the 4 supported allergies
          if (!supportedAllergies.includes(normalizedRestriction)) {
            logger.warn(
              `  Skipping unsupported allergy: "${restriction}" (only dairy, gluten, nuts, eggs supported)`
            );
            continue;
          }

          const queries = allergyQueries[normalizedRestriction];
          logger.info(`  Querying allergy substitutes for: "${restriction}"`);

          for (const query of queries) {
            const results = await retriever.retrieve(query, { topK: 5 });

            const types = results.map((r) => r.metadata?.type).filter(Boolean);
            logger.info(`  Retrieved types for "${restriction}": ${types.join(', ')}`);

            // Filter to get allergy substitute docs
            const allergySubstituteDocs = results.filter((doc) => {
              const type = doc.metadata?.type;
              const content = (doc.pageContent || doc.content || '').toLowerCase();

              // Exclude meal templates
              if (type === 'meal_template') return false;

              // Accept substitute and medical docs
              const isRelevantType =
                type === 'ingredient_substitute' ||
                type === 'medical_info' ||
                type === 'medical_knowledge';

              // Check if content is relevant to the allergy
              const hasAllergyContent =
                content.includes(normalizedRestriction) ||
                content.includes('allergy') ||
                content.includes('free') ||
                content.includes('substitute') ||
                content.includes('alternative');

              return isRelevantType && hasAllergyContent;
            });

            logger.info(`  Filtered to ${allergySubstituteDocs.length} allergy substitute docs`);
            retrievalResults.ingredientSubstitutes.push(...allergySubstituteDocs);
          }
        }

        logger.info(
          `Total allergy substitute docs retrieved: ${retrievalResults.ingredientSubstitutes.length}`
        );
      } else {
        logger.info('Stage 6: No dietary restrictions specified, skipping allergy substitutes');
      }

      // ===== ANTI-HALLUCINATION STRATEGY: LIMIT SUBSTITUTE DOCS =====
      // 🔥 CRITICAL FIX: Reduce substitute docs to prevent prompt noise and "lost in middle" problem
      // Too many substitutes (84+) dilute LLM attention, causing it to ignore forbidden dishes
      const MAX_SUBSTITUTES = 40; // Balanced: enough context, not overwhelming

      if (retrievalResults.ingredientSubstitutes.length > MAX_SUBSTITUTES) {
        const originalCount = retrievalResults.ingredientSubstitutes.length;

        // Keep only the most relevant substitutes (already sorted by relevance from retrieval)
        retrievalResults.ingredientSubstitutes = retrievalResults.ingredientSubstitutes.slice(
          0,
          MAX_SUBSTITUTES
        );

        const tokensReduced = (originalCount - MAX_SUBSTITUTES) * 350; // ~350 chars per substitute
        logger.warn(
          `⚡ ANTI-HALLUCINATION: Reduced substitutes from ${originalCount} → ${MAX_SUBSTITUTES} (saved ~${tokensReduced} tokens)`
        );
      } else {
        logger.info(
          `✅ Substitute count (${retrievalResults.ingredientSubstitutes.length}) within optimal range (<= ${MAX_SUBSTITUTES})`
        );
      }

      // ===== FINAL VALIDATION & SUMMARY =====

      // ⭐ KETO MODE: Log meals that need adaptation (but don't remove them!)
      // NEW STRATEGY: We KEEP high-carb meals as examples and let LLM adapt them
      if (preferences.isKeto && retrievalResults.mealTemplates.length > 0) {
        const mealsNeedingAdaptation = retrievalResults.mealTemplates.filter(
          (doc) => doc.metadata?.needsKetoAdaptation === true
        );

        const alreadyKetoFriendly =
          retrievalResults.mealTemplates.length - mealsNeedingAdaptation.length;

        if (mealsNeedingAdaptation.length > 0) {
          logger.info(`📋 KETO MEAL TEMPLATES SUMMARY:`, {
            total: retrievalResults.mealTemplates.length,
            alreadyKetoFriendly: alreadyKetoFriendly,
            needsAdaptation: mealsNeedingAdaptation.length,
            examples: mealsNeedingAdaptation.slice(0, 3).map((m) => ({
              name: m.metadata?.mealName || 'Unknown',
              highCarb: m.metadata?.highCarbIngredients || [],
            })),
          });

          logger.info(
            `✅ Strategy: LLM will adapt ${mealsNeedingAdaptation.length} high-carb meals using keto substitutes from RAG`
          );
        } else {
          logger.info(
            `✅ KETO VALIDATION: All ${retrievalResults.mealTemplates.length} meal templates are naturally keto-friendly`
          );
        }
      }
      // ⭐ ALLERGEN MODE: Final validation to ensure NO allergen-containing meals slipped through
      // This should NEVER catch anything if Stage 1 filtering works correctly
      if (restrictions && restrictions.length > 0 && retrievalResults.mealTemplates.length > 0) {
        const allergenMap = {
          dairy: [
            'milk',
            'paneer',
            'cheese',
            'curd',
            'yogurt',
            'dahi',
            'ghee',
            'butter',
            'cream',
            'khoya',
            'malai',
          ],
          gluten: ['wheat', 'maida', 'atta', 'roti', 'chapati', 'paratha', 'bread', 'naan'],
          nuts: [
            'almond',
            'cashew',
            'walnut',
            'pistachio',
            'peanut',
            'hazelnut',
            'pecan',
            'badam',
            'kaju',
          ],
          eggs: ['egg', 'omelette', 'anda'],
        };

        const violatingMeals = retrievalResults.mealTemplates.filter((doc) => {
          const content = (doc.pageContent || doc.content || '').toLowerCase();
          const mealName = (doc.metadata?.mealName || '').toLowerCase();

          return restrictions.some((restriction) => {
            const normalizedRestriction = restriction.toLowerCase().trim();
            const allergens = allergenMap[normalizedRestriction];
            // ⭐ FIX: Check both meal name AND content
            return (
              allergens &&
              allergens.some(
                (allergen) => mealName.includes(allergen) || content.includes(allergen)
              )
            );
          });
        });

        if (violatingMeals.length > 0) {
          logger.error(
            `🚨 CRITICAL BUG: ALLERGEN VALIDATION FAILED IN STAGE 1! Found ${violatingMeals.length} meals with allergens that should have been filtered earlier`,
            {
              restrictions: restrictions,
              violatingMeals: violatingMeals
                .slice(0, 5)
                .map((m) => m.metadata?.mealName || 'Unknown'),
              message:
                'This indicates a bug in the Stage 1 allergen filtering logic. Removing meals as fallback.',
            }
          );

          // Remove them as fallback safety
          retrievalResults.mealTemplates = retrievalResults.mealTemplates.filter((doc) => {
            const content = (doc.pageContent || doc.content || '').toLowerCase();
            const mealName = (doc.metadata?.mealName || '').toLowerCase();

            return !restrictions.some((restriction) => {
              const normalizedRestriction = restriction.toLowerCase().trim();
              const allergens = allergenMap[normalizedRestriction];
              return (
                allergens &&
                allergens.some(
                  (allergen) => mealName.includes(allergen) || content.includes(allergen)
                )
              );
            });
          });

          logger.info(
            `✅ Removed ${violatingMeals.length} allergen-containing meals as fallback. Safe meals remaining: ${retrievalResults.mealTemplates.length}`
          );
        } else {
          logger.info(
            `✅ ALLERGEN VALIDATION PASSED: All ${retrievalResults.mealTemplates.length} meal templates are allergen-free`
          );
        }
      }

      logger.info('Multi-stage retrieval complete', {
        mealTemplates: retrievalResults.mealTemplates.length,
        symptomGuidance: retrievalResults.symptomGuidance.length,
        labGuidance: retrievalResults.labGuidance.length,
        ingredientSubstitutes: retrievalResults.ingredientSubstitutes.length,
        allergyRestrictions: restrictions.length,
        isKeto: preferences.isKeto || false,
      });

      // ✅ OPTIMIZATION: Hybrid Re-Ranking
      // Re-rank meal templates using combined semantic + feature-based scoring
      // Improves recommendation quality by considering nutritional alignment,
      // budget constraints, prep time, and GI levels beyond pure semantic similarity
      if (retrievalResults.mealTemplates.length > 0) {
        logger.info('🎯 Applying hybrid re-ranking to meal templates');

        // Build query from preferences for intent detection
        const rankingQuery = this.buildMealTemplateQuery(preferences, healthContext);

        // Re-rank using hybrid scoring
        const beforeRerank = [...retrievalResults.mealTemplates];
        retrievalResults.mealTemplates = this.reranker.reRank(
          retrievalResults.mealTemplates,
          rankingQuery,
          {
            isKeto: preferences.isKeto || false,
            budget: preferences.budget,
            maxPrepTime: preferences.maxPrepTime,
            targetProtein: preferences.targetProtein,
            targetCarbs: preferences.targetCarbs,
          }
        );

        // Log re-ranking stats
        const stats = this.reranker.getStats(beforeRerank, retrievalResults.mealTemplates);
        if (stats) {
          logger.info('✅ Re-ranking complete', {
            totalDocs: stats.totalDocs,
            changedPositions: stats.changedPositions,
            avgImprovement: stats.avgImprovement,
          });
        }
      }

      // ✅ OPTIMIZATION: Deduplicate meal templates
      // Removes duplicate documents based on mealName + state
      // Reduces noise and improves LLM context quality
      // ✅ ENHANCED: Prefers state-specific over "All States" versions
      if (retrievalResults.mealTemplates.length > 0) {
        const beforeCount = retrievalResults.mealTemplates.length;
        retrievalResults.mealTemplates = deduplicator.deduplicateDocuments(
          retrievalResults.mealTemplates,
          {
            keyFields: ['mealName', 'state'],
            keepFirst: false, // Keep best scoring duplicate
            handleAllStates: true, // Prefer state-specific over "All States"
            logStats: true,
          }
        );
        const afterCount = retrievalResults.mealTemplates.length;

        if (beforeCount !== afterCount) {
          logger.info(
            `✅ Deduplication: ${beforeCount} → ${afterCount} meal templates (-${
              beforeCount - afterCount
            } duplicates)`
          );
        }

        // ⚠️ ANTI-HALLUCINATION: Increase meal templates to reduce LLM hallucination
        // More examples = Less need to make up dishes!
        // Each meal ~400 tokens (after compression) → 70 meals = 28K tokens (well within limit)
        // Previous: 40 meals = 13 per cuisine (too few, causes hallucination)
        // New: 70 meals = 23 per cuisine (sufficient examples)
        const MAX_MEALS_FOR_LLM = 70; // Increased from 40
        if (retrievalResults.mealTemplates.length > MAX_MEALS_FOR_LLM) {
          const originalCount = retrievalResults.mealTemplates.length;
          retrievalResults.mealTemplates = retrievalResults.mealTemplates.slice(
            0,
            MAX_MEALS_FOR_LLM
          );
          logger.warn(
            `⚠️ Token limit protection: Reduced meals from ${originalCount} → ${MAX_MEALS_FOR_LLM} (top re-ranked meals only)`
          );
        }

        // 🛡️ CRITICAL: Pre-generation cuisine validation
        // LAST DEFENSE: Filter out contaminated templates before LLM sees them
        // Even if Stage 1 filters missed them, catch forbidden dishes here
        // Prevents: "Cauliflower Upma (Tripuri Keto Jain)" from reaching prompt
        if (preferences.cuisines && preferences.cuisines.length > 0) {
          const forbiddenDishes = this.buildForbiddenDishList(preferences.cuisines);

          if (forbiddenDishes.length > 0) {
            const beforeValidation = retrievalResults.mealTemplates.length;
            retrievalResults.mealTemplates = retrievalResults.mealTemplates.filter((doc) => {
              const mealName = (doc.metadata?.mealName || '').toLowerCase();
              const ingredients = (doc.pageContent || '').toLowerCase();

              // Check for forbidden dish names in meal name or ingredients
              const hasForbiddenDish = forbiddenDishes.some((dish) => {
                return mealName.includes(dish) || ingredients.includes(dish);
              });

              if (hasForbiddenDish) {
                logger.warn(
                  `🚫 Pre-generation validation: Removed "${doc.metadata?.mealName}" - contains forbidden cuisine keyword`,
                  {
                    requestedCuisines: preferences.cuisines,
                    forbiddenKeywords: forbiddenDishes.filter(
                      (dish) => mealName.includes(dish) || ingredients.includes(dish)
                    ),
                  }
                );
              }

              return !hasForbiddenDish;
            });

            const afterValidation = retrievalResults.mealTemplates.length;
            if (beforeValidation !== afterValidation) {
              logger.info(
                `✅ Pre-generation validation: ${beforeValidation} → ${afterValidation} meal templates (-${
                  beforeValidation - afterValidation
                } forbidden dishes removed)`
              );
            }
          }
        }
      }

      // ⚡ NEW OPTIMIZATION: Cross-category deduplication for symptom/lab/substitute docs
      // Remove duplicate content across different retrieval categories to reduce tokens
      // This is critical because the same nutritional guidance often appears in multiple categories
      const allGuidanceDocs = [
        ...retrievalResults.symptomGuidance,
        ...retrievalResults.labGuidance,
        ...retrievalResults.ingredientSubstitutes,
      ];

      if (allGuidanceDocs.length > 0) {
        const beforeGuidanceCount = allGuidanceDocs.length;

        // Deduplicate based on content similarity (first 200 chars as fingerprint)
        const deduplicatedGuidance = deduplicator.deduplicateDocuments(allGuidanceDocs, {
          keyFields: ['metadata.title', 'contentHash'], // Use title + content hash
          keepFirst: true, // Keep first occurrence (best semantic match)
          logStats: false,
        });

        const afterGuidanceCount = deduplicatedGuidance.length;

        // Redistribute back to categories (preserve ratios)
        if (beforeGuidanceCount !== afterGuidanceCount) {
          const symptomRatio = retrievalResults.symptomGuidance.length / beforeGuidanceCount;
          const labRatio = retrievalResults.labGuidance.length / beforeGuidanceCount;
          const substituteRatio =
            retrievalResults.ingredientSubstitutes.length / beforeGuidanceCount;

          const symptomCount = Math.ceil(afterGuidanceCount * symptomRatio);
          const labCount = Math.ceil(afterGuidanceCount * labRatio);
          const substituteCount = afterGuidanceCount - symptomCount - labCount;

          retrievalResults.symptomGuidance = deduplicatedGuidance.slice(0, symptomCount);
          retrievalResults.labGuidance = deduplicatedGuidance.slice(
            symptomCount,
            symptomCount + labCount
          );
          retrievalResults.ingredientSubstitutes = deduplicatedGuidance.slice(
            symptomCount + labCount
          );

          logger.info(
            `✅ Cross-category deduplication: ${beforeGuidanceCount} → ${afterGuidanceCount} guidance docs (-${
              beforeGuidanceCount - afterGuidanceCount
            } duplicates)`,
            {
              symptom: `${retrievalResults.symptomGuidance.length}`,
              lab: `${retrievalResults.labGuidance.length}`,
              substitute: `${retrievalResults.ingredientSubstitutes.length}`,
            }
          );
        }
      }

      return retrievalResults;
    } catch (error) {
      logger.error('Multi-stage retrieval failed', { error: error.message, stack: error.stack });
      return retrievalResults;
    }
  }

  /**
   * Build forbidden dish list based on requested cuisines
   * Uses region-based dish keywords to find dishes NOT in allowed cuisines
   * Example: If user requests "Naga", forbid all South Indian dishes (idli, dosa, upma, etc.)
   */
  buildForbiddenDishList(requestedCuisines) {
    const forbiddenDishes = [];

    // Define forbidden dish keywords by region
    const forbiddenDishKeywords = {
      'south-indian': [
        'idli',
        'dosa',
        'sambar',
        'rasam',
        'appam',
        'puttu',
        'upma',
        'vada',
        'pongal',
        'uttapam',
        'coconut chutney',
      ],
      'north-indian': ['chole', 'rajma', 'makki', 'sarson', 'tandoor', 'naan', 'kulcha', 'paratha'],
      'west-indian': ['dhokla', 'thepla', 'undhiyu', 'khandvi', 'pav bhaji', 'vada pav'],
      bengali: ['shukto', 'chingri', 'ilish', 'machher jhol', 'mishti doi'],
    };

    // Check if ANY cuisine from each region is selected
    const selectedRegions = new Set();
    requestedCuisines.forEach((cuisine) => {
      const cuisineLower = cuisine.toLowerCase();
      const region = CUISINE_TO_REGION_MAP[cuisineLower];
      if (region) {
        selectedRegions.add(region);
      }
    });

    // Build list of EXPLICITLY FORBIDDEN dishes from regions NOT selected
    for (const [region, dishes] of Object.entries(forbiddenDishKeywords)) {
      // Only forbid if NO cuisine from this region is selected
      const regionIsSelected = selectedRegions.has(region);
      if (!regionIsSelected) {
        forbiddenDishes.push(...dishes);
      }
    }

    // Legacy logic to prevent issues - keep the original iteration structure
    // This section was trying to iterate but cuisineToRegionMap had wrong structure
    // Replaced with simpler region-based approach above

    logger.debug('Built forbidden dish list', {
      requestedCuisines,
      selectedRegions: Array.from(selectedRegions),
      forbiddenDishesCount: forbiddenDishes.length,
      forbiddenSample: forbiddenDishes.slice(0, 10), // First 10 for debugging
    });

    return forbiddenDishes;
  }

  /**
   * Build RAG query for meal templates (UPDATED for multiple cuisines)
   */
  buildMealTemplateQuery(preferences, healthContext) {
    const queryParts = [];

    // Add cuisines (now supports multiple with OR logic)
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      const cuisineString = preferences.cuisines.join(' OR ');
      queryParts.push(`cuisine: ${cuisineString}`);
    } else if (preferences.regions && preferences.regions.length > 0) {
      // Fallback to regions if no cuisines specified
      const regionString = preferences.regions.join(' OR ');
      queryParts.push(`region: ${regionString}`);
    }

    // Add diet type
    if (preferences.dietType) {
      queryParts.push(`diet: ${preferences.dietType}`);
    }

    // Add PCOS-specific keywords
    queryParts.push('PCOS-friendly');
    queryParts.push('low-glycemic');

    // Add symptom-based keywords if available
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      const symptomKeywords = healthContext.symptoms
        .map((s) => {
          const keywordMap = {
            'irregular-periods': 'hormone-balancing',
            'weight-gain': 'weight-management',
            acne: 'anti-inflammatory',
            'hair-loss': 'nutrient-rich',
            hirsutism: 'androgen-reducing',
            fatigue: 'energy-boosting',
            'mood-swings': 'mood-stabilizing',
          };
          return keywordMap[s] || s;
        })
        .join(' ');

      queryParts.push(symptomKeywords);
    }

    // Add goal-based keywords
    if (healthContext.goals && healthContext.goals.length > 0) {
      queryParts.push(healthContext.goals.join(' '));
    }

    const query = queryParts.join(' ');
    logger.info('Built meal template query for multiple cuisines', {
      cuisines: preferences.cuisines,
      cuisineCount: preferences.cuisines?.length || 0,
      queryLength: query.length,
      query: query.substring(0, 200),
    });

    return query;
  }

  /**
   * Build query for PCOS nutrition guidelines
   */
  buildNutritionQuery(healthContext) {
    const parts = ['PCOS nutrition guidelines'];
    if (healthContext.symptoms?.length) {
      parts.push('for', healthContext.symptoms.join(' '));
    }
    if (healthContext.goals?.length) {
      parts.push(healthContext.goals.join(' '));
    }
    parts.push('low glycemic index hormone balance insulin resistance');
    return parts.join(' ');
  }

  /**
   * Build query for lab-specific dietary guidance
   */
  buildLabGuidanceQuery(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return null;
    }

    const abnormalLabs = [];
    const categories = this.categorizeLabs(labValues);

    Object.entries(labValues).forEach(([labName, data]) => {
      if (data.severity && data.severity !== 'normal') {
        abnormalLabs.push({
          name: labName,
          severity: data.severity,
          category: categories[labName] || 'general',
        });
      }
    });

    if (abnormalLabs.length === 0) {
      return null;
    }

    const queryParts = ['PCOS dietary recommendations for'];

    abnormalLabs.forEach((lab) => {
      const displayName = this.getLabDisplayName(lab.name);
      queryParts.push(`${lab.severity} ${displayName}`);
    });

    queryParts.push('nutrition management');

    const query = queryParts.join(' ');
    logger.info('Built lab guidance query', {
      abnormalLabCount: abnormalLabs.length,
      query: query.substring(0, 150),
    });

    return query;
  }

  /**
   * Categorize labs by health domain
   */
  categorizeLabs(labValues) {
    const categories = {
      glucose_fasting: 'glucose',
      insulin_fasting: 'glucose',
      homa_ir: 'glucose',
      hba1c: 'glucose',
      cholesterol_total: 'lipids',
      triglycerides: 'lipids',
      hdl_cholesterol: 'lipids',
      ldl_cholesterol: 'lipids',
      vldl_cholesterol: 'lipids',
      testosterone_total: 'hormones',
      testosterone_free: 'hormones',
      dheas: 'hormones',
      lh: 'hormones',
      fsh: 'hormones',
      prolactin: 'hormones',
      amh: 'hormones',
      tsh: 'thyroid',
      t3_free: 'thyroid',
      t4_free: 'thyroid',
      vitamin_d: 'vitamins',
      vitamin_b12: 'vitamins',
      iron: 'minerals',
      ferritin: 'minerals',
    };

    return categories;
  }

  /**
   * Get display name for lab test
   */
  getLabDisplayName(labName) {
    const nameMap = {
      glucose_fasting: 'Fasting Glucose',
      insulin_fasting: 'Fasting Insulin',
      homa_ir: 'HOMA-IR',
      hba1c: 'HbA1c',
      cholesterol_total: 'Total Cholesterol',
      triglycerides: 'Triglycerides',
      hdl_cholesterol: 'HDL Cholesterol',
      ldl_cholesterol: 'LDL Cholesterol',
      vldl_cholesterol: 'VLDL Cholesterol',
      testosterone_total: 'Total Testosterone',
      testosterone_free: 'Free Testosterone',
      dheas: 'DHEA-S',
      lh: 'LH',
      fsh: 'FSH',
      lh_fsh_ratio: 'LH:FSH Ratio',
      prolactin: 'Prolactin',
      amh: 'AMH',
      tsh: 'TSH',
      t3_free: 'Free T3',
      t4_free: 'Free T4',
      vitamin_d: 'Vitamin D',
      vitamin_b12: 'Vitamin B12',
      iron: 'Serum Iron',
      ferritin: 'Ferritin',
      crp: 'CRP',
      cortisol: 'Cortisol',
    };

    return nameMap[labName] || labName.replace(/_/g, ' ').toUpperCase();
  }

  /**
   * Build user context with health data (UPDATED for multiple cuisines)
   */
  buildUserContext(preferences, healthContext) {
    let context = '👤 USER PROFILE & PREFERENCES:\n\n';

    // Multiple cuisines support
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      context += `Preferred Cuisines: ${preferences.cuisines.join(', ')}\n`;
      if (preferences.cuisines.length > 1) {
        context += `📍 IMPORTANT: Create a balanced mix incorporating ALL ${preferences.cuisines.length} selected cuisines throughout the meal plan.\n`;
        context += `Each day should feature meals from different cuisines for variety.\n\n`;
      }
    } else if (preferences.regions && preferences.regions.length > 0) {
      context += `Regions: ${preferences.regions.join(', ')}\n\n`;
    }

    context += `Diet Type: ${preferences.dietType || 'vegetarian'}\n`;
    context += `Meals Per Day: ${preferences.mealsPerDay || 3}\n`;
    context += `Daily Budget: ₹${preferences.budget || 300}\n`;
    context += `Duration: ${preferences.duration || 7} days\n\n`;

    // Restrictions (STRONG ENFORCEMENT) - ONLY 4 SUPPORTED: dairy, gluten, nuts, eggs
    if (preferences.restrictions && preferences.restrictions.length > 0) {
      context += `\n🚨🚨🚨 ALLERGY & INTOLERANCE RESTRICTIONS (ABSOLUTE MUST - HIGHEST PRIORITY):\n`;
      context += `The user has the following allergies/intolerances. You MUST completely ELIMINATE these ingredients:\n\n`;

      // Filter to only supported allergies
      const supportedAllergies = ['dairy', 'gluten', 'nuts', 'eggs'];
      const validRestrictions = preferences.restrictions.filter((r) =>
        supportedAllergies.includes(r.toLowerCase().trim())
      );

      validRestrictions.forEach((r) => {
        const normalizedRestriction = r.toLowerCase().trim();

        // Add detailed guidance for each restriction type
        if (normalizedRestriction === 'dairy') {
          context += `❌ DAIRY ALLERGY/INTOLERANCE - ELIMINATE ALL:\n`;
          context += `   - NO milk, paneer, cheese, curd, yogurt, ghee, butter, cream, khoya, malai, condensed milk\n`;
          context += `   - REPLACE WITH: Coconut milk, almond milk, tofu, coconut yogurt, coconut oil\n`;
          context += `   - CHECK RAG "DAIRY-FREE SUBSTITUTES" section for complete alternatives\n\n`;
        } else if (normalizedRestriction === 'gluten') {
          context += `❌ GLUTEN INTOLERANCE/CELIAC - ELIMINATE ALL:\n`;
          context += `   - NO wheat, barley, rye, maida, atta, semolina (sooji), regular roti, paratha, bread, pasta\n`;
          context += `   - REPLACE WITH: Besan (chickpea flour), ragi flour, jowar flour, bajra flour, rice flour, quinoa\n`;
          context += `   - CHECK RAG "GLUTEN-FREE SUBSTITUTES" section for complete alternatives\n\n`;
        } else if (normalizedRestriction === 'nuts') {
          context += `❌ NUT ALLERGY - ELIMINATE ALL TYPES OF NUTS:\n`;
          context += `   - NO almonds, cashews, walnuts, pistachios, peanuts, hazelnuts, pecans, macadamia, brazil nuts\n`;
          context += `   - NO almond flour, almond milk, cashew cream, nut butters, any nut-based products\n`;
          context += `   - REPLACE WITH: Seeds (sunflower, pumpkin, chia, flax, hemp, sesame), coconut products\n`;
          context += `   - NOTE: Coconut is botanically a FRUIT (not a nut) and is SAFE for nut allergies\n`;
          context += `   - CHECK RAG "NUT-FREE SUBSTITUTES" section for complete alternatives\n\n`;
        } else if (normalizedRestriction === 'eggs') {
          context += `❌ EGG ALLERGY - ELIMINATE ALL:\n`;
          context += `   - NO eggs in any form (whole eggs, egg yolk, egg white, egg powder)\n`;
          context += `   - REPLACE WITH: Flax egg (1 tbsp ground flaxseed + 3 tbsp water), chia egg, mashed banana, tofu\n`;
          context += `   - CHECK RAG "EGG-FREE SUBSTITUTES" section for complete alternatives\n\n`;
        }
      });

      context += `⚠️ CRITICAL REMINDERS:\n`;
      context += `   - These are allergies/intolerances - NOT preferences. NEVER include restricted ingredients.\n`;
      context += `   - Check EVERY ingredient in EVERY meal to ensure it doesn't contain allergens\n`;
      context += `   - Use the RAG "ALLERGY & INTOLERANCE SUBSTITUTES" section for detailed alternatives\n`;
      context += `   - If a traditional dish contains allergens, YOU MUST adapt it using substitutes\n`;
      context += `   - For NUT ALLERGY: Eliminate ALL types of nuts (we don't specify which nuts - ALL are forbidden)\n`;
      context += `   - Allergies take ABSOLUTE PRIORITY over all other requirements (including keto, taste, cost)\n\n`;
    }

    // Health data
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      context += `🩺 SYMPTOMS:\n`;
      healthContext.symptoms.forEach((s) => {
        context += `  - ${s}\n`;
      });
      context += '\n';
    }

    if (healthContext.goals && healthContext.goals.length > 0) {
      context += `🎯 HEALTH GOALS:\n`;
      healthContext.goals.forEach((g) => {
        context += `  - ${g}\n`;
      });
      context += '\n';
    }

    if (healthContext.activityLevel) {
      context += `💪 Activity Level: ${healthContext.activityLevel}\n\n`;
    }

    // Medical data
    if (healthContext.medicalData && healthContext.medicalData.labValues) {
      context += `🔬 MEDICAL REPORT DATA:\n`;
      const labs = healthContext.medicalData.labValues;

      Object.entries(labs).forEach(([key, data]) => {
        if (data.severity && data.severity !== 'normal') {
          context += `  - ${key}: ${data.value} ${data.unit || ''} (${data.severity})\n`;
        }
      });
      context += '\n';
    }

    return context;
  }

  /**
   * Generate meal plan prompt (UPDATED for multiple cuisines)
   */
  buildMealPlanPrompt(preferences, healthContext, enhancedContext) {
    // ⭐ DECLARE COMMON VARIABLES EARLY for reuse throughout
    const dietType = preferences.dietType || 'vegetarian';
    const targetCalories = preferences.userCalories || 2000;
    const mealsCount = preferences.mealsPerDay || 3;

    // =================================================================
    // 🚨🚨🚨 CRITICAL CONSTRAINTS SECTION - LLM READS THIS FIRST! 🚨🚨🚨
    // =================================================================
    // Anti-hallucination strategy: Place most important constraints at the
    // very top where LLM attention is highest (not buried in middle)

    let prompt = `🚨🚨🚨 ============================================ 🚨🚨🚨\n`;
    prompt += `🚨 CRITICAL CONSTRAINTS - READ THESE FIRST (ABSOLUTE PRIORITY) 🚨\n`;
    prompt += `🚨🚨🚨 ============================================ 🚨🚨🚨\n\n`;

    // 1. FORBIDDEN DISHES (anti-hallucination - highest priority)
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      const forbiddenDishes = this.buildForbiddenDishList(preferences.cuisines);

      if (forbiddenDishes.length > 0) {
        prompt += `1️⃣ ❌ FORBIDDEN DISHES - DO NOT USE THESE UNDER ANY CIRCUMSTANCES:\n`;
        prompt += `   Requested cuisines: ${preferences.cuisines.join(', ')}\n`;
        prompt += `   BANNED dishes: ${forbiddenDishes.slice(0, 15).join(', ')}${
          forbiddenDishes.length > 15 ? ', etc.' : ''
        }\n`;
        prompt += `   \n`;
        prompt += `   🚨 IF YOU USE ANY FORBIDDEN DISH, THE ENTIRE MEAL PLAN WILL BE REJECTED!\n`;
        prompt += `   🚨 Examples of VIOLATIONS:\n`;
        prompt += `      - User selects "Manipuri" but you suggest "Vegetable Upma" (South Indian dish)\n`;
        prompt += `      - User selects "Naga" but you suggest "Idli" (South Indian dish)\n`;
        prompt += `      - User selects "Rajasthani" but you suggest "Dosa" (South Indian dish)\n`;
        prompt += `   ✅ ONLY use dishes from meal templates that match selected cuisines!\n\n`;
      }
    }

    // 2. MEAL TEMPLATE ADHERENCE (anti-hallucination)
    prompt += `2️⃣ 🚨 MEAL TEMPLATE ADHERENCE (MANDATORY - NO EXCEPTIONS):\n`;
    prompt += `   ✅ ONLY use meals from "📋 MEAL TEMPLATES FROM KNOWLEDGE BASE" section below\n`;
    prompt += `   ✅ EVERY meal name MUST match a template exactly (including state label)\n`;
    prompt += `   ❌ DO NOT create new dishes from scratch\n`;
    prompt += `   ❌ DO NOT hallucinate dish names not in templates\n`;
    prompt += `   ❌ DO NOT use generic dishes (upma, idli, dosa, poha) unless in your cuisine's templates\n`;
    prompt += `   ❌ DO NOT use meal examples from "Substitution Guide" as complete meals\n`;
    prompt += `   \n`;
    prompt += `   ✅ IF templates contain high-carb ingredients → ADAPT using substitution guide\n`;
    prompt += `   ✅ KEEP regional authenticity (state labels, traditional preparation)\n\n`;

    // 3. DIET TYPE ENFORCEMENT
    if (dietType === 'vegan') {
      prompt += `3️⃣ 🌱 VEGAN DIET (ABSOLUTE MUST - NO ANIMAL PRODUCTS):\n`;
      prompt += `   ❌ NO meat, fish, seafood, eggs, dairy, honey\n`;
      prompt += `   ❌ IF template has "Fish", "Prawn", "Chicken", "Egg" → REPLACE with tofu/chickpea/mushroom\n`;
      prompt += `   ❌ RENAME meal after substitution (see constraint 7️⃣ below)\n`;
      prompt += `   ✅ ONLY plant-based: vegetables, fruits, grains, legumes, nuts, seeds\n`;
      prompt += `   ✅ Adapt non-vegan templates using "Ingredient Substitution Guide"\n\n`;
    } else if (dietType === 'jain') {
      prompt += `3️⃣ 🙏 JAIN DIET (STRICTEST RESTRICTIONS - STRICTER THAN VEGAN):\n`;
      prompt += `   🚨 CRITICAL: Jain = VEGETARIAN + NO root vegetables + NO onion/garlic\n`;
      prompt += `   \n`;
      prompt += `   ❌ ABSOLUTELY NO MEAT/FISH/SEAFOOD:\n`;
      prompt += `      - NO chicken, mutton, lamb, pork, beef, fish, prawns, shrimp, crab, seafood\n`;
      prompt += `      - IF template has "Fish", "Prawn", "Chicken", "Meat" → REPLACE with paneer/tofu/chickpea\n`;
      prompt += `      - RENAME meal after substitution: "Fish Stew" → "Paneer Stew" or "Tofu Stew"\n`;
      prompt += `   \n`;
      prompt += `   ❌ NO EGGS in any form (whole eggs, egg whites, egg-based products)\n`;
      prompt += `   \n`;
      prompt += `   ❌ NO ROOT VEGETABLES (critical Jain principle):\n`;
      prompt += `      - NO potato, sweet potato, yam, cassava\n`;
      prompt += `      - NO onion, garlic, ginger root, shallots, leek, scallions\n`;
      prompt += `      - NO carrot, radish, beetroot, turnip, parsnip\n`;
      prompt += `      - IF template has these → REPLACE with above-ground vegetables\n`;
      prompt += `   \n`;
      prompt += `   ❌ NO MUSHROOMS (fungi are considered non-vegetarian in Jain diet)\n`;
      prompt += `   \n`;
      prompt += `   ❌ NO HONEY (produced by bees, involves harming insects)\n`;
      prompt += `   \n`;
      prompt += `   ✅ ALLOWED PROTEINS: Paneer, chhena, tofu, milk, yogurt, dals, chickpeas, beans, nuts, seeds\n`;
      prompt += `   ✅ ALLOWED VEGETABLES: Only above-ground (cauliflower, broccoli, cabbage, pumpkin, etc.)\n`;
      prompt += `   ✅ FLAVOR: Use hing (asafoetida) + ginger powder (saunth) instead of onion/garlic\n`;
      prompt += `   \n`;
      prompt += `   🚨 IF YOU INCLUDE FISH/PRAWN/CHICKEN/EGG IN JAIN MEAL, PLAN IS REJECTED!\n\n`;
    }

    // 4. KETO MODE (if applicable)
    if (preferences.isKeto) {
      prompt += `4️⃣ 🔥 KETOGENIC MODE (OVERRIDES STANDARD PCOS RULES):\n`;
      prompt += `   ❌ ZERO grains (rice, wheat, millets, oats)\n`;
      prompt += `   ❌ ZERO legumes/dals (too high in carbs)\n`;
      prompt += `   ❌ ZERO starchy vegetables (potato, corn, peas)\n`;
      prompt += `   ❌ NO RICE in meal names (check names: "Rice Soup", "Fish Rice", "Vegetable Rice" = FORBIDDEN)\n`;
      prompt += `   ❌ NO DAL/LENTILS in meal names or ingredients\n`;
      prompt += `   ❌ NO SOUP with grains (check names: "Rice Soup", "Dal Soup", "Wheat Soup" = FORBIDDEN)\n`;
      prompt += `   ✅ ADAPT templates: rice→cauliflower rice, roti→almond flour roti\n`;
      prompt += `   ✅ NET CARBS: Maximum 20-50g per day (${Math.round(
        50 / mealsCount
      )}g per meal)\n\n`;
    }

    // 5. INGREDIENT VARIETY (anti-repetition for ALL food categories)
    prompt += `5️⃣ 🌈 INGREDIENT VARIETY (MANDATORY - ROTATE ALL FOOD CATEGORIES):\n\n`;

    prompt += `   A. PROTEIN VARIETY (NO repetition in consecutive meals):\n`;
    if (dietType === 'vegan') {
      prompt += `   ✅ Vegan proteins: tofu, tempeh, chickpeas, black beans, kidney beans, lentils (red/green/black),\n`;
      prompt += `      mushrooms (button/shiitake/oyster), jackfruit, soya chunks, peanuts, almonds, walnuts, cashews\n`;
    } else if (dietType === 'jain') {
      prompt += `   ✅ Jain proteins (NO onion/garlic/root veg): paneer, chhena, tofu, chickpeas, moong dal,\n`;
      prompt += `      urad dal, masoor dal, toor dal, above-ground beans, pumpkin seeds, sunflower seeds,\n`;
      prompt += `      almonds, cashews, walnuts, pistachios, peanuts, sesame seeds\n`;
      prompt += `   ⚠️ Jain-specific: Focus on dairy proteins (paneer, chhena) and legumes (dals, beans)\n`;
    } else if (dietType === 'vegetarian') {
      prompt += `   ✅ Vegetarian proteins: paneer, chhena, tofu, eggs, chickpeas, black beans, kidney beans,\n`;
      prompt += `      lentils (red/green/black), mushrooms, peanuts, almonds, walnuts, cashews, Greek yogurt\n`;
    } else {
      prompt += `   ✅ All proteins: chicken, fish, prawns, eggs, paneer, tofu, chickpeas, lentils, beans, nuts\n`;
    }
    prompt += `   ❌ WRONG: Tofu in all 3 meals (Day 1: Tofu Singju, Day 2: Tofu Wrap, Day 3: Tofu Bowl)\n`;
    prompt += `   ✅ RIGHT: Day 1 tofu, Day 2 chickpeas, Day 3 mushrooms, Day 4 lentils, Day 5 paneer\n\n`;

    prompt += `   B. VEGETABLE VARIETY (NO repetition - use diverse colors/types):\n`;
    if (dietType === 'jain') {
      prompt += `   ✅ Jain vegetables (NO root veg/onion/garlic): cauliflower, broccoli, cabbage, bottle gourd (lauki),\n`;
      prompt += `      ridge gourd (turai), bitter gourd (karela), pumpkin, tomatoes, bell peppers (red/yellow/green),\n`;
      prompt += `      spinach, fenugreek (methi), zucchini, eggplant (brinjal), okra (bhindi), green beans, peas (pods)\n`;
      prompt += `   ⚠️ Jain FORBIDDEN: NO potato, onion, garlic, carrot, radish, beetroot, ginger, turnip\n`;
    } else {
      prompt += `   ✅ Mix colors daily: green (spinach, beans), orange (carrots, pumpkin), red (tomatoes, beets),\n`;
      prompt += `      white (cauliflower, mushrooms), purple (eggplant, cabbage), yellow (bell peppers, squash)\n`;
      prompt += `   ✅ Vary types: leafy greens, cruciferous (broccoli/cabbage), gourds (lauki/turai), root veg (carrots/beets)\n`;
    }
    prompt += `   ❌ WRONG: Spinach every day (Day 1-7: all meals with spinach)\n`;
    prompt += `   ✅ RIGHT: Day 1 spinach, Day 2 broccoli, Day 3 bell peppers, Day 4 eggplant, Day 5 beans\n\n`;

    prompt += `   C. GRAIN/CARB VARIETY (rotate across days):\n`;
    if (preferences.isKeto) {
      prompt += `   ✅ Keto carbs ONLY: cauliflower rice, zucchini noodles, almond flour roti, coconut flour bread,\n`;
      prompt += `      shirataki noodles, lettuce wraps, cheese-based bread\n`;
      prompt += `   ❌ NO regular grains (rice, wheat, millets, oats, quinoa, dal)\n`;
    } else if (dietType === 'jain') {
      prompt += `   ✅ Jain grains: rice (white/brown), wheat roti, bajra roti, jowar roti, buckwheat (kuttu),\n`;
      prompt += `      amaranth (rajgira), water chestnut flour (singhara), sabudana (tapioca pearls)\n`;
      prompt += `   ✅ Vary daily: Day 1 rice, Day 2 wheat roti, Day 3 bajra, Day 4 sabudana, Day 5 buckwheat\n`;
    } else {
      prompt += `   ✅ Healthy grains: brown rice, quinoa, millets (ragi/bajra/jowar), oats, whole wheat roti,\n`;
      prompt += `      barley, buckwheat, amaranth, red rice, black rice\n`;
      prompt += `   ✅ Vary daily: Day 1 brown rice, Day 2 quinoa, Day 3 ragi, Day 4 oats, Day 5 whole wheat\n`;
    }
    prompt += `   ❌ WRONG: White rice every single day for 7 days\n`;
    prompt += `   ✅ RIGHT: Rotate grains across days for diverse nutrients\n\n`;

    prompt += `   D. HEALTHY FAT VARIETY (rotate cooking oils and fat sources):\n`;
    if (dietType === 'jain') {
      prompt += `   ✅ Jain fats: ghee, butter, coconut oil, sesame oil, peanut oil, sunflower oil, olive oil,\n`;
      prompt += `      avocado (if available), nuts (almonds/cashews/walnuts), seeds (sesame/pumpkin/sunflower)\n`;
    } else if (dietType === 'vegan') {
      prompt += `   ✅ Vegan fats: coconut oil, olive oil, sesame oil, peanut oil, sunflower oil, avocado oil,\n`;
      prompt += `      nuts (almonds/cashews/walnuts), seeds (chia/flax/hemp/pumpkin), tahini, nut butters\n`;
      prompt += `   ❌ NO ghee, butter, dairy-based fats\n`;
    } else {
      prompt += `   ✅ All fats: ghee, coconut oil, olive oil, sesame oil, mustard oil, peanut oil,\n`;
      prompt += `      nuts (almonds/cashews/walnuts), seeds (chia/flax/pumpkin), avocado, tahini\n`;
    }
    prompt += `   ✅ Vary cooking oils: Day 1 coconut oil, Day 2 ghee, Day 3 olive oil, Day 4 sesame oil\n`;
    prompt += `   ❌ WRONG: Only coconut oil for all 7 days\n`;
    prompt += `   ✅ RIGHT: Rotate oils and fat sources for omega-3/6/9 balance\n\n`;

    prompt += `   E. FLAVOR ENHANCER VARIETY (avoid onion/garlic repetition for Jain):\n`;
    if (dietType === 'jain') {
      prompt += `   ✅ Jain flavor bases: hing (asafoetida), ginger powder (saunth), curry leaves, fresh herbs,\n`;
      prompt += `      tomatoes, tamarind, kokum, amchur (dry mango powder), lemon/lime, cumin, coriander seeds,\n`;
      prompt += `      fennel seeds, ajwain, fenugreek seeds, black pepper, green chili\n`;
      prompt += `   ⚠️ CRITICAL: ALWAYS use hing as onion/garlic replacement in tempering (tadka)\n`;
      prompt += `   ❌ ABSOLUTELY FORBIDDEN: NO onion, garlic, ginger root, leek, scallions, shallots\n`;
      prompt += `   ✅ Vary flavor profiles: Day 1 hing+cumin, Day 2 curry leaves+mustard, Day 3 tamarind+kokum\n`;
    } else {
      prompt += `   ✅ Regular flavor bases: onion, garlic, ginger, tomatoes, curry leaves, fresh herbs,\n`;
      prompt += `      tamarind, kokum, lemon/lime, various spices\n`;
      prompt += `   ✅ Vary combinations daily for diverse taste profiles\n`;
    }
    prompt += `\n`;

    // 6. MEAL TYPE ENFORCEMENT
    prompt += `6️⃣ 🍽️ MEAL TYPE ENFORCEMENT (STRICT MATCHING):\n`;
    prompt += `   ✅ Use ONLY breakfast templates for breakfast slots (7-9 AM meals)\n`;
    prompt += `   ✅ Use ONLY lunch/dinner templates for lunch slots (12-2 PM meals)\n`;
    prompt += `   ✅ Use ONLY dinner/lunch templates for dinner slots (7-9 PM meals)\n`;
    prompt += `   ✅ Use ONLY snack templates for snack slots\n`;
    prompt += `   \n`;
    prompt += `   ❌ BREAKFAST FORBIDDEN ITEMS (these are lunch/dinner foods):\n`;
    prompt += `      - NO curry of any kind (dal curry, vegetable curry, paneer curry, pumpkin curry, etc.)\n`;
    prompt += `      - NO soup (fish soup, vegetable soup, dal soup, chamthong, etc.)\n`;
    prompt += `      - NO rice dishes (biryani, pulao, fried rice, fish rice, etc.)\n`;
    prompt += `      - NO heavy gravied dishes (butter masala, korma, rogan josh, etc.)\n`;
    prompt += `      - NO dal/lentil-based main dishes (dal tadka, dal makhani - these are lunch/dinner)\n`;
    prompt += `   \n`;
    prompt += `   ✅ BREAKFAST APPROPRIATE ITEMS (Indian context):\n`;
    prompt += `      - Light grain dishes: Poha, Upma, Idli, Dosa, Uttapam, Dhokla, Chilla\n`;
    prompt += `      - Stuffed breads: Paratha (stuffed), Thepla\n`;
    prompt += `      - Protein options: Eggs (if diet allows), Sprouts, Light paneer dishes\n`;
    prompt += `      - Modern: Oats preparations, Smoothie bowls, Whole grain toast\n`;
    prompt += `      - Accompaniments: Chutney, Sambhar (as side), Fresh fruit, Curd\n`;
    prompt += `   \n`;
    prompt += `   🚨 IF BREAKFAST HAS "CURRY" OR "SOUP" IN NAME → REJECTED!\n\n`;

    // 7. VEGAN/JAIN NAME ADAPTATION
    if (dietType === 'vegan') {
      prompt += `7️⃣ 🌱 VEGAN MEAL NAME ADAPTATION (MANDATORY):\n`;
      prompt += `   ✅ If adapting non-vegan template, RENAME meal to reflect vegan protein used\n`;
      prompt += `   ❌ WRONG: "Herb Chicken Roast (Vegan Adaptation)" - still has "Chicken" in name\n`;
      prompt += `   ✅ RIGHT: "Herb Tofu Roast" or "Herb Chickpea Roast" - actual protein in name\n`;
      prompt += `   ❌ WRONG: "Lite Prawn Stew (Vegan)" - still has "Prawn" in name\n`;
      prompt += `   ✅ RIGHT: "Lite Mushroom Stew" or "Lite Jackfruit Stew" - actual protein in name\n`;
      prompt += `   📝 Name replacement guide:\n`;
      prompt += `      - Chicken/Fish/Prawn → Tofu, Chickpea, Mushroom, Jackfruit (based on actual substitute)\n`;
      prompt += `      - Mutton/Lamb → Jackfruit, Soya Chunks, Mushroom\n`;
      prompt += `      - Egg → Tofu Scramble, Chickpea Flour (based on dish type)\n\n`;
    } else if (dietType === 'jain') {
      prompt += `7️⃣ 🙏 JAIN MEAL NAME ADAPTATION (MANDATORY):\n`;
      prompt += `   ✅ If template has meat/fish/seafood, RENAME meal to reflect Jain protein used\n`;
      prompt += `   ❌ ABSOLUTELY WRONG: "Prawn Chili Tawa" for Jain diet - FISH/SEAFOOD FORBIDDEN!\n`;
      prompt += `   ❌ ABSOLUTELY WRONG: "Hill Herb Fish Stew" for Jain diet - FISH FORBIDDEN!\n`;
      prompt += `   ❌ ABSOLUTELY WRONG: "Herb Chicken Roast (Jain)" - CHICKEN FORBIDDEN!\n`;
      prompt += `   \n`;
      prompt += `   ✅ RIGHT: Replace with Jain proteins and rename:\n`;
      prompt += `      - "Prawn Chili Tawa" → "Paneer Chili Tawa" or "Tofu Chili Tawa"\n`;
      prompt += `      - "Hill Herb Fish Stew" → "Hill Herb Paneer Stew" or "Hill Herb Tofu Stew"\n`;
      prompt += `      - "Chicken Roast" → "Paneer Roast" or "Chickpea Roast"\n`;
      prompt += `   \n`;
      prompt += `   📝 Jain name replacement guide:\n`;
      prompt += `      - Fish/Prawn/Seafood → Paneer, Tofu, Chickpea (NO mushroom - fungi forbidden)\n`;
      prompt += `      - Chicken/Meat → Paneer, Tofu, Chickpea\n`;
      prompt += `      - Egg → Skip or use Paneer/Tofu\n`;
      prompt += `   \n`;
      prompt += `   🚨 CRITICAL: Jain diet is VEGETARIAN + stricter rules. NO meat/fish/seafood EVER!\n\n`;
    }

    // 8. ACCOMPANIMENTS MANDATE
    prompt += `8️⃣ 🍛 ACCOMPANIMENTS MANDATE (COMPLETE MEALS ONLY):\n`;
    prompt += `   ✅ ALWAYS include chutneys, pickles, or sides with meals\n`;
    prompt += `   ✅ Breakfast: Main dish + chutney/curd/fruit\n`;
    prompt += `   ✅ Lunch/Dinner: Main dish + dal/curry + chutney + salad\n`;
    prompt += `   ❌ WRONG: "Vegetable Stir Fry" alone (incomplete, missing accompaniments)\n`;
    prompt += `   ✅ RIGHT: "Vegetable Stir Fry with Coconut Chutney and Cucumber Salad"\n`;
    prompt += `   📋 Include accompaniments in ingredients list and recipe steps\n\n`;

    prompt += `🚨 VIOLATING ANY CONSTRAINT ABOVE = MEAL PLAN REJECTION 🚨\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // =================================================================
    // NOW ADD REGULAR PROMPT CONTENT
    // =================================================================

    prompt += `You are an expert nutritionist specializing in PCOS management and Indian cuisine.\n\n`;

    // Add user context
    prompt += this.buildUserContext(preferences, healthContext);

    // Add RAG context
    if (enhancedContext) {
      prompt += enhancedContext + '\n\n';
    }

    // Special instructions for multiple cuisines
    if (preferences.cuisines && preferences.cuisines.length > 1) {
      prompt += `🌟 MULTI-CUISINE MEAL PLAN REQUIREMENTS:\n`;
      prompt += `The user has selected ${
        preferences.cuisines.length
      } cuisines: ${preferences.cuisines.join(', ')}.\n`;
      prompt += `\nIMPORTANT INSTRUCTIONS:\n`;
      prompt += `1. Create a BALANCED MIX of all ${preferences.cuisines.length} selected cuisines\n`;
      prompt += `2. Each day should feature meals from DIFFERENT cuisines for variety\n`;
      prompt += `3. Example for 3 meals/day with 2 cuisines:\n`;
      prompt += `   - Day 1: Breakfast (Cuisine A), Lunch (Cuisine B), Dinner (Cuisine A)\n`;
      prompt += `   - Day 2: Breakfast (Cuisine B), Lunch (Cuisine A), Dinner (Cuisine B)\n`;
      prompt += `4. Ensure ALL cuisines are represented fairly across the ${preferences.duration}-day plan\n`;
      prompt += `5. Maintain authenticity of each cuisine's traditional preparations\n`;
      prompt += `6. When mixing cuisines, ensure complementary flavors and nutritional balance\n\n`;
    }

    // Main task
    prompt += `📋 TASK:\n`;
    prompt += `Generate a ${preferences.duration}-day PCOS-friendly meal plan with ${preferences.mealsPerDay} meals per day.\n`;
    prompt += `💰 BUDGET CONSTRAINT: Keep total daily cost within ₹${
      preferences.budget || 300
    }/day using affordable, locally available ingredients.\n\n`;

    // ⭐⭐⭐ KETO INSTRUCTIONS (already covered in critical constraints above, details here)
    if (preferences.isKeto) {
      prompt += `\n🔥🔥🔥 ============================================\n`;
      prompt += `🔥🔥🔥 KETOGENIC DIET MODE ACTIVATED (ABSOLUTE PRIORITY)\n`;
      prompt += `🔥🔥🔥 ============================================\n\n`;

      prompt += `⚡ THIS IS A KETO MEAL PLAN - STANDARD PCOS RULES ARE OVERRIDDEN:\n\n`;

      // ✅ ADD CRITICAL MEAL TEMPLATE ADHERENCE RULE AT TOP
      prompt += `🚨🚨🚨 CRITICAL MEAL TEMPLATE RULE (ABSOLUTE PRIORITY):\n`;
      prompt += `✅ YOU MUST SELECT ALL MEALS FROM THE "📋 MEAL TEMPLATES FROM KNOWLEDGE BASE" SECTION ABOVE\n`;
      prompt += `✅ REQUESTED CUISINES: ${preferences.cuisines?.join(', ') || 'Indian'}\n`;
      prompt += `✅ EVERY MEAL NAME MUST MATCH A MEAL TEMPLATE WITH THE CORRECT STATE LABEL (e.g., "(Sikkim)", "(Jharkhand)", "(Manipur)")\n`;
      prompt += `❌ DO NOT create meals from scratch\n`;
      prompt += `❌ DO NOT use meal examples from the "INGREDIENT SUBSTITUTION GUIDE" section as complete meals\n`;
      prompt += `❌ DO NOT use generic Indian meals (idli, dosa, upma, poha) UNLESS they appear in the meal templates with your requested cuisines\n`;
      prompt += `✅ IF a meal template contains rice/dal/grains → ADAPT IT using the keto substitution rules below (e.g., "Manipuri Fish Rice" → "Manipuri Fish with Cauliflower Rice")\n`;
      prompt += `✅ KEEP the state/regional label in the meal name to show authenticity (e.g., "Jharkhandi Cauliflower Rice Biryani (Jain Keto)")\n\n`;

      prompt += `⚡ KETO MACRO TARGETS (NON-NEGOTIABLE):\n`;
      prompt += `- Fat: 70% of calories (approximately ${Math.round(
        (targetCalories * 0.7) / 9
      )}g fat per day)\n`;
      prompt += `- Protein: 25% of calories (approximately ${Math.round(
        (targetCalories * 0.25) / 4
      )}g protein per day)\n`;
      prompt += `- Carbs: 5% of calories (approximately ${Math.round(
        (targetCalories * 0.05) / 4
      )}g NET carbs per day)\n`;
      prompt += `- NET CARBS: Maximum 20-50g per day (total carbs minus fiber)\n`;
      prompt += `- Fiber: 25-30g per day (doesn't count toward net carbs)\n\n`;

      prompt += `🚨 KETO FOOD ELIMINATIONS (ABSOLUTE MUST - NO EXCEPTIONS):\n`;
      prompt += `❌ ZERO GRAINS ALLOWED:\n`;
      prompt += `   - NO rice (white, brown, red, ANY type)\n`;
      prompt += `   - NO wheat (roti, chapati, paratha, bread, atta)\n`;
      prompt += `   - NO millets (bajra, jowar, ragi, foxtail, finger millet)\n`;
      prompt += `   - NO oats, quinoa, or any grain\n`;
      prompt += `   - BANNED MEALS: Ragi Idli, Ragi Dosa, Jowar Roti, Bajra Khichdi, ANY grain-based meal\n\n`;

      prompt += `❌ ZERO STARCHY VEGETABLES:\n`;
      prompt += `   - NO potato, sweet potato, yam, taro\n`;
      prompt += `   - NO corn, peas\n\n`;

      prompt += `❌ ZERO LEGUMES/DALS (TOO HIGH IN CARBS):\n`;
      prompt += `   - NO lentils (dal, masoor, moong, toor, urad)\n`;
      prompt += `   - NO chickpeas, rajma, chole, besan\n`;
      prompt += `   - BANNED MEALS: Moong Dal Chilla, Dal Tadka, Chole, Rajma, ANY dal-based meal\n\n`;

      prompt += `❌ ZERO SUGAR:\n`;
      prompt += `   - NO sugar, jaggery, honey\n`;
      prompt += `   - Use stevia, erythritol, monk fruit ONLY\n\n`;

      prompt += `✅ KETO GRAIN REPLACEMENTS (MANDATORY - USE THESE TO ADAPT MEAL TEMPLATES):\n`;
      prompt += `   - Rice → CAULIFLOWER RICE (pulse raw cauliflower in food processor)\n`;
      prompt += `   - Roti/Chapati → ALMOND FLOUR ROTI, coconut flour roti, cheese wraps\n`;
      prompt += `   - Upma → Cauliflower upma (only if Upma appears in meal templates)\n`;
      prompt += `   - Poha → Cauliflower poha (only if Poha appears in meal templates)\n`;
      prompt += `   - Idli/Dosa → Coconut flour dosa, egg dosa (only if Idli/Dosa appears in meal templates for your cuisine)\n`;
      prompt += `   - Biryani → Cauliflower rice biryani (adapt template biryani recipes)\n\n`;

      prompt += `✅ KETO FAT SOURCES (ADD TO EVERY MEAL):\n`;
      prompt += `   - Cook in: Ghee, coconut oil, butter (2-3 tbsp per serving)\n`;
      prompt += `   - Add: Coconut cream, heavy cream to curries\n`;
      prompt += `   - Include: Almonds, walnuts (1/4 cup per meal)\n`;
      prompt += `   - Drizzle: Olive oil, ghee on vegetables\n\n`;

      prompt += `✅ KETO VEGETABLES (EMPHASIZE THESE):\n`;
      prompt += `   - Leafy greens: spinach, methi, kale (unlimited)\n`;
      prompt += `   - Cauliflower, broccoli, zucchini, bell peppers\n`;
      prompt += `   - Cucumber, mushrooms, cabbage\n\n`;

      // Diet-specific keto
      if (dietType === 'vegan') {
        prompt += `🌿 VEGAN KETO: NO dairy, use coconut (oil, cream, milk), tofu, tempeh, nuts, seeds\n\n`;
      } else if (dietType === 'jain') {
        prompt += `🙏 JAIN KETO (MOST RESTRICTIVE COMBINATION):\n`;
        prompt += `   - You will receive ALL meal templates (vegetarian + non-vegetarian)\n`;
        prompt += `   - STEP 1: Convert non-veg proteins to vegetarian (chicken→paneer, fish→tofu)\n`;
        prompt += `   - STEP 2: Remove ALL Jain-prohibited ingredients (root vegetables, mushrooms, eggs, honey)\n`;
        prompt += `   - STEP 3: Apply keto substitutions to vegetarian version (grains→cauliflower, high-carb→low-carb)\n`;
        prompt += `   - NO root vegetables: potato, onion, garlic, ginger, carrot, radish, beetroot, turnip\n`;
        prompt += `   - NO mushrooms, NO eggs, NO honey\n`;
        prompt += `   - NO grains (rice, wheat, millets), NO high-carb legumes (chickpeas, kidney beans)\n`;
        prompt += `   - USE: Cauliflower, paneer, tofu, nuts, seeds, above-ground vegetables, coconut products\n`;
        prompt += `   - USE: Hing (asafoetida) for onion/garlic flavor, dry ginger powder instead of fresh ginger\n`;
        prompt += `   - Example: "Butter Chicken" → "Butter Paneer (Jain)" → use cauliflower rice, coconut cream, hing\n\n`;
      } else if (dietType === 'vegetarian') {
        prompt += `🌱 VEGETARIAN KETO: Emphasize paneer, cheese, eggs, ghee, butter, nuts\n\n`;
      } else {
        prompt += `🍖 NON-VEG KETO: Fatty fish (salmon), chicken thighs (not breast), eggs, ghee\n\n`;
      }

      prompt += `�🚨🚨 CRITICAL KETO RULES - MUST FOLLOW EXACTLY:\n`;
      prompt += `1. ✅ USE ONLY THE 40 MEAL TEMPLATES PROVIDED IN "📋 MEAL TEMPLATES" SECTION - MANDATORY!\n`;
      prompt += `2. ✅ ADAPT high-carb templates to keto (rice→cauliflower rice, dal→paneer, grains→almond flour)\n`;
      prompt += `3. ❌ DO NOT REJECT templates with rice/dal/grains - ADAPT THEM TO KETO using substitution rules!\n`;
      prompt += `4. ❌ DO NOT CREATE meals from scratch - ALWAYS start with a provided template\n`;
      prompt += `5. ❌ FORBIDDEN: "Ragi Dosa", "Moong Dal Chilla", "Palak Paneer" (generic names not in templates)\n`;
      prompt += `6. CALCULATE NET CARBS: Total carbs minus fiber\n`;
      prompt += `7. DAILY NET CARBS LIMIT: Maximum 20-50g per day (divide by ${mealsCount} meals = ~${Math.round(
        50 / mealsCount
      )}g net carbs per meal MAX)\n`;
      prompt += `8. MEAL NAME FORMAT: Template name + state label + "(Keto Jain)"\n`;
      prompt += `   Example: "81. Dhuska" → "Dhuska with Cauliflower (Jharkhandi Keto Jain)"\n\n`;

      prompt += `🌍 CUISINE-SPECIFIC KETO ADAPTATIONS (RESPECT REGIONAL AUTHENTICITY):\n`;
      prompt += `⚠️ WARNING: DO NOT mix cuisines incorrectly!\n`;
      prompt += `   - Uttar Pradesh/Uttarakhand: Use paneer, aloo gobi (cauliflower instead of aloo), kadhi (coconut flour pakoras)\n`;
      prompt += `   - Rajasthani: Use paneer lababdar, gatte (almond flour), dal baati (skip baati, make cauliflower curry)\n`;
      prompt += `   - Delhi: Use butter chicken (coconut cream), chole bhature (skip bhature, make paneer)\n`;
      prompt += `   - Goan: Use fish curry, prawn dishes, coconut-based curries\n`;
      prompt += `   - South Indian: ONLY if cuisine selected - coconut flour dosa, egg dosa, vegetable stir-fry\n`;
      prompt += `   ❌ DO NOT recommend Idli/Dosa for North Indian cuisines (Uttar Pradesh, Rajasthani, Delhi)\n`;
      prompt += `   ❌ DO NOT recommend Paneer dishes for Goan cuisine (use fish/coconut)\n\n`;

      prompt += `📊 KETO RECIPE ADAPTATION PROCESS (CRITICAL FOR REGIONAL CUISINES):\n`;
      prompt += `   ⚠️ IMPORTANT: Many RAG templates contain rice/dal (especially Bengali, South Indian, East Indian)\n`;
      prompt += `   ⚠️ YOU MUST adapt these traditional meals to be keto-compatible while preserving authenticity\n\n`;
      prompt += `   STEP 1: Find cuisine-appropriate dish from RAG (even if it contains high-carb ingredients)\n`;
      prompt += `   STEP 2: Check if it contains grains, dals, or starchy vegetables\n`;
      prompt += `   STEP 3: If YES → Apply these MANDATORY substitutions (ROTATE for variety!):\n`;
      prompt += `      • Rice → OPTIONS (rotate these):\n`;
      prompt += `        - Cauliflower rice (most common, budget-friendly)\n`;
      prompt += `        - Cabbage rice (shredded cabbage, similar texture)\n`;
      prompt += `        - Zucchini noodles/spirals (different texture)\n`;
      prompt += `        - Shirataki rice (konjac rice, very low carb)\n`;
      prompt += `      • Dal/Lentils → Paneer curry, chicken curry, fish curry, or egg curry (use same spices)\n`;
      prompt += `      • Roti/Chapati → OPTIONS (rotate these):\n`;
      prompt += `        - Almond flour roti (most authentic texture)\n`;
      prompt += `        - Coconut flour roti (budget option)\n`;
      prompt += `        - Flaxseed meal roti (omega-3 rich)\n`;
      prompt += `        - Cheese wraps (for wraps/rolls)\n`;
      prompt += `        - Lettuce wraps (for light meals)\n`;
      prompt += `      • Potato → OPTIONS (rotate these):\n`;
      prompt += `        - Cauliflower (most versatile)\n`;
      prompt += `        - Zucchini (for fries/chips)\n`;
      prompt += `        - Turnip (for stews)\n`;
      prompt += `        - Radish (for roasting)\n`;
      prompt += `      • Keep ALL other ingredients: spices, cooking method, garnishes\n`;
      prompt += `   ⚠️ VARIETY RULE: Don't use cauliflower rice in EVERY meal! Rotate substitutes!\n`;
      prompt += `   STEP 4: TRIPLE the fat content (add 2-3 tbsp ghee/coconut oil per serving)\n`;
      prompt += `   STEP 5: Calculate macros using RAG nutrition data\n`;
      prompt += `   STEP 6: Verify NET carbs < ${Math.round(
        50 / mealsCount
      )}g per meal, Fat > 70%, Protein ~25%\n`;
      prompt += `   \n`;
      prompt += `   Example Adaptations:\n`;
      prompt += `   • "Bengali Fish Curry with Rice" → "Bengali Fish Curry with Cauliflower Rice (Keto)"\n`;
      prompt += `   • "Dal Tadka with Roti" → "Paneer Tikka Masala with Almond Flour Roti (Keto)"\n`;
      prompt += `   • "Chicken Biryani" → "Chicken Cauliflower Rice Biryani (Keto)" with extra ghee\n`;
      prompt += `   • "Manipuri Fish Rice" → "Manipuri Fish with Cauliflower Rice (Keto)"\n\n`;

      prompt += `� KETO MACRO CALCULATION INSTRUCTIONS (CRITICAL - USE RAG MACROS):\n`;
      prompt += `   - The RAG context contains DETAILED macros (carbs, protein, fat, calories) for ALL keto ingredients per 100g\n`;
      prompt += `   - USE these macros to calculate ACCURATE nutrition for each meal\n`;
      prompt += `   - Example calculation for "Palak Paneer with Cauliflower Rice":\n`;
      prompt += `     • 200g spinach (cooked): Carbs 8g (Fiber 4g, Net 4g), Protein 6g, Fat 1g, Calories 46\n`;
      prompt += `     • 150g paneer: Carbs 4.5g, Protein 27g, Fat 33g, Calories 398\n`;
      prompt += `     • 150g cauliflower rice: Carbs 7.5g (Fiber 3g, Net 4.5g), Protein 3g, Fat 1g, Calories 44\n`;
      prompt += `     • 2 tbsp ghee (30g): Carbs 0g, Protein 0g, Fat 30g, Calories 270\n`;
      prompt += `     TOTAL: Net Carbs 8.5g, Protein 36g, Fat 65g, Calories 758\n`;
      prompt += `     MACROS CHECK: 8.5g carbs (4.5%), 36g protein (19%), 65g fat (77%) ✅ KETO!\n`;
      prompt += `   - ALWAYS verify meal macros match 70% fat, 25% protein, 5% carbs\n`;
      prompt += `   - If macros are off, ADJUST portions (add more ghee for fat, reduce carbs)\n\n`;

      prompt += `💰 KETO BUDGET STRATEGY (OPTIMIZE COSTS WITH HOMEMADE OPTIONS):\n`;
      prompt += `   - PRIORITIZE HOMEMADE KETO SUBSTITUTES:\n`;
      prompt += `     • Cauliflower rice (₹8-10/meal) vs packaged alternatives (₹50-100/meal)\n`;
      prompt += `     • Homemade flax flour: Buy flax seeds (₹200-300/kg), grind fresh = SAVE ₹300-400/kg\n`;
      prompt += `     • Homemade chia flour: Buy chia seeds (₹400-500/kg), grind fresh = SAVE ₹100-200/kg\n`;
      prompt += `     • Egg dosa (3 eggs = ₹20) instead of expensive almond flour dosa (₹60+)\n`;
      prompt += `   - AFFORDABLE KETO FLOUR STRATEGY (per 6-day supply for 2 meals/day):\n`;
      prompt += `     • Coconut flour: ₹745/kg = ₹124/day (GOOD value, high fiber)\n`;
      prompt += `     • Flaxseed meal: ₹600-700/kg = ₹100-117/day (AFFORDABLE, omega-3)\n`;
      prompt += `     • Almond flour: ₹750-2000/kg = ₹125-333/day (choose budget brand)\n`;
      prompt += `     • Chia flour: ₹600-700/kg = ₹100-117/day (BUDGET-FRIENDLY)\n`;
      prompt += `     • AVOID lupin flour (₹2000/kg = ₹333/day) unless special occasion\n`;
      prompt += `   - MIX FLOURS TO REDUCE COST:\n`;
      prompt += `     • 50% flaxseed meal + 50% coconut flour = ₹672/kg average = CHEAPEST rotis!\n`;
      prompt += `     • Use cauliflower rice for 1 meal, keto flour roti for 1 meal = ₹40-50/day total\n`;
      prompt += `   - FOR TIGHT BUDGETS (₹250/day):\n`;
      prompt += `     • Use cauliflower rice for BOTH meals = ₹20/day\n`;
      prompt += `     • Make homemade flax flour (grind seeds) = ₹10-15/day\n`;
      prompt += `     • Use egg dosas occasionally (PROTEIN + carb substitute) = ₹20/meal\n`;
      prompt += `     • Total carb substitutes: ₹40-50/day, leaving ₹200/day for protein/vegetables/fats\n\n`;

      prompt += `🎯 CALORIE REQUIREMENT PRIORITY (ABSOLUTE NON-NEGOTIABLE):\n`;
      prompt += `   - Daily calorie target: ${targetCalories} kcal (this is FIXED and CRITICAL)\n`;
      prompt += `   - EVEN IN KETO, you MUST meet this calorie target using high-fat foods\n`;
      prompt += `   - If a meal is low in calories, ADD MORE FAT:\n`;
      prompt += `     • Add 1 extra tbsp ghee = +135 calories\n`;
      prompt += `     • Add 1/4 cup nuts = +170-200 calories\n`;
      prompt += `     • Add coconut cream to curry = +100-150 calories\n`;
      prompt += `   - At end of day calculation, SUM all meal calories - MUST equal ${targetCalories} ±3%\n`;
      prompt += `   - If total is below ${
        targetCalories - Math.round(targetCalories * 0.03)
      }, INCREASE fat portions immediately\n`;
      prompt += `   - If total is above ${
        targetCalories + Math.round(targetCalories * 0.03)
      }, REDUCE portions slightly\n\n`;

      prompt += `�🔥🔥🔥 REMEMBER: This is KETO - NO GRAINS, NO STARCHY VEGETABLES, HIGH FAT!\n`;
      prompt += `🔥🔥🔥 MACROS: Use RAG macro data for accurate calculations\n`;
      prompt += `🔥🔥🔥 CALORIES: MUST meet ${targetCalories} kcal target using high-fat foods\n`;
      prompt += `🔥🔥🔥 BUDGET: Prioritize homemade cauliflower rice, flax flour, eggs\n`;
      prompt += `\n📋 FINAL KETO VALIDATION (CHECK EVERY MEAL BEFORE FINALIZING):\n`;
      prompt += `✅ 1. NO GRAINS: Not rice, roti, idli, dosa, upma, poha, ragi, jowar, bajra\n`;
      prompt += `✅ 2. NO DALS: Not moong dal, toor dal, chana dal, masoor dal, besan, chickpeas\n`;
      prompt += `✅ 3. NO STARCHY VEG: Not potato, sweet potato, corn, peas\n`;
      prompt += `✅ 4. NET CARBS < ${Math.round(
        50 / mealsCount
      )}g per meal (calculate: total carbs - fiber)\n`;
      prompt += `✅ 5. FAT > 70%: Must have 2-3 tbsp ghee/coconut oil per meal\n`;
      prompt += `✅ 6. CUISINE MATCH: Respect regional authenticity (no South Indian for North cuisines)\n`;
      prompt += `❌ IF MEAL FAILS → REJECT and create keto alternative!\n`;
      prompt += `🔥🔥🔥 ============================================\n\n`;
    }

    prompt += `⚠️ IMPORTANT: You need ${
      parseInt(preferences.duration) * parseInt(preferences.mealsPerDay)
    } UNIQUE dishes total (${preferences.duration} days × ${preferences.mealsPerDay} meals).\n`;
    prompt += `Check the RAG context above - count how many ${
      preferences.cuisines?.[0] || 'selected cuisine'
    } ${dietType} dishes are available.\n`;
    prompt += `If there are fewer dishes than needed, you MUST create meaningful variations (see VARIETY REQUIREMENT section below).\n\n`;

    // ⭐ Add exclusion list if this is a continuation chunk
    if (preferences.excludeMeals && preferences.excludeMeals.length > 0) {
      prompt += `\n�🚨🚨 MEALS ALREADY USED - DO NOT REPEAT THESE:\n`;
      prompt += `The following ${preferences.excludeMeals.length} meals were used in previous days.\n`;
      prompt += `You MUST NOT use any of these meals again:\n`;
      prompt += preferences.excludeMeals.map((m, i) => `${i + 1}. ❌ ${m} (SKIP THIS)`).join('\n');
      prompt += `\n\n⚠️ REMEMBER: Choose COMPLETELY DIFFERENT dishes from the RAG templates!\n\n`;
    }

    // ⭐ IMPORTANT: Specify WHICH meals based on mealsPerDay
    if (preferences.mealsPerDay === 3) {
      prompt += `Each day must include exactly these 3 meals: BREAKFAST, LUNCH, and DINNER (NO snacks).\n`;
    } else if (preferences.mealsPerDay === 4) {
      prompt += `Each day must include exactly these 4 meals: BREAKFAST, LUNCH, SNACK, and DINNER.\n`;
    } else if (preferences.mealsPerDay === 2) {
      prompt += `Each day must include exactly these 2 meals: BREAKFAST and DINNER.\n`;
    }
    prompt += `\n`;

    // ===== CRITICAL CALORIE BALANCING RULES =====
    prompt += `\n🚨🚨🚨 CRITICAL CALORIE BALANCING RULES (HIGHEST PRIORITY):\n\n`;

    prompt += `0. MEAL TYPE MATCHING (ABSOLUTELY NON-NEGOTIABLE):\n`;
    prompt += `   🚨 BREAKFAST must ONLY use breakfast items: Upma, Poha, Idli, Dosa, Chilla, Paratha, Oats\n`;
    prompt += `   🚨 NEVER use soup, curry, rice, or gravied dishes for breakfast\n`;
    prompt += `   🚨 LUNCH/DINNER must use lunch/dinner templates (can include curries, rice, dal)\n`;
    prompt += `   🚨 SNACKS must ONLY use light snack items (nuts, fruits, salads)\n`;
    prompt += `   → If you use wrong meal type, the entire meal plan will be REJECTED\n\n`;

    prompt += `1. NEVER artificially inflate or deflate calorie values of individual meal components to meet daily calorie targets.\n\n`;

    prompt += `2. Each meal component must have REALISTIC calorie values based on:\n`;
    prompt += `   - Standard portion sizes\n`;
    prompt += `   - Actual nutritional content of ingredients\n`;
    prompt += `   - Typical cooking methods\n`;
    prompt += `   - Real-world food composition data\n\n`;

    prompt += `3. To meet daily calorie targets, BUILD COMPLETE MEALS by adding multiple components:\n\n`;
    prompt += `   MEAL STRUCTURE FOR BALANCED CALORIES:\n\n`;

    const currentMealsPerDay = parseInt(preferences.mealsPerDay) || 3;

    if (currentMealsPerDay === 2) {
      prompt += `   For 2 meals/day (target: ~${Math.round(targetCalories / 2)} kcal per meal):\n`;
      prompt += `   - Main dish: 400-500 kcal\n`;
      prompt += `   - Side dish/accompaniment: 200-300 kcal\n`;
      prompt += `   - Beverage (PCOS-friendly): 100-150 kcal\n`;
      prompt += `   - Additional component (salad, nuts, fruit): 100-200 kcal\n`;
      prompt += `   - Total: 800-1150 kcal (realistic range)\n\n`;
    } else if (currentMealsPerDay === 3) {
      prompt += `   For 3 meals/day (target: ~${Math.round(targetCalories / 3)} kcal per meal):\n`;
      prompt += `   - Main dish: 350-450 kcal\n`;
      prompt += `   - Side dish/accompaniment: 150-200 kcal\n`;
      prompt += `   - Beverage or small addition: 50-100 kcal\n`;
      prompt += `   - Total: 550-750 kcal (realistic range)\n\n`;
    } else {
      prompt += `   For ${currentMealsPerDay} meals/day (target: ~${Math.round(
        targetCalories / currentMealsPerDay
      )} kcal per meal):\n`;
      prompt += `   - Main dish: 300-400 kcal\n`;
      prompt += `   - Side dish or beverage: 100-150 kcal\n`;
      prompt += `   - Total: 400-550 kcal (realistic range)\n\n`;
    }

    prompt += `4. ALWAYS include appropriate accompaniments to complete meals:\n\n`;
    prompt += `   ACCOMPANIMENT OPTIONS (choose based on diet type and meal):\n`;
    prompt += `   - Grains: Quinoa, brown rice, millet, whole wheat roti, cauliflower rice (keto)\n`;
    prompt += `   - Proteins: Dal, legumes, paneer, tofu, eggs (if diet allows)\n`;
    prompt += `   - Vegetables: Side salad, roasted vegetables, vegetable raita\n`;
    prompt += `   - Fats: Nuts (almonds, walnuts), seeds (chia, flax, pumpkin), avocado\n`;
    prompt += `   - Beverages: Green tea, turmeric latte, herbal tea, coconut water, buttermilk\n`;
    prompt += `   - Condiments: Chutney, pickles, yogurt-based dips\n\n`;

    prompt += `5. MEAL COMPLETION EXAMPLES:\n\n`;
    prompt += `   Example 1 - Vegetable Stir Fry (${mealsCount} meals/day plan):\n`;
    prompt += `   ❌ WRONG NAME: "Vegetable Stir Fry" (incomplete, missing accompaniments)\n`;
    prompt += `   ❌ WRONG CALORIES: Vegetable Stir Fry (600 kcal) - artificially inflated\n`;
    prompt += `   ✅ CORRECT NAME: "Vegetable Stir Fry with Quinoa and Raita"\n`;
    prompt += `   ✅ CORRECT COMPONENTS:\n`;
    prompt += `   - Vegetable Stir Fry with tofu (280 kcal)\n`;
    prompt += `   - Quinoa (1 cup cooked, 220 kcal)\n`;
    prompt += `   - Cucumber Raita (80 kcal)\n`;
    prompt += `   - Handful of roasted almonds (100 kcal)\n`;
    prompt += `   - Green tea (5 kcal)\n`;
    prompt += `   - Total: 685 kcal (realistic and balanced)\n\n`;

    prompt += `   Example 2 - Dal Meal:\n`;
    prompt += `   ❌ WRONG NAME: "Moong Dal" (incomplete, missing rice)\n`;
    prompt += `   ❌ WRONG CALORIES: Moong Dal (500 kcal) - inflated\n`;
    prompt += `   ✅ CORRECT NAME: "Moong Dal with Brown Rice"\n`;
    prompt += `   ✅ CORRECT COMPONENTS:\n`;
    prompt += `   - Moong Dal (1.5 cups, 250 kcal)\n`;
    prompt += `   - Brown Rice (1 cup cooked, 215 kcal)\n`;
    prompt += `   - Mixed Vegetable Salad with lemon (80 kcal)\n`;
    prompt += `   - Buttermilk (100 kcal)\n`;
    prompt += `   - Total: 645 kcal (realistic and complete)\n\n`;

    prompt += `6. PORTION SIZE GUIDELINES (use realistic portions):\n`;
    prompt += `   - Rice/Quinoa: 1 cup cooked = 200-220 kcal\n`;
    prompt += `   - Dal/Legumes: 1 cup cooked = 150-230 kcal (depending on type)\n`;
    prompt += `   - Vegetables (cooked): 1 cup = 50-100 kcal\n`;
    prompt += `   - Paneer: 100g = 260-280 kcal\n`;
    prompt += `   - Tofu: 100g = 70-80 kcal\n`;
    prompt += `   - Nuts: 1 handful (28g) = 150-170 kcal\n`;
    prompt += `   - Oil/Ghee: 1 tbsp = 120 kcal\n`;
    prompt += `   - Roti: 1 medium = 70-80 kcal\n\n`;

    prompt += `7. MACRO BALANCE (for each meal):\n`;
    prompt += `   - Carbohydrates: 40-50% of meal calories (PCOS-friendly, low GI)\n`;
    prompt += `   - Protein: 25-35% of meal calories\n`;
    prompt += `   - Fats: 20-30% of meal calories (healthy fats prioritized)\n`;
    prompt += `   - Ensure macros come from diverse food sources, not just one inflated component\n\n`;

    prompt += `8. QUALITY OVER QUANTITY:\n`;
    prompt += `   - Prioritize nutrient-dense foods\n`;
    prompt += `   - Include variety of food groups in each meal\n`;
    prompt += `   - Focus on PCOS-friendly ingredients (low GI, anti-inflammatory)\n`;
    prompt += `   - Never sacrifice meal quality to meet calorie targets artificially\n\n`;

    prompt += `9. VALIDATION CHECK (before finalizing meal plan):\n`;
    prompt += `    - Review each meal component's calorie value\n`;
    prompt += `    - Ask: "Is this calorie count realistic for this portion size?"\n`;
    prompt += `    - If any single component exceeds expected calories by 50%+, add accompaniments instead\n`;
    prompt += `    - Ensure every meal has at least 2-3 distinct components (main + sides/beverages)\n\n`;

    // ===== CRITICAL MEAL TYPE RULES =====
    prompt += `🚨🚨🚨 CRITICAL MEAL TYPE RULES (STRICTLY ENFORCE):\n\n`;

    prompt += `1. MEAL TEMPLATE USAGE (STRICTLY ENFORCE):\n\n`;
    prompt += `   BREAKFAST (ABSOLUTELY NON-NEGOTIABLE):\n`;
    prompt += `   - ONLY use traditional Indian breakfast items:\n`;
    prompt += `     * Upma, Poha, Idli, Dosa, Chilla, Paratha, Uttapam, Dhokla\n`;
    prompt += `     * Oats preparations, Sprout salads, Whole grain toast\n`;
    prompt += `   - 🚨 NEVER EVER use: Soups, Curries, Rice dishes, Gravied items\n`;
    prompt += `   - 🚨 If a template says "breakfast" but contains soup/curry, IGNORE IT\n`;
    prompt += `   - NEVER use lunch or dinner templates for breakfast\n`;
    prompt += `   - Breakfast should be light to moderate, appropriate for morning consumption (7-9 AM)\n\n`;

    prompt += `   LUNCH (MAIN MEAL):\n`;
    prompt += `   - Use ONLY lunch OR dinner templates\n`;
    prompt += `   - 🚨 NEVER use breakfast templates for lunch\n`;
    prompt += `   - 🚨 NEVER use snack templates for lunch\n`;
    prompt += `   - Can include curries, rice dishes, dal, rotis, complete meals\n`;
    prompt += `   - Can be heavier than breakfast (12-2 PM)\n\n`;

    prompt += `   DINNER (EVENING MEAL):\n`;
    prompt += `   - Use ONLY dinner OR lunch templates\n`;
    prompt += `   - 🚨 NEVER use breakfast templates for dinner\n`;
    prompt += `   - 🚨 NEVER use snack templates for dinner\n`;
    prompt += `   - Can include curries, rice dishes, dal, rotis, complete meals\n`;
    prompt += `   - Can be moderate to heavy (7-9 PM)\n\n`;

    prompt += `   SNACKS (BETWEEN MEALS):\n`;
    prompt += `   - Use ONLY snack templates from RAG\n`;
    prompt += `   - 🚨 NEVER use breakfast/lunch/dinner templates for snacks\n`;
    prompt += `   - Light, portable options only\n`;
    prompt += `   - 100-250 kcal range typically\n`;
    prompt += `   - Simple, 1-2 components maximum\n\n`;

    prompt += `2. BREAKFAST CHARACTERISTICS (Indian Context):\n\n`;
    prompt += `   APPROPRIATE BREAKFAST FOODS:\n`;
    prompt += `   - Traditional: Idli, Dosa, Upma, Poha, Paratha (stuffed), Uttapam\n`;
    prompt += `   - Modern: Oats preparations, Smoothie bowls, Whole grain toast\n`;
    prompt += `   - Protein: Eggs (if diet allows), Paneer in light preparations, Sprouts\n`;
    prompt += `   - Accompaniments: Chutney, Sambhar, Curd, Fresh fruit\n`;
    prompt += `   - Beverages: Tea, Coffee, Fresh juice, Smoothies, Herbal tea\n\n`;

    prompt += `   ❌ INAPPROPRIATE FOR BREAKFAST (NEVER USE THESE):\n`;
    prompt += `   - Heavy curries (Paneer Butter Masala, Chole, Rajma, Fish Curry, Chicken Curry)\n`;
    prompt += `   - Rice-based meals (Biryani, Pulao, Fish with Rice, Chicken with Rice)\n`;
    prompt += `   - Gravied dishes (any curry with gravy)\n`;
    prompt += `   - Soups (Fish Soup, Chicken Soup, Vegetable Soup) - these are NOT breakfast items\n`;
    prompt += `   - Deep-fried items (except occasional special items like Puri)\n`;
    prompt += `   - Anything labeled as "lunch" or "dinner" in templates\n`;
    prompt += `   - Any dish that would typically be served at lunch or dinner\n\n`;

    prompt += `   🚨 CRITICAL: If you see "soup", "curry with rice", or "gravied" items in breakfast templates,\n`;
    prompt += `   these are ERRORS in the template database. DO NOT USE THEM for breakfast.\n`;
    prompt += `   Use ONLY traditional Indian breakfast items listed above.\n\n`;

    prompt += `3. BREAKFAST EXAMPLES (Correct):\n\n`;
    prompt += `   Example 1:\n`;
    prompt += `   - Vegetable Oats Upma\n`;
    prompt += `   - Coconut Chutney\n`;
    prompt += `   - Green Tea\n\n`;

    prompt += `   Example 2:\n`;
    prompt += `   - Moong Dal Chilla (2 pieces)\n`;
    prompt += `   - Mint-Coriander Chutney\n`;
    prompt += `   - Fresh Fruit (Papaya)\n\n`;

    prompt += `   Example 3:\n`;
    prompt += `   - Ragi Dosa (2 pieces)\n`;
    prompt += `   - Sambhar\n`;
    prompt += `   - Coconut Chutney\n`;
    prompt += `   - Filter Coffee\n\n`;

    prompt += `4. LUNCH/DINNER CHARACTERISTICS:\n\n`;
    prompt += `   Can include:\n`;
    prompt += `   - Curries and gravied dishes\n`;
    prompt += `   - Rice preparations (within PCOS guidelines)\n`;
    prompt += `   - Dal preparations\n`;
    prompt += `   - Roti/Chapati with vegetables/protein\n`;
    prompt += `   - Complete meal combinations\n\n`;

    prompt += `   Examples:\n`;
    prompt += `   - Dal + Rice + Vegetable + Salad\n`;
    prompt += `   - Paneer Curry + Roti + Raita\n`;
    prompt += `   - Mixed Vegetable Curry + Quinoa + Salad\n\n`;

    prompt += `5. SNACK CHARACTERISTICS:\n\n`;
    prompt += `   Light, portable, between-meal options:\n`;
    prompt += `   - Nuts and seeds\n`;
    prompt += `   - Fresh fruit\n`;
    prompt += `   - Roasted chickpeas (chana)\n`;
    prompt += `   - Vegetable sticks with hummus\n`;
    prompt += `   - Herbal tea with almond cookies\n`;
    prompt += `   - Sprouts salad\n`;
    prompt += `   - Greek yogurt with berries\n\n`;

    prompt += `   NOT snacks:\n`;
    prompt += `   - Full meals\n`;
    prompt += `   - Heavy dishes\n`;
    prompt += `   - Multiple-component meals\n\n`;

    prompt += `6. CULTURAL APPROPRIATENESS CHECK:\n\n`;
    prompt += `   Before finalizing any meal, ask:\n`;
    prompt += `   - "Would an Indian person typically eat this for {meal_type}?"\n`;
    prompt += `   - "Is this meal too heavy/light for {meal_type}?"\n`;
    prompt += `   - "Does this follow Indian meal timing and customs?"\n\n`;

    prompt += `   Indian meal culture context:\n`;
    prompt += `   - Breakfast: 7-9 AM, light to moderate, energizing\n`;
    prompt += `   - Mid-morning snack: 10-11 AM, very light\n`;
    prompt += `   - Lunch: 12-2 PM, can be heavier, main meal for many\n`;
    prompt += `   - Evening snack: 4-5 PM, light, tea-time\n`;
    prompt += `   - Dinner: 7-9 PM, moderate to heavy, but lighter than lunch ideally\n\n`;

    prompt += `7. VALIDATION CHECKLIST (before finalizing meal plan):\n\n`;
    prompt += `   For EVERY breakfast meal:\n`;
    prompt += `   ☐ Is this from a breakfast template?\n`;
    prompt += `   ☐ Is this something people eat in the morning?\n`;
    prompt += `   ☐ Is this light enough for breakfast?\n`;
    prompt += `   ☐ Does this NOT include: soup, curry, rice, or gravy?\n`;
    prompt += `   ☐ Is this a traditional breakfast item (Upma/Poha/Idli/Dosa/Paratha/Chilla/Oats)?\n\n`;

    prompt += `   For EVERY lunch/dinner meal:\n`;
    prompt += `   ☐ Is this from lunch or dinner templates?\n`;
    prompt += `   ☐ Is this substantial enough for a main meal?\n`;
    prompt += `   ☐ Does this include balanced components?\n\n`;

    prompt += `   For EVERY snack:\n`;
    prompt += `   ☐ Is this from snack templates?\n`;
    prompt += `   ☐ Is this 100-250 kcal?\n`;
    prompt += `   ☐ Is this simple and light?\n\n`;

    // ===== MEAL-SPECIFIC INSTRUCTIONS WITH CALORIE TARGETS =====
    prompt += `\n📋 MEAL-SPECIFIC INSTRUCTIONS:\n\n`;

    const breakfastCal = getBreakfastCalories(targetCalories, currentMealsPerDay);
    const lunchCal = getLunchCalories(targetCalories, currentMealsPerDay);
    const dinnerCal = getDinnerCalories(targetCalories, currentMealsPerDay);
    const snackCal = getSnackCalories(targetCalories, currentMealsPerDay);

    prompt += `BREAKFAST (${breakfastCal} kcal target):\n`;
    prompt += `- Use ONLY breakfast templates provided in RAG context\n`;
    prompt += `- Must be appropriate for morning consumption in Indian cuisine\n`;
    prompt += `- Include traditional breakfast items (Idli, Dosa, Upma, Poha, Oats, Eggs if diet allows)\n`;
    prompt += `- NO curries, NO gravied dishes, NO rice meals\n`;
    prompt += `- Complete with accompaniments: chutney, fruit, beverage\n`;
    prompt += `- Validate: "Would an Indian person eat this for breakfast?"\n\n`;

    if (currentMealsPerDay >= 3) {
      prompt += `LUNCH (${lunchCal} kcal target):\n`;
      prompt += `- Use lunch or dinner templates\n`;
      prompt += `- Can include curries, rice, dal, roti-based meals\n`;
      prompt += `- Build complete meal with multiple components\n`;
      prompt += `- Add realistic accompaniments to meet calorie targets\n\n`;
    }

    prompt += `DINNER (${dinnerCal} kcal target):\n`;
    prompt += `- Use dinner or lunch templates\n`;
    prompt += `- Can include curries, rice, dal, roti-based meals\n`;
    prompt += `- Build complete meal with multiple components\n`;
    prompt += `- Add realistic accompaniments to meet calorie targets\n\n`;

    if (snackCal > 0) {
      prompt += `SNACKS (${snackCal} kcal each):\n`;
      prompt += `- Use ONLY snack templates\n`;
      prompt += `- Light, portable options\n`;
      prompt += `- 100-250 kcal range\n`;
      prompt += `- Simple, 1-2 components\n\n`;
    }

    prompt += `REQUIREMENTS:\n`;
    prompt += `1. Each meal must include:\n`;
    prompt += `   - name: Complete descriptive meal name including ALL main components\n`;
    prompt += `     Examples:\n`;
    prompt += `     ✅ CORRECT: "Fish Curry with Brown Rice (Karnataka)"\n`;
    prompt += `     ✅ CORRECT: "Chicken Tikka with Roti and Salad"\n`;
    prompt += `     ❌ WRONG: "Fish Curry" (missing rice component)\n`;
    prompt += `     ❌ WRONG: "Chicken Tikka" (missing accompaniments)\n`;
    prompt += `   - mealType: breakfast/lunch/snack/dinner\n`;
    prompt += `   - ingredients: Array of {item, quantity, unit}\n`;
    prompt += `   - recipe: Step-by-step cooking instructions (2-4 sentences)\n`;
    prompt += `   - protein: grams\n`;
    prompt += `   - carbs: grams\n`;
    prompt += `   - fats: grams\n`;
    prompt += `   - fiber: grams\n`;
    prompt += `   - calories: Total calories\n`;
    prompt += `   - gi: "Low" or "Medium" (prefer Low)\n`;
    prompt += `   - time: Prep time in minutes\n`;
    prompt += `   - tip: 1-2 PCOS-specific tips\n\n`;

    // ⭐ NEW: Add regional authenticity requirement
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      prompt += `2. 🚨🚨🚨 REGIONAL AUTHENTICITY (ABSOLUTELY NON-NEGOTIABLE):\n`;
      prompt += `   - SELECTED CUISINES: ${preferences.cuisines.join(', ')}\n`;
      prompt += `   - You are ONLY allowed to use dishes from the SELECTED cuisines above\n`;
      prompt += `   - The RAG meal templates contain dishes from these selected cuisines\n`;
      prompt += `   - You MUST prioritize using EXACT dish names from the RAG templates\n`;
      prompt += `   - If no suitable template exists, create authentic ${preferences.cuisines.join(
        '/'
      )} dishes\n`;
      prompt += `\n`;
      prompt += `   📋 WHAT YOU MUST USE:\n`;
      prompt += `   - ✅ ONLY dishes from: ${preferences.cuisines.join(', ')}\n`;
      prompt += `   - ✅ Check RAG meal templates first - use those exact names when possible\n`;
      prompt += `   - ✅ Mention cuisine/state in meal name: "Chicken Curry (Bihari)", "Fish Curry (Manipuri)"\n`;
      prompt += `   - ✅ Use regional spices, cooking methods, and ingredients authentic to selected cuisines\n`;
      prompt += `\n`;
      prompt += `   ❌ WHAT YOU MUST NEVER USE:\n`;

      // ⭐ FIX: Build exclusion list dynamically based on what's NOT selected
      const allIndianCuisines = [
        'South Indian',
        'North Indian',
        'West Indian',
        'East Indian',
        'Tamil',
        'Telugu',
        'Kerala',
        'Karnataka',
        'Andhra',
        'Bengali',
        'Odia',
        'Assamese',
        'Punjabi',
        'Rajasthani',
        'Gujarati',
        'Maharashtrian',
        'Goan',
        'Kashmiri',
        'Himachali',
        'Uttarakhand',
        'Uttar Pradesh',
        'Madhya Pradesh',
        'Jharkhand',
        'Chhattisgarh',
      ];

      // Filter out selected cuisines and their regions
      const selectedCuisinesLower = preferences.cuisines.map((c) => c.toLowerCase());
      const forbiddenCuisines = allIndianCuisines.filter((cuisine) => {
        const cuisineLower = cuisine.toLowerCase();
        // Don't forbid if it matches any selected cuisine
        return !selectedCuisinesLower.some(
          (selected) => cuisineLower.includes(selected) || selected.includes(cuisineLower)
        );
      });

      // Show a few examples of forbidden cuisines
      const exampleForbidden = forbiddenCuisines.slice(0, 5);
      prompt += `   - ❌ NO dishes from OTHER regions: ${exampleForbidden.join(', ')}, etc.\n`;

      // ⭐ ADD EXPLICIT FORBIDDEN DISH KEYWORDS based on what's NOT selected
      const forbiddenDishKeywords = {
        'south-indian': [
          'idli',
          'dosa',
          'sambar',
          'rasam',
          'appam',
          'puttu',
          'upma',
          'vada',
          'pongal',
          'uttapam',
          'coconut chutney',
        ],
        'north-indian': [
          'chole',
          'rajma',
          'makki',
          'sarson',
          'tandoor',
          'naan',
          'kulcha',
          'paratha',
        ],
        'west-indian': ['dhokla', 'thepla', 'undhiyu', 'khandvi', 'pav bhaji', 'vada pav'],
        bengali: ['shukto', 'chingri', 'ilish', 'machher jhol', 'mishti doi'],
      };

      // ⭐ FIX: Map cuisines to their parent regions to check if ANY cuisine from that region is selected
      const cuisineToRegionMap = {
        tamil: 'south-indian',
        telugu: 'south-indian',
        kerala: 'south-indian',
        karnataka: 'south-indian',
        andhra: 'south-indian',
        bengali: 'east-indian',
        odia: 'east-indian',
        assamese: 'east-indian',
        manipuri: 'east-indian',
        bihari: 'east-indian',
        punjabi: 'north-indian',
        rajasthani: 'north-indian',
        'uttar pradesh': 'north-indian',
        uttarakhand: 'north-indian',
        haryanvi: 'north-indian',
        kashmiri: 'north-indian',
        himachali: 'north-indian',
        gujarati: 'west-indian',
        maharashtrian: 'west-indian',
        goan: 'west-indian',
        jharkhandi: 'east-indian',
        chhattisgarh: 'central-indian',
        'madhya pradesh': 'central-indian',
      };

      // Check if ANY cuisine from each region is selected
      const selectedRegions = new Set();
      preferences.cuisines.forEach((cuisine) => {
        const cuisineLower = cuisine.toLowerCase();
        const region = cuisineToRegionMap[cuisineLower];
        if (region) {
          selectedRegions.add(region);
        }
      });

      // Build list of EXPLICITLY FORBIDDEN dishes
      const forbiddenDishes = [];
      for (const [region, dishes] of Object.entries(forbiddenDishKeywords)) {
        // ⭐ FIX: Only forbid if NO cuisine from this region is selected
        // If user selected Tamil (south-indian), don't forbid south-indian dishes
        const regionIsSelected = selectedRegions.has(region);

        if (!regionIsSelected) {
          // Also check if the region name itself is in forbidden cuisines
          const regionIsForbidden = forbiddenCuisines.some((cuisine) => {
            const cuisineLower = cuisine.toLowerCase();
            return (
              region.includes(cuisineLower) || cuisineLower.includes(region.replace('-indian', ''))
            );
          });

          if (regionIsForbidden) {
            forbiddenDishes.push(...dishes);
          }
        }
      }

      // ⚠️ Forbidden dishes already added at prompt TOP for maximum LLM attention
      // No need to repeat here - reduces prompt length and prevents dilution

      prompt += `   - ❌ NO generic pan-Indian dishes unless they're authentic to selected cuisines\n`;
      prompt += `   - ❌ DO NOT hallucinate or make up dish names - use RAG templates!\n`;
      prompt += `\n`;
      prompt += `   🚨 IF RAG HAS LIMITED OPTIONS:\n`;
      prompt += `   - Limited templates due to diet/allergen restrictions is OK\n`;
      prompt += `   - CREATE VARIATIONS of ${preferences.cuisines.join(
        '/'
      )} dishes rather than using wrong cuisines\n`;
      prompt += `   - Example: If only 3 Manipuri meals available, create variations:\n`;
      prompt += `     • "Eromba (Manipuri)" → "Eromba with Pumpkin (Manipuri)", "Eromba with Bamboo Shoots (Manipuri)"\n`;
      prompt += `     • SAME BASE DISH + DIFFERENT VEGETABLES/PROTEINS = VARIATION (✅ Allowed)\n`;
      prompt += `     • EXACT SAME MEAL NAME + SAME INGREDIENTS = REPETITION (❌ NOT allowed)\n`;
      prompt += `   - AUTHENTICITY > VARIETY: Better to create authentic variations than use wrong cuisines!\n\n`;
    }

    // ⭐ NEW: Add strict diet type enforcement
    // Note: dietType is already declared earlier in the function
    if (dietType === 'vegan') {
      prompt += `2b. 🚨🚨🚨 VEGAN DIET REQUIREMENT (ABSOLUTE MUST):\n`;
      prompt += `   - The user is STRICTLY VEGAN - this is NON-NEGOTIABLE\n`;
      prompt += `   - ABSOLUTELY NO animal products of any kind:\n`;
      prompt += `     ❌ NO meat (chicken, mutton, pork, beef, lamb)\n`;
      prompt += `     ❌ NO fish or seafood\n`;
      prompt += `     ❌ NO eggs\n`;
      prompt += `     ❌ NO dairy (milk, paneer, cheese, curd, yogurt, ghee, butter, cream)\n`;
      prompt += `     ❌ NO honey\n`;
      prompt += `   - Use ONLY plant-based ingredients: vegetables, fruits, grains, legumes, nuts, seeds, plant-based oils\n`;
      prompt += `\n`;
      prompt += `   🔧 ADAPTING NON-VEGAN DISHES TO VEGAN:\n`;
      prompt += `   - If a traditional dish contains animal products, you MUST adapt it to be 100% vegan\n`;
      prompt += `   - REFER TO the "🔧 INGREDIENT SUBSTITUTION GUIDE" in the RAG context above\n`;
      prompt += `   - Look for vegan substitutes for: fish, meat, eggs, dairy, honey\n`;
      prompt += `   - Examples (use substitution guide for more options):\n`;
      prompt += `     • "Goan Fish Curry" → "Goan Tofu Curry" or "Goan Banana Curry" (check substitution guide)\n`;
      prompt += `     • "Fish Recheado" → "Tofu Recheado" or "Mushroom Recheado" (check substitution guide)\n`;
      prompt += `     • "Prawn Balchão" → "Jackfruit Balchão" or "Mixed Vegetable Balchão" (check substitution guide)\n`;
      prompt += `     • Paneer → Tofu (firm, pressed)\n`;
      prompt += `     • Dairy milk → Coconut milk, almond milk, soy milk\n`;
      prompt += `     • Ghee → Coconut oil, vegetable oil\n`;
      prompt += `     • Eggs → Flax eggs (1 tbsp ground flaxseed + 3 tbsp water)\n`;
      prompt += `   - 🚨 DISH NAMING RULE: Replace animal protein in the dish name with the substitute\n`;
      prompt += `     ✅ CORRECT: "Fish Curry" → "Tofu Curry" or "Banana Curry"\n`;
      prompt += `     ❌ WRONG: "Fish Curry (Vegan Version)" - This is confusing!\n`;
      prompt += `     ✅ CORRECT: "Chepala Pulusu" → "Tofu Pulusu" (replace fish with tofu)\n`;
      prompt += `     ❌ WRONG: "Chepala Pulusu (Fish Curry) (Vegan Version)" - Don't mention fish!\n`;
      prompt += `   - Only add "(Vegan Version)" if the original dish name doesn't mention the animal product\n`;
      prompt += `   - THIS IS THE MOST IMPORTANT CONSTRAINT - NEVER VIOLATE IT!\n\n`;
    } else if (dietType === 'vegetarian') {
      prompt += `2b. 🚨 VEGETARIAN DIET REQUIREMENT (STRICT):\n`;
      prompt += `   - The user is STRICTLY VEGETARIAN\n`;
      prompt += `   - ABSOLUTELY NO meat, fish, or eggs:\n`;
      prompt += `     ❌ NO chicken, mutton, pork, beef, lamb, fish, seafood, eggs\n`;
      prompt += `   - Dairy is ALLOWED: paneer, milk, curd, ghee, butter, cheese\n`;
      prompt += `\n`;
      prompt += `   🔧 ADAPTING NON-VEGETARIAN DISHES TO VEGETARIAN:\n`;
      prompt += `   - If a traditional dish contains meat/fish/eggs, you MUST adapt it to be vegetarian\n`;
      prompt += `   - REFER TO the "🔧 INGREDIENT SUBSTITUTION GUIDE" in the RAG context above\n`;
      prompt += `   - Look for vegetarian substitutes for: fish, meat, chicken, eggs\n`;
      prompt += `   - Examples (use substitution guide for more options):\n`;
      prompt += `     • "Goan Fish Curry" → "Goan Paneer Curry" or "Goan Mixed Vegetable Curry" (check substitution guide)\n`;
      prompt += `     • "Chicken Cafreal" → "Paneer Cafreal" or "Mushroom Cafreal" (check substitution guide)\n`;
      prompt += `     • "Prawn Balchão" → "Paneer Balchão" or "Potato Balchão" (check substitution guide)\n`;
      prompt += `     • Fish → Paneer cubes, tofu, or mixed vegetables\n`;
      prompt += `     • Chicken → Paneer, soy chunks, or legumes\n`;
      prompt += `     • Eggs → Can be omitted or replaced with paneer scramble\n`;
      prompt += `   - 🚨 DISH NAMING RULE: Replace animal protein in the dish name with the substitute\n`;
      prompt += `     ✅ CORRECT: "Fish Curry" → "Paneer Curry" or "Mixed Vegetable Curry"\n`;
      prompt += `     ❌ WRONG: "Fish Curry (Vegetarian Version)" - This is confusing!\n`;
      prompt += `     ✅ CORRECT: "Chicken Cafreal" → "Paneer Cafreal" or "Mushroom Cafreal"\n`;
      prompt += `     ❌ WRONG: "Chicken Cafreal (Vegetarian Version)" - Don't mention chicken!\n`;
      prompt += `   - Only add "(Vegetarian Version)" if the original dish name doesn't mention the animal product\n\n`;
    } else if (dietType === 'eggetarian') {
      prompt += `2b. EGGETARIAN DIET:\n`;
      prompt += `   - Eggs are ALLOWED\n`;
      prompt += `   - NO meat, fish, or poultry\n`;
      prompt += `   - Dairy is ALLOWED\n\n`;
    } else if (dietType === 'non-vegetarian') {
      // ⭐ NEW: Non-vegetarian mixed meal plan instructions
      prompt += `2b. 🔥 NON-VEGETARIAN MEAL PLAN (BALANCED APPROACH):\n`;
      prompt += `   - The user prefers NON-VEGETARIAN meals but is also open to vegetarian options\n`;
      prompt += `   - NON-VEGETARIANS eat BOTH non-veg AND vegetarian meals in real life\n`;
      prompt += `\n`;
      prompt += `   📊 REQUIRED MEAL DISTRIBUTION:\n`;
      prompt += `   - 70% NON-VEGETARIAN meals (chicken, fish, eggs, mutton, seafood)\n`;
      prompt += `   - 30% VEGETARIAN meals (paneer, dal, vegetables, legumes)\n`;
      prompt += `\n`;
      prompt += `   🎯 IMPLEMENTATION STRATEGY:\n`;
      prompt += `   - For a ${preferences.duration}-day plan with ${mealsCount} meals/day = ${
        preferences.duration * mealsCount
      } total meals\n`;
      prompt += `   - NON-VEG meals needed: ${Math.ceil(
        preferences.duration * mealsCount * 0.7
      )} meals (~70%)\n`;
      prompt += `   - VEGETARIAN meals needed: ${Math.floor(
        preferences.duration * mealsCount * 0.3
      )} meals (~30%)\n`;
      prompt += `\n`;
      prompt += `   ✅ EXAMPLE DISTRIBUTION for 3 meals/day:\n`;
      prompt += `   - Day 1: Non-veg breakfast, Non-veg lunch, Vegetarian dinner\n`;
      prompt += `   - Day 2: Vegetarian breakfast, Non-veg lunch, Non-veg dinner\n`;
      prompt += `   - Day 3: Non-veg breakfast, Vegetarian lunch, Non-veg dinner\n`;
      prompt += `   - (Continue this pattern to achieve 70-30 ratio)\n`;
      prompt += `\n`;
      prompt += `   💡 WHY THIS MATTERS:\n`;
      prompt += `   - Non-vegetarians are NOT restricted to ONLY non-veg meals\n`;
      prompt += `   - Variety is important for nutrition and user satisfaction\n`;
      prompt += `   - Dal, paneer, and vegetable dishes are enjoyed by all Indians\n`;
      prompt += `   - This creates a balanced, realistic, and sustainable meal plan\n`;
      prompt += `\n`;
      prompt += `   ⚠️ IMPORTANT REMINDERS:\n`;
      prompt += `   - COUNT your meals as you plan: track non-veg vs vegetarian\n`;
      prompt += `   - At the end, VERIFY the ratio is approximately 70% non-veg, 30% veg\n`;
      prompt += `   - Use BOTH the non-veg AND vegetarian meal templates from RAG context\n`;
      prompt += `   - Don't ignore vegetarian templates - they're intentionally included!\n\n`;
    } else if (dietType === 'jain') {
      prompt += `2b. 🚨🚨🚨 JAIN DIET REQUIREMENT (ABSOLUTE MUST - STRICTEST DIET):\n`;
      prompt += `   - The user follows JAIN dietary principles - this is NON-NEGOTIABLE\n`;
      prompt += `   - You will receive BOTH vegetarian AND non-vegetarian meal templates\n`;
      prompt += `   - You MUST adapt ALL templates to be 100% Jain-compliant using substitutions\n`;
      prompt += `\n`;
      prompt += `   📋 COMPLETE LIST OF PROHIBITED FOODS:\n`;
      prompt += `   1. ❌ ALL ANIMAL PRODUCTS:\n`;
      prompt += `      • NO meat (chicken, mutton, pork, beef, lamb, any poultry)\n`;
      prompt += `      • NO fish or seafood (tuna, salmon, prawns, shrimp, crab, any sea food)\n`;
      prompt += `      • NO eggs (in any form - whole, powder, as ingredient)\n`;
      prompt += `\n`;
      prompt += `   2. ❌ ALL ROOT VEGETABLES & UNDERGROUND ITEMS:\n`;
      prompt += `      • NO potato, sweet potato, yam\n`;
      prompt += `      • NO onion, garlic, ginger (fresh)\n`;
      prompt += `      • NO carrot, radish, beetroot, turnip\n`;
      prompt += `      • NO any underground tubers or bulbs\n`;
      prompt += `      • REASON: Harvesting kills the plant and microorganisms (nigoda) in soil\n`;
      prompt += `\n`;
      prompt += `   3. ❌ MUSHROOMS, FUNGI & FERMENTED FOODS:\n`;
      prompt += `      • NO mushrooms (button, shiitake, portobello, any variety)\n`;
      prompt += `      • NO yeast or yeast-based products\n`;
      prompt += `      • NO fermented foods (unless specifically Jain-approved)\n`;
      prompt += `      • NO alcoholic beverages (beer, wine, spirits)\n`;
      prompt += `\n`;
      prompt += `   4. ❌ HONEY:\n`;
      prompt += `      • NO honey or honey-based products\n`;
      prompt += `      • REASON: Involves harm to bees\n`;
      prompt += `\n`;
      prompt += `   ✅ ALLOWED FOODS:\n`;
      prompt += `   - Above-ground vegetables: spinach, tomato, cucumber, beans, peas, capsicum, cauliflower, cabbage, broccoli, bottle gourd, pumpkin, zucchini, okra, eggplant\n`;
      prompt += `   - Fruits: all fruits that don't harm the plant (apples, bananas, berries, etc.)\n`;
      prompt += `   - Grains: rice, wheat, millets (but NOT for Jain Keto)\n`;
      prompt += `   - Legumes: lentils, chickpeas, kidney beans, moong, masoor, chana\n`;
      prompt += `   - Nuts & Seeds: almonds, cashews, walnuts, peanuts, chia, flax, sesame, pumpkin seeds\n`;
      prompt += `   - Dairy: milk, paneer, cheese, yogurt, butter, ghee, cream\n`;
      prompt += `   - Dry ginger powder (sunth) is acceptable as it's dried\n`;
      prompt += `\n`;
      prompt += `   🔧 MANDATORY SUBSTITUTION STRATEGY:\n`;
      prompt += `   - REFER TO the "🔧 INGREDIENT SUBSTITUTION GUIDE" in the RAG context above\n`;
      prompt += `   - For EVERY non-vegetarian dish, substitute proteins:\n`;
      prompt += `     • Chicken/Mutton/Meat → Paneer, tofu, soya chunks, legumes (rajma, chana)\n`;
      prompt += `     • Fish/Prawns/Seafood → Paneer, tofu, cottage cheese, baby corn\n`;
      prompt += `     • Eggs → Tofu scramble, chickpea flour (besan) for binding\n`;
      prompt += `\n`;
      prompt += `   - For EVERY dish with prohibited vegetables:\n`;
      prompt += `     • Potato → Pumpkin, bottle gourd (lauki), raw banana (plantain), cauliflower\n`;
      prompt += `     • Onion → Asafoetida (hing) + extra tomatoes, green chilies for flavor\n`;
      prompt += `     • Garlic → Asafoetida (hing), cumin, fennel for aroma\n`;
      prompt += `     • Fresh Ginger → Dry ginger powder (sunth)\n`;
      prompt += `     • Carrot → Pumpkin, red bell pepper, tomato\n`;
      prompt += `     • Mushrooms → Paneer cubes, tofu, baby corn, above-ground vegetables\n`;
      prompt += `\n`;
      prompt += `   - NAMING CONVENTION:\n`;
      prompt += `     • Keep dish name authentic but add "(Jain)" or "(Jain Version)"\n`;
      prompt += `     • Examples:\n`;
      prompt += `       "Goan Fish Curry" → "Goan Paneer Curry (Jain)"\n`;
      prompt += `       "Butter Chicken" → "Butter Paneer (Jain)"\n`;
      prompt += `       "Fish Recheado" → "Paneer Recheado (Jain)"\n`;
      prompt += `       "Tendli Batata Bhaji" → "Tendli Pumpkin Bhaji (Jain)"\n`;
      prompt += `       "Mushroom Masala" → "Paneer Masala (Jain)"\n`;
      prompt += `\n`;
      prompt += `   ⚠️  VERIFICATION CHECKLIST (Check EVERY meal):\n`;
      prompt += `   □ Contains NO meat, fish, seafood, or eggs\n`;
      prompt += `   □ Contains NO root vegetables (potato, onion, garlic, ginger, carrot, etc.)\n`;
      prompt += `   □ Contains NO mushrooms, fungi, or yeast products\n`;
      prompt += `   □ Contains NO honey\n`;
      prompt += `   □ All substitutions are from the ALLOWED foods list\n`;
      prompt += `   □ Dish name includes "(Jain)" or "(Jain Version)"\n`;
      prompt += `\n`;
      prompt += `   THIS IS THE MOST IMPORTANT CONSTRAINT - NEVER VIOLATE JAIN PRINCIPLES!\n\n`;
    }

    if (preferences.cuisines && preferences.cuisines.length > 1) {
      prompt += `3. DISTRIBUTE cuisines evenly: Each cuisine (${preferences.cuisines.join(
        ', '
      )}) should appear multiple times across all ${preferences.duration} days\n`;
    } else {
      prompt += `3. Stay true to ${
        preferences.cuisines?.[0] || 'the selected'
      } cuisine throughout the meal plan\n`;
    }

    // Use personalized calorie target from user profile (already declared at top)
    const avgCaloriesPerMeal = Math.round(targetCalories / mealsCount);
    const weightGoalContext = preferences.weightGoal
      ? `The user wants to ${preferences.weightGoal} weight.`
      : '';

    const calorieToleranceValue = Math.round(targetCalories * 0.03);
    const minAcceptableCalories = targetCalories - calorieToleranceValue;
    const maxAcceptableCalories = targetCalories + calorieToleranceValue;

    prompt += `4. 🚨🚨🚨 CRITICAL CALORIE REQUIREMENT (ABSOLUTELY NON-NEGOTIABLE):\n`;
    prompt += `   - Target: ${targetCalories} kcal per day${
      weightGoalContext ? ` (${weightGoalContext})` : ''
    }\n`;
    prompt += `   - MANDATORY RANGE: ${minAcceptableCalories}-${maxAcceptableCalories} kcal per day (±3% strict tolerance)\n`;
    prompt += `   - Distribution: ~${avgCaloriesPerMeal} kcal per meal × ${mealsCount} meals\n`;
    prompt += `   - ⚠️ WARNING: Meals below 1500 kcal/day are DANGEROUS for health - DO NOT UNDER-CALCULATE!\n`;
    prompt += `   - Each meal breakdown example for ${targetCalories} kcal:\n`;
    if (mealsCount === 3) {
      prompt += `     • Breakfast: ~${Math.round(targetCalories * 0.25)} kcal\n`;
      prompt += `     • Lunch: ~${Math.round(targetCalories * 0.4)} kcal\n`;
      prompt += `     • Dinner: ~${Math.round(targetCalories * 0.35)} kcal\n`;
    } else if (mealsCount === 4) {
      prompt += `     • Breakfast: ~${Math.round(targetCalories * 0.25)} kcal\n`;
      prompt += `     • Snack: ~${Math.round(targetCalories * 0.1)} kcal\n`;
      prompt += `     • Lunch: ~${Math.round(targetCalories * 0.35)} kcal\n`;
      prompt += `     • Dinner: ~${Math.round(targetCalories * 0.3)} kcal\n`;
    }
    prompt += `   - 🎯 After calculating ALL macros for ALL meals, SUM THE DAY'S CALORIES and verify it's within range!\n`;
    prompt += `   - If day total is outside ${minAcceptableCalories}-${maxAcceptableCalories}, ADJUST portion sizes immediately!\n\n`;

    // Conditional nutritional priorities based on isKeto
    if (preferences.isKeto) {
      prompt += `5. 🔥 KETOGENIC PRIORITIES: High-fat, moderate-protein, very low-carb foods. NO grains, NO starchy vegetables.\n`;
      prompt += `6. ⭐ BUDGET: Target ₹${preferences.budget || 300}/day. For keto, prioritize:\n`;
      prompt += `   - AFFORDABLE keto staples: Eggs (₹6-8/egg), cauliflower (₹30-40/kg), leafy greens (₹20-40/kg), paneer (₹300-400/kg), ghee (₹500/kg but lasts long)\n`;
      prompt += `   - USE coconut oil (₹150-200/L) or refined oil (₹120/L) for cooking instead of expensive MCT oil\n`;
      prompt += `   - LIMIT expensive ingredients: Almond flour (₹600/kg) - use sparingly, coconut flour (₹400/kg) - use moderately\n`;
      prompt += `   - STRATEGY: Use cauliflower rice (cheap) for most meals, reserve almond/coconut flour for 1 meal/day\n`;
      prompt += `   - If budget is tight, emphasize eggs, paneer, vegetables, ghee over expensive nut flours\n`;
    } else {
      prompt += `5. Focus on low-GI foods, high fiber, lean protein, healthy fats\n`;
      prompt += `6. ⭐ BUDGET: Strictly stay within ₹${
        preferences.budget || 300
      }/day. Choose affordable ingredients like seasonal vegetables, whole grains, lentils, local proteins.\n`;
    }

    prompt += `7. 🚨🚨🚨 MEAL TEMPLATES - ONLY USE DISHES FROM RAG CONTEXT (ABSOLUTE RULE):\n`;
    prompt += `   - The RAG context above contains ${preferences.cuisines?.join(
      '/'
    )} meal templates ONLY\n`;
    prompt += `   - CRITICAL: You can ONLY use dishes that appear in that RAG context\n`;
    prompt += `   - DO NOT use any dish that doesn't appear in the RAG templates above\n`;
    prompt += `   - Look for sections marked "## ${preferences.cuisines?.[0].toUpperCase()}"\n`;
    prompt += `   - RULE: If a dish name doesn't appear in RAG context, you CANNOT use it\n`;
    prompt += `   - Example ENFORCEMENT:\n`;
    prompt += `     ✅ IF "Coconut Rice" appears in RAG → You CAN use it\n`;
    prompt += `     ✅ IF "Maskateri" appears in RAG → You CAN use it (adapt for Jain if needed)\n`;
    prompt += `     ❌ IF "Dhuska" appears in RAG but it's JHARKHAND cuisine → You CANNOT use it for ${preferences.cuisines?.[0]}\n`;
    prompt += `     ❌ IF "Rugra Bhurji" doesn't appear in ${preferences.cuisines?.[0]} section → You CANNOT use it\n`;
    prompt += `   - When adapting dishes for ${dietType} diet:\n`;
    prompt += `     🔧 CRITICAL: Use the "INGREDIENT SUBSTITUTION GUIDE" from RAG context above\n`;
    prompt += `     • Check the substitution guide for appropriate replacements\n`;
    prompt += `     • Adjust portion sizes to match calorie targets\n`;
    prompt += `     • Add complementary ingredients for PCOS benefits\n`;
    prompt += `     • Add seasonings and garnishes mentioned in the template\n`;
    prompt += `8. 🚨🚨🚨 VARIETY REQUIREMENT (ABSOLUTELY CRITICAL - NO EXCEPTIONS):\n`;
    prompt += `   ⚡ INGREDIENT DIVERSITY RULE (HIGHEST PRIORITY):\n`;
    prompt += `   - DO NOT use the SAME PRIMARY INGREDIENT in multiple meals within a day\n`;
    prompt += `   - PRIMARY INGREDIENT = the main protein/base of the dish (dal, rice, paneer, vegetables, etc.)\n`;
    prompt += `   - ❌ WRONG Example: Day 1 - Chana Dal Pancake (breakfast), Chana Dal with Rice (lunch), Lauki Chana Dal (dinner)\n`;
    prompt += `   - ✅ CORRECT Example: Day 1 - Chana Dal Pancake (breakfast), Vegetable Biryani (lunch), Mixed Veg Curry (dinner)\n`;
    prompt += `   - CRITICAL: Track which ingredients you've used in each day and AVOID repeating them\n`;

    if (preferences.isKeto) {
      prompt += `   ⚡ KETO-SPECIFIC VARIETY RULES (CRITICAL!):\n`;
      prompt += `   - DO NOT use cauliflower rice in EVERY meal! Maximum 1-2 times per day\n`;
      prompt += `   - ROTATE LOW-CARB BASES:\n`;
      prompt += `     • Cauliflower rice (use 1x per day max)\n`;
      prompt += `     • Cabbage rice/noodles (shredded, stir-fried)\n`;
      prompt += `     • Zucchini noodles/spirals\n`;
      prompt += `     • Shirataki noodles/rice\n`;
      prompt += `     • Lettuce wraps (no grain base needed)\n`;
      prompt += `   - ROTATE PROTEINS: Don't use chicken/paneer in every meal!\n`;
      prompt += `     • Fish → Chicken → Paneer → Eggs → Pork → Mutton (cycle through)\n`;
      prompt += `   - ROTATE VEGETABLES: Don't use cauliflower in everything!\n`;
      prompt += `     • Spinach, zucchini, cabbage, broccoli, bell peppers, mushrooms, eggplant, etc.\n`;
      prompt += `   - ROTATE KETO FLOURS (for rotis/breads):\n`;
      prompt += `     • Almond flour → Coconut flour → Flaxseed meal → Cheese wraps → Lettuce\n\n`;
    } else {
      prompt += `   - DAL VARIETY: If using dal, rotate between: moong dal, toor dal, masoor dal, urad dal, chana dal (1 type per day MAX)\n`;
      prompt += `   - VEG VARIETY: Rotate vegetables: spinach, cauliflower, bottle gourd, pumpkin, beans, okra, eggplant, etc.\n`;
      prompt += `   - PROTEIN VARIETY: Rotate proteins: paneer, tofu, tempeh, chickpeas, rajma, various dals, soy (not same one)\n\n`;
    }
    prompt += `   - ZERO REPETITION ALLOWED: Each meal across ALL ${preferences.duration} days must be 100% UNIQUE\n`;
    prompt += `   - CRITICAL STEP: Before generating the meal plan, COUNT how many unique ${preferences.cuisines?.[0]} ${dietType} dishes are in the RAG context\n`;
    prompt += `   - REQUIRED: You need ${
      parseInt(preferences.duration) * parseInt(preferences.mealsPerDay)
    } UNIQUE dishes for ${preferences.duration} days × ${preferences.mealsPerDay} meals/day\n`;
    prompt += `   - IF the RAG context has fewer dishes than needed:\n`;
    prompt += `     🚨 STRATEGY 1 (PREFERRED): Adapt non-${dietType} dishes to ${dietType} using INGREDIENT SUBSTITUTION GUIDE\n`;
    prompt += `     • Example: "Goan Fish Curry" (non-veg) → "Goan Tofu Curry" (replace fish with tofu in name)\n`;
    prompt += `     • Example: "Prawn Balchão" (non-veg) → "Jackfruit Balchão" (replace prawn with jackfruit in name)\n`;
    prompt += `     • Example: "Chicken Cafreal" (non-veg) → "Paneer Cafreal" (replace chicken with paneer in name)\n`;
    prompt += `     • 🚨 IMPORTANT: Replace the animal protein in the dish NAME, don't add "(Vegan/Vegetarian Version)"\n`;
    prompt += `     • CHECK the "🔧 INGREDIENT SUBSTITUTION GUIDE" section in RAG context for appropriate replacements\n`;

    // Conditional variety strategies based on keto
    if (preferences.isKeto) {
      prompt += `     🚨 STRATEGY 2 (KETO-SPECIFIC): Create variations with different vegetables/proteins\n`;
      prompt += `     • Example: "Palak Paneer with Cauliflower Rice" → "Methi Paneer with Zucchini Noodles" (different vegetables)\n`;
      prompt += `     • Example: "Chicken Curry with Cauliflower Rice" → "Egg Curry with Cauliflower Rice" (different protein)\n`;
      prompt += `     • Example: "Paneer Tikka with Cucumber Salad" → "Tofu Tikka with Spinach Salad (Vegan Keto)" (different protein + sides)\n`;
      prompt += `     • IMPORTANT: ALL variations MUST still use cauliflower rice/almond flour instead of grains\n`;
      prompt += `     🚨 STRATEGY 3 (KETO): Vary cooking methods and fat sources\n`;
      prompt += `     • Example: "Palak Paneer (ghee-based)" → "Palak Paneer (coconut oil-based)" (different fat)\n`;
      prompt += `     • Example: "Grilled Paneer" → "Pan-fried Paneer in butter" (different cooking method)\n`;
    } else {
      prompt += `     🚨 STRATEGY 2: Create variations by changing preparation methods\n`;
      prompt += `     • Example: "Veg Xacuti Bowl (Lite)" → "Veg Xacuti with Red Rice Idli" (different accompaniment)\n`;
      prompt += `     • Example: "Alsande Tonak with Brown Rice" → "Alsande Usal with Pav" (different style)\n`;
      prompt += `     • Example: "Ragi Pulao Bowl" → "Ragi Upma" (different cooking method)\n`;
      prompt += `     🚨 STRATEGY 3: Vary portion sizes and accompaniments significantly\n`;
      prompt += `     • Example: "Sol Kadhi with Millet Khichdi" vs "Sol Kadhi with Cucumber Salad" (different sides)\n`;
    }

    prompt += `   - Example WRONG approach (DO NOT DO THIS):\n`;
    prompt += `     ❌ Day 1 Breakfast: Ragi Pulao Bowl\n`;
    prompt += `     ❌ Day 2 Breakfast: Ragi Pulao Bowl (EXACT REPETITION - NOT ALLOWED!)\n`;
    prompt += `     ❌ Day 3 Breakfast: Ragi Pulao Bowl (EXACT REPETITION - NOT ALLOWED!)\n`;
    prompt += `   - Example CORRECT approach:\n`;
    prompt += `     ✅ Day 1 Breakfast: Ragi Pulao Bowl\n`;
    prompt += `     ✅ Day 2 Breakfast: Veg Xacuti with Red Rice Idli (DIFFERENT dish)\n`;
    prompt += `     ✅ Day 3 Breakfast: Alsande Usal with Pav (DIFFERENT dish)\n`;
    prompt += `   - Before adding any meal, CHECK if that EXACT dish name already appears in previous days\n`;
    prompt += `   - If you've already used a dish, you MUST choose or create a variation\n\n`;
    prompt += `   📋 INGREDIENT TRACKING CHECKLIST (Use this for EVERY day):\n`;
    prompt += `   Before finalizing Day 1, list ingredients used:\n`;
    prompt += `   - Breakfast: [ingredient A]\n`;
    prompt += `   - Lunch: [ingredient B] (MUST be different from A)\n`;
    prompt += `   - Snack (if applicable): [ingredient C] (MUST be different from A and B)\n`;
    prompt += `   - Dinner: [ingredient D] (MUST be different from A, B, C)\n`;
    prompt += `   ✅ VERIFY: No ingredient appears more than ONCE in the same day\n`;
    prompt += `   ✅ ACROSS DAYS: Try to minimize repetition of the same ingredient across different days too\n`;
    prompt += `   Example CORRECT ingredient distribution:\n`;
    prompt += `   - Day 1: Moong dal (breakfast), Rice + mixed veg (lunch), Bottle gourd curry (snack), Paneer (dinner)\n`;
    prompt += `   - Day 2: Chickpeas (breakfast), Jowar roti + eggplant (lunch), Peanut chaat (snack), Tofu stir-fry (dinner)\n`;
    prompt += `   - Day 3: Urad dal (breakfast), Bajra + spinach (lunch), Roasted chana (snack), Rajma curry (dinner)\n\n`;

    // Add critical constraint intersection reminder
    if (preferences.isKeto) {
      prompt += `   ⚠️ CRITICAL REMINDER - ALL constraints must work together:\n`;
      prompt += `     ✅ MUST BE from ${preferences.cuisines?.join('/')} cuisine (RAG templates)\n`;
      prompt += `     ✅ MUST BE ${dietType}-friendly (no prohibited ingredients)\n`;
      prompt += `     ✅ MUST BE keto-adapted (replace ALL grains with cauliflower rice/almond flour, NO starchy vegetables, HIGH fat)\n`;
      prompt += `     ✅ MUST BE unique (no repetition across ${preferences.duration} days)\n`;
      prompt += `     ✅ EXAMPLE: "Fish Recheado" → "Tofu Recheado with Cauliflower Rice (Vegan Keto)" satisfies ALL constraints\n\n`;
    } else {
      prompt += `   ⚠️ CRITICAL REMINDER - ALL constraints must work together:\n`;
      prompt += `     ✅ MUST BE from ${preferences.cuisines?.join('/')} cuisine (RAG templates)\n`;
      prompt += `     ✅ MUST BE ${dietType}-friendly (no prohibited ingredients)\n`;
      prompt += `     ✅ MUST BE unique (no repetition across ${preferences.duration} days)\n\n`;
    }

    prompt += `9. Include variety in ingredients, preparation methods, and flavor profiles\n`;
    prompt += `10. Consider Indian meal timing and portion sizes\n`;
    prompt += `11. Use regional, seasonal, and easily available ingredients\n\n`;

    // ⭐ KETO BLOCK ALREADY ADDED AT TOP - Skip duplicate

    // Standard PCOS priorities (apply when NOT keto)
    if (!preferences.isKeto) {
      prompt += `PCOS NUTRITIONAL PRIORITIES:\n`;
      prompt += `- Protein: 25-30% of calories\n`;
      prompt += `- Complex carbs: 40-45% (low-GI only)\n`;
      prompt += `- Healthy fats: 25-30%\n`;
      prompt += `- Fiber: 25-30g per day\n`;
      prompt += `- Avoid: refined sugar, white rice, maida, processed foods\n\n`;
    }

    // JSON structure
    prompt += `OUTPUT FORMAT (strict JSON):\n`;
    prompt += `{\n`;
    prompt += `  "days": [\n`;
    prompt += `    {\n`;
    prompt += `      "dayNumber": 1,\n`;
    prompt += `      "totalCalories": 2000,\n`;
    prompt += `      "meals": [\n`;
    prompt += `        {\n`;
    prompt += `          "name": "Meal Name",\n`;
    prompt += `          "mealType": "breakfast",\n`;
    prompt += `          "ingredients": [\n`;
    prompt += `            {"item": "ingredient", "quantity": 100, "unit": "g"}\n`;
    prompt += `          ],\n`;
    prompt += `          "recipe": "Step-by-step instructions...",\n`;
    prompt += `          "protein": 20,\n`;
    prompt += `          "carbs": 45,\n`;
    prompt += `          "fats": 15,\n`;
    prompt += `          "fiber": 8,\n`;
    prompt += `          "calories": 400,\n`;
    prompt += `          "gi": "Low",\n`;
    prompt += `          "time": "20 mins",\n`;
    prompt += `          "tip": "PCOS tip..."\n`;
    prompt += `        }\n`;
    prompt += `      ]\n`;
    prompt += `    }\n`;
    prompt += `  ]\n`;
    prompt += `}\n\n`;

    prompt += `Generate the complete meal plan now as valid JSON only. No explanations.`;

    return prompt;
  }

  /**
   * Generate meal plan in chunks for longer durations
   */
  async generateInChunks(preferences) {
    logger.info('Generating in 3-day chunks with RAG for reliability');

    const duration = parseInt(preferences.duration) || 7;
    const allDays = [];
    const chunkSize = 3;
    const previousMealNames = new Set(); // ⭐ Track meal names to avoid repetition

    for (let startDay = 1; startDay <= duration; startDay += chunkSize) {
      const endDay = Math.min(startDay + chunkSize - 1, duration);
      const chunkDuration = endDay - startDay + 1;

      try {
        const chunkPrefs = {
          ...preferences,
          duration: chunkDuration,
          startDay,
          excludeMeals: Array.from(previousMealNames), // ⭐ Pass previously used meals
        };

        const chunk = await this.generateWithRAG(chunkPrefs);

        if (chunk && chunk.days) {
          chunk.days.forEach((day, idx) => {
            day.dayNumber = startDay + idx;
            // ⭐ Track all meal names from this chunk
            day.meals?.forEach((meal) => {
              if (meal.name) previousMealNames.add(meal.name);
            });
            allDays.push(day);
          });
        } else {
          for (let i = startDay; i <= endDay; i++) {
            allDays.push(this.getFallbackDay(i, preferences));
          }
        }
      } catch (e) {
        logger.warn(`RAG chunk ${startDay}-${endDay} failed, using fallback`);
        for (let i = startDay; i <= endDay; i++) {
          allDays.push(this.getFallbackDay(i, preferences));
        }
      }
    }

    return { days: allDays };
  }

  /**
   * Parse JSON response from LLM
   */
  parseJSON(rawContent) {
    try {
      // Remove markdown fences
      let cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try parsing directly
      return JSON.parse(cleaned);
    } catch (e1) {
      try {
        // Try extracting JSON block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (e2) {
        logger.error('JSON parsing failed', { error: e2.message });
        return null;
      }
    }
    return null;
  }

  /**
   * Validate meal plan structure
   */
  validateStructure(parsed, expectedDays, expectedMeals) {
    if (!parsed || !parsed.days || !Array.isArray(parsed.days)) {
      logger.error('Invalid structure: missing days array');
      return false;
    }

    if (parsed.days.length !== expectedDays) {
      logger.error(`Invalid structure: expected ${expectedDays} days, got ${parsed.days.length}`);
      return false;
    }

    for (const day of parsed.days) {
      if (!day.meals || !Array.isArray(day.meals)) {
        logger.error('Invalid structure: day missing meals array');
        return false;
      }

      if (day.meals.length !== expectedMeals) {
        logger.error(`Invalid structure: expected ${expectedMeals} meals, got ${day.meals.length}`);
        return false;
      }

      for (const meal of day.meals) {
        if (!meal.name || !meal.mealType || !meal.ingredients || !Array.isArray(meal.ingredients)) {
          logger.error('Invalid meal structure: missing required fields');
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Fix malformed structure
   */
  fixStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      // Try to find days array in nested structure
      if (!parsed.days) {
        for (const key in parsed) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            const firstItem = parsed[key][0];
            if (firstItem.meals || firstItem.dayNumber) {
              parsed[key].forEach((item, idx) => {
                if (!item.dayNumber) {
                  item.dayNumber = idx + 1;
                }
              });

              const candidate = { days: parsed[key] };
              if (this.validateStructure(candidate, expectedDays, expectedMeals)) {
                logger.info('✅ Structure fixed successfully');
                return candidate;
              }
            }
          }
        }
        return null;
      }

      // Fix day numbers
      parsed.days.forEach((day, idx) => {
        if (day.day && !day.dayNumber) {
          day.dayNumber = day.day;
          delete day.day;
        }
        if (!day.dayNumber) {
          day.dayNumber = idx + 1;
        }
      });

      // Fix missing meal properties
      parsed.days.forEach((day) => {
        day.meals.forEach((meal) => {
          if (!meal.gi) meal.gi = 'Low';
          if (!meal.time) meal.time = '20 mins';
          if (!meal.tip) meal.tip = 'Enjoy fresh';
          if (!meal.ingredients) meal.ingredients = [];
          if (typeof meal.protein !== 'number') meal.protein = 10;
          if (typeof meal.carbs !== 'number') meal.carbs = 20;
          if (typeof meal.fats !== 'number') meal.fats = 5;
          if (typeof meal.fiber !== 'number') meal.fiber = 5;
          if (typeof meal.calories !== 'number') {
            meal.calories = Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
          }
        });
      });

      if (this.validateStructure(parsed, expectedDays, expectedMeals)) {
        logger.info('✅ Structure validated and fixed');
        return parsed;
      }

      return null;
    } catch (e) {
      logger.error('Fix structure failed', { error: e.message });
      return null;
    }
  }

  /**
   * Validate that LLM output adheres to selected cuisines
   * Catches hallucinations and wrong regional dishes
   */
  validateCuisineAdherence(mealPlan, requestedCuisines, dietType) {
    const logger = new Logger('CuisineValidation');

    // Map of forbidden cuisine indicators for different regional selections
    const forbiddenCuisineKeywords = {
      'south-indian': [
        'idli',
        'dosa',
        'sambar',
        'rasam',
        'appam',
        'puttu',
        'upma',
        'vada',
        'pongal',
      ],
      'north-indian': ['chole', 'rajma', 'makki', 'sarson', 'tandoor', 'naan', 'kulcha'],
      'west-indian': ['dhokla', 'thepla', 'undhiyu', 'khandvi', 'pav bhaji'],
      bengali: ['shukto', 'chingri', 'ilish', 'machher jhol', 'mishti'],
    };

    // ⭐ FIX: Map cuisines to their parent regions (same as prompt generation)
    const cuisineToRegionMap = {
      tamil: 'south-indian',
      telugu: 'south-indian',
      kerala: 'south-indian',
      karnataka: 'south-indian',
      andhra: 'south-indian',
      puducherry: 'south-indian',
      bengali: 'east-indian',
      odia: 'east-indian',
      assamese: 'east-indian',
      manipuri: 'east-indian',
      bihari: 'east-indian',
      mizo: 'east-indian',
      naga: 'east-indian',
      punjabi: 'north-indian',
      rajasthani: 'north-indian',
      'uttar pradesh': 'north-indian',
      uttarakhand: 'north-indian',
      haryanvi: 'north-indian',
      kashmiri: 'north-indian',
      himachali: 'north-indian',
      gujarati: 'west-indian',
      maharashtrian: 'west-indian',
      goan: 'west-indian',
      jharkhandi: 'east-indian',
      chhattisgarh: 'central-indian',
      'madhya pradesh': 'central-indian',
    };

    // ✅ Check if ANY cuisine from each region is selected
    const selectedRegions = new Set();
    requestedCuisines.forEach((cuisine) => {
      const cuisineLower = cuisine.toLowerCase();
      const region = cuisineToRegionMap[cuisineLower];
      if (region) {
        selectedRegions.add(region); // "kerala" → adds "south-indian"
      }
    });

    // Determine which cuisines are FORBIDDEN based on selection
    const requestedRegions = requestedCuisines.map((c) => c.toLowerCase());
    const violations = [];

    mealPlan.days.forEach((day, dayIdx) => {
      day.meals.forEach((meal, mealIdx) => {
        const mealName = (meal.name || '').toLowerCase();

        // Check if meal name contains requested cuisine/state name (GOOD)
        const hasRequestedCuisineInName = requestedCuisines.some((cuisine) => {
          const cuisineLower = cuisine.toLowerCase();
          // Check for exact cuisine mention: "(Bihari)", "(Manipuri)", "(Sikkimese)"
          const hasParenthetical =
            mealName.includes(`(${cuisineLower})`) ||
            mealName.includes(`${cuisineLower} style`) ||
            mealName.includes(`${cuisineLower}-style`);

          // Also check if cuisine name appears anywhere in meal name
          const hasCuisineMention = mealName.includes(cuisineLower);

          return hasParenthetical || hasCuisineMention;
        });

        // Check for forbidden cuisine keywords (BAD)
        let foundForbiddenCuisine = null;
        for (const [region, keywords] of Object.entries(forbiddenCuisineKeywords)) {
          // ⭐ FIX: Skip if ANY cuisine from this region is selected
          // If user selected Kerala (south-indian), don't forbid south-indian dishes
          if (selectedRegions.has(region)) {
            continue;
          }

          // Also check old logic for backward compatibility
          if (requestedRegions.some((r) => region.includes(r) || r.includes(region))) {
            continue;
          }

          // Check if meal contains forbidden keywords from this region
          const hasForbiddenKeyword = keywords.some((keyword) => mealName.includes(keyword));
          if (hasForbiddenKeyword) {
            foundForbiddenCuisine = region;
            break;
          }
        }

        // Log violations
        if (foundForbiddenCuisine) {
          violations.push({
            day: dayIdx + 1,
            mealType: meal.mealType,
            mealName: meal.name,
            issue: `Contains ${foundForbiddenCuisine} dish (forbidden)`,
            severity: 'ERROR',
          });
        } else if (!hasRequestedCuisineInName) {
          // Warn if meal name doesn't mention the cuisine (might be generic)
          violations.push({
            day: dayIdx + 1,
            mealType: meal.mealType,
            mealName: meal.name,
            issue: `Meal name doesn't mention requested cuisines [${requestedCuisines.join(', ')}]`,
            severity: 'WARNING',
          });
        }
      });
    });

    // Report violations
    if (violations.length > 0) {
      const errors = violations.filter((v) => v.severity === 'ERROR');
      const warnings = violations.filter((v) => v.severity === 'WARNING');

      if (errors.length > 0) {
        logger.error(`🚨 CUISINE VALIDATION FAILED: ${errors.length} meals from WRONG cuisines!`, {
          requestedCuisines,
          violations: errors.map((v) => `Day ${v.day} ${v.mealType}: ${v.mealName} - ${v.issue}`),
        });
      }

      if (warnings.length > 0) {
        logger.warn(
          `⚠️  CUISINE VALIDATION WARNING: ${warnings.length} meals lack cuisine labels`,
          {
            requestedCuisines,
            warnings: warnings.slice(0, 3).map((v) => `Day ${v.day} ${v.mealType}: ${v.mealName}`),
          }
        );
      }
    } else {
      logger.info(
        `✅ CUISINE VALIDATION PASSED: All meals match requested cuisines [${requestedCuisines.join(
          ', '
        )}]`
      );
    }
  }

  /**
   * Validate and adjust daily calories to user's target
   */
  validateAndAdjustCalories(mealPlan, targetCalories = 2000) {
    const target = targetCalories;
    // Use proportional tolerance: 3% of target (strict precision for health goals)
    // For 1709 kcal: ±51 kcal tolerance (1658-1760 kcal acceptable)
    // For 2000 kcal: ±60 kcal tolerance (1940-2060 kcal acceptable)
    const tolerance = Math.round(target * 0.03);

    mealPlan.days.forEach((day, dayIndex) => {
      let dailyTotal = day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

      if (Math.abs(dailyTotal - target) > tolerance) {
        logger.warn(
          `Day ${
            dayIndex + 1
          } calories out of range: ${dailyTotal} kcal (target: ${target}, tolerance: ±${tolerance})`
        );

        const difference = target - dailyTotal;
        const adjustmentPerMeal = Math.round(difference / day.meals.length);

        day.meals.forEach((meal) => {
          meal.calories = Math.max(200, meal.calories + adjustmentPerMeal);
        });

        dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);

        if (Math.abs(dailyTotal - target) > tolerance) {
          const largestMeal = day.meals.reduce((max, meal) =>
            meal.calories > max.calories ? meal : max
          );
          const finalDifference = target - dailyTotal;
          const carbAdjustment = Math.round(finalDifference / 4);
          largestMeal.carbs = Math.max(5, largestMeal.carbs + carbAdjustment);
          largestMeal.calories = Math.round(
            largestMeal.protein * 4 + largestMeal.carbs * 4 + largestMeal.fats * 9
          );
          dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
        }

        logger.info(`Day ${dayIndex + 1} adjusted total: ${dailyTotal} kcal`);
      } else {
        // Log when calories are within tolerance (for monitoring)
        logger.info(
          `Day ${
            dayIndex + 1
          } calories acceptable: ${dailyTotal} kcal (target: ${target}, tolerance: ±${tolerance})`
        );
      }

      day.totalCalories = dailyTotal;
    });

    // Log overall calorie distribution
    const avgCalories = Math.round(
      mealPlan.days.reduce((sum, day) => sum + day.totalCalories, 0) / mealPlan.days.length
    );
    const minCalories = Math.min(...mealPlan.days.map((day) => day.totalCalories));
    const maxCalories = Math.max(...mealPlan.days.map((day) => day.totalCalories));

    logger.info('Meal plan calorie summary', {
      target: target,
      tolerance: tolerance,
      average: avgCalories,
      min: minCalories,
      max: maxCalories,
      variance: maxCalories - minCalories,
    });
  }

  /**
   * Assess retrieval quality including lab guidance
   */
  assessRetrievalQuality(mealTemplates, nutritionGuidelines, labGuidanceDocs = []) {
    const totalDocs = mealTemplates.length + nutritionGuidelines.length + labGuidanceDocs.length;

    if (totalDocs === 0) return 'none';
    if (totalDocs < 3) return 'low';
    if (totalDocs < 8) return 'medium';
    if (totalDocs < 15) return 'high';
    return 'excellent';
  }

  /**
   * Get fallback guidelines when RAG fails
   */
  getFallbackGuidelines() {
    return `
📚 GENERAL PCOS NUTRITION GUIDELINES:

1. LOW GLYCEMIC INDEX (GI) FOODS:
   - Choose whole grains: brown rice, oats, quinoa, millets (ragi, bajra, jowar)
   - Avoid: white rice, maida (refined flour), white bread
   - Legumes and lentils: moong dal, masoor dal, chickpeas, kidney beans

2. PROTEIN SOURCES:
   - Plant-based: tofu, paneer, legumes, nuts, seeds
   - Lean meats (if non-veg): chicken breast, fish, eggs
   - Aim for 25-30% of daily calories from protein

3. HEALTHY FATS:
   - Nuts: almonds, walnuts, pistachios (25-30g/day)
   - Seeds: flaxseeds, chia seeds, pumpkin seeds
   - Oils: olive oil, mustard oil, coconut oil (in moderation)
   - Avoid: trans fats, excessive saturated fats

4. FIBER:
   - Target: 25-30g per day
   - Sources: vegetables, fruits (low-sugar), whole grains, legumes
   - Benefits: improves insulin sensitivity, aids digestion

5. ANTI-INFLAMMATORY FOODS:
   - Turmeric, ginger, garlic (if not Jain)
   - Green leafy vegetables: spinach, fenugreek, amaranth
   - Berries, tomatoes, fatty fish

6. FOODS TO LIMIT/AVOID:
   - Refined carbohydrates and sugar
   - Processed foods and packaged snacks
   - Sugary beverages
   - Excessive dairy (if insulin resistant)

7. MEAL TIMING:
   - Eat regular meals to maintain blood sugar
   - Don't skip breakfast
   - Avoid late-night eating
`;
  }

  /**
   * Get regional meal templates as fallback
   */
  getRegionalTemplates(region) {
    const templates = {
      'north-india': {
        breakfast: {
          name: 'Oats Upma with Vegetables',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Oats', quantity: 50, unit: 'g' },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g' },
            { item: 'Mustard Seeds', quantity: 5, unit: 'g' },
          ],
          recipe: 'Roast oats, temper with mustard seeds, add vegetables and cook.',
          protein: 12,
          carbs: 40,
          fats: 10,
          fiber: 8,
          calories: 290,
          gi: 'Low',
          time: '15 mins',
          tip: 'Oats are low-GI and help with insulin resistance',
        },
        lunch: {
          name: 'Roti with Dal and Salad',
          mealType: 'lunch',
          ingredients: [
            { item: 'Whole Wheat Roti', quantity: 2, unit: 'pieces' },
            { item: 'Moong Dal', quantity: 100, unit: 'g' },
            { item: 'Cucumber Salad', quantity: 100, unit: 'g' },
          ],
          recipe: 'Cook dal with spices, serve with roti and fresh salad.',
          protein: 18,
          carbs: 55,
          fats: 8,
          fiber: 12,
          calories: 360,
          gi: 'Low',
          time: '30 mins',
          tip: 'Protein-rich dal helps stabilize blood sugar',
        },
        dinner: {
          name: 'Vegetable Khichdi',
          mealType: 'dinner',
          ingredients: [
            { item: 'Brown Rice', quantity: 50, unit: 'g' },
            { item: 'Moong Dal', quantity: 50, unit: 'g' },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Cook rice and dal together with vegetables and mild spices.',
          protein: 15,
          carbs: 50,
          fats: 6,
          fiber: 10,
          calories: 310,
          gi: 'Low',
          time: '25 mins',
          tip: 'Light dinner aids digestion and hormone balance',
        },
        snack: {
          name: 'Handful of Nuts',
          mealType: 'snack',
          ingredients: [
            { item: 'Almonds', quantity: 15, unit: 'g' },
            { item: 'Walnuts', quantity: 10, unit: 'g' },
          ],
          recipe: 'Enjoy a mix of unsalted nuts.',
          protein: 6,
          carbs: 8,
          fats: 15,
          fiber: 3,
          calories: 180,
          gi: 'Low',
          time: '2 mins',
          tip: 'Healthy fats support hormone production',
        },
      },
      'south-india': {
        breakfast: {
          name: 'Ragi Dosa with Sambar',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Ragi Flour', quantity: 60, unit: 'g' },
            { item: 'Sambar', quantity: 150, unit: 'ml' },
          ],
          recipe: 'Make dosa from ragi batter, serve hot with sambar.',
          protein: 10,
          carbs: 45,
          fats: 8,
          fiber: 9,
          calories: 300,
          gi: 'Low',
          time: '20 mins',
          tip: 'Ragi is rich in calcium and fiber',
        },
        lunch: {
          name: 'Brown Rice with Sambar and Poriyal',
          mealType: 'lunch',
          ingredients: [
            { item: 'Brown Rice', quantity: 100, unit: 'g' },
            { item: 'Sambar', quantity: 150, unit: 'ml' },
            { item: 'Beans Poriyal', quantity: 100, unit: 'g' },
          ],
          recipe: 'Serve brown rice with hot sambar and vegetable stir-fry.',
          protein: 16,
          carbs: 60,
          fats: 10,
          fiber: 12,
          calories: 380,
          gi: 'Low',
          time: '35 mins',
          tip: 'Fiber-rich meal promotes gut health',
        },
        dinner: {
          name: 'Quinoa Upma with Vegetables',
          mealType: 'dinner',
          ingredients: [
            { item: 'Quinoa', quantity: 60, unit: 'g' },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Cook quinoa with vegetables and South Indian tempering.',
          protein: 14,
          carbs: 48,
          fats: 8,
          fiber: 8,
          calories: 320,
          gi: 'Low',
          time: '25 mins',
          tip: 'Quinoa is a complete protein',
        },
        snack: {
          name: 'Roasted Chana',
          mealType: 'snack',
          ingredients: [{ item: 'Roasted Chickpeas', quantity: 30, unit: 'g' }],
          recipe: 'Enjoy roasted chana with light spices.',
          protein: 8,
          carbs: 18,
          fats: 3,
          fiber: 6,
          calories: 130,
          gi: 'Low',
          time: '2 mins',
          tip: 'High-protein, low-calorie snack',
        },
      },
      'west-india': {
        breakfast: {
          name: 'Gujarati Dhokla with Green Chutney',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Besan (Gram Flour)', quantity: 60, unit: 'g' },
            { item: 'Curd', quantity: 50, unit: 'g' },
            { item: 'Green Chutney', quantity: 30, unit: 'g' },
          ],
          recipe: 'Steam besan batter, temper and serve with chutney.',
          protein: 12,
          carbs: 35,
          fats: 8,
          fiber: 7,
          calories: 270,
          gi: 'Low',
          time: '30 mins',
          tip: 'Besan is protein-rich and low-GI',
        },
        lunch: {
          name: 'Bajra Roti with Gujarati Kadhi',
          mealType: 'lunch',
          ingredients: [
            { item: 'Bajra Flour', quantity: 80, unit: 'g' },
            { item: 'Gujarati Kadhi', quantity: 200, unit: 'ml' },
          ],
          recipe: 'Make bajra roti and serve with tangy kadhi.',
          protein: 14,
          carbs: 52,
          fats: 10,
          fiber: 10,
          calories: 350,
          gi: 'Low',
          time: '40 mins',
          tip: 'Bajra aids in weight management',
        },
        dinner: {
          name: 'Vegetable Handvo',
          mealType: 'dinner',
          ingredients: [
            { item: 'Mixed Lentils', quantity: 70, unit: 'g' },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Bake savory cake with lentils and vegetables.',
          protein: 16,
          carbs: 45,
          fats: 12,
          fiber: 9,
          calories: 340,
          gi: 'Low',
          time: '45 mins',
          tip: 'Combines protein and vegetables perfectly',
        },
        snack: {
          name: 'Roasted Makhana',
          mealType: 'snack',
          ingredients: [{ item: 'Fox Nuts (Makhana)', quantity: 30, unit: 'g' }],
          recipe: 'Roast makhana with light spices.',
          protein: 4,
          carbs: 18,
          fats: 2,
          fiber: 3,
          calories: 110,
          gi: 'Low',
          time: '10 mins',
          tip: 'Low-calorie, filling snack',
        },
      },
      'east-india': {
        breakfast: {
          name: 'Poha with Peanuts',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Beaten Rice (Poha)', quantity: 60, unit: 'g' },
            { item: 'Peanuts', quantity: 20, unit: 'g' },
            { item: 'Vegetables', quantity: 50, unit: 'g' },
          ],
          recipe: 'Cook poha with peanuts and vegetables.',
          protein: 10,
          carbs: 42,
          fats: 12,
          fiber: 6,
          calories: 310,
          gi: 'Low',
          time: '15 mins',
          tip: 'Light and nutritious breakfast',
        },
        lunch: {
          name: 'Brown Rice with Bengali Dal',
          mealType: 'lunch',
          ingredients: [
            { item: 'Brown Rice', quantity: 100, unit: 'g' },
            { item: 'Masoor Dal', quantity: 100, unit: 'g' },
            { item: 'Bengali Style Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Serve rice with dal cooked Bengali style.',
          protein: 18,
          carbs: 58,
          fats: 8,
          fiber: 11,
          calories: 370,
          gi: 'Low',
          time: '35 mins',
          tip: 'Balanced meal with complete protein',
        },
        dinner: {
          name: 'Millet Khichuri',
          mealType: 'dinner',
          ingredients: [
            { item: 'Millets', quantity: 60, unit: 'g' },
            { item: 'Moong Dal', quantity: 40, unit: 'g' },
            { item: 'Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Cook millets and dal together with vegetables.',
          protein: 15,
          carbs: 48,
          fats: 7,
          fiber: 10,
          calories: 315,
          gi: 'Low',
          time: '30 mins',
          tip: 'Easy to digest evening meal',
        },
        snack: {
          name: 'Bhuna Chana',
          mealType: 'snack',
          ingredients: [{ item: 'Roasted Bengal Gram', quantity: 30, unit: 'g' }],
          recipe: 'Enjoy roasted gram with spices.',
          protein: 7,
          carbs: 17,
          fats: 3,
          fiber: 7,
          calories: 125,
          gi: 'Low',
          time: '2 mins',
          tip: 'High-fiber, protein-rich snack',
        },
      },
      'central-india': {
        breakfast: {
          name: 'Jowar Roti with Chutney',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Jowar Flour', quantity: 70, unit: 'g' },
            { item: 'Green Chutney', quantity: 40, unit: 'g' },
          ],
          recipe: 'Make fresh jowar roti and serve with chutney.',
          protein: 10,
          carbs: 44,
          fats: 6,
          fiber: 8,
          calories: 280,
          gi: 'Low',
          time: '20 mins',
          tip: 'Jowar is gluten-free and nutritious',
        },
        lunch: {
          name: 'Bafla with Dal',
          mealType: 'lunch',
          ingredients: [
            { item: 'Whole Wheat Bafla', quantity: 2, unit: 'pieces' },
            { item: 'Panchmel Dal', quantity: 150, unit: 'g' },
          ],
          recipe: 'Serve baked bafla with mixed dal.',
          protein: 16,
          carbs: 54,
          fats: 10,
          fiber: 11,
          calories: 360,
          gi: 'Low',
          time: '45 mins',
          tip: 'Traditional and wholesome meal',
        },
        dinner: {
          name: 'Vegetable Daliya',
          mealType: 'dinner',
          ingredients: [
            { item: 'Broken Wheat (Daliya)', quantity: 60, unit: 'g' },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g' },
          ],
          recipe: 'Cook daliya with vegetables and spices.',
          protein: 12,
          carbs: 50,
          fats: 6,
          fiber: 12,
          calories: 310,
          gi: 'Low',
          time: '25 mins',
          tip: 'High-fiber dinner for better digestion',
        },
        snack: {
          name: 'Roasted Peanuts',
          mealType: 'snack',
          ingredients: [{ item: 'Peanuts', quantity: 25, unit: 'g' }],
          recipe: 'Enjoy roasted peanuts with salt.',
          protein: 7,
          carbs: 8,
          fats: 14,
          fiber: 3,
          calories: 160,
          gi: 'Low',
          time: '2 mins',
          tip: 'Good source of healthy fats',
        },
      },
    };

    return templates[region] || templates['north-india'];
  }

  /**
   * Get fallback day when generation fails
   */
  getFallbackDay(dayNumber, preferences) {
    const templates = this.getRegionalTemplates(preferences.regions?.[0] || 'north-india');
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const meals = [];

    const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    const selectedTypes =
      mealsPerDay === 2
        ? ['breakfast', 'dinner']
        : mealsPerDay === 4
        ? ['breakfast', 'lunch', 'snack', 'dinner']
        : ['breakfast', 'lunch', 'dinner'];

    selectedTypes.forEach((type) => {
      const template = templates[type] || templates.breakfast;
      meals.push({ ...template });
    });

    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

    return {
      dayNumber,
      totalCalories,
      meals,
    };
  }

  /**
   * Get complete fallback plan
   */
  getFallbackPlan(preferences) {
    logger.warn('Using complete fallback plan');
    const duration = parseInt(preferences.duration) || 7;
    const days = [];

    for (let i = 1; i <= duration; i++) {
      days.push(this.getFallbackDay(i, preferences));
    }

    return { days };
  }
}

export const mealPlanChain = new MealPlanChain();
export default mealPlanChain;
