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
      // Check cache first
      const cacheKey = `${foodItem.toLowerCase()}_${location}`;
      const cached = this.nutritionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.info('Returning cached nutrition data', { foodItem });
        return cached.data;
      }

      logger.info('Fetching nutrition data from SERP API', { foodItem });

      const query = `${foodItem} nutrition facts calories protein carbs india`;

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

      const nutritionData = this.extractNutritionData(response.data, foodItem);

      // Cache the result
      this.nutritionCache.set(cacheKey, {
        data: nutritionData,
        timestamp: Date.now(),
      });

      return nutritionData;
    } catch (error) {
      logger.error('SERP API nutrition search failed', {
        error: error.message,
        foodItem,
      });

      // Return fallback data structure
      return {
        foodItem,
        found: false,
        error: 'Unable to fetch nutrition data',
        source: null,
      };
    }
  }

  /**
   * Extract structured nutrition data from SERP results
   */
  extractNutritionData(serpResults, foodItem) {
    try {
      // Check for knowledge graph (Google's structured data)
      if (serpResults.knowledge_graph) {
        const kg = serpResults.knowledge_graph;

        // Google often provides nutrition facts in knowledge graph
        if (kg.nutrition_facts || kg.nutrition) {
          return {
            foodItem,
            found: true,
            servingSize: kg.serving_size || '100g',
            calories: this.extractValue(kg, ['calories', 'energy']),
            protein: this.extractValue(kg, ['protein']),
            carbs: this.extractValue(kg, ['carbohydrates', 'carbs', 'total_carbohydrate']),
            fat: this.extractValue(kg, ['fat', 'total_fat']),
            fiber: this.extractValue(kg, ['fiber', 'dietary_fiber']),
            sugar: this.extractValue(kg, ['sugar', 'sugars']),
            sodium: this.extractValue(kg, ['sodium']),
            source: kg.source || 'Google Knowledge Graph',
            sourceUrl: kg.source_url || null,
          };
        }
      }

      // Check answer box
      if (serpResults.answer_box) {
        const answerBox = serpResults.answer_box;
        if (answerBox.type === 'nutrition_facts' || answerBox.nutrition) {
          return this.parseAnswerBoxNutrition(answerBox, foodItem);
        }
      }

      // Parse from organic results
      const organicData = this.parseOrganicResults(serpResults.organic_results, foodItem);
      if (organicData.found) {
        return organicData;
      }

      // If no structured data found
      return {
        foodItem,
        found: false,
        message: 'Nutrition data not found in structured format',
        organicResults: serpResults.organic_results?.slice(0, 3).map((r) => ({
          title: r.title,
          snippet: r.snippet,
          link: r.link,
        })),
      };
    } catch (error) {
      logger.error('Failed to extract nutrition data', { error: error.message });
      return {
        foodItem,
        found: false,
        error: 'Data extraction failed',
      };
    }
  }

  /**
   * Helper: Extract numeric value from various possible keys
   */
  extractValue(obj, possibleKeys) {
    for (const key of possibleKeys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        // Extract numeric value (remove units like 'g', 'mg', 'kcal')
        const value = String(obj[key]).match(/[\d.]+/);
        return value ? parseFloat(value[0]) : obj[key];
      }
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
   */
  parseOrganicResults(results, foodItem) {
    if (!results || results.length === 0) {
      return { foodItem, found: false };
    }

    // Look for trusted nutrition sources
    const trustedDomains = [
      'nutritionix.com',
      'fdc.nal.usda.gov',
      'healthline.com',
      'webmd.com',
      'myfitnesspal.com',
      'calorieking.com',
    ];

    for (const result of results) {
      const domain = new URL(result.link).hostname;

      if (trustedDomains.some((trusted) => domain.includes(trusted))) {
        // Extract numbers from snippet
        const snippet = result.snippet || '';
        const calories = snippet.match(/(\d+)\s*cal/i);
        const protein = snippet.match(/(\d+\.?\d*)\s*g.*protein/i);
        const carbs = snippet.match(/(\d+\.?\d*)\s*g.*(carb|carbohydrate)/i);
        const fat = snippet.match(/(\d+\.?\d*)\s*g.*fat/i);

        if (calories) {
          return {
            foodItem,
            found: true,
            servingSize: '100g',
            calories: calories[1] ? parseFloat(calories[1]) : null,
            protein: protein && protein[1] ? parseFloat(protein[1]) : null,
            carbs: carbs && carbs[1] ? parseFloat(carbs[1]) : null,
            fat: fat && fat[1] ? parseFloat(fat[1]) : null,
            source: result.title,
            sourceUrl: result.link,
          };
        }
      }
    }

    return { foodItem, found: false };
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
        .sort((a, b) => b.isMedicalSource - a.isMedicalSource) // Prioritize medical sources
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

      return {
        dishName,
        recipes,
        count: recipes.length,
      };
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
    return {
      size: this.nutritionCache.size,
      entries: Array.from(this.nutritionCache.keys()),
    };
  }
}

export const serpService = new SERPService();
export default serpService;
