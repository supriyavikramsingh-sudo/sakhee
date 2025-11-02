import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

class ProgressController {
  constructor() {
    this.logger = new Logger('ProgressController');
  }

  async logProgress(req, res) {
    const requestId = req.requestId;
    this.logger.info('Starting progress logging', { requestId, userId: req.body.userId });

    try {
      const { userId, date, weight, symptoms, mood, energy, sleep, exercise, notes } = req.body;

      if (!userId || !date) {
        this.logger.warn('Missing required fields for progress logging', { requestId });
        return res.status(400).json({ error: 'User ID and date are required' });
      }

      const progressData = {
        userId,
        date,
        weight: weight || null,
        symptoms: symptoms || [],
        mood: mood || null,
        energy: energy || null,
        sleep: sleep || null,
        exercise: exercise || null,
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Use date as document ID to ensure one entry per day
      const progressRef = db.collection('progress').doc(`${userId}_${date}`);
      await progressRef.set(progressData, { merge: true });

      this.logger.info('Progress logged successfully', {
        requestId,
        userId,
        date,
        hasWeight: !!weight,
        symptomsCount: symptoms?.length || 0,
        hasMood: !!mood,
        hasEnergy: !!energy,
      });

      res.json({
        success: true,
        message: 'Progress logged successfully',
        data: progressData,
      });
    } catch (error) {
      this.logger.error('Error logging progress', {
        requestId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to log progress' });
    }
  }

  async getUserProgress(req, res) {
    const requestId = req.requestId;
    const { userId } = req.params;
    const { startDate, endDate, limit } = req.query;

    this.logger.info('Retrieving user progress', { requestId, userId, startDate, endDate, limit });

    try {
      if (!userId) {
        this.logger.warn('Missing userId in request', { requestId });
        return res.status(400).json({ error: 'User ID is required' });
      }

      let query = db.collection('progress').where('userId', '==', userId).orderBy('date', 'desc');

      // Apply date filters if provided
      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      // Apply limit if provided
      if (limit) {
        query = query.limit(parseInt(limit));
      }

      const progressSnapshot = await query.get();

      const progressEntries = [];
      progressSnapshot.forEach((doc) => {
        progressEntries.push({ id: doc.id, ...doc.data() });
      });

      this.logger.info('User progress retrieved successfully', {
        requestId,
        userId,
        count: progressEntries.length,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all',
      });

      res.json({
        success: true,
        data: progressEntries,
      });
    } catch (error) {
      this.logger.error('Error retrieving user progress', {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to retrieve progress' });
    }
  }

  async updateProgress(req, res) {
    const requestId = req.requestId;
    const { progressId } = req.params;

    this.logger.info('Updating progress entry', { requestId, progressId });

    try {
      if (!progressId) {
        this.logger.warn('Missing progressId in request', { requestId });
        return res.status(400).json({ error: 'Progress ID is required' });
      }

      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await db.collection('progress').doc(progressId).update(updateData);

      this.logger.info('Progress entry updated successfully', {
        requestId,
        progressId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'Progress updated successfully',
      });
    } catch (error) {
      this.logger.error('Error updating progress', {
        requestId,
        progressId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }

  async deleteProgress(req, res) {
    const requestId = req.requestId;
    const { progressId } = req.params;

    this.logger.info('Deleting progress entry', { requestId, progressId });

    try {
      if (!progressId) {
        this.logger.warn('Missing progressId in request', { requestId });
        return res.status(400).json({ error: 'Progress ID is required' });
      }

      // Check if progress entry exists
      const progressDoc = await db.collection('progress').doc(progressId).get();
      if (!progressDoc.exists) {
        this.logger.warn('Progress entry not found for deletion', { requestId, progressId });
        return res.status(404).json({ error: 'Progress entry not found' });
      }

      await db.collection('progress').doc(progressId).delete();

      this.logger.info('Progress entry deleted successfully', {
        requestId,
        progressId,
        userId: progressDoc.data().userId,
      });

      res.json({
        success: true,
        message: 'Progress entry deleted successfully',
      });
    } catch (error) {
      this.logger.error('Error deleting progress', {
        requestId,
        progressId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to delete progress' });
    }
  }

  async setGoals(req, res) {
    const requestId = req.requestId;
    this.logger.info('Setting user goals', { requestId, userId: req.body.userId });

    try {
      const { userId, goals } = req.body;

      if (!userId || !goals) {
        this.logger.warn('Missing required fields for goal setting', { requestId });
        return res.status(400).json({ error: 'User ID and goals are required' });
      }

      const goalData = {
        userId,
        goals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('goals').doc(userId).set(goalData, { merge: true });

      this.logger.info('Goals set successfully', {
        requestId,
        userId,
        goalsCount: Object.keys(goals).length,
      });

      res.json({
        success: true,
        message: 'Goals set successfully',
        data: goalData,
      });
    } catch (error) {
      this.logger.error('Error setting goals', {
        requestId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to set goals' });
    }
  }

  async getAnalytics(req, res) {
    const requestId = req.requestId;
    const { userId } = req.params;
    const { period } = req.query; // week, month, year

    this.logger.info('Calculating progress analytics', { requestId, userId, period });

    try {
      if (!userId) {
        this.logger.warn('Missing userId in request', { requestId });
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1); // Default to month
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const progressSnapshot = await db
        .collection('progress')
        .where('userId', '==', userId)
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .orderBy('date', 'asc')
        .get();

      const entries = [];
      progressSnapshot.forEach((doc) => {
        entries.push(doc.data());
      });

      // Calculate analytics
      const analytics = {
        totalEntries: entries.length,
        averageWeight: null,
        weightTrend: null,
        averageMood: null,
        averageEnergy: null,
        averageSleep: null,
        commonSymptoms: {},
        exerciseFrequency: 0,
      };

      if (entries.length > 0) {
        // Weight analytics
        const weightEntries = entries.filter((e) => e.weight);
        if (weightEntries.length > 0) {
          analytics.averageWeight =
            weightEntries.reduce((sum, e) => sum + e.weight, 0) / weightEntries.length;
          if (weightEntries.length > 1) {
            analytics.weightTrend =
              weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight;
          }
        }

        // Mood, energy, sleep analytics
        const moodEntries = entries.filter((e) => e.mood);
        if (moodEntries.length > 0) {
          analytics.averageMood =
            moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length;
        }

        const energyEntries = entries.filter((e) => e.energy);
        if (energyEntries.length > 0) {
          analytics.averageEnergy =
            energyEntries.reduce((sum, e) => sum + e.energy, 0) / energyEntries.length;
        }

        const sleepEntries = entries.filter((e) => e.sleep);
        if (sleepEntries.length > 0) {
          analytics.averageSleep =
            sleepEntries.reduce((sum, e) => sum + e.sleep, 0) / sleepEntries.length;
        }

        // Symptom frequency
        entries.forEach((entry) => {
          if (entry.symptoms && Array.isArray(entry.symptoms)) {
            entry.symptoms.forEach((symptom) => {
              analytics.commonSymptoms[symptom] = (analytics.commonSymptoms[symptom] || 0) + 1;
            });
          }
        });

        // Exercise frequency
        analytics.exerciseFrequency = entries.filter((e) => e.exercise && e.exercise > 0).length;
      }

      this.logger.info('Progress analytics calculated successfully', {
        requestId,
        userId,
        period,
        totalEntries: analytics.totalEntries,
      });

      res.json({
        success: true,
        data: {
          period,
          dateRange: { startDate: startDateStr, endDate: endDateStr },
          analytics,
        },
      });
    } catch (error) {
      this.logger.error('Error calculating analytics', {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Failed to calculate analytics' });
    }
  }
}

export default new ProgressController();
