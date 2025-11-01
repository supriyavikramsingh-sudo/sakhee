// server/src/routes/mealPlan.js
import express from 'express';
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('MealPlanRoutes');

// In-memory storage for meal plans
const mealPlans = new Map();

/**
 * POST /api/meals/generate
 * Generate a personalized meal plan with RAG retrieval (UPDATED for multiple cuisines)
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      userId,
      regions,
      cuisines,
      dietType,
      budget,
      restrictions,
      mealsPerDay,
      goals,
      duration,
      healthContext,
      userOverrides,
    } = req.body;

    logger.info('Generating RAG-enhanced meal plan with multiple cuisines', {
      userId,
      regions: regions?.length || 0,
      cuisines: cuisines?.length || 0,
      cuisineList: cuisines,
      dietType,
      restrictions: restrictions?.length || 0,
      hasHealthContext: !!healthContext,
      hasMedicalData: !!healthContext?.medicalData,
      userOverrides,
    });

    // Validate required fields
    if (!budget || !mealsPerDay || !duration) {
      return res.status(400).json({
        success: false,
        error: { message: 'Budget, meals per day, and duration are required' },
      });
    }

    // Validate cuisines array
    if (!cuisines || !Array.isArray(cuisines) || cuisines.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'At least one cuisine must be selected' },
      });
    }

    // Use defaults if regions not provided
    const finalRegions = regions && regions.length > 0 ? regions : ['north-indian'];
    const finalDietType = dietType || 'vegetarian';

    logger.info('Meal plan generation parameters', {
      finalRegions,
      cuisines,
      cuisineCount: cuisines.length,
      finalDietType,
      duration,
    });

    // Generate plan using RAG-enhanced LLM with multiple cuisines
    const mealPlan = await mealPlanChain.generateMealPlan({
      duration,
      regions: finalRegions,
      cuisines, // Now an array of cuisine names
      dietType: finalDietType,
      budget,
      restrictions: restrictions || [],
      mealsPerDay: mealsPerDay || 3,
      healthContext: healthContext || {},
      userOverrides: userOverrides || {},
    });

    // Extract RAG metadata
    const ragMetadata = mealPlan.ragMetadata || null;
    delete mealPlan.ragMetadata; // Remove from plan data

    // Store plan with metadata
    const planId = 'plan_' + Date.now();
    const planData = {
      id: planId,
      userId,
      plan: mealPlan,
      regions: finalRegions,
      cuisines, // Store array of cuisines
      dietType: finalDietType,
      budget,
      goals: goals || [],
      duration: duration || 7,
      createdAt: new Date(),
      active: true,

      // Enhanced personalization sources with RAG tracking
      personalizationSources: {
        onboarding: !!(restrictions?.length || cuisines?.length || healthContext?.symptoms?.length),
        medicalReport: !!healthContext?.medicalData,
        userOverrides: !!(
          userOverrides?.regions ||
          userOverrides?.cuisineStates ||
          userOverrides?.dietType
        ),
        rag: true, // RAG always attempted
        ragQuality: ragMetadata?.retrievalQuality || 'unknown',
        ragSources: ragMetadata
          ? {
              mealTemplates: ragMetadata.mealTemplates || 0,
              nutritionGuidelines: ragMetadata.nutritionGuidelines || 0,
              labGuidance: ragMetadata.labGuidance || 0,
              symptomRecommendations: !!ragMetadata.symptomRecommendations,
            }
          : {},
      },
    };

    mealPlans.set(planId, planData);

    logger.info('Meal plan generated successfully', {
      planId,
      userId,
      daysGenerated: mealPlan.days?.length || 0,
      cuisinesUsed: cuisines,
      ragQuality: ragMetadata?.retrievalQuality,
      personalizationSources: Object.keys(planData.personalizationSources).filter(
        (k) => planData.personalizationSources[k]
      ),
    });

    res.json({
      success: true,
      data: {
        planId,
        regions,
        cuisines,
        dietType,
        budget,
        plan: mealPlan,
        ragMetadata,
        personalizationSources: planData.personalizationSources,
      },
    });
  } catch (error) {
    logger.error('Meal plan generation failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate meal plan',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/meals/:planId
 * Retrieve a specific meal plan
 */
router.get('/:planId', (req, res) => {
  try {
    const { planId } = req.params;

    const planData = mealPlans.get(planId);

    if (!planData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' },
      });
    }

    res.json({
      success: true,
      data: planData,
    });
  } catch (error) {
    logger.error('Failed to retrieve meal plan', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plan' },
    });
  }
});

/**
 * GET /api/meals/user/:userId
 * Get all meal plans for a user
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const userPlans = Array.from(mealPlans.values()).filter((plan) => plan.userId === userId);

    logger.info('Retrieved user meal plans', {
      userId,
      count: userPlans.length,
    });

    res.json({
      success: true,
      data: userPlans,
    });
  } catch (error) {
    logger.error('Failed to retrieve user meal plans', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plans' },
    });
  }
});

/**
 * DELETE /api/meals/:planId
 * Delete a meal plan
 */
router.delete('/:planId', (req, res) => {
  try {
    const { planId } = req.params;

    const deleted = mealPlans.delete(planId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' },
      });
    }

    logger.info('Meal plan deleted', { planId });

    res.json({
      success: true,
      message: 'Meal plan deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete meal plan', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete meal plan' },
    });
  }
});

export default router;
