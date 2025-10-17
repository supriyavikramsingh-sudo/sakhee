// server/src/langchain/chains/mealPlanChain.js
import { ChatOpenAI } from '@langchain/openai';
import { env } from '../../config/env.js';
import { retriever } from '../retriever.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('MealPlanChain');

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
  }

  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan with RAG-enhanced context + lab values', {
        duration: preferences.duration,
        region: preferences.region,
        dietType: preferences.dietType,
        hasLabValues: !!preferences.healthContext?.medicalData?.labValues,
      });

      const duration = parseInt(preferences.duration) || 7;

      if (duration > 3) {
        return await this.generateInChunks(preferences);
      }

      return await this.generateWithRAG(preferences);
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message, stack: error.stack });
      return this.getFallbackPlan(preferences);
    }
  }

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
      hasLabValues: !!healthContext.medicalData?.labValues,
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

    // ===== STEP 3: RETRIEVE LAB-SPECIFIC DIETARY GUIDANCE FROM RAG =====
    let labSpecificContext = '';
    let labGuidanceDocs = [];

    if (healthContext.medicalData?.labValues) {
      const labGuidanceQuery = this.buildLabGuidanceQuery(healthContext.medicalData.labValues);

      if (labGuidanceQuery) {
        logger.info('Retrieving lab-specific dietary guidance from RAG', {
          query: labGuidanceQuery,
          labCount: Object.keys(healthContext.medicalData.labValues).length,
        });

        labGuidanceDocs = await retriever.retrieve(labGuidanceQuery, { topK: 10 });
        labSpecificContext = retriever.formatContextFromResults(labGuidanceDocs);

        logger.info('Lab-specific guidance retrieved', {
          docsRetrieved: labGuidanceDocs.length,
          contextLength: labSpecificContext.length,
        });
      }
    }

    // ===== STEP 4: RETRIEVE SYMPTOM-SPECIFIC RECOMMENDATIONS =====
    let symptomContext = '';
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      const symptomQuery = `PCOS dietary recommendations for ${healthContext.symptoms.join(
        ' '
      )} management`;
      logger.info('Retrieving symptom-specific recommendations', { query: symptomQuery });

      const symptomDocs = await retriever.retrieve(symptomQuery, { topK: 3 });
      symptomContext = retriever.formatContextFromResults(symptomDocs);
    }

    // ===== STEP 5: BUILD COMPREHENSIVE CONTEXT =====
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

    // ===== NEW: ADD LAB-SPECIFIC GUIDANCE SECTION =====
    if (labSpecificContext) {
      enhancedContext += '🔬 LAB-SPECIFIC DIETARY GUIDANCE:\n';
      enhancedContext += "(Evidence-based food recommendations based on user's lab values)\n\n";
      enhancedContext += labSpecificContext + '\n\n';
    }

    if (symptomContext) {
      enhancedContext += '💊 SYMPTOM-SPECIFIC DIETARY RECOMMENDATIONS:\n';
      enhancedContext += symptomContext + '\n\n';
    }

    if (!enhancedContext) {
      logger.warn('No RAG context retrieved, using fallback guidelines');
      enhancedContext = this.getFallbackGuidelines();
    }

    // ===== STEP 6: BUILD USER-SPECIFIC CONTEXT WITH LAB VALUES =====
    const userContext = this.buildUserContextWithLabs(
      preferences,
      restrictions,
      cuisines,
      healthContext,
      userOverrides
    );

    // ===== STEP 7: CREATE COMPREHENSIVE PROMPT WITH LAB INTEGRATION =====
    const caloriesPerMeal = Math.round(2000 / mealsPerDay);
    const calorieRange = Math.round(caloriesPerMeal * 0.15);

    const prompt = `Generate a ${duration}-day PCOS-friendly meal plan using the evidence-based knowledge below.

${enhancedContext}

${userContext}

CRITICAL REQUIREMENTS:
- All meals must strictly adhere to PCOS nutrition guidelines provided above
- **PRIORITIZE lab-specific dietary guidance** from the knowledge base based on user's medical report
- Use meal templates as inspiration, but create NEW variations
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
          labGuidance: labGuidanceDocs.length,
          symptomRecommendations: symptomContext ? true : false,
        },
      });

      const parsed = JSON.parse(content);

      if (this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.info('✅ RAG-enhanced meal plan validation passed');

        this.validateAndAdjustCalories(parsed, mealsPerDay);

        // Enhanced RAG metadata with lab guidance tracking
        parsed.ragMetadata = {
          mealTemplatesUsed: mealTemplates.length,
          nutritionGuidelinesUsed: nutritionGuidelines.length,
          labGuidanceUsed: labGuidanceDocs.length, // NEW
          symptomSpecificRecommendations: !!symptomContext,
          retrievalQuality: this.assessRetrievalQuality(
            mealTemplates,
            nutritionGuidelines,
            labGuidanceDocs
          ),
        };

        return parsed;
      }

      logger.warn('RAG-enhanced structured output validation failed, attempting fix');
      const fixed = this.fixStructure(parsed, duration, mealsPerDay);
      if (fixed) {
        fixed.ragMetadata = {
          mealTemplatesUsed: mealTemplates.length,
          nutritionGuidelinesUsed: nutritionGuidelines.length,
          labGuidanceUsed: labGuidanceDocs.length,
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
   * NEW: Build lab-specific guidance query from medical report lab values
   */
  buildLabGuidanceQuery(labValues) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return null;
    }

    const queryParts = [];
    const labParams = [];

    // Process each lab value and build targeted queries
    Object.entries(labValues).forEach(([labName, labData]) => {
      if (!labData || !labData.value) return;

      const severity = labData.severity || 'unknown';

      // Only query for abnormal values or values that need dietary attention
      if (severity !== 'normal' && severity !== 'optimal' && severity !== 'unknown') {
        // Map lab names to query terms
        const labQueryMap = {
          glucose_fasting: 'glucose fasting blood sugar',
          insulin_fasting: 'insulin fasting',
          homa_ir: 'HOMA-IR insulin resistance',
          hba1c: 'HbA1c hemoglobin A1c',
          cholesterol_total: 'total cholesterol',
          triglycerides: 'triglycerides',
          hdl_cholesterol: 'HDL cholesterol',
          ldl_cholesterol: 'LDL cholesterol',
          testosterone_total: 'testosterone total',
          testosterone_free: 'free testosterone',
          dheas: 'DHEA-S',
          lh: 'LH luteinizing hormone',
          fsh: 'FSH follicle stimulating hormone',
          lh_fsh_ratio: 'LH FSH ratio',
          prolactin: 'prolactin',
          amh: 'AMH anti-mullerian hormone',
          tsh: 'TSH thyroid',
          t3_free: 'free T3 thyroid',
          t4_free: 'free T4 thyroid',
          vitamin_d: 'vitamin D',
          vitamin_b12: 'vitamin B12',
          iron: 'iron serum',
          ferritin: 'ferritin',
          crp: 'CRP inflammation',
          cortisol: 'cortisol stress',
        };

        const queryTerm = labQueryMap[labName];
        if (queryTerm) {
          queryParts.push(queryTerm);
          labParams.push(`${labName} ${severity}`);
        }
      }
    });

    if (queryParts.length === 0) {
      logger.info('No abnormal lab values found, using general PCOS nutrition query');
      return 'PCOS nutrition guidelines dietary recommendations';
    }

    // Build comprehensive query focusing on dietary guidance
    const query = `LAB ${queryParts.join(
      ' '
    )} SEVERITY dietary focus Indian ingredients substitutes PCOS`;

    logger.info('Built lab guidance query', {
      query,
      abnormalLabs: labParams,
      labCount: queryParts.length,
    });

    return query;
  }

  /**
   * Enhanced user context builder that includes lab values interpretation
   */
  buildUserContextWithLabs(preferences, restrictions, cuisines, healthContext, userOverrides) {
    let context = 'USER PREFERENCES:\n';
    context += `- Region: ${preferences.region}\n`;
    context += `- Diet Type: ${preferences.dietType}\n`;
    context += `- Budget: ₹${preferences.budget}/day\n`;
    context += `- Meals per day: ${preferences.mealsPerDay}\n`;

    if (restrictions.length > 0) {
      context += '\n⚠️ DIETARY RESTRICTIONS (MUST AVOID):\n';
      restrictions.forEach((r) => (context += `- ${r}\n`));
    }

    if (cuisines.length > 0) {
      context += '\nPREFERRED CUISINES:\n';
      cuisines.forEach((c) => (context += `- ${c}\n`));
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

    // ===== NEW: ADD DETAILED LAB VALUES INTERPRETATION =====
    if (healthContext.medicalData?.labValues) {
      context += '\n📊 MEDICAL REPORT LAB VALUES (Use RAG guidance for these):\n';
      context +=
        '**CRITICAL: Refer to the "LAB-SPECIFIC DIETARY GUIDANCE" section above for evidence-based food recommendations**\n\n';

      const labValues = healthContext.medicalData.labValues;
      const categorizedLabs = this.categorizeLabs(labValues);

      // Metabolic markers (highest priority)
      if (categorizedLabs.metabolic.length > 0) {
        context += '🔴 METABOLIC MARKERS (HIGH PRIORITY):\n';
        categorizedLabs.metabolic.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context += 'Action: Focus on low-GI foods, increase fiber, reduce refined carbs\n\n';
      }

      // Hormonal markers
      if (categorizedLabs.hormonal.length > 0) {
        context += '⚠️ HORMONAL MARKERS:\n';
        categorizedLabs.hormonal.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context +=
          'Action: Include hormone-balancing foods (flaxseeds, spearmint, cruciferous veg)\n\n';
      }

      // Lipid profile
      if (categorizedLabs.lipid.length > 0) {
        context += '💊 LIPID PROFILE:\n';
        categorizedLabs.lipid.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context +=
          'Action: Heart-healthy fats (nuts, seeds, fish), increase fiber, reduce saturated fats\n\n';
      }

      // Nutritional deficiencies
      if (categorizedLabs.nutritional.length > 0) {
        context += '🥗 NUTRITIONAL STATUS:\n';
        categorizedLabs.nutritional.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context +=
          'Action: Include nutrient-rich foods, consider food sources for deficiencies\n\n';
      }

      // Inflammation markers
      if (categorizedLabs.inflammation.length > 0) {
        context += '🔥 INFLAMMATION MARKERS:\n';
        categorizedLabs.inflammation.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context += 'Action: Anti-inflammatory foods (turmeric, ginger, omega-3, berries)\n\n';
      }

      // Thyroid markers
      if (categorizedLabs.thyroid.length > 0) {
        context += '🦋 THYROID MARKERS:\n';
        categorizedLabs.thyroid.forEach((lab) => {
          context += `- ${this.formatLabName(lab.name)}: ${lab.value} ${
            lab.unit
          } [${lab.severity.toUpperCase()}]\n`;
        });
        context += 'Action: Iodine-rich (iodized salt), selenium (lentils, eggs), zinc sources\n\n';
      }

      context +=
        '**NOTE: The RAG system has retrieved specific dietary recommendations for these lab values. Use them to personalize meal plan.**\n';
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
   * NEW: Categorize lab values by health domain for better interpretation
   */
  categorizeLabs(labValues) {
    const categories = {
      metabolic: [],
      hormonal: [],
      lipid: [],
      nutritional: [],
      inflammation: [],
      thyroid: [],
    };

    const categoryMap = {
      // Metabolic
      glucose_fasting: 'metabolic',
      insulin_fasting: 'metabolic',
      homa_ir: 'metabolic',
      hba1c: 'metabolic',

      // Hormonal
      testosterone_total: 'hormonal',
      testosterone_free: 'hormonal',
      dheas: 'hormonal',
      lh: 'hormonal',
      fsh: 'hormonal',
      lh_fsh_ratio: 'hormonal',
      prolactin: 'hormonal',
      amh: 'hormonal',
      estradiol: 'hormonal',
      progesterone: 'hormonal',

      // Lipid
      cholesterol_total: 'lipid',
      triglycerides: 'lipid',
      hdl_cholesterol: 'lipid',
      ldl_cholesterol: 'lipid',
      vldl_cholesterol: 'lipid',

      // Nutritional
      vitamin_d: 'nutritional',
      vitamin_b12: 'nutritional',
      iron: 'nutritional',
      ferritin: 'nutritional',
      tibc: 'nutritional',
      transferrin_saturation: 'nutritional',

      // Inflammation
      crp: 'inflammation',
      cortisol: 'inflammation',

      // Thyroid
      tsh: 'thyroid',
      t3_free: 'thyroid',
      t4_free: 'thyroid',
    };

    Object.entries(labValues).forEach(([labName, labData]) => {
      if (!labData || !labData.value) return;

      const category = categoryMap[labName];
      const severity = labData.severity || 'unknown';

      // Only include abnormal values
      if (category && severity !== 'normal' && severity !== 'optimal') {
        categories[category].push({
          name: labName,
          value: labData.value,
          unit: labData.unit || '',
          severity: severity,
        });
      }
    });

    return categories;
  }

  /**
   * NEW: Format lab names for human readability
   */
  formatLabName(labName) {
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
   * Enhanced retrieval quality assessment including lab guidance
   */
  assessRetrievalQuality(mealTemplates, nutritionGuidelines, labGuidanceDocs = []) {
    const totalDocs = mealTemplates.length + nutritionGuidelines.length + labGuidanceDocs.length;

    if (totalDocs === 0) return 'none';
    if (totalDocs < 3) return 'low';
    if (totalDocs < 8) return 'medium';
    if (totalDocs < 15) return 'high';
    return 'excellent';
  }

  // ... [Keep all existing methods: generateInChunks, validateStructure, fixStructure, etc.]
  // ... [Keep: getCalorieDistributionExample, validateAndAdjustCalories, etc.]
  // ... [Keep: buildMealTemplateQuery, buildNutritionQuery, etc.]
  // ... [Keep: getFallbackGuidelines, getRegionalTemplates, getFallbackPlan, etc.]

  getCalorieDistributionExample(mealsPerDay) {
    const distributions = {
      2: 'Breakfast: 900-1000 kcal, Dinner: 900-1000 kcal',
      3: 'Breakfast: 500-600 kcal, Lunch: 700-800 kcal, Dinner: 600-700 kcal',
      4: 'Breakfast: 450-500 kcal, Lunch: 550-600 kcal, Snack: 200-250 kcal, Dinner: 550-600 kcal',
    };
    return distributions[mealsPerDay] || distributions[3];
  }

  validateAndAdjustCalories(plan, mealsPerDay) {
    const targetCalories = 2000;
    const minCalories = 1900;
    const maxCalories = 2100;

    plan.days.forEach((day, dayIndex) => {
      let dailyTotal = day.meals.reduce((sum, meal) => {
        const calories =
          meal.calories || Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
        return sum + calories;
      }, 0);

      logger.info(`Day ${dayIndex + 1} total calories: ${dailyTotal} kcal`);

      if (dailyTotal < minCalories || dailyTotal > maxCalories) {
        logger.warn(
          `Day ${dayIndex + 1} calories (${dailyTotal}) outside target range, adjusting...`
        );

        const scaleFactor = targetCalories / dailyTotal;
        day.meals.forEach((meal) => {
          meal.protein = Math.round(meal.protein * scaleFactor);
          meal.carbs = Math.round(meal.carbs * scaleFactor);
          meal.fats = Math.round(meal.fats * scaleFactor);
          meal.calories = Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9);
        });

        dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
        const difference = targetCalories - dailyTotal;

        if (Math.abs(difference) > 0) {
          const largestMeal = day.meals.reduce((max, meal) =>
            meal.calories > max.calories ? meal : max
          );
          const carbAdjustment = Math.round(difference / 4);
          largestMeal.carbs = Math.max(5, largestMeal.carbs + carbAdjustment);
          largestMeal.calories = Math.round(
            largestMeal.protein * 4 + largestMeal.carbs * 4 + largestMeal.fats * 9
          );
          dailyTotal = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
        }

        logger.info(`Day ${dayIndex + 1} adjusted total: ${dailyTotal} kcal`);
      }
    });
  }

  buildMealTemplateQuery(preferences, healthContext) {
    const parts = [];
    if (preferences.region) parts.push(preferences.region.replace('-', ' '));
    if (preferences.cuisines?.length) parts.push(preferences.cuisines.join(' '));
    if (preferences.dietType) parts.push(preferences.dietType);
    if (healthContext.goals?.length) parts.push(healthContext.goals.join(' '));
    if (healthContext.symptoms?.length) {
      parts.push(healthContext.symptoms.map((s) => s.replace('-', ' ')).join(' '));
    }
    parts.push('PCOS meal templates breakfast lunch dinner snacks');
    return parts.join(' ');
  }

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

  fixStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

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

    selectedTypes.forEach((type) => {
      const template = templates[type]?.[0] || {
        name: 'Simple PCOS meal',
        ingredients: ['vegetables', 'protein', 'whole grains'],
        protein: 15,
        carbs: 30,
        fats: 8,
        calories: 245,
      };

      meals.push({
        mealType: type.charAt(0).toUpperCase() + type.slice(1),
        name: template.name,
        ingredients: template.ingredients,
        protein: template.protein,
        carbs: template.carbs,
        fats: template.fats,
        calories: template.calories,
        gi: 'Low',
        time: '20 mins',
        tip: 'Prepare fresh for best results',
      });
    });

    return {
      dayNumber,
      meals,
    };
  }

  getRegionalTemplates(region) {
    const templates = {
      'north-india': {
        breakfast: [
          {
            name: 'Besan Chilla with Vegetables',
            ingredients: ['100g besan flour', 'onion', 'tomato', 'coriander', '1 tsp oil'],
            protein: 18,
            carbs: 45,
            fats: 12,
            calories: 360,
          },
        ],
        lunch: [
          {
            name: 'Rajma with Brown Rice',
            ingredients: ['100g rajma', '80g brown rice', 'spices', 'ghee'],
            protein: 22,
            carbs: 85,
            fats: 12,
            calories: 548,
          },
        ],
        snack: [
          {
            name: 'Roasted Chana with Vegetables',
            ingredients: ['80g roasted chana', 'cucumber', 'tomato', 'lemon'],
            protein: 18,
            carbs: 40,
            fats: 6,
            calories: 286,
          },
        ],
        dinner: [
          {
            name: 'Palak Paneer with Roti',
            ingredients: ['150g spinach', '80g paneer', '2 whole wheat roti', 'ghee'],
            protein: 24,
            carbs: 60,
            fats: 18,
            calories: 510,
          },
        ],
      },
      'south-india': {
        breakfast: [
          {
            name: 'Ragi Dosa with Sambar',
            ingredients: ['100g ragi flour', '50g urad dal', 'sambar', 'coconut chutney'],
            protein: 16,
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
    };

    return templates[region] || templates['north-india'];
  }

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
