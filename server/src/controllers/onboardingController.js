import { Logger } from '../utils/logger.js';

export class OnboardingController {
  constructor() {
    this.logger = new Logger('OnboardingController');
    // In-memory storage (replace with database in production)
    this.users = new Map();
  }

  /**
   * Initialize onboarding for a new user
   */
  async startOnboarding(req, res) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    this.logger.info('🚀 Starting onboarding process', { requestId });

    try {
      const { email, phone } = req.body;

      if (!email && !phone) {
        this.logger.warn('❌ Onboarding start failed - missing credentials', { requestId });
        return res.status(400).json({
          success: false,
          error: { message: 'Email or phone required' }
        });
      }

      const userId = 'user_' + Date.now();
      const userProfile = {
        userId,
        email,
        phone,
        createdAt: new Date(),
        onboardingStep: 0,
        profileData: {}
      };

      this.users.set(userId, userProfile);
      
      this.logger.info('✅ Onboarding initialized successfully', { 
        requestId, 
        userId,
        hasEmail: !!email,
        hasPhone: !!phone
      });

      res.json({
        success: true,
        data: {
          userId,
          step: 0,
          message: 'Onboarding initialized'
        }
      });
    } catch (error) {
      this.logger.error('💥 Start onboarding failed', { 
        requestId, 
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to start onboarding' }
      });
    }
  }

  /**
   * Save onboarding step data
   */
  async saveOnboardingStep(req, res) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    const { userId } = req.params;
    
    this.logger.info('💾 Saving onboarding step', { requestId, userId });

    try {
      const { stepNumber, data } = req.body;

      const user = this.users.get(userId);
      if (!user) {
        this.logger.warn('❌ User not found for step save', { requestId, userId });
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Save step data
      user.profileData = { ...user.profileData, ...data };
      user.onboardingStep = stepNumber;
      this.users.set(userId, user);

      this.logger.info('✅ Onboarding step saved successfully', { 
        requestId, 
        userId, 
        stepNumber,
        dataKeys: Object.keys(data || {})
      });

      res.json({
        success: true,
        data: {
          step: stepNumber,
          message: 'Step saved successfully'
        }
      });
    } catch (error) {
      this.logger.error('💥 Save onboarding step failed', { 
        requestId, 
        userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to save step' }
      });
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(req, res) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    const { userId } = req.params;
    
    this.logger.info('🎯 Completing onboarding', { requestId, userId });

    try {
      const { finalData } = req.body;

      const user = this.users.get(userId);
      if (!user) {
        this.logger.warn('❌ User not found for onboarding completion', { requestId, userId });
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Merge final data
      user.profileData = { ...user.profileData, ...finalData };
      user.onboardingComplete = true;
      user.completedAt = new Date();
      this.users.set(userId, user);

      this.logger.info('✅ Onboarding completed successfully', { 
        requestId, 
        userId,
        finalDataKeys: Object.keys(finalData || {}),
        totalProfileKeys: Object.keys(user.profileData || {}).length
      });

      res.json({
        success: true,
        data: {
          userId,
          message: 'Onboarding completed successfully',
          profile: user.profileData
        }
      });
    } catch (error) {
      this.logger.error('💥 Complete onboarding failed', { 
        requestId, 
        userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to complete onboarding' }
      });
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(req, res) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    const { userId } = req.params;
    
    this.logger.info('👤 Retrieving user profile', { requestId, userId });

    try {
      const user = this.users.get(userId);

      if (!user) {
        this.logger.warn('❌ User profile not found', { requestId, userId });
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      this.logger.info('✅ User profile retrieved successfully', { 
        requestId, 
        userId,
        onboardingComplete: user.onboardingComplete,
        currentStep: user.onboardingStep
      });

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      this.logger.error('💥 Get user profile failed', { 
        requestId, 
        userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve profile' }
      });
    }
  }
}
