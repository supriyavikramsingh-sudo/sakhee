// server/src/services/serpService.js
import axios from 'axios';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('SERPService');

class SERPService {
  constructor() {
    this.apiKey = env.SERP_API_KEY;
    this.baseURL = 'https://serpapi.com/search';

    // Cache for nutrition data (in-memory, move to Firestore for production)
    this.nutritionCache = new Map();
    this.cacheTTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }

  /**
   * Search for nutritional information about a food item
   */
  async searchNutrition(foodItem, location = 'India') {
    try {
      // Check if API key is configured
      if (!this.apiKey) {
        logger.warn('SERP API key not configured - skipping nutrition fetch', { foodItem });
        return {
          foodItem,
          found: false,
          error: 'SERP API key not configured',
          source: null,
        };
      }

      // Check cache first
      const cacheKey = `${foodItem.toLowerCase()}_${location}`;
      const cached = this.nutritionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.info('✅ Returning cached nutrition data', { foodItem });
        return cached.data;
      }

      // Clean the food item query - remove noise words
      const cleanFoodItem = foodItem
        .toLowerCase()
        .replace(
          /\b(nutrition|nutritional|info|information|share|give|tell|about|on|of|for|the)\b/gi,
          ''
        )
        .trim()
        .replace(/\s+/g, ' '); // Normalize spaces

      logger.info('🔍 Fetching nutrition data from SERP API', {
        originalQuery: foodItem,
        cleanedQuery: cleanFoodItem,
        hasApiKey: !!this.apiKey,
      });

      const query = `${cleanFoodItem} nutrition facts calories protein carbs india`;

      const response = await axios.get(this.baseURL, {
        params: {
          engine: 'google',
          q: query,
          api_key: this.apiKey,
          location: location,
          hl: 'en',
          gl: 'in', // Google domain for India
          num: 10,
        },
      });

      const nutritionData = this.extractNutritionData(response.data, cleanFoodItem);

      // Cache the result
      this.nutritionCache.set(cacheKey, {
        data: nutritionData,
        timestamp: Date.now(),
      });

      logger.info('✅ Nutrition data fetched successfully', {
        originalQuery: foodItem,
        cleanedQuery: cleanFoodItem,
        found: nutritionData.found,
        hasSourceUrl: !!nutritionData.sourceUrl,
      });

      return nutritionData;
    } catch (error) {
      logger.error('❌ SERP API nutrition search failed', {
        error: error.message,
        errorResponse: error.response?.data,
        statusCode: error.response?.status,
        foodItem,
        hasApiKey: !!this.apiKey,
      });

      // Return fallback data structure
      return {
        foodItem,
        found: false,
        error: `Unable to fetch nutrition data: ${error.message}`,
        source: null,
      };
    }
  }

  /**
   * Extract structured nutrition data from SERP results
   */
  extractNutritionData(serpResults, foodItem) {
    try {
      // Log the raw SERP response for debugging
      logger.debug('🔍 Raw SERP Response Structure', {
        hasKnowledgeGraph: !!serpResults.knowledge_graph,
        hasAnswerBox: !!serpResults.answer_box,
        hasOrganicResults: !!serpResults.organic_results,
        knowledgeGraphKeys: serpResults.knowledge_graph
          ? Object.keys(serpResults.knowledge_graph)
          : [],
      });

      // PRIORITY 1: Try organic results FIRST (prefer per-serving trusted sources)
      logger.info('🔍 Checking organic results first for per-serving data');
      const organicData = this.parseOrganicResults(serpResults.organic_results, foodItem);

      logger.info('📊 Organic results parsed:', {
        found: organicData.found,
        servingSize: organicData.servingSize,
        calories: organicData.calories,
        protein: organicData.protein,
        carbs: organicData.carbs,
        fat: organicData.fat,
      });

      if (organicData.found && organicData.servingSize && organicData.servingSize !== '100g') {
        logger.info('✅ Using organic results (has per-serving data)', {
          servingSize: organicData.servingSize,
          source: organicData.source,
        });
        return organicData;
      }

      logger.info(
        '⚠️ Organic results not used (serving size is 100g or not found), checking knowledge graph'
      );

      // PRIORITY 2: Check knowledge graph (usually per 100g, but might have serving_size)
      if (serpResults.knowledge_graph) {
        const kg = serpResults.knowledge_graph;

        // Log knowledge graph structure
        logger.debug('📊 Knowledge Graph Data', {
          hasNutritionFacts: !!kg.nutrition_facts,
          hasNutrition: !!kg.nutrition,
          allKeys: Object.keys(kg),
        });

        // Google often provides nutrition facts in knowledge graph
        if (kg.nutrition_facts || kg.nutrition) {
          const nutritionData = kg.nutrition_facts || kg.nutrition;

          // Log the extracted nutrition data
          const extracted = {
            foodItem,
            found: true,
            servingSize: kg.serving_size || nutritionData.serving_size || '100g',
            calories: this.extractValue(
              nutritionData,
              ['calories', 'energy', 'Energy', 'Calories'],
              kg
            ),
            protein: this.extractValue(nutritionData, ['protein', 'Protein', 'proteins'], kg),
            carbs: this.extractValue(
              nutritionData,
              [
                'carbohydrates',
                'carbs',
                'total_carbohydrate',
                'Carbohydrates',
                'Total Carbohydrate',
              ],
              kg
            ),
            fat: this.extractValue(nutritionData, ['fat', 'total_fat', 'Fat', 'Total Fat'], kg),
            fiber: this.extractValue(
              nutritionData,
              ['fiber', 'dietary_fiber', 'Fiber', 'Dietary Fiber'],
              kg
            ),
            sugar: this.extractValue(nutritionData, ['sugar', 'sugars', 'Sugar', 'Sugars'], kg),
            sodium: this.extractValue(nutritionData, ['sodium', 'Sodium'], kg),
            source: kg.source || 'Google Knowledge Graph',
            sourceUrl: kg.source_url || kg.sourceUrl || null,
          };

          logger.info('✅ Extracted nutrition from knowledge graph', {
            foodItem,
            servingSize: extracted.servingSize,
            calories: extracted.calories,
            protein: extracted.protein,
            carbs: extracted.carbs,
            fat: extracted.fat,
            rawNutritionData: JSON.stringify(nutritionData).substring(0, 200),
          });

          return extracted;
        }
      }

      // PRIORITY 3: Check answer box
      if (serpResults.answer_box) {
        const answerBox = serpResults.answer_box;
        if (answerBox.type === 'nutrition_facts' || answerBox.nutrition) {
          return this.parseAnswerBoxNutrition(answerBox, foodItem);
        }
      }

      // PRIORITY 4: Use organic results even if serving size is 100g (fallback)
      if (organicData.found) {
        logger.warn('⚠️ Using organic results as fallback (may be per 100g)', {
          servingSize: organicData.servingSize,
        });
        return organicData;
      }

      // If no structured data found
      return {
        foodItem,
        found: false,
        message: 'Nutrition data not found in structured format',
        organicResults: serpResults.organic_results
          ?.slice(0, 3)
          .map((r) => ({ title: r.title, snippet: r.snippet, link: r.link })),
      };
    } catch (error) {
      logger.error('Failed to extract nutrition data', { error: error.message });
      return { foodItem, found: false, error: 'Data extraction failed' };
    }
  }

  /**
   * Helper: Extract numeric value from various possible keys
   * Searches in both the provided object and optionally a fallback object
   */
  extractValue(obj, possibleKeys, fallbackObj = null) {
    // Try each possible key in the main object first
    for (const key of possibleKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        const extracted = this.parseNutritionValue(obj[key]);
        if (extracted !== null) {
          logger.debug(`Found ${key}: ${extracted}`, { rawValue: obj[key] });
          return extracted;
        }
      }
    }

    // Try fallback object if provided
    if (fallbackObj) {
      for (const key of possibleKeys) {
        if (fallbackObj[key] !== undefined && fallbackObj[key] !== null) {
          const extracted = this.parseNutritionValue(fallbackObj[key]);
          if (extracted !== null) {
            logger.debug(`Found ${key} in fallback: ${extracted}`, { rawValue: fallbackObj[key] });
            return extracted;
          }
        }
      }
    }

    logger.debug(`No value found for keys: ${possibleKeys.join(', ')}`);
    return null;
  }

  /**
   * Parse nutrition value - handles strings, numbers, and objects
   */
  parseNutritionValue(value) {
    if (value === null || value === undefined) return null;

    // If it's already a number
    if (typeof value === 'number') return value;

    // If it's a string
    if (typeof value === 'string') {
      // Extract numeric value (remove units like 'g', 'mg', 'kcal', 'cal', etc.)
      const match = value.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    }

    // If it's an object with a value property
    if (typeof value === 'object' && value.value !== undefined) {
      return this.parseNutritionValue(value.value);
    }

    return null;
  }

  /**
   * Parse nutrition from answer box
   */
  parseAnswerBoxNutrition(answerBox, foodItem) {
    return {
      foodItem,
      found: true,
      servingSize: answerBox.serving_size || '100g',
      calories: this.extractValue(answerBox, ['calories', 'energy']),
      protein: this.extractValue(answerBox, ['protein']),
      carbs: this.extractValue(answerBox, ['carbohydrates', 'carbs']),
      fat: this.extractValue(answerBox, ['fat', 'total_fat']),
      fiber: this.extractValue(answerBox, ['fiber']),
      sugar: this.extractValue(answerBox, ['sugar']),
      source: 'Google Answer Box',
      sourceUrl: answerBox.link || null,
    };
  }

  /**
   * Parse organic search results for nutrition info
   * Prioritize a single trusted source in deterministic order (Nutritionix, USDA FDC, MyFitnessPal, etc.)
   */
  parseOrganicResults(results, foodItem) {
    if (!results || results.length === 0) {
      return { foodItem, found: false };
    }

    // Deterministic trusted source ranking (higher index = lower priority)
    const trustedDomainsPriority = [
      'nutritionix.com',
      'fdc.nal.usda.gov',
      'myfitnesspal.com',
      'calorieking.com',
      'healthline.com',
      'webmd.com',
    ];

    // Normalize results with domain information
    const normalizedResults = results.map((result) => {
      let domain = '';
      try {
        domain = new URL(result.link).hostname;
      } catch (e) {
        domain = '';
      }
      return { ...result, domain, title: result.title || '', snippet: result.snippet || '' };
    });

    // Try each trusted domain in order and pick the first one that contains valid per-serving nutrition data
    for (const trusted of trustedDomainsPriority) {
      const candidate = normalizedResults.find((r) => r.domain.includes(trusted));
      if (!candidate) continue;

      const snippet = `${candidate.title} ${candidate.snippet}`.toLowerCase();

      // Extract serving size FIRST (most important)
      const servingSizeMatch =
        snippet.match(/serving size:?\s*([^.]+?)(?:\n|$|calories)/i) ||
        snippet.match(
          /amount per serving.*?(\d+\s*(?:cookie|piece|cup|bowl|slice|tbsp|oz)(?:\s*\(\d+g\))?)/i
        ) ||
        snippet.match(
          /(\d+\s*(?:cookie|piece|cup|bowl|slice|tbsp|oz)(?:\s*\(\d+\s*g\))?)\s*\(\d+g\)/i
        ) ||
        snippet.match(/per\s+(\d+\s*(?:cookie|piece|cup|bowl|slice|tbsp|oz))/i);

      let servingSize = servingSizeMatch ? servingSizeMatch[1].trim() : '100g';
      servingSize = servingSize.replace(/[,.]$/, '');

      // Extract calories and macros using safer patterns (avoid false matches)
      const caloriesMatch =
        snippet.match(/calories\s*:?\s*(\d{2,3})(?!\s*calorie)/i) ||
        snippet.match(/(\d{2,3})\s*cal(?:ories)?(?:\s|$)/i) ||
        snippet.match(/amount per serving.*?(\d{2,3})\s*cal/i);

      const protein =
        snippet.match(/protein[\s:]+(\d+\.?\d*)g/i) || snippet.match(/(\d+\.?\d*)g\s+protein/i);
      const carbs =
        snippet.match(/(?:total\s+)?carbohydrate[s]?[\s:]+(\d+\.?\d*)g/i) ||
        snippet.match(/(\d+\.?\d*)g\s+(?:total\s+)?carb/i);
      const fat =
        snippet.match(/(?:total\s+)?fat[\s:]+(\d+\.?\d*)g/i) ||
        snippet.match(/(\d+\.?\d*)g\s+(?:total\s+)?fat/i);

      const caloriesValue = caloriesMatch ? parseFloat(caloriesMatch[1]) : null;
      const proteinValue = protein ? parseFloat(protein[1]) : null;
      const carbsValue = carbs ? parseFloat(carbs[1]) : null;
      const fatValue = fat ? parseFloat(fat[1]) : null;

      const hasValidData = caloriesValue && (proteinValue || carbsValue || fatValue);
      const isReasonableCalories = caloriesValue && caloriesValue < 1000;

      if (hasValidData && isReasonableCalories) {
        const extractedData = {
          foodItem,
          found: true,
          servingSize,
          calories: caloriesValue,
          protein: proteinValue,
          carbs: carbsValue,
          fat: fatValue,
          source: candidate.title || trusted,
          sourceUrl: candidate.link,
          organicResults: normalizedResults
            .slice(0, 3)
            .map((r) => ({ title: r.title, snippet: r.snippet, link: r.link })),
        };

        logger.info('✅ Extracted nutrition from trusted organic result', {
          foodItem,
          trustedDomain: trusted,
          servingSize: extractedData.servingSize,
          calories: extractedData.calories,
          protein: extractedData.protein,
          carbs: extractedData.carbs,
          fat: extractedData.fat,
          sourceUrl: extractedData.sourceUrl,
        });

        return extractedData;
      }
    }

    logger.warn('⚠️ No trustworthy per-serving nutrition data found in organic results', {
      foodItem,
    });
    return {
      foodItem,
      found: false,
      organicResults: normalizedResults
        .slice(0, 3)
        .map((r) => ({ title: r.title, snippet: r.snippet, link: r.link })),
    };
  }

  /**
   * Search for PCOS-related health information
   */
  async searchHealthInfo(query, location = 'India') {
    try {
      logger.info('Searching health info', { query });

      const response = await axios.get(this.baseURL, {
        params: {
          engine: 'google',
          q: `${query} PCOS India`,
          api_key: this.apiKey,
          location: location,
          hl: 'en',
          gl: 'in',
          num: 10,
        },
      });

      // Extract relevant health information
      const results = this.parseHealthResults(response.data);

      return results;
    } catch (error) {
      logger.error('Health info search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse health-related search results
   */
  parseHealthResults(serpResults) {
    const results = {
      query: serpResults.search_parameters?.q,
      knowledgeGraph: null,
      answerBox: null,
      organicResults: [],
    };

    // Knowledge graph (for symptoms, conditions, etc.)
    if (serpResults.knowledge_graph) {
      results.knowledgeGraph = {
        title: serpResults.knowledge_graph.title,
        type: serpResults.knowledge_graph.type,
        description: serpResults.knowledge_graph.description,
        source: serpResults.knowledge_graph.source,
      };
    }

    // Answer box (quick facts)
    if (serpResults.answer_box) {
      results.answerBox = {
        title: serpResults.answer_box.title,
        snippet: serpResults.answer_box.snippet || serpResults.answer_box.answer,
        source: serpResults.answer_box.source,
      };
    }

    // Organic results (prioritize medical sources)
    const medicalDomains = [
      'nih.gov',
      'who.int',
      'mayoclinic.org',
      'healthline.com',
      'webmd.com',
      'medicalnewstoday.com',
      'ncbi.nlm.nih.gov',
      'health.harvard.edu',
      'clevelandclinic.org',
    ];

    if (serpResults.organic_results) {
      results.organicResults = serpResults.organic_results
        .map((result) => ({
          title: result.title,
          snippet: result.snippet,
          link: result.link,
          domain: new URL(result.link).hostname,
          isMedicalSource: medicalDomains.some((domain) => result.link.includes(domain)),
        }))
        .sort((a, b) => b.isMedicalSource - a.isMedicalSource)
        .slice(0, 5);
    }

    return results;
  }

  /**
   * Get nutritional comparison between foods
   */
  async compareNutrition(food1, food2) {
    try {
      const [data1, data2] = await Promise.all([
        this.searchNutrition(food1),
        this.searchNutrition(food2),
      ]);

      if (!data1.found || !data2.found) {
        return {
          success: false,
          message: 'Unable to fetch complete nutrition data for comparison',
        };
      }

      return {
        success: true,
        comparison: {
          [food1]: data1,
          [food2]: data2,
          differences: {
            calories: (data1.calories || 0) - (data2.calories || 0),
            protein: (data1.protein || 0) - (data2.protein || 0),
            carbs: (data1.carbs || 0) - (data2.carbs || 0),
            fat: (data1.fat || 0) - (data2.fat || 0),
          },
        },
      };
    } catch (error) {
      logger.error('Nutrition comparison failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Search for meal recipes with nutrition info
   */
  async searchRecipes(dishName, dietary = 'vegetarian', location = 'India') {
    try {
      const query = `${dishName} ${dietary} recipe nutrition india`;

      const response = await axios.get(this.baseURL, {
        params: {
          engine: 'google',
          q: query,
          api_key: this.apiKey,
          location: location,
          hl: 'en',
          gl: 'in',
          num: 5,
        },
      });

      const recipes =
        response.data.organic_results?.map((result) => ({
          title: result.title,
          snippet: result.snippet,
          link: result.link,
          domain: new URL(result.link).hostname,
        })) || [];

      return { dishName, recipes, count: recipes.length };
    } catch (error) {
      logger.error('Recipe search failed', { error: error.message });
      return { dishName, recipes: [], count: 0 };
    }
  }

  /**
   * Clear nutrition cache (for maintenance)
   */
  clearCache() {
    const size = this.nutritionCache.size;
    this.nutritionCache.clear();
    logger.info(`Cleared nutrition cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return { size: this.nutritionCache.size, entries: Array.from(this.nutritionCache.keys()) };
  }
}

export const serpService = new SERPService();
export default serpService;
