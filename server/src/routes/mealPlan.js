import express from 'express'
import { mealPlanChain } from '../langchain/chains/mealPlanChain.js'
import { Logger } from '../utils/logger.js'

const router = express.Router()
const logger = new Logger('MealPlanRoutes')

// In-memory storage for meal plans
const mealPlans = new Map()

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
      duration
    } = req.body

    logger.info('Generating meal plan', { userId, region, dietType })

    if (!region || !dietType || !budget) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields' }
      })
    }

    // Generate plan using LLM
    const mealPlan = await mealPlanChain.generateMealPlan({
      region,
      dietType,
      budget,
      restrictions: restrictions || [],
      cuisines: cuisines || [],
      mealsPerDay: mealsPerDay || 3
    })

    // Store plan
    const planId = 'plan_' + Date.now()
    const planData = {
      id: planId,
      userId,
      plan: mealPlan,
      region,
      dietType,
      budget,
      goals: goals || [],
      duration: duration || 7,
      createdAt: new Date(),
      active: true
    }

    mealPlans.set(planId, planData)
    logger.info('Meal plan generated', { planId, userId })

    res.json({
      success: true,
      data: {
        planId,
        plan: mealPlan,
        createdAt: new Date()
      }
    })
  } catch (error) {
    logger.error('Meal plan generation failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate meal plan' }
    })
  }
})

/**
 * GET /api/meals/:planId
 * Get a specific meal plan
 */
router.get('/:planId', (req, res) => {
  try {
    const { planId } = req.params
    const plan = mealPlans.get(planId)

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' }
      })
    }

    res.json({
      success: true,
      data: plan
    })
  } catch (error) {
    logger.error('Get meal plan failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plan' }
    })
  }
})

/**
 * GET /api/meals/user/:userId
 * Get user's meal plans
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const userPlans = Array.from(mealPlans.values()).filter(
      plan => plan.userId === userId
    )

    res.json({
      success: true,
      data: {
        plans: userPlans,
        count: userPlans.length
      }
    })
  } catch (error) {
    logger.error('Get user meal plans failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve meal plans' }
    })
  }
})

/**
 * PUT /api/meals/:planId
 * Update meal plan
 */
router.put('/:planId', (req, res) => {
  try {
    const { planId } = req.params
    const { feedback, ratings } = req.body

    const plan = mealPlans.get(planId)
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' }
      })
    }

    plan.feedback = feedback || plan.feedback
    plan.ratings = ratings || plan.ratings
    plan.updatedAt = new Date()
    mealPlans.set(planId, plan)

    logger.info('Meal plan updated', { planId })

    res.json({
      success: true,
      data: plan
    })
  } catch (error) {
    logger.error('Update meal plan failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update meal plan' }
    })
  }
})

/**
 * DELETE /api/meals/:planId
 * Delete meal plan
 */
router.delete('/:planId', (req, res) => {
  try {
    const { planId } = req.params

    if (!mealPlans.has(planId)) {
      return res.status(404).json({
        success: false,
        error: { message: 'Meal plan not found' }
      })
    }

    mealPlans.delete(planId)
    logger.info('Meal plan deleted', { planId })

    res.json({
      success: true,
      message: 'Meal plan deleted'
    })
  } catch (error) {
    logger.error('Delete meal plan failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete meal plan' }
    })
  }
})

export default router