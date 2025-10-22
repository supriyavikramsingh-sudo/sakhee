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
    const retrievalResults = await this.performMultiStageRetrieval(preferences, healthContext);

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

    // ===== STEP 1: MULTI-STAGE RAG RETRIEVAL (ENHANCED) =====
    logger.info('Performing multi-stage RAG retrieval');

    const mealTemplatesContext = retriever.formatContextFromResults(mealTemplates);

    // ===== STEP 2: RETRIEVE PCOS NUTRITION GUIDELINES =====
    const nutritionQuery = this.buildNutritionQuery(healthContext);
    logger.info('Retrieving PCOS nutrition guidelines', { query: nutritionQuery });

    const nutritionGuidelines = await retriever.retrieve(nutritionQuery, { topK: 5 });
    const nutritionContext = retriever.formatContextFromResults(nutritionGuidelines);

    // ===== STEP 3: RETRIEVE SYMPTOM-SPECIFIC RECOMMENDATIONS =====
    // (Now handled by multi-stage retrieval above)

    // ===== STEP 4: BUILD COMPREHENSIVE CONTEXT =====
    // ===== STEP 3: RETRIEVE SYMPTOM-SPECIFIC RECOMMENDATIONS =====
    // (Now handled by multi-stage retrieval above)

    // ===== STEP 4: BUILD COMPREHENSIVE CONTEXT =====
    let enhancedContext = '';

    if (mealTemplatesContext) {
      enhancedContext += '📋 MEAL TEMPLATES FROM KNOWLEDGE BASE:\n';
      enhancedContext += '(Use these as inspiration and adapt to user preferences)\n\n';
      enhancedContext += mealTemplatesContext + '\n\n';
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
        const labContext = labGuidanceDocs
          .map((doc) => doc.pageContent || doc.content)
          .join('\n\n');

        enhancedContext += '🔬 LAB MARKER-SPECIFIC GUIDANCE:\n';
        enhancedContext += '(Address these abnormal lab values through ingredient selection)\n\n';
        enhancedContext += labContext + '\n\n';
      }

      // NEW: Add ingredient substitutes
      if (ingredientSubstituteDocs.length > 0) {
        const substituteContext = ingredientSubstituteDocs
          .map((doc) => doc.pageContent || doc.content)
          .join('\n\n');

        enhancedContext += '� INGREDIENT SUBSTITUTION GUIDE:\n';
        enhancedContext += '(Use these to modify non-PCOS-friendly meals from templates)\n\n';
        enhancedContext += substituteContext + '\n\n';
      }

      // NEW: Add lab-specific guidance
      if (labGuidanceDocs.length > 0) {
        const labContext = labGuidanceDocs
          .map((doc) => doc.pageContent || doc.content)
          .join('\n\n');

        enhancedContext += '🔬 LAB MARKER-SPECIFIC GUIDANCE:\n';
        enhancedContext += '(Address these abnormal lab values through ingredient selection)\n\n';
        enhancedContext += labContext + '\n\n';
      }

      // NEW: Add ingredient substitutes
      if (ingredientSubstituteDocs.length > 0) {
        const substituteContext = ingredientSubstituteDocs
          .map((doc) => doc.pageContent || doc.content)
          .join('\n\n');

        enhancedContext += '� INGREDIENT SUBSTITUTION GUIDE:\n';
        enhancedContext += '(Use these to modify non-PCOS-friendly meals from templates)\n\n';
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

      const response = await this.structuredLLM.invoke(prompt);
      const rawContent = response.content || response;

      logger.info('LLM response received', { responseLength: rawContent.length });

      // ===== STEP 8: PARSE AND VALIDATE =====
      let parsed = this.parseJSON(rawContent);

      if (!parsed || !this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.warn('Invalid structure detected, attempting fix');
        parsed = this.fixStructure(parsed, duration, mealsPerDay);
      }

      if (!parsed || !this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.error('Structure validation failed after fixes');
        throw new Error('Invalid meal plan structure');
      }

      // ===== STEP 9: VALIDATE AND ADJUST CALORIES =====
      this.validateAndAdjustCalories(parsed);

      // ===== STEP 10: COMPILE RAG METADATA (ENHANCED) =====
      // ===== STEP 10: COMPILE RAG METADATA (ENHANCED) =====
      const ragMetadata = {
        mealTemplates: mealTemplates.length,
        nutritionGuidelines: nutritionGuidelines.length,
        symptomGuidance: symptomGuidanceDocs.length, // NEW
        labGuidance: labGuidanceDocs.length, // NEW
        ingredientSubstitutes: ingredientSubstituteDocs.length, // NEW
        symptomRecommendations: symptomGuidanceDocs.length > 0,
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
      });

      return {
        ...parsed,
        ragMetadata,
      };
    }
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

      // ===== STAGE 1: Retrieve meal templates =====
      logger.info('Stage 1: Retrieving meal templates');
      if (cuisines.length > 0) {
        const templateQueries = cuisines.flatMap((cuisine) => [
          `${cuisine} traditional authentic breakfast regional ${dietType}`,
          `${cuisine} traditional authentic lunch regional ${dietType}`,
          `${cuisine} traditional authentic dinner regional ${dietType}`,
          `${cuisine} traditional authentic snacks regional ${dietType}`,
        ]);

        for (const query of templateQueries) {
          const results = await retriever.retrieve(query, 5);

          // ⭐ FILTER: For vegan/vegetarian, exclude non-veg dishes
          const filteredResults = results.filter((doc) => {
            const content = (doc.pageContent || doc.content || '').toLowerCase();

            if (dietType === 'vegan') {
              // Exclude meat, dairy, eggs
              const nonVeganKeywords = [
                'chicken',
                'mutton',
                'pork',
                'fish',
                'egg',
                'meat',
                'paneer',
                'cheese',
                'milk',
                'curd',
                'yogurt',
                'ghee',
                'butter',
                'cream',
              ];
              return !nonVeganKeywords.some((keyword) => content.includes(keyword));
            } else if (dietType === 'vegetarian') {
              // Exclude meat, fish, eggs
              const nonVegKeywords = [
                'chicken',
                'mutton',
                'pork',
                'fish',
                'egg',
                'meat',
                'non-vegetarian',
              ];
              return !nonVegKeywords.some((keyword) => content.includes(keyword));
            }

            return true; // Allow all for non-veg
          });

          logger.info(
            `  Query: "${query}" - Retrieved ${results.length}, filtered to ${filteredResults.length} ${dietType} meals`
          );
          retrievalResults.mealTemplates.push(...filteredResults);
        }
      }

      // ===== STAGE 2: Retrieve symptom-specific guidance =====
      logger.info('Stage 2: Retrieving symptom guidance');
      const symptoms = healthContext?.symptoms || [];

      if (symptoms.length > 0) {
        const primarySymptoms = symptoms.slice(0, 3);

        for (const symptom of primarySymptoms) {
          // ⭐ IMPROVED: More specific query to target symptom_guidance docs
          const query = `${symptom} PCOS dietary recommendations nutrition foods`;
          logger.info(`  Querying symptom: "${query}"`);

          const results = await retriever.retrieve(query, 5);

          // Log what we got
          logger.info(`  Retrieved ${results.length} results`);
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
          retrievalResults.symptomGuidance.push(...symptomDocs);
        }

        logger.info(`Total symptom guidance docs: ${retrievalResults.symptomGuidance.length}`);
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

        for (const marker of abnormalMarkers) {
          // ⭐ IMPROVED: More specific query
          const query = `${marker.name} PCOS dietary guidance nutrition recommendations`;
          logger.info(`  Querying lab marker: "${query}"`);

          const results = await retriever.retrieve(query, 5);

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
          retrievalResults.labGuidance.push(...labDocs);
        }

        logger.info(`Total lab guidance docs: ${retrievalResults.labGuidance.length}`);
      } else {
        logger.info('No abnormal lab markers detected - skipping Stage 3');
      }

      // ===== STAGE 4: Retrieve ingredient substitutes =====
      logger.info('Stage 4: Identifying problematic ingredients and retrieving substitutes');
      const problematicIngredients = this.identifyProblematicIngredients(
        retrievalResults.mealTemplates
      );

      if (problematicIngredients.length > 0) {
        logger.info(`Found ${problematicIngredients.length} problematic ingredients`);

        // Limit to top 8 most important
        const topIngredients = problematicIngredients.slice(0, 8);

        for (const ingredient of topIngredients) {
          // ⭐ IMPROVED: More specific query targeting substitutes
          const query = `${ingredient} PCOS substitute alternative ${dietType}`;
          logger.info(`  Querying substitute: "${query}"`);

          const results = await retriever.retrieve(query, 5);

          // Log what we got
          const types = results.map((r) => r.metadata?.type).filter(Boolean);
          logger.info(`  Retrieved types: ${types.join(', ')}`);

          // ⭐ FIX: More lenient filtering for substitutes - accept multiple types
          const substituteDocs = results.filter((doc) => {
            const type = doc.metadata?.type;

            // Exclude meal templates
            if (type === 'meal_template') return false;

            // Accept any medical/nutritional content
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

        logger.info(`Total substitute docs: ${retrievalResults.ingredientSubstitutes.length}`);
      }

      // ===== FINAL SUMMARY =====
      logger.info('Multi-stage retrieval complete', {
        mealTemplates: retrievalResults.mealTemplates.length,
        symptomGuidance: retrievalResults.symptomGuidance.length,
        labGuidance: retrievalResults.labGuidance.length,
        ingredientSubstitutes: retrievalResults.ingredientSubstitutes.length,
      });

      return retrievalResults;
    } catch (error) {
      logger.error('Multi-stage retrieval failed', { error: error.message, stack: error.stack });
      return retrievalResults;
    }
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

    // Restrictions
    if (preferences.restrictions && preferences.restrictions.length > 0) {
      context += `⚠️ DIETARY RESTRICTIONS:\n`;
      preferences.restrictions.forEach((r) => {
        context += `  - Avoid ${r}\n`;
      });
      context += '\n';
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
    let prompt = `You are an expert nutritionist specializing in PCOS management and Indian cuisine.\n\n`;

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
    }/day using affordable, locally available ingredients.\n`;

    // ⭐ Add exclusion list if this is a continuation chunk
    if (preferences.excludeMeals && preferences.excludeMeals.length > 0) {
      prompt += `\n🚫 DO NOT USE THESE MEALS (already used in previous days):\n`;
      prompt += preferences.excludeMeals.map((m) => `- ${m}`).join('\n');
      prompt += `\n\n`;
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

    prompt += `REQUIREMENTS:\n`;
    prompt += `1. Each meal must include:\n`;
    prompt += `   - name: Meal name (mention cuisine if multi-cuisine)\n`;
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
      prompt += `2. ⭐⭐⭐ REGIONAL AUTHENTICITY (CRITICAL):\n`;
      prompt += `   - ONLY use dishes that are AUTHENTIC to ${preferences.cuisines.join(
        ' and '
      )} cuisine\n`;
      prompt += `   - DO NOT use generic pan-Indian dishes like Poha, Upma, Idli, Dosa, or Chilla UNLESS they are explicitly mentioned in the RAG meal templates for this cuisine\n`;
      prompt += `   - Use the EXACT dish names from the RAG meal templates provided above\n`;
      prompt += `   - If you see dishes like "Dhuska", "Rugra Bhurji", "Thekua", "Sattu", "Handia" in the templates, USE THOSE instead of generic alternatives\n`;
      prompt += `   - Each cuisine has unique traditional dishes - honor them!\n\n`;
    }

    // ⭐ NEW: Add strict diet type enforcement
    const dietType = preferences.dietType || 'vegetarian';
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
      prompt += `   - If a traditional dish contains animal products, you MUST adapt it to be 100% vegan\n`;
      prompt += `   - Example: Naga pork dishes → use tofu/mushrooms/jackfruit instead\n`;
      prompt += `   - THIS IS THE MOST IMPORTANT CONSTRAINT - NEVER VIOLATE IT!\n\n`;
    } else if (dietType === 'vegetarian') {
      prompt += `2b. 🚨 VEGETARIAN DIET REQUIREMENT (STRICT):\n`;
      prompt += `   - The user is STRICTLY VEGETARIAN\n`;
      prompt += `   - ABSOLUTELY NO meat, fish, or eggs:\n`;
      prompt += `     ❌ NO chicken, mutton, pork, beef, lamb, fish, seafood, eggs\n`;
      prompt += `   - Dairy is ALLOWED: paneer, milk, curd, ghee, butter, cheese\n`;
      prompt += `   - If a traditional dish contains meat/fish/eggs, you MUST adapt it to be vegetarian\n\n`;
    } else if (dietType === 'eggetarian') {
      prompt += `2b. EGGETARIAN DIET:\n`;
      prompt += `   - Eggs are ALLOWED\n`;
      prompt += `   - NO meat, fish, or poultry\n`;
      prompt += `   - Dairy is ALLOWED\n\n`;
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

    prompt += `4. Target ~2000 kcal per day total (adjust based on activity level)\n`;
    prompt += `5. Focus on low-GI foods, high fiber, lean protein, healthy fats\n`;
    prompt += `6. ⭐ BUDGET: Strictly stay within ₹${
      preferences.budget || 300
    }/day. Choose affordable ingredients like seasonal vegetables, whole grains, lentils, local proteins.\n`;
    prompt += `7. ⭐ MEAL TEMPLATES: Use the meal templates from RAG context as your BASE, but ENHANCE them:\n`;
    prompt += `   - Start with the dish name and core ingredients from the template\n`;
    prompt += `   - ADD complementary ingredients to make it more nutritious and PCOS-friendly\n`;
    prompt += `   - Use the ingredient substitute guidance to swap any problematic ingredients\n`;
    prompt += `   - Add seasonings, garnishes, and side dishes that are authentic to the cuisine\n`;
    prompt += `   - Example: If template says "Poha" with basic ingredients, add curry leaves, peanuts, vegetables, lemon\n`;
    prompt += `8. ⭐ VARIETY: Each meal must be UNIQUE. Do NOT repeat the same dish across different days. Use different recipes for each day.\n`;
    prompt += `9. Include variety in ingredients and preparation methods\n`;
    prompt += `10. Consider Indian meal timing and portion sizes\n`;
    prompt += `11. Use regional, seasonal, and easily available ingredients\n\n`;

    prompt += `PCOS NUTRITIONAL PRIORITIES:\n`;
    prompt += `- Protein: 25-30% of calories\n`;
    prompt += `- Complex carbs: 40-45% (low-GI only)\n`;
    prompt += `- Healthy fats: 25-30%\n`;
    prompt += `- Fiber: 25-30g per day\n`;
    prompt += `- Avoid: refined sugar, white rice, maida, processed foods\n\n`;

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
   * Validate and adjust daily calories to ~2000 kcal
   */
  validateAndAdjustCalories(mealPlan) {
    const target = 2000;
    const tolerance = 200;

    mealPlan.days.forEach((day, dayIndex) => {
      let dailyTotal = day.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

      if (Math.abs(dailyTotal - target) > tolerance) {
        logger.warn(`Day ${dayIndex + 1} calories out of range: ${dailyTotal} kcal`);

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
      }

      day.totalCalories = dailyTotal;
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
