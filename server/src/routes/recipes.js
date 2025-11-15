import express from 'express';
import { spoonacularService } from '../services/spoonacularService.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('RecipesRoute');

/**
 * POST /api/recipes/search
 * Search for PCOS-friendly recipes with RAG-enhanced modifications
 *
 * Request body:
 * {
 *   dishName: string,          // Required: e.g., "chicken biryani"
 *   preferences: {             // Optional
 *     region: string,          // e.g., "North India"
 *     dietType: string,        // e.g., "vegetarian", "non-vegetarian"
 *     restrictions: string[]   // e.g., ["gluten-free", "dairy-free"]
 *   },
 *   userId: string,            // Required: from auth token or body
 *   userTier: string,          // Required: "free", "pro", or "max"
 *   location: string           // Optional: defaults to "India"
 * }
 *
 * Responses:
 * - 200: Recipe search successful
 * - 403: Free tier user (upgrade required)
 * - 429: Rate limit exceeded
 * - 400: Validation error
 * - 500: Server error
 */
router.post('/search', async (req, res) => {
  const startTime = Date.now();

  try {
    const { dishName, preferences = {}, userId, userTier = 'free', location = 'India' } = req.body;

    // Validation
    if (!dishName || typeof dishName !== 'string') {
      logger.warn('Recipe search validation failed: missing or invalid dishName', {
        body: req.body,
      });
      return res.status(400).json({
        success: false,
        error: 'Dish name is required and must be a string',
        details: 'Please provide a valid dish name (2-100 characters)',
      });
    }

    if (!userId || typeof userId !== 'string') {
      logger.warn('Recipe search validation failed: missing or invalid userId', { body: req.body });
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        details: 'Authentication required for recipe search',
      });
    }

    // Trim and validate dish name length
    const trimmedDishName = dishName.trim();
    if (trimmedDishName.length < 2 || trimmedDishName.length > 100) {
      logger.warn('Recipe search validation failed: dish name length invalid', {
        dishName: trimmedDishName,
        length: trimmedDishName.length,
      });
      return res.status(400).json({
        success: false,
        error: 'Dish name must be between 2 and 100 characters',
        details: `Current length: ${trimmedDishName.length} characters`,
      });
    }

    // Validate user tier
    const validTiers = ['free', 'pro', 'max'];
    if (!validTiers.includes(userTier.toLowerCase())) {
      logger.warn('Recipe search validation failed: invalid user tier', { userTier });
      return res.status(400).json({
        success: false,
        error: 'Invalid user tier',
        details: 'User tier must be one of: free, pro, max',
      });
    }

    logger.info('🔍 Recipe search request received', {
      dishName: trimmedDishName,
      userId,
      userTier,
      location,
      hasPreferences: Object.keys(preferences).length > 0,
    });

    // Call spoonacularService
    const result = await spoonacularService.searchRecipes(
      trimmedDishName,
      preferences,
      userTier.toLowerCase(),
      userId,
      location
    );

    // Check if result contains error (upgrade required or rate limited)
    if (result.error) {
      const statusCode = result.upgradeRequired ? 403 : result.rateLimited ? 429 : 400;

      logger.info(`Recipe search blocked: ${result.error}`, {
        userId,
        userTier,
        statusCode,
        upgradeRequired: result.upgradeRequired,
        rateLimited: result.rateLimited,
      });

      return res.status(statusCode).json({
        success: false,
        ...result,
      });
    }

    // Success response
    const responseTime = Date.now() - startTime;
    logger.info('✅ Recipe search successful', {
      dishName: trimmedDishName,
      userId,
      userTier,
      recipeCount: result.count,
      responseTime: `${responseTime}ms`,
      remainingSearches: result.tierLimit?.remainingToday,
    });

    return res.status(200).json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('❌ Recipe search failed', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      responseTime: `${responseTime}ms`,
    });

    // Handle Spoonacular API errors
    if (error.response?.status === 402) {
      return res.status(503).json({
        success: false,
        error: 'Recipe search service temporarily unavailable',
        details: 'API quota exceeded. Please try again later.',
        code: 'QUOTA_EXCEEDED',
      });
    }

    if (error.response?.status === 401) {
      return res.status(503).json({
        success: false,
        error: 'Recipe search service configuration error',
        details: 'Please contact support.',
        code: 'CONFIG_ERROR',
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Unable to search recipes',
      details: error.message || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/recipes/usage/:userId
 * Get current recipe search usage for a user
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     userId: string,
 *     tier: string,
 *     dailyLimit: number,
 *     remainingToday: number,
 *     resetAt: string (ISO timestamp)
 *   }
 * }
 */
router.get('/usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { userTier = 'free' } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Validate tier
    const validTiers = ['free', 'pro', 'max'];
    const tier = typeof userTier === 'string' ? userTier.toLowerCase() : 'free';

    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user tier',
        details: 'User tier must be one of: free, pro, max',
      });
    }

    // Get rate limit info
    const rateLimitInfo = spoonacularService.checkRecipeSearchLimit(userId, tier);

    logger.info('Recipe usage info retrieved', { userId, tier, rateLimitInfo });

    return res.status(200).json({
      success: true,
      data: {
        userId,
        tier,
        dailyLimit: rateLimitInfo.dailyLimit,
        remainingToday: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt,
        allowed: rateLimitInfo.allowed,
      },
    });
  } catch (error) {
    logger.error('Failed to get recipe usage info', {
      error: error.message,
      userId: req.params.userId,
    });

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve usage information',
      details: error.message,
    });
  }
});

export default router;
