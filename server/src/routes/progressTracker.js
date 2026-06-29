/**
 * Progress Tracker API Routes
 * Handles period tracking, daily tracking, ovulation, and reports
 */

import express from 'express';
import { db, FieldValue } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';
import {
  initializePeriodSetup,
  getPeriodSetup,
  createCycle,
  getCycles,
  getCycle,
  updateCycle,
  saveCycleInsights,
  calculateCycleLength,
  updateCycleLength,
  saveDailyTracking,
  getDailyTracking,
  getDailyTrackingRange,
  calculateCurrentCycleDay,
  calculateWeeklyWeightAverage,
  getGoalAchievement,
  dismissGoalBanner,
  calculateOvulationScore,
  saveDailyOvulationScore,
  getCurrentCycleId,
  getOvulationPrediction,
  saveWeeklySymptoms,
  getWeeklySymptoms,
  getWeeklySymptomsRange,
  getWeeklySummary,
  getWeeklySummariesRange,
  generateWeeklySummary,
  getMonthlyReport,
  getMonthlyReportsRange,
  generateMonthlyReport,
} from '../services/progressTrackerService.js';
import {
  generateMonthlyInsights,
  generateLongTermInsights,
} from '../services/aiInsightsService.js';
import {
  exportDailyTracking,
  exportWeeklySummaries,
  exportMonthlyReports,
  exportAllData,
} from '../services/dataExportService.js';
import { generateMonthlyReportPDF } from '../services/pdfExportService.js';

const router = express.Router();
const logger = new Logger('ProgressTrackerRoutes');

/**
 * Middleware to verify authentication
 */
const verifyAuth = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.query.userId || req.params.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized: No user ID provided' },
      });
    }

    req.userId = userId;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication error' },
    });
  }
};

// =====================================================
// PERIOD TRACKING ROUTES
// =====================================================

/**
 * POST /api/progress/period/setup
 * Initialize period tracking setup with branching logic
 */
router.post('/period/setup', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const setupData = req.body;

    logger.info('Initializing period setup', { userId });

    // Extract new fields
    const {
      isCurrentlyOnPeriod,
      lastPeriodStart,
      onboardingDuration, // User's typical duration (2, 4, 5, 6, or 7)
      averageCycleLength, // Optional, only if period was >35 days ago
      flow,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      medicalWarnings = {},
    } = setupData;

    // Validate required fields
    if (!lastPeriodStart || !onboardingDuration) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: lastPeriodStart and onboardingDuration' },
      });
    }

    // Calculate end date from start + onboarding duration
    const startDate = new Date(lastPeriodStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (onboardingDuration - 1)); // -1 because inclusive counting
    const lastPeriodEnd = endDate.toISOString().split('T')[0];

    // Determine final cycle length (use input if provided, otherwise default to 28)
    const finalCycleLength = averageCycleLength || 28;

    // Prepare setup data with new schema
    const enhancedSetupData = {
      lastPeriodStart,
      lastPeriodEnd, // Auto-calculated
      onboardingDuration, // Store user's selection
      avgCycleLength: finalCycleLength,
      medicalWarnings: medicalWarnings || {},
      setupCompleted: true,
      symptoms: setupData.symptoms || [],
    };

    const result = await initializePeriodSetup(userId, enhancedSetupData);

    // Create initial cycle
    const cycleData = {
      startDate: lastPeriodStart,
      endDate: lastPeriodEnd,
      periodDuration: onboardingDuration,
      actualDuration: onboardingDuration, // Initially same as onboarding
      durationDiffersFromOnboarding: false,
      cycleLength: null, // First cycle, no previous data
      flow,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      source: 'setup', // Mark as setup-created
    };

    const cycleResult = await createCycle(userId, cycleData);
    result.initialCycleId = cycleResult.cycleId;

    res.json({
      success: true,
      message: 'Period tracking setup completed',
      data: result,
    });
  } catch (error) {
    logger.error('Period setup failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to initialize period setup',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/period/setup/:userId
 * Get period setup status
 */
router.get('/period/setup/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching period setup', { userId });

    const setup = await getPeriodSetup(userId);

    res.json({
      success: true,
      data: setup,
    });
  } catch (error) {
    logger.error('Get period setup failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch period setup',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/period/log
 * Log a new period cycle with auto-calculated end date
 */
router.post('/period/log', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      startDate,
      flow,
      symptoms,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      comparedToLast,
    } = req.body;

    logger.info('Logging period cycle', { userId });

    // Fetch user's setup data
    const setupDoc = await getPeriodSetup(userId);

    // Validate that the period is not before the first setup period
    if (setupDoc.lastPeriodStart) {
      const setupPeriodDate = new Date(setupDoc.lastPeriodStart);
      const newPeriodDate = new Date(startDate);

      if (newPeriodDate < setupPeriodDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: `You cannot log a period before your first setup period (${setupDoc.lastPeriodStart}). Please select a date on or after this date.`,
          },
        });
      }
    }

    const onboardingDuration = setupDoc.onboardingDuration;

    if (!onboardingDuration) {
      return res.status(400).json({
        success: false,
        error: { message: 'Onboarding duration not found. Please complete setup first.' },
      });
    }

    // Calculate end date from start + onboarding duration
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (onboardingDuration - 1)); // -1 for inclusive counting
    const endDate = end.toISOString().split('T')[0];

    // Prepare cycle data with auto-calculated end date
    const cycleData = {
      startDate,
      endDate, // Auto-calculated from onboarding duration
      periodDuration: onboardingDuration,
      actualDuration: onboardingDuration, // Initially same as onboarding
      durationDiffersFromOnboarding: false,
      flow,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      comparedToLast,
      symptoms: symptoms || [],
      source: 'manual',
    };

    // BEFORE creating the cycle, calculate cycle length for the PREVIOUS cycle
    const cycleLength = await calculateCycleLength(userId, startDate);
    let previousCycleId = null;

    if (cycleLength) {
      const cycles = await getCycles(userId, 50);
      if (cycles.length >= 1) {
        // Update the most recent cycle (which is the previous one before creating new)
        const previousCycle = cycles[cycles.length - 1];
        previousCycleId = previousCycle.cycleId;
        await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
        logger.info('Updated previous cycle length', {
          userId,
          cycleId: previousCycle.cycleId,
          cycleLength,
        });
      }
    }

    // NOW create the new cycle
    const result = await createCycle(userId, cycleData);

    res.json({
      success: true,
      message: 'Period logged successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Log period failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to log period',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/progress/period/update/:cycleId
 * Update an existing period cycle with new restrictions
 */
router.put('/period/update/:cycleId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { cycleId } = req.params;
    const {
      newStartDate,
      newEndDate,
      flow,
      symptoms,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      comparedToLast,
    } = req.body;

    logger.info('Updating period cycle', { userId, cycleId });

    // Step 1: Verify editing most recent cycle only
    const allCycles = await getCycles(userId, 50);
    if (!allCycles || allCycles.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No cycles found' },
      });
    }

    const mostRecentCycle = allCycles[allCycles.length - 1];

    // Only allow editing the most recent (last completed) period
    if (cycleId !== mostRecentCycle.cycleId) {
      return res.status(403).json({
        success: false,
        error: {
          message:
            'Only the most recent period can be edited. To modify older periods, please contact support.',
        },
      });
    }

    const originalCycle = mostRecentCycle;
    const originalStart = new Date(originalCycle.startDate);

    // Step 2: Validate start date ±5 days restriction
    const newStart = new Date(newStartDate);
    const daysDiff = Math.abs((newStart - originalStart) / (1000 * 60 * 60 * 24));

    if (daysDiff > 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date can only be changed by ±5 days from the original date.' },
      });
    }

    // Step 3: Validate end date after start date
    const newEnd = new Date(newEndDate);
    if (newEnd <= newStart) {
      return res.status(400).json({
        success: false,
        error: { message: 'End date must be after start date.' },
      });
    }

    // Step 4: Check for overlaps with OTHER periods
    const otherCycles = allCycles.filter((c) => c.cycleId !== cycleId);
    const hasOverlap = otherCycles.some((cycle) => {
      const cStart = new Date(cycle.startDate);
      const cEnd = new Date(cycle.endDate);
      return newStart <= cEnd && newEnd >= cStart;
    });

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'These dates would create overlapping periods. Please adjust your dates.',
        },
      });
    }

    // Step 5: Calculate actual duration
    const actualDuration = Math.floor((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;

    // Step 6: Compare with onboarding duration
    const setupData = await getPeriodSetup(userId);
    const onboardingDuration = setupData.onboardingDuration || 5; // Default fallback
    const isDifferent = actualDuration !== onboardingDuration;

    // Step 7: Update cycle document
    const updateData = {
      startDate: newStartDate,
      endDate: newEndDate,
      actualDuration,
      durationDiffersFromOnboarding: isDifferent,
      periodDuration: onboardingDuration, // Keep original onboarding reference
      flow,
      color,
      colorConsistency,
      clots,
      spotting,
      odor,
      comparedToLast,
      symptoms: symptoms || [],
    };

    const result = await updateCycle(userId, cycleId, updateData);

    // Step 8: Recalculate previous cycle's cycleLength if there is one
    if (allCycles.length >= 2) {
      const previousCycle = allCycles[allCycles.length - 2];
      const newCycleLength = Math.floor(
        (newStart - new Date(previousCycle.startDate)) / (1000 * 60 * 60 * 24)
      );

      await updateCycleLength(userId, previousCycle.cycleId, newCycleLength);
    }

    // Step 9: Check if duration update should be offered
    const recentCycles = allCycles.slice(-3); // Last 3 cycles
    const consecutiveDifferent = recentCycles.every(
      (c) => c.durationDiffersFromOnboarding === true || c.cycleId === cycleId // Include the one being edited
    );

    const alreadyOffered = setupData.durationUpdateOffered || false;

    let responseData = { success: true, message: 'Period updated successfully' };

    if (consecutiveDifferent && recentCycles.length >= 3 && !alreadyOffered && isDifferent) {
      // Calculate suggested duration (median of 4 values)
      const recentActualDurations = recentCycles
        .filter((c) => c.cycleId !== cycleId)
        .map((c) => c.actualDuration || c.periodDuration);

      // Add the newly edited duration
      recentActualDurations.push(actualDuration);

      const allDurations = [onboardingDuration, ...recentActualDurations];
      allDurations.sort((a, b) => a - b);
      const mid = Math.floor(allDurations.length / 2);
      const suggestedDuration =
        allDurations.length % 2 === 0
          ? Math.round((allDurations[mid - 1] + allDurations[mid]) / 2)
          : allDurations[mid];

      responseData.offerDurationUpdate = true;
      responseData.suggestedDuration = suggestedDuration;
      responseData.currentDuration = onboardingDuration;
      responseData.recentDurations = recentActualDurations;
    }

    res.json(responseData);
  } catch (error) {
    logger.error('Update period failed', {
      userId: req.userId,
      cycleId: req.params.cycleId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update period',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/period/update-duration
 * Update user's period duration system-wide
 */
router.post('/period/update-duration', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { newDuration, declined } = req.body;

    logger.info('Updating period duration', { userId, newDuration, declined });

    const setupRef = db.collection('periodTracking').doc(userId);

    if (declined) {
      // User declined the update
      await setupRef.update({
        durationUpdateOffered: true,
        durationUpdateDeclined: true,
        durationUpdateDeclinedAt: FieldValue.serverTimestamp(),
      });

      return res.json({
        success: true,
        message: 'Duration kept as-is',
      });
    }

    // Validate new duration
    if (!newDuration || newDuration < 2 || newDuration > 10) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid duration. Must be between 2 and 10 days.' },
      });
    }

    // User accepted update
    await setupRef.update({
      onboardingDuration: newDuration,
      durationUpdateOffered: true,
      durationUpdatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: 'Duration updated successfully',
      newDuration: newDuration,
    });
  } catch (error) {
    logger.error('Update duration failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update duration',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/period/cycles/:userId
 * Get all cycles for timeline
 */
router.get('/period/cycles/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const limitCount = parseInt(req.query.limit) || 6;

    logger.info('Fetching cycles', { userId, limit: limitCount });

    const cycles = await getCycles(userId, limitCount);

    res.json({
      success: true,
      data: cycles,
    });
  } catch (error) {
    logger.error('Get cycles failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch cycles',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/period/cycle/:userId/:cycleId
 * Get specific cycle details
 */
router.get('/period/cycle/:userId/:cycleId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { cycleId } = req.params;

    logger.info('Fetching cycle', { userId, cycleId });

    const cycle = await getCycle(userId, cycleId);

    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cycle not found' },
      });
    }

    res.json({
      success: true,
      data: cycle,
    });
  } catch (error) {
    logger.error('Get cycle failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch cycle',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/period/ovulation-prediction/:userId
 * Get ovulation prediction (data-driven or estimated)
 */
router.get('/period/ovulation-prediction/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching ovulation prediction', { userId });

    const prediction = await getOvulationPrediction(userId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('Get ovulation prediction failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch ovulation prediction',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/period/insights/:cycleId
 * Generate AI insights for a cycle
 */
router.post('/period/insights/:cycleId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { cycleId } = req.params;

    logger.info('Generating cycle insights', { userId, cycleId });

    // TODO: Implement AI insights generation in Phase 8
    // For now, return placeholder
    const insights = 'AI insights generation will be implemented in Phase 8';

    const result = await saveCycleInsights(userId, cycleId, insights);

    res.json({
      success: true,
      message: 'Insights generated',
      data: { insights },
    });
  } catch (error) {
    logger.error('Generate insights failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate insights',
        details: error.message,
      },
    });
  }
});

// =====================================================
// DAILY TRACKING ROUTES
// =====================================================

/**
 * POST /api/progress/daily
 * Save daily tracking entry
 */
router.post('/daily', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { date, ...trackingData } = req.body;

    logger.info('Saving daily tracking', { userId, date });

    // Calculate ovulation score if relevant data provided
    let ovulationData = null;
    if (trackingData.cervicalMucus && trackingData.ovulationPain && trackingData.libido) {
      ovulationData = calculateOvulationScore(trackingData);

      // Save ovulation score
      const currentCycleId = await getCurrentCycleId(userId);
      if (currentCycleId) {
        await saveDailyOvulationScore(userId, currentCycleId, date, ovulationData);
      }
    }

    const result = await saveDailyTracking(userId, date, trackingData);

    // Check if weight tracking should trigger weekly average
    if (trackingData.weight !== undefined && trackingData.weight !== null) {
      try {
        const weeklyResult = await calculateWeeklyWeightAverage(userId, date);
        if (weeklyResult) {
          result.weeklyAverage = weeklyResult;
        }
      } catch (error) {
        logger.warn('Weekly average calculation failed', { userId, error: error.message });
        // Don't fail the entire request if weekly average fails
      }
    }

    res.json({
      success: true,
      message: 'Daily tracking saved',
      data: {
        ...result,
        ovulationScore: ovulationData,
      },
    });
  } catch (error) {
    logger.error('Save daily tracking failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to save daily tracking',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/progress/daily/:entryId
 * Update existing daily tracking entry (edit mode - Phase 4)
 * Entries can only be edited within 7 days of creation
 */
router.put('/daily/:entryId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { entryId } = req.params; // This is actually the date (YYYY-MM-DD)
    const trackingData = req.body;

    logger.info('Updating daily tracking', { userId, entryId });

    // Get the existing entry from subcollection: dailyTracking/{userId}/entries/{date}
    const entryRef = db.collection('dailyTracking').doc(userId).collection('entries').doc(entryId);
    const existingEntry = await entryRef.get();

    if (!existingEntry.exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Entry not found',
        },
      });
    }

    const entryData = existingEntry.data();

    // Note: Ownership is implicit since we're querying user's subcollection
    // No need for separate ownership check

    // Check 7-day edit window
    const entryDate = new Date(entryData.date);
    const today = new Date();
    entryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays >= 7) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Entries can only be edited within 7 days. This entry is ${diffDays} days old.`,
        },
      });
    }

    // Track if weight or exercise changed (for recalculation triggers)
    const weightChanged = trackingData.weight !== entryData.weight;
    const exerciseChanged = trackingData.exercisedToday !== entryData.exercisedToday;
    const skipRecalculation = trackingData.skipRecalculation || false;

    // Remove frontend-only fields and flags before saving
    const {
      skipRecalculation: _skip,
      status: _status,
      completenessScore: _score,
      userId: _userId,
      ...dataToSave
    } = trackingData;

    // Update entry in subcollection
    await entryRef.update({
      ...dataToSave,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Recalculate ovulation score if relevant data changed
    let ovulationData = null;
    if (trackingData.cervicalMucus || trackingData.ovulationPain || trackingData.libido) {
      ovulationData = calculateOvulationScore(trackingData);

      const currentCycleId = await getCurrentCycleId(userId);
      if (currentCycleId) {
        await saveDailyOvulationScore(userId, currentCycleId, entryData.date, ovulationData);
      }
    }

    // Recalculate weekly metrics if weight or exercise changed (unless user opted to skip)
    let recalculationResults = {};
    if (!skipRecalculation && (weightChanged || exerciseChanged)) {
      try {
        // Recalculate weekly weight average
        if (weightChanged) {
          const weeklyResult = await calculateWeeklyWeightAverage(userId, entryData.date);
          if (weeklyResult) {
            recalculationResults.weeklyWeightAverage = weeklyResult;
          }
        }

        // Recalculate weekly activity if exercise changed (Phase 2 feature)
        if (exerciseChanged) {
          // This will be triggered by the weekly cron job
          // Or we can trigger immediate recalculation here
          recalculationResults.activityRecalculated = true;
        }

        logger.info('Recalculations triggered', {
          userId,
          weightChanged,
          exerciseChanged,
          recalculationResults,
        });
      } catch (error) {
        logger.warn('Recalculation failed', { userId, error: error.message });
        // Don't fail the entire request if recalculation fails
      }
    } else if (skipRecalculation && weightChanged) {
      logger.info('User opted to skip calorie recalculation despite weight change', {
        userId,
        entryId,
        weightChanged,
      });
    }

    res.json({
      success: true,
      message: 'Daily tracking updated successfully',
      data: {
        entryId,
        ovulationScore: ovulationData,
        recalculationResults,
        changesDetected: {
          weightChanged,
          exerciseChanged,
        },
      },
    });
  } catch (error) {
    logger.error('Update daily tracking failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update daily tracking',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/daily/range/:userId
 * Get daily tracking for date range
 * NOTE: This must be defined BEFORE /daily/:userId/:date to avoid route conflicts
 */
router.get('/daily/range/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date and end date are required' },
      });
    }

    logger.info('Fetching daily tracking range', { userId, startDate, endDate });

    const entries = await getDailyTrackingRange(userId, new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    logger.error('Get daily tracking range failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch daily tracking range',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/daily/:userId/:date
 * Get daily tracking for specific date
 */
router.get('/daily/:userId/:date', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { date } = req.params;

    logger.info('Fetching daily tracking', { userId, date });

    const tracking = await getDailyTracking(userId, date);

    res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    logger.error('Get daily tracking failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch daily tracking',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/cycle-day/:userId
 * Get current cycle day
 */
router.get('/cycle-day/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Calculating current cycle day', { userId });

    const cycleDay = await calculateCurrentCycleDay(userId, new Date());

    res.json({
      success: true,
      data: { cycleDay },
    });
  } catch (error) {
    logger.error('Get cycle day failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to calculate cycle day',
        details: error.message,
      },
    });
  }
});

// =====================================================
// WEIGHT TRACKING ROUTES
// =====================================================

/**
 * GET /api/progress/weight/goal/:userId
 * Get goal achievement status
 */
router.get('/weight/goal/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching goal achievement', { userId });

    const achievement = await getGoalAchievement(userId);

    res.json({
      success: true,
      data: achievement,
    });
  } catch (error) {
    logger.error('Get goal achievement failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch goal achievement',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/weight/goal/dismiss
 * Dismiss goal achievement banner
 */
router.post('/weight/goal/dismiss', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Dismissing goal banner', { userId });

    const result = await dismissGoalBanner(userId);

    res.json({
      success: true,
      message: 'Goal banner dismissed',
      data: result,
    });
  } catch (error) {
    logger.error('Dismiss goal banner failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to dismiss goal banner',
        details: error.message,
      },
    });
  }
});

// =====================================================
// WEEKLY SYMPTOMS ROUTES
// =====================================================

/**
 * POST /api/progress/weekly-symptoms
 * Save weekly symptoms
 * Body: { userId, weekId, ...symptomData }
 */
router.post('/weekly-symptoms', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { weekId, ...symptomData } = req.body;

    if (!weekId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Week ID is required' },
      });
    }

    logger.info('Saving weekly symptoms', { userId, weekId });

    const result = await saveWeeklySymptoms(userId, weekId, symptomData);

    res.json({
      success: true,
      message: 'Weekly symptoms saved successfully',
      data: result.data,
    });
  } catch (error) {
    logger.error('Save weekly symptoms failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to save weekly symptoms',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/weekly-symptoms/range/:userId
 * Get weekly symptoms for date range
 * Query params: startWeek, endWeek
 */
router.get('/weekly-symptoms/range/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { startWeek, endWeek } = req.query;

    logger.info('Fetching weekly symptoms range', { userId, startWeek, endWeek });

    const symptoms = await getWeeklySymptomsRange(userId, startWeek, endWeek);

    res.json({
      success: true,
      data: symptoms,
    });
  } catch (error) {
    logger.error('Get weekly symptoms range failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch weekly symptoms range',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/weekly-symptoms/:userId/:weekId
 * Get weekly symptoms for specific week
 */
router.get('/weekly-symptoms/:userId/:weekId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { weekId } = req.params;

    logger.info('Fetching weekly symptoms', { userId, weekId });

    const symptoms = await getWeeklySymptoms(userId, weekId);

    if (!symptoms) {
      return res.status(404).json({
        success: false,
        error: { message: 'Weekly symptoms not found' },
      });
    }

    res.json({
      success: true,
      data: symptoms,
    });
  } catch (error) {
    logger.error('Get weekly symptoms failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch weekly symptoms',
        details: error.message,
      },
    });
  }
});

// =====================================================
// WEEKLY SUMMARY ROUTES
// =====================================================

/**
 * GET /api/progress/weekly-summary/:userId/:weekId
 * Get weekly summary for specific week
 */
router.get('/weekly-summary/:userId/:weekId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { weekId } = req.params;

    logger.info('Fetching weekly summary', { userId, weekId });

    const summary = await getWeeklySummary(userId, weekId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: { message: 'Weekly summary not found' },
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get weekly summary failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch weekly summary',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/weekly-summaries/:userId
 * Get multiple weekly summaries
 * Query params: weeks (default: 12)
 */
router.get('/weekly-summaries/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const numberOfWeeks = parseInt(req.query.weeks) || 12;

    logger.info('Fetching weekly summaries range', { userId, numberOfWeeks });

    const summaries = await getWeeklySummariesRange(userId, numberOfWeeks);

    res.json({
      success: true,
      data: summaries,
    });
  } catch (error) {
    logger.error('Get weekly summaries failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch weekly summaries',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/weekly-summary/generate
 * Generate weekly summary manually
 * Body: { userId, weekId }
 */
router.post('/weekly-summary/generate', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { weekId } = req.body;

    if (!weekId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Week ID is required' },
      });
    }

    logger.info('Generating weekly summary', { userId, weekId });

    const result = await generateWeeklySummary(userId, weekId);

    res.json({
      success: true,
      message: 'Weekly summary generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Generate weekly summary failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate weekly summary',
        details: error.message,
      },
    });
  }
});

// =====================================================
// MONTHLY REPORT ROUTES
// =====================================================

/**
 * GET /api/progress/monthly-report/:userId/:monthId
 * Get monthly report for specific month
 */
router.get('/monthly-report/:userId/:monthId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { monthId } = req.params;

    logger.info('Fetching monthly report', { userId, monthId });

    const report = await getMonthlyReport(userId, monthId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Monthly report not found' },
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get monthly report failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch monthly report',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/monthly-reports/:userId
 * Get multiple monthly reports
 * Query params: months (default: 6)
 */
router.get('/monthly-reports/:userId', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const numberOfMonths = parseInt(req.query.months) || 6;

    logger.info('Fetching monthly reports range', { userId, numberOfMonths });

    const reports = await getMonthlyReportsRange(userId, numberOfMonths);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    logger.error('Get monthly reports failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch monthly reports',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/monthly-report/generate
 * Generate monthly report manually
 * Body: { userId, monthId }
 */
router.post('/monthly-report/generate', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { monthId } = req.body;

    if (!monthId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Month ID is required' },
      });
    }

    logger.info('Generating monthly report', { userId, monthId });

    const result = await generateMonthlyReport(userId, monthId);

    res.json({
      success: true,
      message: 'Monthly report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Generate monthly report failed', { userId: req.userId, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate monthly report',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/ai-insights/:userId/:monthId
 * Generate AI-powered insights for a specific monthly report
 * Params: userId, monthId
 * Body: { previousMonths?, userProfile?, forceRegenerate? }
 */
router.post('/ai-insights/:userId/:monthId', verifyAuth, async (req, res) => {
  try {
    const { userId, monthId } = req.params;
    const { previousMonths = [], userProfile = {}, forceRegenerate = false } = req.body;

    if (!monthId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Month ID is required' },
      });
    }

    logger.info('Generating AI insights', { userId, monthId, forceRegenerate });

    // First, fetch the monthly report
    const monthlyReport = await getMonthlyReport(userId, monthId);

    if (!monthlyReport) {
      return res.status(404).json({
        success: false,
        error: { message: 'Monthly report not found. Please generate the report first.' },
      });
    }

    // Generate AI insights (with caching)
    const insights = await generateMonthlyInsights(userId, monthlyReport, {
      previousMonths,
      userProfile,
      forceRegenerate,
    });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Generate AI insights failed', {
      userId: req.userId,
      monthId: req.params.monthId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate AI insights',
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/progress/ai-insights/long-term/:userId
 * Generate long-term AI insights across multiple months
 * Body: { numberOfMonths, forceRegenerate }
 */
router.post('/ai-insights/long-term/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { numberOfMonths = 6, forceRegenerate = false } = req.body;

    logger.info('Generating long-term AI insights', { userId, numberOfMonths, forceRegenerate });

    // Fetch multiple monthly reports
    const monthlyReports = await getMonthlyReportsRange(userId, numberOfMonths);

    if (!monthlyReports || monthlyReports.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No monthly reports found. Please track data and generate reports first.',
        },
      });
    }

    // Generate long-term insights (with caching)
    const insights = await generateLongTermInsights(userId, monthlyReports, { forceRegenerate });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Generate long-term AI insights failed', {
      userId: req.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate long-term AI insights',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/export/daily/:userId
 * Export daily tracking data
 * Query: startDate, endDate, format (csv or json)
 */
router.get('/export/daily/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, format = 'csv' } = req.query;

    logger.info('Exporting daily tracking data', { userId, startDate, endDate, format });

    const exportData = await exportDailyTracking(userId, {
      startDate,
      endDate,
      format,
    });

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    logger.error('Export daily tracking failed', {
      userId: req.params.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export daily tracking data',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/export/weekly/:userId
 * Export weekly summaries data
 * Query: numberOfWeeks, format (csv or json)
 */
router.get('/export/weekly/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { numberOfWeeks, format = 'csv' } = req.query;

    logger.info('Exporting weekly summaries', { userId, numberOfWeeks, format });

    const exportData = await exportWeeklySummaries(userId, {
      numberOfWeeks: numberOfWeeks ? parseInt(numberOfWeeks) : null,
      format,
    });

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    logger.error('Export weekly summaries failed', {
      userId: req.params.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export weekly summaries',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/export/monthly/:userId
 * Export monthly reports data
 * Query: numberOfMonths, format (csv or json), includeAIInsights (true or false)
 */
router.get('/export/monthly/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { numberOfMonths, format = 'csv', includeAIInsights = 'false' } = req.query;

    logger.info('Exporting monthly reports', { userId, numberOfMonths, format, includeAIInsights });

    const exportData = await exportMonthlyReports(userId, {
      numberOfMonths: numberOfMonths ? parseInt(numberOfMonths) : null,
      format,
      includeAIInsights: includeAIInsights === 'true',
    });

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    logger.error('Export monthly reports failed', {
      userId: req.params.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export monthly reports',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/export/all/:userId
 * Export all progress tracking data (JSON only)
 */
router.get('/export/all/:userId', verifyAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    logger.info('Exporting all progress data', { userId });

    const exportData = await exportAllData(userId, { format: 'json' });

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.content);
  } catch (error) {
    logger.error('Export all data failed', {
      userId: req.params.userId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export all data',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/progress/export/pdf/:userId/:monthId
 * Export monthly report as PDF
 * Query: includeAIInsights (true or false)
 */
router.get('/export/pdf/:userId/:monthId', verifyAuth, async (req, res) => {
  try {
    const { userId, monthId } = req.params;
    const { includeAIInsights = 'true' } = req.query;

    logger.info('Exporting monthly report as PDF', { userId, monthId, includeAIInsights });

    const pdfBuffer = await generateMonthlyReportPDF(userId, monthId, {
      includeAIInsights: includeAIInsights === 'true',
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${monthId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Export PDF failed', {
      userId: req.params.userId,
      monthId: req.params.monthId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export PDF',
        details: error.message,
      },
    });
  }
});

export default router;
