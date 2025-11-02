const { db } = require('../config/firebase');
const Logger = require('../utils/logger');

class MealPlanController {
  constructor() {
    this.logger = new Logger('MealPlanController');
  }

  async generateMealPlan(req, res) {
    const requestId = req.requestId;
    this.logger.info('Starting meal plan generation', { requestId, userId: req.body.userId });

    try {
      const { userId, preferences, dietaryRestrictions, goals } = req.body;

      if (!userId) {
        this.logger.warn('Missing userId in request', { requestId });
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user's medical data for personalized recommendations
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Generate meal plan using RAG
      const mealPlanData = {
        userId,
        preferences: preferences || [],
        dietaryRestrictions: dietaryRestrictions || [],
        goals: goals || [],
        medicalData: userData.medicalData || {},
        createdAt: new Date().toISOString()
      };

      // Save to Firestore
      const mealPlanRef = await db.collection('mealPlans').add(mealPlanData);
      const mealPlanId = mealPlanRef.id;

      this.logger.info('Meal plan generated successfully', { 
        requestId, 
        userId, 
        mealPlanId,
        preferencesCount: preferences?.length || 0,
        restrictionsCount: dietaryRestrictions?.length || 0
      });

      res.json({
        success: true,
        mealPlanId,
        message: 'Meal plan generated successfully'
      });

    } catch (error) {
      this.logger.error('Error generating meal plan', { 
        requestId, 
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Failed to generate meal plan' });
    }
  }

  async getMealPlan(req, res) {
    const requestId = req.requestId;
    const { mealPlanId } = req.params;
    
    this.logger.info('Retrieving meal plan', { requestId, mealPlanId });

    try {
      if (!mealPlanId) {
        this.logger.warn('Missing mealPlanId in request', { requestId });
        return res.status(400).json({ error: 'Meal plan ID is required' });
      }

      const mealPlanDoc = await db.collection('mealPlans').doc(mealPlanId).get();

      if (!mealPlanDoc.exists) {
        this.logger.warn('Meal plan not found', { requestId, mealPlanId });
        return res.status(404).json({ error: 'Meal plan not found' });
      }

      const mealPlanData = { id: mealPlanDoc.id, ...mealPlanDoc.data() };

      this.logger.info('Meal plan retrieved successfully', { 
        requestId, 
        mealPlanId,
        userId: mealPlanData.userId
      });

      res.json({
        success: true,
        mealPlan: mealPlanData
      });

    } catch (error) {
      this.logger.error('Error retrieving meal plan', { 
        requestId, 
        mealPlanId,
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Failed to retrieve meal plan' });
    }
  }

  async getUserMealPlans(req, res) {
    const requestId = req.requestId;
    const { userId } = req.params;
    
    this.logger.info('Retrieving user meal plans', { requestId, userId });

    try {
      if (!userId) {
        this.logger.warn('Missing userId in request', { requestId });
        return res.status(400).json({ error: 'User ID is required' });
      }

      const mealPlansSnapshot = await db.collection('mealPlans')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const mealPlans = [];
      mealPlansSnapshot.forEach(doc => {
        mealPlans.push({ id: doc.id, ...doc.data() });
      });

      this.logger.info('User meal plans retrieved successfully', { 
        requestId, 
        userId,
        count: mealPlans.length
      });

      res.json({
        success: true,
        mealPlans
      });

    } catch (error) {
      this.logger.error('Error retrieving user meal plans', { 
        requestId, 
        userId,
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Failed to retrieve meal plans' });
    }
  }

  async updateMealPlan(req, res) {
    const requestId = req.requestId;
    const { mealPlanId } = req.params;
    
    this.logger.info('Updating meal plan', { requestId, mealPlanId });

    try {
      if (!mealPlanId) {
        this.logger.warn('Missing mealPlanId in request', { requestId });
        return res.status(400).json({ error: 'Meal plan ID is required' });
      }

      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await db.collection('mealPlans').doc(mealPlanId).update(updateData);

      this.logger.info('Meal plan updated successfully', { 
        requestId, 
        mealPlanId,
        updatedFields: Object.keys(updateData)
      });

      res.json({
        success: true,
        message: 'Meal plan updated successfully'
      });

    } catch (error) {
      this.logger.error('Error updating meal plan', { 
        requestId, 
        mealPlanId,
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Failed to update meal plan' });
    }
  }

  async deleteMealPlan(req, res) {
    const requestId = req.requestId;
    const { mealPlanId } = req.params;
    
    this.logger.info('Deleting meal plan', { requestId, mealPlanId });

    try {
      if (!mealPlanId) {
        this.logger.warn('Missing mealPlanId in request', { requestId });
        return res.status(400).json({ error: 'Meal plan ID is required' });
      }

      // Check if meal plan exists
      const mealPlanDoc = await db.collection('mealPlans').doc(mealPlanId).get();
      if (!mealPlanDoc.exists) {
        this.logger.warn('Meal plan not found for deletion', { requestId, mealPlanId });
        return res.status(404).json({ error: 'Meal plan not found' });
      }

      await db.collection('mealPlans').doc(mealPlanId).delete();

      this.logger.info('Meal plan deleted successfully', { 
        requestId, 
        mealPlanId,
        userId: mealPlanDoc.data().userId
      });

      res.json({
        success: true,
        message: 'Meal plan deleted successfully'
      });

    } catch (error) {
      this.logger.error('Error deleting meal plan', { 
        requestId, 
        mealPlanId,
        error: error.message,
        stack: error.stack 
      });
      res.status(500).json({ error: 'Failed to delete meal plan' });
    }
  }
}

module.exports = new MealPlanController();
