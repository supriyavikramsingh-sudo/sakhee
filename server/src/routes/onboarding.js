import express from 'express';
import { OnboardingController } from '../controllers/onboardingController.js';

const router = express.Router();
const onboardingController = new OnboardingController();

/**
 * POST /api/onboarding/start
 * Initialize onboarding for a new user
 */
router.post('/start', async (req, res) => {
  await onboardingController.startOnboarding(req, res);
});

/**
 * POST /api/onboarding/:userId/save-step
 * Save onboarding step data
 */
router.post('/:userId/save-step', async (req, res) => {
  await onboardingController.saveOnboardingStep(req, res);
});

/**
 * POST /api/onboarding/:userId/complete
 * Complete onboarding
 */
router.post('/:userId/complete', async (req, res) => {
  await onboardingController.completeOnboarding(req, res);
});

/**
 * GET /api/onboarding/:userId
 * Get user profile
 */
router.get('/:userId', async (req, res) => {
  await onboardingController.getUserProfile(req, res);
});

export default router
