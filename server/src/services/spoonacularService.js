// server/src/services/spoonacularService.js
import axios from 'axios';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { retriever } from '../langchain/retriever.js';

const logger = new Logger('SpoonacularService');

class SpoonacularService {
  constructor() {
    this.apiKey = env.SPOONACULAR_API_KEY;
    this.baseURL = 'https://api.spoonacular.com';

    // Cache for nutrition data (in-memory with 30-day TTL)
    this.nutritionCache = new Map();
    this.nutritionCacheTTL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Cache for recipe data (in-memory with 24-hour TTL)
    this.recipeCache = new Map();
    this.recipeCacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Rate limit tracking: userId → {count, resetAt}
    this.rateLimits = new Map();
  }

  /**
   * Search for nutritional information about a food item
   * Replaces SERP nutrition lookup with Spoonacular
   *
   * @param {string} foodItem - Food item to search for
   * @param {string} location - User location (default: 'India')
   * @returns {Object} Nutrition data in standardized format
   */
  async searchNutrition(foodItem, location = 'India') {
    try {
      // Check if API key is configured
      if (!this.validateApiKey()) {
        logger.warn('Spoonacular API key not configured - skipping nutrition fetch', { foodItem });
        return {
          foodItem,
          found: false,
          error: 'Spoonacular API key not configured',
          source: null,
        };
      }

      // Check cache first
      const cacheKey = `${foodItem.toLowerCase()}_${location}`;
      const cached = this.nutritionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.nutritionCacheTTL) {
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

      logger.info('🔍 Fetching nutrition data from Spoonacular API', {
        originalQuery: foodItem,
        cleanedQuery: cleanFoodItem,
        hasApiKey: !!this.apiKey,
      });

      // Try ingredient search first
      const ingredientData = await this.searchIngredientNutrition(cleanFoodItem);

      if (ingredientData.found) {
        // Cache the result
        this.nutritionCache.set(cacheKey, {
          data: ingredientData,
          timestamp: Date.now(),
        });

        logger.info('✅ Nutrition data fetched from ingredient search', {
          originalQuery: foodItem,
          cleanedQuery: cleanFoodItem,
          found: ingredientData.found,
        });

        return ingredientData;
      }

      // Fallback to recipe search if ingredient not found
      logger.info('⚠️ Ingredient not found, trying recipe search', { cleanFoodItem });
      const recipeData = await this.searchRecipeNutrition(cleanFoodItem, location);

      // Cache the result
      this.nutritionCache.set(cacheKey, {
        data: recipeData,
        timestamp: Date.now(),
      });

      logger.info('✅ Nutrition data fetched from recipe search', {
        originalQuery: foodItem,
        cleanedQuery: cleanFoodItem,
        found: recipeData.found,
      });

      return recipeData;
    } catch (error) {
      logger.error('❌ Spoonacular API nutrition search failed', {
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
   * Search ingredient database for nutrition
   * @private
   */
  async searchIngredientNutrition(foodItem) {
    try {
      // Step 1: Search for ingredient
      const searchResponse = await axios.get(`${this.baseURL}/food/ingredients/search`, {
        params: {
          query: foodItem,
          apiKey: this.apiKey,
          number: 1,
          metaInformation: true,
        },
      });

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        return { foodItem, found: false };
      }

      const ingredient = searchResponse.data.results[0];
      const ingredientId = ingredient.id;

      // Step 2: Get nutrition information
      const nutritionResponse = await axios.get(
        `${this.baseURL}/food/ingredients/${ingredientId}/information`,
        {
          params: {
            amount: 100,
            unit: 'grams',
            apiKey: this.apiKey,
          },
        }
      );

      return this.extractNutritionFromSpoonacular(nutritionResponse.data, true);
    } catch (error) {
      logger.debug('Ingredient search failed', { error: error.message });
      return { foodItem, found: false };
    }
  }

  /**
   * Search recipe database for nutrition
   * @private
   */
  async searchRecipeNutrition(foodItem, location) {
    try {
      const cuisine = location === 'India' ? 'indian' : undefined;

      // Step 1: Search for recipe
      const searchResponse = await axios.get(`${this.baseURL}/recipes/complexSearch`, {
        params: {
          query: foodItem,
          cuisine,
          number: 1,
          addRecipeNutrition: false, // Get detailed nutrition separately
          apiKey: this.apiKey,
        },
      });

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        return { foodItem, found: false };
      }

      const recipe = searchResponse.data.results[0];
      const recipeId = recipe.id;

      // Step 2: Get recipe with nutrition
      const recipeResponse = await axios.get(`${this.baseURL}/recipes/${recipeId}/information`, {
        params: {
          includeNutrition: true,
          apiKey: this.apiKey,
        },
      });

      return this.extractNutritionFromSpoonacular(recipeResponse.data, false);
    } catch (error) {
      logger.debug('Recipe search failed', { error: error.message });
      return { foodItem, found: false };
    }
  }

  /**
   * Search for recipes with PCOS modifications
   * NEW premium feature for recipe search with RAG enhancements
   *
   * @param {string} dishName - Name of dish to search for
   * @param {Object} preferences - User preferences (dietType, restrictions, region)
   * @param {string} userTier - Subscription tier (free, pro, max)
   * @param {string} userId - User ID for rate limiting
   * @param {string} location - User location (default: 'India')
   * @returns {Object} Recipe results with PCOS modifications
   */
  async searchRecipes(dishName, preferences = {}, userTier = 'free', userId, location = 'India') {
    try {
      // Validate subscription tier
      if (userTier === 'free') {
        logger.warn('Recipe search attempted by free tier user', { userId, dishName });
        return {
          error: 'Recipe search is available for Pro and Max subscribers',
          upgradeRequired: true,
          tierLimit: {
            tier: 'free',
            dailyLimit: 0,
            remainingToday: 0,
          },
        };
      }

      // Check rate limit
      const rateLimitCheck = this.checkRecipeSearchLimit(userId, userTier);

      if (!rateLimitCheck.allowed) {
        logger.warn('Recipe search rate limit exceeded', {
          userId,
          tier: userTier,
          remaining: rateLimitCheck.remaining,
          resetAt: rateLimitCheck.resetAt,
        });

        return {
          error: `Daily recipe search limit reached (${rateLimitCheck.dailyLimit} searches/day). Resets at midnight IST.`,
          rateLimited: true,
          resetAt: rateLimitCheck.resetAt,
          remaining: rateLimitCheck.remaining,
          tierLimit: {
            tier: userTier,
            dailyLimit: rateLimitCheck.dailyLimit,
            remainingToday: rateLimitCheck.remaining,
          },
        };
      }

      // Check cache first
      const cacheKey = `${dishName.toLowerCase()}_${JSON.stringify(preferences)}`;
      const cached = this.recipeCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.recipeCacheTTL) {
        logger.info('✅ Returning cached recipe data', { dishName });

        // Still increment search count even for cached results
        this.incrementRecipeSearchCount(userId);

        return {
          ...cached.data,
          tierLimit: {
            tier: userTier,
            dailyLimit: rateLimitCheck.dailyLimit,
            remainingToday: rateLimitCheck.remaining - 1, // Account for this search
          },
        };
      }

      // Build query params
      const queryParams = this.buildRecipeQueryParams(dishName, preferences, location);

      logger.info('🔍 Searching recipes on Spoonacular', {
        dishName,
        preferences,
        tier: userTier,
        userId,
      });

      // Call Spoonacular API
      const searchResponse = await axios.get(`${this.baseURL}/recipes/complexSearch`, {
        params: {
          ...queryParams,
          apiKey: this.apiKey,
        },
      });
      logger.info('Search Response', searchResponse.data);

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        logger.info('No recipes found', { dishName, preferences });
        return {
          query: dishName,
          count: 0,
          recipes: [],
          tierLimit: {
            tier: userTier,
            dailyLimit: rateLimitCheck.dailyLimit,
            remainingToday: rateLimitCheck.remaining,
          },
        };
      }

      // Get detailed info for each recipe
      const recipes = await Promise.all(
        searchResponse.data.results.map(async (recipe) => {
          try {
            const detailResponse = await axios.get(
              `${this.baseURL}/recipes/${recipe.id}/information`,
              {
                params: {
                  includeNutrition: true,
                  apiKey: this.apiKey,
                },
              }
            );

            const recipeData = detailResponse.data;

            // RAG Enhancement: Get PCOS-friendly substitutes
            const pcosModifications = await this.getPCOSModifications(recipeData, preferences);

            return {
              id: recipeData.id,
              title: recipeData.title,
              readyInMinutes: recipeData.readyInMinutes,
              servings: recipeData.servings,
              sourceUrl: recipeData.sourceUrl,
              summary: recipeData.summary?.replace(/<[^>]*>/g, ''), // Remove HTML tags
              cuisines: recipeData.cuisines || [],
              diets: recipeData.diets || [],
              dishTypes: recipeData.dishTypes || [],
              healthScore: recipeData.healthScore,
              nutrition: {
                nutrients: recipeData.nutrition?.nutrients || [],
                caloricBreakdown: recipeData.nutrition?.caloricBreakdown || {},
              },
              ingredients:
                recipeData.extendedIngredients?.map((ing) => ({
                  name: ing.name,
                  amount: ing.amount,
                  unit: ing.unit,
                  original: ing.original,
                })) || [],
              instructions:
                recipeData.instructions?.replace(/<[^>]*>/g, '') || 'Instructions not available',
              pcosModifications,
            };
          } catch (error) {
            logger.error('Failed to fetch recipe details', {
              recipeId: recipe.id,
              error: error.message,
            });
            return null;
          }
        })
      );

      // Filter out failed recipe fetches
      const validRecipes = recipes.filter((r) => r !== null);

      const result = {
        query: dishName,
        count: validRecipes.length,
        recipes: validRecipes,
        tierLimit: {
          tier: userTier,
          dailyLimit: rateLimitCheck.dailyLimit,
          remainingToday: rateLimitCheck.remaining - 1, // Account for this search
        },
      };

      // Cache the result
      this.recipeCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      // Increment search count
      this.incrementRecipeSearchCount(userId);

      logger.info('✅ Recipe search complete', {
        dishName,
        recipesFound: validRecipes.length,
        userId,
        remaining: rateLimitCheck.remaining - 1,
      });

      return result;
    } catch (error) {
      logger.error('❌ Recipe search failed', {
        error: error.message,
        errorResponse: error.response?.data,
        statusCode: error.response?.status,
        dishName,
        userId,
      });

      return {
        error: `Unable to search recipes: ${error.message}`,
        query: dishName,
        count: 0,
        recipes: [],
      };
    }
  }

  /**
   * Get PCOS-friendly modifications using RAG
   * @private
   */
  async getPCOSModifications(recipeData, preferences) {
    try {
      // Identify problematic ingredients for PCOS
      const problematicIngredients = this.identifyProblematicIngredients(
        recipeData.extendedIngredients || []
      );

      if (problematicIngredients.length === 0) {
        return {
          regionalSubstitutes: [],
          cookingMethodImprovements: [],
          portionGuidance: 'This recipe is relatively PCOS-friendly. Enjoy in moderation.',
          glycemicOptimization: [],
        };
      }

      // Build RAG queries for each problematic ingredient
      const modifications = {
        regionalSubstitutes: [],
        cookingMethodImprovements: [],
        portionGuidance: '',
        glycemicOptimization: [],
      };

      for (const ingredient of problematicIngredients.slice(0, 3)) {
        // Limit to top 3 ingredients
        const ragQuery = this.buildRAGQuery(ingredient, preferences);

        logger.debug('Querying RAG for PCOS substitute', { ingredient, ragQuery });

        // Retrieve substitutes from vector store
        const ragResults = await retriever.retrieve(ragQuery, { topK: 3 });

        if (ragResults && ragResults.length > 0) {
          // Extract substitute recommendations
          ragResults.forEach((doc) => {
            const content = doc.content || doc.pageContent || '';

            modifications.regionalSubstitutes.push({
              original: ingredient,
              substitute: this.extractSubstituteFromRAG(content),
              reason: this.extractReasonFromRAG(content),
            });
          });
        }
      }

      // Add general cooking method improvements
      modifications.cookingMethodImprovements = [
        'Use minimal oil (1-2 tsp per serving)',
        'Opt for baking or air-frying instead of deep-frying',
        'Add extra vegetables for fiber',
      ];

      // Add portion guidance
      modifications.portionGuidance = `Limit to ${
        recipeData.servings > 4 ? '1 serving' : '1-2 servings'
      } and pair with a salad or protein-rich side.`;

      // Add glycemic optimization tips
      modifications.glycemicOptimization = [
        'Eat protein first, then this dish to slow glucose spike',
        'Have this meal earlier in the day (breakfast/lunch) rather than dinner',
        'Include fiber-rich sides like salad or roasted vegetables',
      ];

      return modifications;
    } catch (error) {
      logger.error('Failed to get PCOS modifications', { error: error.message });
      return {
        regionalSubstitutes: [],
        cookingMethodImprovements: [],
        portionGuidance: 'Consult a nutritionist for personalized recommendations.',
        glycemicOptimization: [],
      };
    }
  }

  /**
   * Identify problematic PCOS ingredients
   * @private
   */
  identifyProblematicIngredients(ingredients) {
    const problematic = [
      'white rice',
      'rice',
      'basmati rice',
      'maida',
      'all-purpose flour',
      'refined flour',
      'wheat flour',
      'white bread',
      'bread',
      'sugar',
      'refined sugar',
      'brown sugar',
      'potato',
      'potatoes',
      'pasta',
      'noodles',
      'coconut milk',
      'cream',
      'heavy cream',
      'milk',
      'whole milk',
    ];

    const found = [];

    ingredients.forEach((ing) => {
      const name = ing.name?.toLowerCase() || '';

      problematic.forEach((prob) => {
        if (name.includes(prob) && !found.includes(prob)) {
          found.push(prob);
        }
      });
    });

    return found;
  }

  /**
   * Build RAG query for PCOS substitute
   * @private
   */
  buildRAGQuery(ingredient, preferences) {
    const region = preferences.region || 'North Indian';
    const dietType = preferences.dietType || 'vegetarian';
    const restrictions = preferences.restrictions || [];

    let query = `PCOS friendly substitute for ${ingredient} ${region} ${dietType}`;

    if (restrictions.length > 0) {
      query += ` ${restrictions.join(' ')}`;
    }

    query += ' low GI high protein healthy alternative';

    return query;
  }

  /**
   * Extract substitute from RAG content
   * @private
   */
  extractSubstituteFromRAG(content) {
    // Simple heuristic: look for "instead of" or "replace with" patterns
    const patterns = [
      /instead of.*?use ([^.]+)/i,
      /replace.*?with ([^.]+)/i,
      /substitute.*?with ([^.]+)/i,
      /use ([^.]+) instead/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: return first sentence
    const firstSentence = content.split('.')[0];
    return firstSentence.trim();
  }

  /**
   * Extract reason from RAG content
   * @private
   */
  extractReasonFromRAG(content) {
    // Look for "because" or "why" patterns
    const patterns = [/because ([^.]+)/i, /why:? ([^.]+)/i, /benefits:? ([^.]+)/i];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Better for PCOS management';
  }

  /**
   * Check if user has exceeded recipe search rate limit
   *
   * @param {string} userId - User ID
   * @param {string} userTier - Subscription tier
   * @returns {Object} Rate limit status
   */
  checkRecipeSearchLimit(userId, userTier) {
    // Define tier limits
    const tierLimits = {
      free: 0,
      pro: 5,
      max: 10,
    };

    const dailyLimit = tierLimits[userTier] || 0;

    // Calculate midnight today in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
    const istNow = new Date(now.getTime() + istOffset);

    // Set to midnight IST
    const midnightIST = new Date(istNow);
    midnightIST.setUTCHours(0, 0, 0, 0);

    // Calculate next midnight IST
    const nextMidnightIST = new Date(midnightIST.getTime() + 24 * 60 * 60 * 1000);

    // Get or create rate limit entry
    let rateLimitEntry = this.rateLimits.get(userId);

    if (!rateLimitEntry || now >= new Date(rateLimitEntry.resetAt)) {
      // Reset rate limit
      rateLimitEntry = {
        count: 0,
        resetAt: nextMidnightIST.toISOString(),
      };
      this.rateLimits.set(userId, rateLimitEntry);
    }

    const remaining = Math.max(0, dailyLimit - rateLimitEntry.count);
    const allowed = rateLimitEntry.count < dailyLimit;

    return {
      allowed,
      remaining,
      dailyLimit,
      resetAt: rateLimitEntry.resetAt,
    };
  }

  /**
   * Increment recipe search count for user
   *
   * @param {string} userId - User ID
   */
  incrementRecipeSearchCount(userId) {
    const entry = this.rateLimits.get(userId);

    if (entry) {
      entry.count += 1;
      this.rateLimits.set(userId, entry);
      logger.debug('Incremented recipe search count', {
        userId,
        newCount: entry.count,
      });
    }
  }

  /**
   * Extract nutrition from Spoonacular response
   *
   * @param {Object} spoonacularResponse - API response
   * @param {boolean} isIngredient - Whether this is ingredient (vs recipe)
   * @returns {Object} Standardized nutrition format
   */
  extractNutritionFromSpoonacular(spoonacularResponse, isIngredient = true) {
    try {
      const foodItem = spoonacularResponse.name || spoonacularResponse.title || 'Unknown';

      let nutrition = {};

      if (isIngredient) {
        // Extract from ingredient response
        const nutrients = spoonacularResponse.nutrition?.nutrients || [];

        nutrition = {
          calories: this.findNutrient(nutrients, 'Calories'),
          protein: this.findNutrient(nutrients, 'Protein'),
          carbs: this.findNutrient(nutrients, 'Carbohydrates'),
          fat: this.findNutrient(nutrients, 'Fat'),
          fiber: this.findNutrient(nutrients, 'Fiber'),
        };
      } else {
        // Extract from recipe response
        const nutrients = spoonacularResponse.nutrition?.nutrients || [];
        const servings = spoonacularResponse.servings || 1;

        nutrition = {
          calories: this.findNutrient(nutrients, 'Calories') / servings,
          protein: this.findNutrient(nutrients, 'Protein') / servings,
          carbs: this.findNutrient(nutrients, 'Carbohydrates') / servings,
          fat: this.findNutrient(nutrients, 'Fat') / servings,
          fiber: this.findNutrient(nutrients, 'Fiber') / servings,
        };
      }

      return {
        foodItem,
        found: true,
        servingSize: isIngredient ? '100g' : '1 serving',
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        source: 'Spoonacular',
        sourceUrl: spoonacularResponse.sourceUrl || null,
        error: null,
        organicResults: null,
      };
    } catch (error) {
      logger.error('Failed to extract nutrition from Spoonacular', {
        error: error.message,
      });
      return {
        foodItem: 'Unknown',
        found: false,
        error: 'Failed to parse nutrition data',
      };
    }
  }

  /**
   * Find nutrient value by name
   * @private
   */
  findNutrient(nutrients, name) {
    const nutrient = nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
    return nutrient ? nutrient.amount : null;
  }

  /**
   * Build recipe query params
   *
   * @param {string} dishName - Dish name
   * @param {Object} preferences - User preferences
   * @param {string} location - User location
   * @returns {Object} Query params for Spoonacular
   */
  buildRecipeQueryParams(dishName, preferences, location) {
    const params = {
      query: dishName,
      number: 10,
      instructionsRequired: true,
      addRecipeNutrition: false, // Get detailed nutrition separately
      sort: 'healthiness',
      type: 'main course,breakfast,lunch,dinner',
    };

    // Add cuisine based on location
    if (location === 'India') {
      params.cuisine = 'indian';
    }

    // Add diet type
    if (preferences.dietType) {
      params.diet = preferences.dietType;
    }

    // Add intolerances/restrictions
    if (preferences.restrictions && preferences.restrictions.length > 0) {
      params.intolerances = preferences.restrictions.join(',');
    }

    return params;
  }

  /**
   * Validate if API key is configured
   *
   * @returns {boolean} True if API key exists
   */
  validateApiKey() {
    return !!this.apiKey;
  }

  /**
   * Clear both nutrition and recipe caches
   */
  clearCache() {
    const nutritionSize = this.nutritionCache.size;
    const recipeSize = this.recipeCache.size;

    this.nutritionCache.clear();
    this.recipeCache.clear();

    logger.info('Cleared caches', {
      nutritionEntries: nutritionSize,
      recipeEntries: recipeSize,
    });
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      nutrition: {
        size: this.nutritionCache.size,
        entries: Array.from(this.nutritionCache.keys()),
      },
      recipes: {
        size: this.recipeCache.size,
        entries: Array.from(this.recipeCache.keys()),
      },
    };
  }
}

export const spoonacularService = new SpoonacularService();
export default spoonacularService;
