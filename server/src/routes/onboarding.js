import express from 'express'
import { Logger } from '../utils/logger.js'

const router = express.Router()
const logger = new Logger('OnboardingRoutes')

// In-memory storage (replace with database in production)
const users = new Map()

/**
 * POST /api/onboarding/start
 * Initialize onboarding for a new user
 */
router.post('/start', (req, res) => {
  try {
    const { email, phone } = req.body

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email or phone required' }
      })
    }

    const userId = 'user_' + Date.now()
    const userProfile = {
      userId,
      email,
      phone,
      createdAt: new Date(),
      onboardingStep: 0,
      profileData: {}
    }

    users.set(userId, userProfile)
    logger.info('Onboarding started', { userId })

    res.json({
      success: true,
      data: {
        userId,
        step: 0,
        message: 'Onboarding initialized'
      }
    })
  } catch (error) {
    logger.error('Start onboarding failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to start onboarding' }
    })
  }
})

/**
 * POST /api/onboarding/:userId/save-step
 * Save onboarding step data
 */
router.post('/:userId/save-step', (req, res) => {
  try {
    const { userId } = req.params
    const { stepNumber, data } = req.body

    const user = users.get(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    // Save step data
    user.profileData = { ...user.profileData, ...data }
    user.onboardingStep = stepNumber
    users.set(userId, user)

    logger.info('Onboarding step saved', { userId, stepNumber })

    res.json({
      success: true,
      data: {
        step: stepNumber,
        message: 'Step saved successfully'
      }
    })
  } catch (error) {
    logger.error('Save step failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to save step' }
    })
  }
})

/**
 * POST /api/onboarding/:userId/complete
 * Complete onboarding
 */
router.post('/:userId/complete', (req, res) => {
  try {
    const { userId } = req.params
    const { finalData } = req.body

    const user = users.get(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    // Merge final data
    user.profileData = { ...user.profileData, ...finalData }
    user.onboardingComplete = true
    user.completedAt = new Date()
    users.set(userId, user)

    logger.info('Onboarding completed', { userId })

    res.json({
      success: true,
      data: {
        userId,
        message: 'Onboarding completed successfully',
        profile: user.profileData
      }
    })
  } catch (error) {
    logger.error('Complete onboarding failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to complete onboarding' }
    })
  }
})

/**
 * GET /api/onboarding/:userId
 * Get user profile
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const user = users.get(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    logger.error('Get user profile failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve profile' }
    })
  }
})

export default router