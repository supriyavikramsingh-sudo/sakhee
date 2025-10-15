// server/src/langchain/chains/mealPlanChain.js
import { ChatOpenAI } from '@langchain/openai';
import { env } from '../../config/env.js';
import { retriever } from '../retriever.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('MealPlanChain');

class MealPlanChain {
  constructor() {
    // Create dedicated LLM for structured output with JSON mode enabled
    this.structuredLLM = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.8,
      maxTokens: 8192,
      openAIApiKey: env.OPENAI_API_KEY,
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    });
  }

  /**
   * Main entry point for meal plan generation with RAG
   */
  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan with RAG-enhanced context', {
        duration: preferences.duration,
        region: preferences.region,
        dietType: preferences.dietType,
        budget: preferences.budget,
        mealsPerDay: preferences.mealsPerDay,
        restrictions: preferences.restrictions,
        cuisines: preferences.cuisines,
      });

      const duration = parseInt(preferences.duration) || 7;

      // For reliability, cap at 3 days per request
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
   * Generate meal plan with RAG context retrieval
   */
  async generateWithRAG(preferences) {
    const duration = parseInt(preferences.duration) || 3;
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const restrictions = preferences.restrictions || [];
    const cuisines = preferences.cuisines || [];
    const healthContext = preferences.healthContext || {};
    const userOverrides = preferences.userOverrides || {};

    logger.info('Fetching RAG context for meal generation', {
      restrictions: restrictions.length,
      cuisines: cuisines.length,
      hasSymptoms: !!healthContext.symptoms?.length,
      hasMedicalData: !!healthContext.medicalData,
    });

    // ===== STEP 1: RETRIEVE MEAL TEMPLATES FROM VECTOR STORE =====
    const mealTemplateQuery = this.buildMealTemplateQuery(preferences, healthContext);
    logger.info('Retrieving meal templates', { query: mealTemplateQuery });

    const mealTemplates = await retriever.retrieve(mealTemplateQuery, { topK: 8 });
    const mealTemplatesContext = retriever.formatContextFromResults(mealTemplates);

    // ===== STEP 2: RETRIEVE PCOS NUTRITION GUIDELINES =====
    const nutritionQuery = this.buildNutritionQuery(healthContext);
    logger.info('Retrieving PCOS nutrition guidelines', { query: nutritionQuery });

    const nutritionGuidelines = await retriever.retrieve(nutritionQuery, { topK: 5 });
    const nutritionContext = retriever.formatContextFromResults(nutritionGuidelines);

    // ===== STEP 3: RETRIEVE SYMPTOM-SPECIFIC RECOMMENDATIONS =====
    let symptomContext = '';
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      const symptomQuery = `PCOS dietary recommendations for ${healthContext.symptoms.join(
        ' '
      )} management`;
      logger.info('Retrieving symptom-specific recommendations', { query: symptomQuery });

      const symptomDocs = await retriever.retrieve(symptomQuery, { topK: 3 });
      symptomContext = retriever.formatContextFromResults(symptomDocs);
    }

    // ===== STEP 4: BUILD COMPREHENSIVE CONTEXT =====
    let enhancedContext = '';

    if (mealTemplatesContext) {
      enhancedContext += '📋 MEAL TEMPLATES FROM KNOWLEDGE BASE:\n';
      enhancedContext += '(Use these as inspiration and adapt to user preferences)\n\n';
      enhancedContext += mealTemplatesContext + '\n\n';
    }

    if (nutritionContext) {
      enhancedContext += '🥗 PCOS NUTRITION GUIDELINES:\n';
      enhancedContext += nutritionContext + '\n\n';
    }

    if (symptomContext) {
      enhancedContext += '💊 SYMPTOM-SPECIFIC DIETARY RECOMMENDATIONS:\n';
      enhancedContext += symptomContext + '\n\n';
    }

    if (!enhancedContext) {
      logger.warn('No RAG context retrieved, using fallback guidelines');
      enhancedContext = this.getFallbackGuidelines();
    }

    // ===== STEP 5: BUILD USER-SPECIFIC CONTEXT =====
    const userContext = this.buildUserContext(
      preferences,
      restrictions,
      cuisines,
      healthContext,
      userOverrides
    );

    // ===== STEP 6: CREATE COMPREHENSIVE PROMPT =====
    const caloriesPerMeal = Math.round(2000 / mealsPerDay);
    const calorieRange = Math.round(caloriesPerMeal * 0.15); // 15% flexibility

    const prompt = `Generate a ${duration}-day PCOS-friendly meal plan using the evidence-based knowledge below.

${enhancedContext}

${userContext}

CRITICAL REQUIREMENTS:
- All meals must strictly adhere to PCOS nutrition guidelines provided above
- Use meal templates from knowledge base as inspiration, but create NEW variations
- All meals must include exact protein, carb, fat grams, calories, and glycemic index (Low/Medium/High)
- Calculate calories accurately using: (protein × 4) + (carbs × 4) + (fats × 9)

⚠️ CALORIE DISTRIBUTION REQUIREMENT (MANDATORY):
- EACH DAY must total approximately 2000 kcal across all meals
- With ${mealsPerDay} meals per day, each meal should be approximately ${caloriesPerMeal} kcal (range: ${
      caloriesPerMeal - calorieRange
    }-${caloriesPerMeal + calorieRange} kcal)
- Example distribution for ${mealsPerDay} meals: ${this.getCalorieDistributionExample(mealsPerDay)}
- Verify that the sum of all meal calories for each day equals 1900-2100 kcal
- Adjust portion sizes and ingredients to meet this target while maintaining PCOS-friendly guidelines

- Generate DIVERSE meals - do NOT repeat dishes across any days
- Provide a quick cooking tip for each meal
- Format output EXACTLY as the provided JSON structure
- Ensure variety in ingredients to meet nutritional and culinary diversity

REQUIRED JSON STRUCTURE:

{
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Dish Name",
          "ingredients": ["item1 - 50g", "item2 - 30g"],
          "protein": 15,
          "carbs": 20,
          "fats": 5,
          "calories": 185,
          "gi": "Low",
          "time": "15 mins",
          "tip": "Cooking tip"
        }
      ]
    }
  ]
}

Generate ${duration} days with ${mealsPerDay} meals each day.`;

    try {
      const response = await this.structuredLLM.invoke(prompt);
      const content = response.content || response.text || '';
      logger.info('RAG-enhanced structured response received', {
        length: content.length,
        sourcesUsed: {
          mealTemplates: mealTemplates.length,
          nutritionGuidelines: nutritionGuidelines.length,
          symptomRecommendations: symptomContext ? true : false,
        },
      });

      const parsed = JSON.parse(content);

      if (this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.info('✅ RAG-enhanced meal plan validation passed');

        // Validate and adjust calorie totals
        this.validateAndAdjustCalories(parsed, mealsPerDay);

        // Attach RAG metadata for transparency
        parsed.ragMetadata = {
          mealTemplatesUsed: mealTemplates.length,
          nutritionGuidelinesUsed: nutritionGuidelines.length,
          symptomSpecificRecommendations: !!symptomContext,
          retrievalQuality: this.assessRetrievalQuality(mealTemplates, nutritionGuidelines),
        };

        return parsed;
      }

      logger.warn('RAG-enhanced structured output validation failed, attempting fix');
      const fixed = this.fixStructure(parsed, duration, mealsPerDay);
      if (fixed) {
        fixed.ragMetadata = {
          mealTemplatesUsed: mealTemplates.length,
          nutritionGuidelinesUsed: nutritionGuidelines.length,
          structureFixed: true,
        };
        return fixed;
      }

      throw new Error('Invalid structure after cleanup');
    } catch (error) {
      logger.error('RAG-enhanced generation failed', { error: error.message });
      return this.getFallbackPlan(preferences);
    }
  }

  /**
   * Get calorie distribution example based on meals per day
   */
  getCalorieDistributionExample(mealsPerDay) {
    const distributions = {
      2: 'Breakfast: 900-1000 kcal, Dinner: 900-1000 kcal',
      3: 'Breakfast: 500-600 kcal, Lunch: 700-800 kcal, Dinner: 600-700 kcal',
      4: 'Breakfast: 450-500 kcal, Lunch: 550-600 kcal, Snack: 200-250 kcal, Dinner: 550-600 kcal',
    };
    return distributions[mealsPerDay] || distributions[3];
  }

  /**
   * Validate and adjust calories to ensure daily totals meet ~2000 kcal target
   */
  validateAndAdjustCalories(plan, mealsPerDay) {
    const targetCalories = 2000;
    const minCalories = 1900;
    const maxCalories = 2100;

    plan.days.forEach((day, dayIndex) => {
      // Calculate total calories for the day
      let dailyTotal = day.meals.reduce((sum, meal) => {
        const calories =
          meal.calories || Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
        return sum + calories;
      }, 0);

      logger.info(`Day ${dayIndex + 1} total calories: ${dailyTotal} kcal`);

      // If total is significantly off target, adjust proportionally
      if (dailyTotal < minCalories || dailyTotal > maxCalories) {
        logger.warn(
          `Day ${
            dayIndex + 1
          } calories (${dailyTotal}) outside target range (${minCalories}-${maxCalories}), adjusting...`
        );

        const scaleFactor = targetCalories / dailyTotal;

        // First pass: scale macros
        day.meals.forEach((meal) => {
          meal.protein = Math.round(meal.protein * scaleFactor);
          meal.carbs = Math.round(meal.carbs * scaleFactor);
          meal.fats = Math.round(meal.fats * scaleFactor);
          meal.calories = Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
        });

        // Recalculate total after scaling
        dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);

        // Second pass: fine-tune to hit exact target by adjusting carbs in largest meal
        const difference = targetCalories - dailyTotal;
        if (Math.abs(difference) > 0) {
          // Find the meal with most calories to adjust
          const largestMeal = day.meals.reduce((max, meal) =>
            meal.calories > max.calories ? meal : max
          );

          // Adjust carbs (4 kcal per gram) to meet target
          const carbAdjustment = Math.round(difference / 4);
          largestMeal.carbs = Math.max(5, largestMeal.carbs + carbAdjustment);
          largestMeal.calories = Math.round(
            largestMeal.protein * 4 + largestMeal.carbs * 4 + largestMeal.fats * 9
          );

          // Final total
          dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
        }

        logger.info(`Day ${dayIndex + 1} adjusted total: ${dailyTotal} kcal`);
      } else {
        logger.info(`✅ Day ${dayIndex + 1} calories within target range`);
      }
    });
  }

  /**
   * Build meal template retrieval query
   */
  buildMealTemplateQuery(preferences, healthContext) {
    const parts = [];

    // Region and cuisine
    if (preferences.region) {
      parts.push(preferences.region.replace('-', ' '));
    }
    if (preferences.cuisines && preferences.cuisines.length > 0) {
      parts.push(preferences.cuisines.join(' '));
    }

    // Diet type
    if (preferences.dietType) {
      parts.push(preferences.dietType);
    }

    // Health goals
    if (healthContext.goals && healthContext.goals.length > 0) {
      parts.push(healthContext.goals.join(' '));
    }

    // Symptoms (for targeted meals)
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      const symptomKeywords = healthContext.symptoms.map((s) => s.replace('-', ' ')).join(' ');
      parts.push(symptomKeywords);
    }

    parts.push('PCOS meal templates breakfast lunch dinner snacks');

    return parts.join(' ');
  }

  /**
   * Build nutrition guidelines retrieval query
   */
  buildNutritionQuery(healthContext) {
    const parts = ['PCOS nutrition guidelines'];

    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      parts.push('for', healthContext.symptoms.join(' '));
    }

    if (healthContext.goals && healthContext.goals.length > 0) {
      parts.push(healthContext.goals.join(' '));
    }

    parts.push('low glycemic index hormone balance insulin resistance');

    return parts.join(' ');
  }

  /**
   * Build user-specific context section
   */
  buildUserContext(preferences, restrictions, cuisines, healthContext, userOverrides) {
    let context = 'USER PREFERENCES:\n';
    context += `- Region: ${preferences.region}\n`;
    context += `- Diet Type: ${preferences.dietType}\n`;
    context += `- Budget: ₹${preferences.budget}/day\n`;
    context += `- Meals per day: ${preferences.mealsPerDay}\n`;

    if (restrictions.length > 0) {
      context += '\n⚠️ DIETARY RESTRICTIONS (MUST AVOID):\n';
      restrictions.forEach((r) => {
        context += `- ${r}\n`;
      });
    }

    if (cuisines.length > 0) {
      context += '\nPREFERRED CUISINES:\n';
      cuisines.forEach((c) => {
        context += `- ${c}\n`;
      });
    }

    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      context += '\n🎯 HEALTH FOCUS (addressing PCOS symptoms):\n';
      const symptomMap = {
        'irregular-periods': 'hormone-balancing foods (flaxseeds, leafy greens, sesame seeds)',
        acne: 'anti-inflammatory foods (turmeric, berries, green tea, omega-3)',
        'weight-changes': 'metabolism-boosting foods (green tea, whole grains, protein-rich foods)',
        'hair-loss': 'iron and biotin-rich foods (spinach, nuts, eggs, lentils)',
        fatigue: 'energy-boosting foods (complex carbs, proteins, iron-rich vegetables)',
        'mood-swings': 'mood-stabilizing foods (omega-3, magnesium-rich foods, whole grains)',
      };

      healthContext.symptoms.forEach((s) => {
        const recommendation = symptomMap[s];
        if (recommendation) {
          context += `- ${s.replace('-', ' ')}: ${recommendation}\n`;
        }
      });
    }

    if (healthContext.goals && healthContext.goals.length > 0) {
      context += '\nUSER GOALS:\n';
      const goalMap = {
        'regularize-periods': 'Include cycle-regulating foods',
        'weight-management': 'Focus on portion control and low-calorie options',
        'skin-hair': 'Add biotin and antioxidant-rich foods',
        'balance-hormones': 'Include hormone-balancing seeds and greens',
        fertility: 'Focus on fertility-supporting nutrients',
        'mood-energy': 'Include mood-stabilizing and energizing foods',
      };

      healthContext.goals.forEach((g) => {
        const guidance = goalMap[g];
        if (guidance) {
          context += `- ${g.replace('-', ' ')}: ${guidance}\n`;
        }
      });
    }

    if (healthContext.medicalData) {
      context += '\n📊 MEDICAL REPORT INSIGHTS:\n';
      context += 'Consider nutritional needs based on recent lab work.\n';

      const { labValues } = healthContext.medicalData;
      if (labValues) {
        if (labValues.insulin || labValues.glucose) {
          context += '- Focus on low-GI foods to manage blood sugar\n';
        }
        if (labValues.testosterone) {
          context += '- Include anti-androgenic foods (spearmint tea, flaxseeds)\n';
        }
        if (labValues.cholesterol || labValues.triglycerides) {
          context += '- Heart-healthy fats and fiber-rich foods\n';
        }
      }
    }

    if (healthContext.activityLevel) {
      context += `\nACTIVITY LEVEL: ${healthContext.activityLevel}\n`;
      const activityMap = {
        sedentary: 'Moderate portions, focus on nutrient density',
        light: 'Balanced macros with moderate carbs',
        moderate: 'Slightly higher protein for recovery',
        very: 'Increased protein and complex carbs for sustained energy',
      };
      context += activityMap[healthContext.activityLevel] || '';
      context += '\n';
    }

    if (userOverrides.region || userOverrides.dietType) {
      context += `\n⚠️ USER OVERRIDE: User specifically selected this ${
        userOverrides.region ? 'region' : ''
      }${userOverrides.region && userOverrides.dietType ? ' and ' : ''}${
        userOverrides.dietType ? 'diet type' : ''
      } for this plan. Prioritize these preferences.\n`;
    }

    return context;
  }

  /**
   * Get fallback PCOS guidelines when RAG retrieval fails
   */
  getFallbackGuidelines() {
    return `PCOS NUTRITION GUIDELINES (fallback):
- Low Glycemic Index (GI < 55) for blood sugar management
- Anti-inflammatory spices: turmeric, cinnamon, ginger
- Hormone-balancing: flaxseeds, sesame seeds, leafy greens
- Adequate protein (15-20g per meal) for satiety
- Healthy fats: nuts, seeds, olive oil, avocado
- High fiber: vegetables, whole grains, legumes
- Limit refined carbs, sugary foods, and processed items
`;
  }

  /**
   * Assess quality of RAG retrieval
   */
  assessRetrievalQuality(mealTemplates, nutritionGuidelines) {
    const totalDocs = mealTemplates.length + nutritionGuidelines.length;

    if (totalDocs === 0) return 'none';
    if (totalDocs < 3) return 'low';
    if (totalDocs < 8) return 'medium';
    return 'high';
  }

  /**
   * Generate in chunks for longer durations
   */
  async generateInChunks(preferences) {
    logger.info('Generating in 3-day chunks with RAG for reliability');

    const duration = parseInt(preferences.duration) || 7;
    const allDays = [];
    const chunkSize = 3;

    for (let startDay = 1; startDay <= duration; startDay += chunkSize) {
      const endDay = Math.min(startDay + chunkSize - 1, duration);
      const chunkDuration = endDay - startDay + 1;

      try {
        const chunkPrefs = {
          ...preferences,
          duration: chunkDuration,
          startDay,
        };

        const chunk = await this.generateWithRAG(chunkPrefs);

        if (chunk && chunk.days) {
          chunk.days.forEach((day, idx) => {
            day.dayNumber = startDay + idx;
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
   * Validate meal plan structure
   */
  validateStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed || typeof parsed !== 'object') {
        logger.debug('Validation failed: not an object');
        return false;
      }

      const days = parsed.days;
      if (!Array.isArray(days)) {
        logger.debug('Validation failed: days not an array');
        return false;
      }
      if (days.length === 0) {
        logger.debug('Validation failed: days array empty');
        return false;
      }

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day.meals || !Array.isArray(day.meals)) {
          logger.debug(`Validation failed: day ${i} has no meals array`);
          return false;
        }
        if (day.meals.length === 0) {
          logger.debug(`Validation failed: day ${i} meals array empty`);
          return false;
        }

        for (let j = 0; j < day.meals.length; j++) {
          const meal = day.meals[j];
          const required = ['mealType', 'name', 'ingredients'];
          for (const field of required) {
            if (!(field in meal)) {
              logger.debug(`Validation failed: day ${i} meal ${j} missing ${field}`);
              return false;
            }
          }
        }
      }

      logger.info('✅ Validation passed', { daysCount: days.length });
      return true;
    } catch (e) {
      logger.debug('Validation error', { error: e.message });
      return false;
    }
  }

  /**
   * Fix structure issues
   */
  fixStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed.days) {
        logger.debug('Attempting to fix structure - days missing');
        const alternativeKeys = ['mealPlan', 'plan', 'data', 'schedule', 'menu'];

        for (const key of alternativeKeys) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            logger.info(`Found alternative key: ${key}, restructuring`);
            parsed[key].forEach((item, idx) => {
              if (item.day && !item.dayNumber) {
                item.dayNumber = item.day;
                delete item.day;
              }
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

        return null;
      }

      parsed.days.forEach((day, idx) => {
        if (day.day && !day.dayNumber) {
          day.dayNumber = day.day;
          delete day.day;
        }
        if (!day.dayNumber) {
          day.dayNumber = idx + 1;
        }
      });

      parsed.days.forEach((day) => {
        day.meals.forEach((meal) => {
          if (!meal.gi) meal.gi = 'Low';
          if (!meal.time) meal.time = '20 mins';
          if (!meal.tip) meal.tip = 'Enjoy fresh';
          if (!meal.ingredients) meal.ingredients = [];
          if (typeof meal.protein !== 'number') meal.protein = 10;
          if (typeof meal.carbs !== 'number') meal.carbs = 20;
          if (typeof meal.fats !== 'number') meal.fats = 5;
          // Calculate calories if not provided: (protein × 4) + (carbs × 4) + (fats × 9)
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
   * Get fallback day (used when RAG fails)
   */
  getFallbackDay(dayNumber, preferences) {
    const templates = this.getRegionalTemplates(preferences.region);
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const meals = [];

    const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    const selectedTypes =
      mealsPerDay === 2
        ? ['breakfast', 'dinner']
        : mealsPerDay === 4
        ? ['breakfast', 'lunch', 'snack', 'dinner']
        : ['breakfast', 'lunch', 'dinner'];

    selectedTypes.forEach((type, idx) => {
      const typeTemplates = templates[type] || templates.breakfast;
      const template = typeTemplates[(dayNumber + idx) % typeTemplates.length];

      meals.push({
        mealType: type.charAt(0).toUpperCase() + type.slice(1),
        ...template,
        gi: 'Low',
        time: '20 mins',
        tip: 'Fresh and healthy',
      });
    });

    // Adjust meals to meet 2000 kcal target
    const currentTotal = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const targetCalories = 2000;

    if (currentTotal > 0 && Math.abs(currentTotal - targetCalories) > 200) {
      const scaleFactor = targetCalories / currentTotal;
      meals.forEach((meal) => {
        meal.protein = Math.round(meal.protein * scaleFactor);
        meal.carbs = Math.round(meal.carbs * scaleFactor);
        meal.fats = Math.round(meal.fats * scaleFactor);
        meal.calories = Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
      });
      logger.info(
        `Fallback day ${dayNumber} adjusted from ${currentTotal} to ~${targetCalories} kcal`
      );
    }

    return { dayNumber, meals };
  }

  /**
   * Get hardcoded regional templates (fallback)
   * Templates designed to total ~2000 kcal per day (breakfast ~550, lunch ~750, dinner ~700)
   */
  getRegionalTemplates(region) {
    const templates = {
      'north-india': {
        breakfast: [
          {
            name: 'Besan Chilla with Curd',
            ingredients: ['120g besan', '1 onion', '1 tomato', '100g curd'],
            protein: 25,
            carbs: 45,
            fats: 12,
            calories: 384,
          },
          {
            name: 'Moong Dal Chilla with Vegetables',
            ingredients: ['120g moong dal', 'vegetables', '1 tbsp oil'],
            protein: 28,
            carbs: 50,
            fats: 10,
            calories: 410,
          },
        ],
        lunch: [
          {
            name: 'Dal Tadka with Rice and Vegetables',
            ingredients: ['100g dal', '80g rice', 'vegetables', '2 roti'],
            protein: 25,
            carbs: 95,
            fats: 12,
            calories: 596,
          },
        ],
        snack: [
          {
            name: 'Roasted Chana with Nuts',
            ingredients: ['70g chana', '15g almonds', 'spices'],
            protein: 15,
            carbs: 30,
            fats: 10,
            calories: 270,
          },
        ],
        dinner: [
          {
            name: 'Vegetable Khichdi with Paneer',
            ingredients: ['70g rice', '70g dal', 'vegetables', '80g paneer'],
            protein: 28,
            carbs: 75,
            fats: 15,
            calories: 555,
          },
        ],
      },
      'south-india': {
        breakfast: [
          {
            name: 'Ragi Dosa with Sambar',
            ingredients: ['100g ragi', '30g urad dal', 'sambar', 'chutney'],
            protein: 18,
            carbs: 65,
            fats: 10,
            calories: 422,
          },
        ],
        lunch: [
          {
            name: 'Sambar Rice with Vegetables',
            ingredients: ['80g rice', '70g dal', 'vegetables', 'ghee'],
            protein: 20,
            carbs: 95,
            fats: 15,
            calories: 615,
          },
        ],
        snack: [
          {
            name: 'Sundal with Coconut',
            ingredients: ['80g chickpeas', 'coconut', 'curry leaves'],
            protein: 16,
            carbs: 35,
            fats: 8,
            calories: 276,
          },
        ],
        dinner: [
          {
            name: 'Ragi Mudde with Sambar',
            ingredients: ['130g ragi', 'sambar', 'vegetables'],
            protein: 18,
            carbs: 80,
            fats: 8,
            calories: 488,
          },
        ],
      },
      // Add more regions as needed
    };

    return templates[region] || templates['north-india'];
  }

  /**
   * Get complete fallback plan
   */
  getFallbackPlan(preferences) {
    logger.info('Using complete fallback meal plan (no RAG)');
    const duration = parseInt(preferences.duration) || 7;
    const days = [];

    for (let i = 1; i <= duration; i++) {
      days.push(this.getFallbackDay(i, preferences));
    }

    return {
      days,
      fallback: true,
      message: 'Using pre-designed PCOS-friendly templates (RAG unavailable)',
    };
  }
}

export const mealPlanChain = new MealPlanChain();
export default mealPlanChain;
