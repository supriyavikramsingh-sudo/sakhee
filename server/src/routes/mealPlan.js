import express from 'express';
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('MealPlanRoutes');

// In-memory storage for meal plans
const mealPlans = new Map();

/**
 * POST /api/meals/generate
 * Generate a personalized meal plan
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      userId,
      region,
      dietType,
      budget,
      restrictions,
      cuisines,
      mealsPerDay,
      goals,
      duration,
      healthContext,
      userOverrides,
    } = req.body;

    logger.info('Generating meal plan with full context', {
      userId,
      region,
      dietType,
      restrictions: restrictions?.length || 0,
      cuisines: cuisines?.length || 0,
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

    // Use defaults if region/dietType not provided (optional fields)
    const finalRegion = region || 'north-india';
    const finalDietType = dietType || 'vegetarian';

    // Generate plan using LLM with full context
    const mealPlan = await mealPlanChain.generateMealPlan({
      duration,
      region: finalRegion,
      dietType: finalDietType,
      budget,
      restrictions: restrictions || [],
      cuisines: cuisines || [],
      mealsPerDay: mealsPerDay || 3,
      healthContext: healthContext || {},
      userOverrides: userOverrides || {},
    });

    // Store plan with metadata
    const planId = 'plan_' + Date.now();
    const planData = {
      id: planId,
      userId,
      plan: mealPlan,
      region: finalRegion,
      dietType: finalDietType,
      budget,
      goals: goals || [],
      duration: duration || 7,
      createdAt: new Date(),
      active: true,
      // Store what influenced this plan for transparency
      personalizationSources: {
        onboarding: !!(restrictions?.length || cuisines?.length || healthContext?.symptoms?.length),
        medicalReport: !!healthContext?.medicalData,
        userOverrides: !!(userOverrides?.region || userOverrides?.dietType),
        rag: true, // RAG knowledge base always used
      },
    };

    mealPlans.set(planId, planData);
    logger.info('Meal plan generated successfully', {
      planId,
      userId,
      sources: planData.personalizationSources,
    });

    res.json({
      success: true,
      data: {
        planId,
        plan: mealPlan,
        createdAt: new Date(),
        personalizationSources: planData.personalizationSources,
      },
    });
  } catch (error) {
    logger.error('Meal plan generation failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate meal plan' },
    });
  }
});

/**
 * GET /api/meals/:planId
 * Get a specific meal plan
 */
router.get('/:planId', (req, res) => {
  try {
    const { planId } = req.params;
    const plan = mealPlans.get(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' },
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Get meal plan failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plan' },
    });
  }
});

/**
 * GET /api/meals/user/:userId
 * Get user's meal plans
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userPlans = Array.from(mealPlans.values()).filter((plan) => plan.userId === userId);

    res.json({
      success: true,
      data: {
        plans: userPlans,
        count: userPlans.length,
      },
    });
  } catch (error) {
    logger.error('Get user meal plans failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plans' },
    });
  }
});

/**
 * PUT /api/meals/:planId
 * Update meal plan
 */
router.put('/:planId', (req, res) => {
  try {
    const { planId } = req.params;
    const { feedback, ratings } = req.body;

    const plan = mealPlans.get(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' },
      });
    }

    plan.feedback = feedback || plan.feedback;
    plan.ratings = ratings || plan.ratings;
    plan.updatedAt = new Date();
    mealPlans.set(planId, plan);

    logger.info('Meal plan updated', { planId });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Update meal plan failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update meal plan' },
    });
  }
});

/**
 * DELETE /api/meals/:planId
 * Delete meal plan
 */
router.delete('/:planId', (req, res) => {
  try {
    const { planId } = req.params;

    if (!mealPlans.has(planId)) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' },
      });
    }

    mealPlans.delete(planId);
    logger.info('Meal plan deleted', { planId });

    res.json({
      success: true,
      message: 'Meal plan deleted',
    });
  } catch (error) {
    logger.error('Delete meal plan failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete meal plan' },
    });
  }
});

export default router;
