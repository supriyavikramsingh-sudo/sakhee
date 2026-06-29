// server/src/routes/mealPlan.js
import express from 'express';
import { db } from '../config/firebase.js';
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js';
import { Logger } from '../utils/logger.js';
import { canGenerateMealPlan, incrementMealPlanCounter } from '../utils/subscriptionUtils.js';
import jobService from '../services/jobService.js';
import {
  saveMealPlanToHistory,
  getMealPlanHistory,
  loadFullMealPlan,
  deleteMealPlan,
} from '../utils/mealPlanHistoryUtils.js';

const router = express.Router();
const logger = new Logger('MealPlanRoutes');

// In-memory storage for meal plans
const mealPlans = new Map();

/**
 * POST /api/meals/generate
 * Generate a personalized meal plan with RAG retrieval (UPDATED for multiple cuisines)
 * NOW WITH BACKGROUND PROCESSING: Returns immediately with jobId, processes in background
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
      isKeto, // NEW: Keto diet modifier flag
    } = req.body;

    // ====================================
    // ACCESS CONTROL: Check if user can generate meal plan
    // ====================================
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User ID is required' },
      });
    }

    // Check subscription limits
    const accessCheck = await canGenerateMealPlan(userId);

    if (!accessCheck.canGenerate) {
      logger.warn('Meal plan generation blocked - limit reached', {
        userId,
        reason: accessCheck.reason,
        subscriptionPlan: accessCheck.subscriptionPlan,
        count: accessCheck.count,
        limit: accessCheck.limit,
      });

      return res.status(403).json({
        success: false,
        error: {
          message: accessCheck.reason,
          code: 'MEAL_PLAN_LIMIT_REACHED',
          subscriptionPlan: accessCheck.subscriptionPlan,
          count: accessCheck.count,
          limit: accessCheck.limit,
        },
      });
    }

    logger.info('Access control passed - creating background job for meal plan', {
      userId,
      subscriptionPlan: accessCheck.subscriptionPlan,
      count: accessCheck.count,
      limit: accessCheck.limit,
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

    // ====================================
    // CREATE BACKGROUND JOB
    // ====================================
    const job = jobService.createJob('meal-generation', userId, {
      regions,
      cuisines,
      dietType,
      duration,
      isKeto: isKeto || false,
    });

    // Return job ID immediately
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message:
          "Meal plan generation started. You can navigate away - we'll notify you when it's ready.",
      },
    });

    // ====================================
    // PROCESS IN BACKGROUND (async, no await)
    // ====================================
    processMealPlanGeneration({
      jobId: job.id,
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
      isKeto,
    }).catch((error) => {
      logger.error('Background meal plan generation failed', {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });
    });
  } catch (error) {
    logger.error('Failed to initiate meal plan generation', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to start meal plan generation',
        details: error.message,
      },
    });
  }
});

/**
 * Background meal plan generation function
 */
async function processMealPlanGeneration(params) {
  const {
    jobId,
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
    isKeto,
  } = params;

  try {
    // Update job to processing
    jobService.updateProgress(jobId, 10, 'Fetching user profile...');

    // Fetch user profile to get personalized calorie requirements
    let userCalories = 2000; // Default fallback
    let weightGoal = 'maintain'; // Default

    if (userId) {
      try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          // Use calculated daily_calorie_requirement if available
          if (userData.daily_calorie_requirement) {
            userCalories = userData.daily_calorie_requirement;
            logger.info('Using personalized calorie requirement', {
              userId,
              calories: userCalories,
            });
          }

          // Get weight goal for context
          if (userData.profileData?.weight_goal) {
            weightGoal = userData.profileData.weight_goal;
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch user profile, using default calories', {
          error: error.message,
        });
      }
    }

    jobService.updateProgress(jobId, 20, 'Preparing meal plan parameters...');

    logger.info('Generating RAG-enhanced meal plan with multiple cuisines', {
      jobId,
      userId,
      regions: regions?.length || 0,
      cuisines: cuisines?.length || 0,
      cuisineList: cuisines,
      dietType,
      isKeto: isKeto || false,
      restrictions: restrictions?.length || 0,
      hasHealthContext: !!healthContext,
      hasMedicalData: !!healthContext?.medicalData,
      userOverrides,
    });

    // Use defaults if regions not provided
    const finalRegions = regions && regions.length > 0 ? regions : ['north-indian'];
    const finalDietType = dietType || 'vegetarian';
    const finalIsKeto = isKeto === true;

    logger.info('Meal plan generation parameters', {
      jobId,
      finalRegions,
      cuisines,
      cuisineCount: cuisines.length,
      finalDietType,
      isKeto: finalIsKeto,
      duration,
    });

    jobService.updateProgress(jobId, 30, 'Generating personalized meal plan with AI...');

    // Generate plan using RAG-enhanced LLM with multiple cuisines
    const mealPlan = await mealPlanChain.generateMealPlan({
      duration,
      regions: finalRegions,
      cuisines,
      dietType: finalDietType,
      isKeto: finalIsKeto,
      budget,
      restrictions: restrictions || [],
      mealsPerDay: mealsPerDay || 3,
      healthContext: healthContext || {},
      userOverrides: userOverrides || {},
      userCalories,
      weightGoal,
    });

    jobService.updateProgress(jobId, 90, 'Finalizing meal plan...');

    // Extract RAG metadata and performance metrics
    const ragMetadata = mealPlan.ragMetadata || null;
    const performanceMetrics = mealPlan.performanceMetrics || null;
    delete mealPlan.ragMetadata;
    delete mealPlan.performanceMetrics;

    // Store plan with metadata
    const planId = 'plan_' + Date.now();
    const planData = {
      id: planId,
      userId,
      plan: mealPlan,
      regions: finalRegions,
      cuisines,
      dietType: finalDietType,
      isKeto: finalIsKeto,
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
        rag: true,
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

    // ====================================
    // INCREMENT MEAL PLAN COUNTER
    // ====================================
    try {
      await incrementMealPlanCounter(userId);
      logger.info('Meal plan counter incremented', { userId, jobId });
    } catch (error) {
      logger.error('Failed to increment meal plan counter', {
        userId,
        jobId,
        error: error.message,
      });
      // Non-critical error - don't fail the request
    }

    // ====================================
    // SAVE TO HISTORY (NEW FEATURE)
    // ====================================
    let historyPlanId = null;
    let historyFull = false;

    try {
      const historySaveResult = await saveMealPlanToHistory(userId, {
        plan: mealPlan,
        regions: finalRegions,
        cuisines,
        dietType: finalDietType,
        isKeto: finalIsKeto,
        budget,
        goals: goals || [],
        duration: duration || mealPlan.days?.length || 7,
        userCalories,
        ragMetadata,
        performanceMetrics,
        personalizationSources: planData.personalizationSources,
      });

      if (historySaveResult.success) {
        historyPlanId = historySaveResult.planId;
        logger.info('Meal plan saved to history', {
          userId,
          jobId,
          historyPlanId,
          planName: historySaveResult.planName,
        });
      } else if (historySaveResult.historyFull) {
        historyFull = true;
        logger.warn('Meal plan history full - plan not saved to history', {
          userId,
          jobId,
        });
      } else {
        logger.error('Failed to save meal plan to history', {
          userId,
          jobId,
          error: historySaveResult.error,
        });
      }
    } catch (error) {
      logger.error('Exception while saving meal plan to history', {
        userId,
        jobId,
        error: error.message,
        stack: error.stack,
      });
      // Non-critical - don't fail the job
    }

    logger.info('Meal plan generated successfully', {
      planId,
      jobId,
      userId,
      daysGenerated: mealPlan.days?.length || 0,
      cuisinesUsed: cuisines,
      isKeto: finalIsKeto,
      ragQuality: ragMetadata?.retrievalQuality,
      historyPlanId,
      historyFull,
      performanceMetrics: performanceMetrics
        ? {
            total: `${performanceMetrics.totalDuration}ms`,
            llm: `${performanceMetrics.llmDuration}ms (${performanceMetrics.llmPercentage}%)`,
            rag: `${performanceMetrics.ragDuration}ms (${performanceMetrics.ragPercentage}%)`,
          }
        : null,
      personalizationSources: Object.keys(planData.personalizationSources).filter(
        (k) => planData.personalizationSources[k]
      ),
    });

    // Mark job as completed
    jobService.completeJob(jobId, {
      planId,
      regions,
      cuisines,
      dietType,
      isKeto: finalIsKeto,
      budget,
      plan: mealPlan,
      ragMetadata,
      performanceMetrics,
      personalizationSources: planData.personalizationSources,
      historyPlanId, // Include history plan ID in job result
      historyFull, // Include history full flag
    });

    logger.info('Job completed successfully', { jobId, planId });
  } catch (error) {
    logger.error('Meal plan generation failed in background', {
      jobId,
      error: error.message,
      stack: error.stack,
    });

    jobService.failJob(jobId, error.message);
  }
}

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

/**
 * GET /api/meals/history/:userId
 * Get meal plan history metadata for a user (up to 5 plans)
 * NEW ENDPOINT for meal plan history feature
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User ID is required' },
      });
    }

    const result = await getMealPlanHistory(userId);

    if (result.success) {
      logger.info('Meal plan history retrieved via API', {
        userId,
        planCount: result.plans?.length || 0,
      });

      res.json({
        success: true,
        data: result.plans,
      });
    } else {
      res.status(500).json({
        success: false,
        error: { message: result.error || 'Failed to retrieve meal plan history' },
      });
    }
  } catch (error) {
    logger.error('Failed to retrieve meal plan history via API', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plan history' },
    });
  }
});

/**
 * GET /api/meals/history/:userId/:planId
 * Lazy load full meal plan data for a specific plan
 * NEW ENDPOINT for meal plan history feature
 */
router.get('/history/:userId/:planId', async (req, res) => {
  try {
    const { userId, planId } = req.params;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID and Plan ID are required' },
      });
    }

    const result = await loadFullMealPlan(userId, planId);

    if (result.success) {
      logger.info('Full meal plan loaded via API', {
        userId,
        planId,
      });

      res.json({
        success: true,
        data: result.planData,
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: result.error || 'Meal plan not found' },
      });
    }
  } catch (error) {
    logger.error('Failed to load full meal plan via API', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to load meal plan' },
    });
  }
});

/**
 * DELETE /api/meals/history/:userId/:planId
 * Delete a meal plan from history
 * NEW ENDPOINT for meal plan history feature
 */
router.delete('/history/:userId/:planId', async (req, res) => {
  try {
    const { userId, planId } = req.params;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID and Plan ID are required' },
      });
    }

    const result = await deleteMealPlan(userId, planId);

    if (result.success) {
      logger.info('Meal plan deleted from history via API', {
        userId,
        planId,
      });

      res.json({
        success: true,
        message: 'Meal plan deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: result.error || 'Meal plan not found' },
      });
    }
  } catch (error) {
    logger.error('Failed to delete meal plan from history via API', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete meal plan' },
    });
  }
});

export default router;
