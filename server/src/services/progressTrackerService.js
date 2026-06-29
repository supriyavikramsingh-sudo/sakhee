/**
 * Progress Tracker Service
 * Handles all database operations for period tracking, daily tracking, ovulation, and reports
 */

import { db, FieldValue, Timestamp } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('ProgressTrackerService');

// =====================================================
// PERIOD TRACKING FUNCTIONS
// =====================================================

/**
 * Initialize period tracking setup
 */
export async function initializePeriodSetup(userId, setupData) {
  try {
    const setupRef = db.collection('periodTracking').doc(userId);

    const dataToSave = {
      ...setupData,
      setupCompletedAt: FieldValue.serverTimestamp(),
      setupCompleted: true,
    };

    await setupRef.set(dataToSave);

    logger.info('Period setup initialized', { userId });
    return { success: true, data: dataToSave };
  } catch (error) {
    logger.error('Failed to initialize period setup', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get period tracking setup
 */
export async function getPeriodSetup(userId) {
  try {
    const setupRef = db.collection('periodTracking').doc(userId);
    const setupDoc = await setupRef.get();

    if (!setupDoc.exists) {
      return { setupCompleted: false };
    }

    return setupDoc.data();
  } catch (error) {
    logger.error('Failed to get period setup', { userId, error: error.message });
    throw error;
  }
}

/**
 * Validate period dates
 */
async function validatePeriodDates(userId, startDate, endDate, excludeCycleId = null) {
  // Calculate period duration
  const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Validation 1: Period duration checks
  if (duration < 0) {
    throw new Error('End date must be after start date');
  }

  if (duration > 20) {
    throw new Error(
      'Period duration exceeds 20 days. Please verify your dates or consult your doctor if this is accurate.'
    );
  }

  // Warning for long periods (10-20 days) - we'll return this as a warning, not block
  const warnings = [];
  if (duration > 10) {
    warnings.push(
      "This period is longer than typical (10+ days). People with PCOS can have extended spotting, but if you're concerned, consult your doctor."
    );
  }

  // Validation 2: Check for overlapping periods
  const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
  const snapshot = await cyclesRef.get();

  snapshot.forEach((doc) => {
    const existingCycle = doc.data();

    // Skip validation against the cycle being edited
    if (excludeCycleId && existingCycle.cycleId === excludeCycleId) {
      return;
    }

    const existingStart = existingCycle.startDate?.toDate?.() || new Date(existingCycle.startDate);
    const existingEnd = existingCycle.endDate?.toDate?.() || new Date(existingCycle.endDate);

    // Check if new period overlaps with existing period
    const newPeriodOverlaps =
      (startDate >= existingStart && startDate <= existingEnd) ||
      (endDate >= existingStart && endDate <= existingEnd) ||
      (startDate <= existingStart && endDate >= existingEnd);

    if (newPeriodOverlaps) {
      const existingStartStr = existingStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const existingEndStr = existingEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      throw new Error(
        `This period overlaps with your previous period from ${existingStartStr} to ${existingEndStr}. Please check your dates.`
      );
    }
  });

  // Validation 3: Check cycle length (warning only, not blocking)
  if (snapshot.size > 0) {
    // Get most recent period (excluding the one being edited if applicable)
    const sortedCycles = [];
    snapshot.forEach((doc) => {
      const cycleData = doc.data();
      if (!excludeCycleId || cycleData.cycleId !== excludeCycleId) {
        sortedCycles.push(cycleData);
      }
    });

    if (sortedCycles.length > 0) {
      sortedCycles.sort((a, b) => {
        const dateA = a.startDate?.toDate?.() || new Date(a.startDate);
        const dateB = b.startDate?.toDate?.() || new Date(b.startDate);
        return dateB - dateA;
      });

      const lastPeriodStart =
        sortedCycles[0].startDate?.toDate?.() || new Date(sortedCycles[0].startDate);
      const daysSinceLastPeriod = Math.ceil((startDate - lastPeriodStart) / (1000 * 60 * 60 * 24));

      if (daysSinceLastPeriod < 21) {
        warnings.push(
          'This is a short cycle (less than 21 days). If you experience short cycles frequently, consult your doctor.'
        );
      }
    }
  }

  return { valid: true, warnings };
}

/**
 * Create a new period cycle entry
 */
export async function createCycle(userId, cycleData) {
  try {
    const cycleId = `cycle_${Date.now()}`;
    const cycleRef = db.collection('periodTracking').doc(userId).collection('cycles').doc(cycleId);

    // Convert date strings to Date objects
    let startDate;
    if (cycleData.startDate instanceof Date) {
      startDate = cycleData.startDate;
    } else if (cycleData.startDate?.toDate) {
      // Firestore Timestamp
      startDate = cycleData.startDate.toDate();
    } else if (typeof cycleData.startDate === 'string') {
      // String date like "2025-10-27"
      startDate = new Date(cycleData.startDate);
    } else {
      throw new Error('Invalid startDate format');
    }

    let endDate = null;
    if (cycleData.endDate) {
      if (cycleData.endDate instanceof Date) {
        endDate = cycleData.endDate;
      } else if (cycleData.endDate?.toDate) {
        endDate = cycleData.endDate.toDate();
      } else if (typeof cycleData.endDate === 'string') {
        endDate = new Date(cycleData.endDate);
      }
    }

    // Validate period dates
    const validation = await validatePeriodDates(userId, startDate, endDate);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate cycle length based on previous cycle
    const cycleLength = await calculateCycleLength(userId, startDate);

    // Convert to Firestore Timestamps for storage
    const dataToSave = {
      ...cycleData,
      startDate: Timestamp.fromDate(startDate),
      endDate: endDate ? Timestamp.fromDate(endDate) : null,
      cycleId,
      cycleLength: cycleLength, // Add cycle length
      month: startDate.getMonth() + 1, // 1-12
      year: startDate.getFullYear(),
      loggedAt: FieldValue.serverTimestamp(),
      insightsButtonVisible: true,
      aiInsights: null,
      insightsGeneratedAt: null,
    };

    await cycleRef.set(dataToSave);

    logger.info('Cycle created', { userId, cycleId, cycleLength });
    return { success: true, cycleId, data: dataToSave, warnings: validation.warnings };
  } catch (error) {
    logger.error('Failed to create cycle', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get all cycles for a user
 */
export async function getCycles(userId, limitCount = 6) {
  try {
    const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
    const snapshot = await cyclesRef.orderBy('startDate', 'desc').limit(limitCount).get();

    const cycles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Fetched cycle data:', data);
      cycles.push({
        ...data,
        startDate: data.startDate?.toDate?.() || data.startDate,
        endDate: data.endDate?.toDate?.() || data.endDate,
        loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
        insightsGeneratedAt: data.insightsGeneratedAt?.toDate?.() || data.insightsGeneratedAt,
      });
    });

    // Reverse to return ascending order (oldest first, newest last)
    return cycles.reverse();
  } catch (error) {
    logger.error('Failed to get cycles', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get a specific cycle
 */
export async function getCycle(userId, cycleId) {
  try {
    const cycleRef = db.collection('periodTracking').doc(userId).collection('cycles').doc(cycleId);
    const cycleDoc = await cycleRef.get();

    if (!cycleDoc.exists) {
      return null;
    }

    const data = cycleDoc.data();
    return {
      ...data,
      startDate: data.startDate?.toDate?.() || data.startDate,
      endDate: data.endDate?.toDate?.() || data.endDate,
      loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
      insightsGeneratedAt: data.insightsGeneratedAt?.toDate?.() || data.insightsGeneratedAt,
    };
  } catch (error) {
    logger.error('Failed to get cycle', { userId, cycleId, error: error.message });
    throw error;
  }
}

/**
 * Update an existing cycle
 */
export async function updateCycle(userId, cycleId, updateData) {
  try {
    const cycleRef = db.collection('periodTracking').doc(userId).collection('cycles').doc(cycleId);

    // Check if cycle exists
    const cycleDoc = await cycleRef.get();
    if (!cycleDoc.exists) {
      throw new Error('Cycle not found');
    }

    // Convert date strings to Date objects
    let startDate;
    if (updateData.startDate instanceof Date) {
      startDate = updateData.startDate;
    } else if (updateData.startDate?.toDate) {
      startDate = updateData.startDate.toDate();
    } else if (typeof updateData.startDate === 'string') {
      startDate = new Date(updateData.startDate);
    } else {
      // Use existing startDate if not provided
      const existingData = cycleDoc.data();
      startDate = existingData.startDate?.toDate?.() || existingData.startDate;
    }

    let endDate = null;
    if (updateData.endDate) {
      if (updateData.endDate instanceof Date) {
        endDate = updateData.endDate;
      } else if (updateData.endDate?.toDate) {
        endDate = updateData.endDate.toDate();
      } else if (typeof updateData.endDate === 'string') {
        endDate = new Date(updateData.endDate);
      }
    }

    // Validate period dates (excluding the current cycle being edited)
    const validation = await validatePeriodDates(userId, startDate, endDate, cycleId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Prepare update data
    const dataToUpdate = {
      ...updateData,
      startDate: Timestamp.fromDate(startDate),
      endDate: endDate ? Timestamp.fromDate(endDate) : null,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Remove cycleId and cycleLength from update (don't allow changing these)
    delete dataToUpdate.cycleId;
    delete dataToUpdate.cycleLength;

    await cycleRef.update(dataToUpdate);

    // Recalculate cycle lengths for this cycle and the next one
    const cycles = await getCycles(userId, 50); // Get more cycles to ensure we find neighbors
    const cycleIndex = cycles.findIndex((c) => c.cycleId === cycleId);

    if (cycleIndex !== -1) {
      // Update this cycle's length if there's a previous cycle
      if (cycleIndex > 0) {
        const previousCycle = cycles[cycleIndex - 1];
        const thisCycleLength = Math.ceil(
          Math.abs(startDate.getTime() - new Date(previousCycle.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        await updateCycleLength(userId, cycleId, thisCycleLength);
      }

      // Update next cycle's length if there is one
      if (cycleIndex < cycles.length - 1) {
        const nextCycle = cycles[cycleIndex + 1];
        const nextCycleLength = Math.ceil(
          Math.abs(new Date(nextCycle.startDate).getTime() - startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        await updateCycleLength(userId, nextCycle.cycleId, nextCycleLength);
      }
    }

    logger.info('Cycle updated', { userId, cycleId });
    return { success: true, warnings: validation.warnings };
  } catch (error) {
    logger.error('Failed to update cycle', { userId, cycleId, error: error.message });
    throw error;
  }
}

/**
 * Save AI insights for a cycle
 */
export async function saveCycleInsights(userId, cycleId, insights) {
  try {
    const cycleRef = db.collection('periodTracking').doc(userId).collection('cycles').doc(cycleId);

    await cycleRef.update({
      aiInsights: insights,
      insightsGeneratedAt: FieldValue.serverTimestamp(),
      insightsButtonVisible: false,
    });

    logger.info('Cycle insights saved', { userId, cycleId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to save cycle insights', { userId, cycleId, error: error.message });
    throw error;
  }
}

/**
 * Calculate cycle length based on previous cycle
 */
export async function calculateCycleLength(userId, currentStartDate) {
  try {
    const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
    const snapshot = await cyclesRef.orderBy('startDate', 'desc').limit(1).get();

    if (snapshot.empty) {
      return null; // This is the first cycle, no previous cycle to compare
    }

    const mostRecentCycle = snapshot.docs[0].data();
    const previousStartDate = mostRecentCycle.startDate?.toDate?.() || mostRecentCycle.startDate;
    const currentStart =
      currentStartDate instanceof Date ? currentStartDate : new Date(currentStartDate);

    // Calculate difference between new cycle start and previous cycle start
    // Use floor instead of ceil for accurate day counting
    const diffTime = Math.abs(currentStart.getTime() - new Date(previousStartDate).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    logger.info('Calculated cycle length', {
      userId,
      previousStart: previousStartDate,
      currentStart,
      diffDays,
    });

    return diffDays;
  } catch (error) {
    logger.error('Failed to calculate cycle length', { userId, error: error.message });
    return null;
  }
}

/**
 * Update cycle length for a specific cycle
 */
export async function updateCycleLength(userId, cycleId, cycleLength) {
  try {
    const cycleRef = db.collection('periodTracking').doc(userId).collection('cycles').doc(cycleId);
    await cycleRef.update({ cycleLength });
    logger.info('Updated cycle length', { userId, cycleId, cycleLength });
    return { success: true };
  } catch (error) {
    logger.error('Failed to update cycle length', { userId, cycleId, error: error.message });
    throw error;
  }
}

// =====================================================
// DAILY TRACKING FUNCTIONS
// =====================================================

/**
 * Save daily tracking entry
 */
export async function saveDailyTracking(userId, date, trackingData) {
  try {
    // Format date as YYYY-MM-DD to use as entry ID
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    const dailyRef = db.collection('dailyTracking').doc(userId).collection('entries').doc(dateStr);

    // Calculate cycle day
    const cycleDay = await calculateCurrentCycleDay(userId, new Date(dateStr));

    const dataToSave = {
      ...trackingData,
      date: dateStr,
      cycleDay,
      timestamp: FieldValue.serverTimestamp(),
    };

    await dailyRef.set(dataToSave, { merge: true });

    // NEW (Phase 2): Calculate weekly activity level if exercisedToday is provided
    if (trackingData.exercisedToday !== undefined) {
      try {
        await calculateWeeklyActivityLevel(userId, new Date(dateStr));
        logger.info('Weekly activity level updated', { userId, date: dateStr });
      } catch (activityError) {
        // Don't fail the save if activity calculation fails
        logger.error('Failed to calculate weekly activity (non-fatal)', {
          userId,
          date: dateStr,
          error: activityError.message,
        });
      }
    }

    logger.info('Daily tracking saved', { userId, date: dateStr });
    return { success: true, cycleDay, data: dataToSave };
  } catch (error) {
    logger.error('Failed to save daily tracking', { userId, date, error: error.message });
    throw error;
  }
}

/**
 * Get daily tracking entry for a specific date
 */
export async function getDailyTracking(userId, date) {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dailyRef = db.collection('dailyTracking').doc(userId).collection('entries').doc(dateStr);
    const dailyDoc = await dailyRef.get();

    if (!dailyDoc.exists) {
      return null;
    }

    const data = dailyDoc.data();
    return {
      ...data,
      timestamp: data.timestamp?.toDate?.() || data.timestamp,
    };
  } catch (error) {
    logger.error('Failed to get daily tracking', { userId, date, error: error.message });
    throw error;
  }
}

/**
 * Get daily tracking entries for a date range
 */
export async function getDailyTrackingRange(userId, startDate, endDate) {
  try {
    const dailyRef = db.collection('dailyTracking').doc(userId).collection('entries');

    logger.info('[getDailyTrackingRange] Fetching entries', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      path: `dailyTracking/${userId}/entries`,
    });

    const snapshot = await dailyRef.get();

    logger.info('[getDailyTrackingRange] Snapshot received', {
      userId,
      totalDocs: snapshot.size,
      empty: snapshot.empty,
    });

    const entries = [];
    snapshot.forEach((doc) => {
      const dateStr = doc.id;
      const entryDate = new Date(dateStr);

      logger.info('[getDailyTrackingRange] Processing doc', {
        userId,
        docId: dateStr,
        entryDate: entryDate.toISOString(),
        inRange: entryDate >= startDate && entryDate <= endDate,
        data: doc.data(),
      });

      if (entryDate >= startDate && entryDate <= endDate) {
        const data = doc.data();
        entries.push({
          date: dateStr,
          ...data,
          timestamp: data.timestamp?.toDate?.() || data.timestamp,
        });
      }
    });

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    logger.info('[getDailyTrackingRange] Returning entries', {
      userId,
      count: entries.length,
      entries,
    });

    return entries;
  } catch (error) {
    logger.error('Failed to get daily tracking range', { userId, error: error.message });
    throw error;
  }
}

/**
 * Calculate current cycle day based on latest period start
 */
export async function calculateCurrentCycleDay(userId, currentDate) {
  try {
    const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
    const snapshot = await cyclesRef.orderBy('startDate', 'desc').limit(1).get();

    if (snapshot.empty) {
      return null; // No period logged yet
    }

    const latestCycle = snapshot.docs[0].data();
    const periodStartDate = latestCycle.startDate?.toDate?.() || latestCycle.startDate;

    const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const diffTime = Math.abs(current - periodStartDate);
    const cycleDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return cycleDay;
  } catch (error) {
    logger.error('Failed to calculate cycle day', { userId, error: error.message });
    return null;
  }
}

// =====================================================
// WEIGHT TRACKING FUNCTIONS
// =====================================================

/**
 * Calculate weekly weight average
 */
export async function calculateWeeklyWeightAverage(userId, date) {
  try {
    const targetDate = date instanceof Date ? date : new Date(date);

    // Get last 7 days
    const endDate = new Date(targetDate);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 6);

    const entries = await getDailyTrackingRange(userId, startDate, endDate);
    const weightEntries = entries.filter((e) => e.weight !== undefined && e.weight !== null);

    if (weightEntries.length < 5) {
      logger.info('Insufficient weight entries for weekly average', {
        userId,
        count: weightEntries.length,
      });
      return null; // Need at least 5 entries
    }

    // Calculate average
    const totalWeight = weightEntries.reduce((sum, entry) => sum + parseFloat(entry.weight), 0);
    const average = Math.round((totalWeight / weightEntries.length) * 10) / 10;

    // Get week ID (YYYY-WW format)
    const weekId = getWeekId(targetDate);
    const weekStart = getWeekStart(targetDate);
    const weekEnd = getWeekEnd(targetDate);

    // Calculate TDEE
    const userProfile = await getUserProfile(userId);
    const newTDEE = calculateTDEE(average, userProfile);

    // Check if TDEE changed significantly
    const weeklyRef = db.collection('users').doc(userId).collection('weightTracking').doc(weekId);
    const existingDoc = await weeklyRef.get();
    const existingTDEE = existingDoc.exists ? existingDoc.data().tdeeAtThisWeight : null;
    const mealPlanUpdateNeeded = existingTDEE ? Math.abs(existingTDEE - newTDEE) > 50 : false;

    const weeklyData = {
      average,
      startDate: Timestamp.fromDate(weekStart),
      endDate: Timestamp.fromDate(weekEnd),
      numberOfEntries: weightEntries.length,
      tdeeAtThisWeight: newTDEE,
      mealPlanUpdateNeeded,
      calculatedAt: FieldValue.serverTimestamp(),
    };

    await weeklyRef.set(weeklyData);

    // Update user profile
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      currentWeight: average,
      tdeeRequirement: newTDEE,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Check goal achievement
    if (userProfile.goalWeight) {
      await checkGoalAchievement(userId, average, targetDate);
    }

    logger.info('Weekly weight average calculated', { userId, average, newTDEE });
    return { average, newTDEE, mealPlanUpdateNeeded };
  } catch (error) {
    logger.error('Failed to calculate weekly weight average', { userId, error: error.message });
    throw error;
  }
}

/**
 * Calculate TDEE using Mifflin-St Jeor equation
 */
function calculateTDEE(weight, userProfile) {
  const height = userProfile.profileData?.height_cm || userProfile.height_cm || 160;
  const ageRange = userProfile.profileData?.age || userProfile.age || '25-29';

  // NEW (Phase 2): Use weeklyActivityLevel if available, fallback to onboarding activityLevel
  const activityLevel =
    userProfile.weeklyActivityLevel || // ✅ Calculated from exercise tracking
    userProfile.profileData?.activityLevel || // 🔄 Onboarding value (fallback)
    userProfile.activityLevel || // 🔄 Legacy field (fallback)
    'moderate'; // 🆘 Default

  const weightGoal = userProfile.profileData?.weight_goal || userProfile.weight_goal || 'maintain';

  // Get age from range
  const ageMap = {
    '18-24': 21,
    '25-29': 27,
    '30-34': 32,
    '35-39': 37,
    '40-45': 42.5,
    '56+': 60,
  };
  const age = ageMap[ageRange] || 30;

  // Mifflin-St Jeor equation for women
  const BMR = 10 * weight + 6.25 * height - 5 * age - 161;

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2, // Little to no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 4-5 days/week
    active: 1.725, // Hard exercise 6 days/week
    very: 1.725, // Legacy support
    very_active: 1.9, // Very hard exercise 7 days/week
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  let TDEE = BMR * multiplier;

  // Adjust for goal
  if (weightGoal === 'lose') {
    TDEE *= 0.8; // 20% deficit
  } else if (weightGoal === 'gain') {
    TDEE *= 1.1; // 10% surplus
  }

  return Math.round(TDEE);
}

/**
 * Calculate weekly activity level from exercise tracking
 * Maps exercise days to activity level:
 * 0-1 days = sedentary
 * 2-3 days = light
 * 4-5 days = moderate
 * 6 days = active
 * 7 days = very_active
 *
 * @param {string} userId - User ID
 * @param {Date} weekEndDate - End date of the week (usually today)
 * @returns {Promise<Object>} Activity level and exercise count
 */
export async function calculateWeeklyActivityLevel(userId, weekEndDate = new Date()) {
  try {
    logger.info('Calculating weekly activity level', { userId, weekEndDate });

    // Get last 7 days (including today)
    const endDate = new Date(weekEndDate);
    const startDate = new Date(weekEndDate);
    startDate.setDate(startDate.getDate() - 6); // 6 days ago + today = 7 days

    // Get all daily entries for the week
    const entries = await getDailyTrackingRange(userId, startDate, endDate);

    // Count exercise days (where exercisedToday === true)
    const exerciseDays = entries.filter((e) => e.exercisedToday === true);
    const exerciseCount = exerciseDays.length;

    // Map exercise count to activity level
    let calculatedActivityLevel;
    if (exerciseCount <= 1) {
      calculatedActivityLevel = 'sedentary';
    } else if (exerciseCount <= 3) {
      calculatedActivityLevel = 'light';
    } else if (exerciseCount <= 5) {
      calculatedActivityLevel = 'moderate';
    } else if (exerciseCount === 6) {
      calculatedActivityLevel = 'active';
    } else {
      calculatedActivityLevel = 'very_active';
    }

    // Update user profile with calculated activity level
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      weeklyActivityLevel: calculatedActivityLevel,
      activityCalculatedAt: FieldValue.serverTimestamp(),
    });

    // Save to weekly metrics collection
    const weekId = getWeekId(weekEndDate);
    const weeklyMetricsRef = db.collection('weeklyMetrics').doc(userId).collection('weeks').doc(weekId);
    await weeklyMetricsRef.set({
      weekStartDate: Timestamp.fromDate(startDate),
      weekEndDate: Timestamp.fromDate(endDate),
      exerciseDays: exerciseDays.map((e) => e.date),
      exerciseCount,
      calculatedActivityLevel,
      calculatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('Weekly activity level calculated', {
      userId,
      weekId,
      exerciseCount,
      calculatedActivityLevel,
    });

    return {
      success: true,
      weekId,
      exerciseCount,
      calculatedActivityLevel,
      exerciseDays: exerciseDays.map((e) => e.date),
    };
  } catch (error) {
    logger.error('Failed to calculate weekly activity level', {
      userId,
      weekEndDate,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get user profile helper
 */
async function getUserProfile(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User profile not found');
    }

    return userDoc.data();
  } catch (error) {
    logger.error('Failed to get user profile', { userId, error: error.message });
    throw error;
  }
}

/**
 * Check if goal weight achieved
 */
async function checkGoalAchievement(userId, currentWeight, date) {
  try {
    const userProfile = await getUserProfile(userId);
    const goalWeight = userProfile.profileData?.target_weight_kg || userProfile.goalWeight;

    if (!goalWeight) return;

    const diff = Math.abs(currentWeight - parseFloat(goalWeight));

    if (diff <= 0.1) {
      // Goal achieved!
      const achievementRef = db.collection('users').doc(userId).collection('weightTracking').doc('goalAchievement');

      await achievementRef.set({
        goalAchieved: true,
        achievedDate: Timestamp.fromDate(date instanceof Date ? date : new Date(date)),
        achievedWeight: currentWeight,
        bannerDismissed: false,
      });

      logger.info('Goal weight achieved!', { userId, goalWeight, currentWeight });
    }
  } catch (error) {
    logger.error('Failed to check goal achievement', { userId, error: error.message });
  }
}

/**
 * Get goal achievement status
 */
export async function getGoalAchievement(userId) {
  try {
    const achievementRef = db.collection('users').doc(userId).collection('weightTracking').doc('goalAchievement');
    const achievementDoc = await achievementRef.get();

    if (!achievementDoc.exists) {
      return { goalAchieved: false };
    }

    const data = achievementDoc.data();
    return {
      ...data,
      achievedDate: data.achievedDate?.toDate?.() || data.achievedDate,
    };
  } catch (error) {
    logger.error('Failed to get goal achievement', { userId, error: error.message });
    throw error;
  }
}

/**
 * Dismiss goal achievement banner
 */
export async function dismissGoalBanner(userId) {
  try {
    const achievementRef = db.collection('users').doc(userId).collection('weightTracking').doc('goalAchievement');

    await achievementRef.update({ bannerDismissed: true });

    logger.info('Goal banner dismissed', { userId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to dismiss goal banner', { userId, error: error.message });
    throw error;
  }
}

// =====================================================
// OVULATION TRACKING FUNCTIONS
// =====================================================

/**
 * Calculate ovulation score from daily data
 */
export function calculateOvulationScore(dailyData) {
  const mucusScores = {
    Dry: 0,
    Sticky: 1,
    Creamy: 2,
    Watery: 3,
    'Egg-white/stretchy': 4,
  };

  const painScores = {
    No: 0,
    Mild: 1,
    Moderate: 2,
    Severe: 3,
  };

  const libidoScores = {
    'Lower than usual': 0,
    Normal: 1,
    'Higher than usual': 2,
  };

  const bbtScores = {
    Yes: 3,
    No: 0,
    'Did not check': 0,
  };

  const mucusScore = (mucusScores[dailyData.cervicalMucus] || 0) * 3;
  const painScore = (painScores[dailyData.ovulationPain] || 0) * 1;
  const libidoScore = (libidoScores[dailyData.libido] || 0) * 1;
  const bbtScore = (bbtScores[dailyData.bbtRise] || 0) * 3;

  const totalScore = mucusScore + painScore + libidoScore + bbtScore;

  let fertilityStatus;
  if (totalScore <= 6) fertilityStatus = 'Low chance';
  else if (totalScore <= 14) fertilityStatus = 'Medium chance';
  else fertilityStatus = 'High chance';

  return {
    mucusScore: mucusScores[dailyData.cervicalMucus] || 0,
    painScore: painScores[dailyData.ovulationPain] || 0,
    libidoScore: libidoScores[dailyData.libido] || 0,
    bbtScore:
      bbtScores[dailyData.bbtRise] === 'Did not check' ? 0 : bbtScores[dailyData.bbtRise] || 0,
    totalScore,
    fertilityStatus,
  };
}

/**
 * Save daily ovulation score
 */
export async function saveDailyOvulationScore(userId, cycleId, date, scoreData) {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    const scoreRef = db.collection('users').doc(userId)
      .collection('ovulationPrediction').doc(cycleId)
      .collection('dailyScores').doc(dateStr);

    const dataToSave = {
      ...scoreData,
      calculatedAt: FieldValue.serverTimestamp(),
    };

    await scoreRef.set(dataToSave);

    logger.info('Ovulation score saved', { userId, cycleId, date: dateStr });
    return { success: true };
  } catch (error) {
    logger.error('Failed to save ovulation score', { userId, cycleId, date, error: error.message });
    throw error;
  }
}

/**
 * Get current cycle ID
 */
export async function getCurrentCycleId(userId) {
  try {
    const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
    const snapshot = await cyclesRef.orderBy('startDate', 'desc').limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().cycleId;
  } catch (error) {
    logger.error('Failed to get current cycle ID', { userId, error: error.message });
    return null;
  }
}

/**
 * Get ovulation prediction based on tracked data
 */
export async function getOvulationPrediction(userId) {
  try {
    // Get current cycle info
    const cyclesRef = db.collection('periodTracking').doc(userId).collection('cycles');
    const cycleSnapshot = await cyclesRef.orderBy('startDate', 'desc').limit(1).get();

    if (cycleSnapshot.empty) {
      return {
        method: 'none',
        message: 'No period logged yet',
        ovulationDate: null,
        fertileWindowStart: null,
        fertileWindowEnd: null,
        confidence: 0,
      };
    }

    const currentCycle = cycleSnapshot.docs[0].data();
    const cycleStartDate = currentCycle.startDate?.toDate?.() || new Date(currentCycle.startDate);
    const cycleLength = currentCycle.cycleLength || 28;

    // Get daily tracking data for current cycle
    const dailyRef = db.collection('dailyTracking').doc(userId).collection('entries');
    const dailySnapshot = await dailyRef.get();

    const ovulationScores = [];
    dailySnapshot.forEach((doc) => {
      const data = doc.data();
      const entryDate = new Date(data.date);

      // Only include entries from current cycle
      if (entryDate >= cycleStartDate && data.ovulationScore) {
        ovulationScores.push({
          date: data.date,
          score: data.ovulationScore.totalScore,
          confidence: data.ovulationScore.confidenceLevel,
        });
      }
    });

    // If we have tracked data with high scores, use data-driven prediction
    if (ovulationScores.length >= 3) {
      // Find peak ovulation score
      ovulationScores.sort((a, b) => b.score - a.score);
      const peakScore = ovulationScores[0];

      if (peakScore.score >= 60) {
        // High confidence data-driven prediction
        const ovulationDate = new Date(peakScore.date);
        const fertileStart = new Date(ovulationDate);
        fertileStart.setDate(fertileStart.getDate() - 5);
        const fertileEnd = new Date(ovulationDate);
        fertileEnd.setDate(fertileEnd.getDate() + 1);

        return {
          method: 'data-driven',
          message: 'Based on your tracked symptoms',
          ovulationDate: ovulationDate.toISOString().split('T')[0],
          fertileWindowStart: fertileStart.toISOString().split('T')[0],
          fertileWindowEnd: fertileEnd.toISOString().split('T')[0],
          confidence: peakScore.confidence,
          peakScore: peakScore.score,
        };
      }
    }

    // Fallback to formula-based estimation
    const ovulationDay = cycleLength - 14;
    const ovulationDate = new Date(cycleStartDate);
    ovulationDate.setDate(cycleStartDate.getDate() + ovulationDay - 1);

    const fertileStart = new Date(cycleStartDate);
    fertileStart.setDate(cycleStartDate.getDate() + ovulationDay - 6);

    const fertileEnd = new Date(ovulationDate);
    fertileEnd.setDate(ovulationDate.getDate() + 1);

    return {
      method: 'estimated',
      message: 'Estimated from cycle average - track symptoms for accuracy',
      ovulationDate: ovulationDate.toISOString().split('T')[0],
      fertileWindowStart: fertileStart.toISOString().split('T')[0],
      fertileWindowEnd: fertileEnd.toISOString().split('T')[0],
      confidence: 40, // Low confidence for estimates
      cycleLength,
    };
  } catch (error) {
    logger.error('Failed to get ovulation prediction', { userId, error: error.message });
    throw error;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get week ID in YYYY-WW format
 */
function getWeekId(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();

  // Get week number
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);

  return `${year}-${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get Monday of the week for a given date
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get Sunday of the week for a given date
 */
function getWeekEnd(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// =====================================================
// WEEKLY SYMPTOMS FUNCTIONS
// =====================================================

/**
 * Save weekly symptoms
 */
export async function saveWeeklySymptoms(userId, weekId, symptomData) {
  try {
    const symptomsRef = db.collection('weeklySymptoms').doc(userId).collection('weeks').doc(weekId);

    const dataToSave = {
      weekId,
      ...symptomData,
      loggedAt: FieldValue.serverTimestamp(),
    };

    await symptomsRef.set(dataToSave, { merge: true });

    logger.info('Weekly symptoms saved', { userId, weekId });
    return { success: true, data: dataToSave };
  } catch (error) {
    logger.error('Failed to save weekly symptoms', { userId, weekId, error: error.message });
    throw error;
  }
}

/**
 * Get weekly symptoms for a specific week
 */
export async function getWeeklySymptoms(userId, weekId) {
  try {
    const symptomsRef = db.collection('weeklySymptoms').doc(userId).collection('weeks').doc(weekId);
    const symptomsDoc = await symptomsRef.get();

    if (!symptomsDoc.exists) {
      logger.info('Weekly symptoms not found', { userId, weekId });
      return null;
    }

    const data = symptomsDoc.data();
    return {
      ...data,
      loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
    };
  } catch (error) {
    logger.error('Failed to get weekly symptoms', { userId, weekId, error: error.message });
    throw error;
  }
}

/**
 * Get weekly symptoms for a date range
 */
export async function getWeeklySymptomsRange(userId, startWeek, endWeek) {
  try {
    const symptomsRef = db.collection('weeklySymptoms').doc(userId).collection('weeks');
    const snapshot = await symptomsRef.get();

    const symptoms = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const weekId = data.weekId;

      // Filter by date range if provided
      if (startWeek && weekId < startWeek) return;
      if (endWeek && weekId > endWeek) return;

      symptoms.push({
        ...data,
        loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
      });
    });

    // Sort by weekId descending
    symptoms.sort((a, b) => b.weekId.localeCompare(a.weekId));

    return symptoms;
  } catch (error) {
    logger.error('Failed to get weekly symptoms range', {
      userId,
      startWeek,
      endWeek,
      error: error.message,
    });
    throw error;
  }
}

// =====================================================
// WEEKLY SUMMARY FUNCTIONS
// =====================================================

/**
 * Get weekly summary for a specific week
 */
export async function getWeeklySummary(userId, weekId) {
  try {
    const summaryRef = db.collection('weeklySummaries').doc(userId).collection('weeks').doc(weekId);
    const summaryDoc = await summaryRef.get();

    if (!summaryDoc.exists) {
      logger.info('Weekly summary not found', { userId, weekId });
      return null;
    }

    return summaryDoc.data();
  } catch (error) {
    logger.error('Failed to get weekly summary', { userId, weekId, error: error.message });
    throw error;
  }
}

/**
 * Get multiple weekly summaries
 */
export async function getWeeklySummariesRange(userId, numberOfWeeks = 12) {
  try {
    const summariesRef = db.collection('weeklySummaries').doc(userId).collection('weeks');
    const snapshot = await summariesRef.orderBy('startDate', 'desc').limit(numberOfWeeks).get();

    if (snapshot.empty) {
      logger.info('No weekly summaries found', { userId });
      return [];
    }

    return snapshot.docs.map((doc) => ({
      weekId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Failed to get weekly summaries range', { userId, error: error.message });
    throw error;
  }
}

/**
 * Aggregate weekly data from all tracking sources
 */
async function aggregateWeeklyData(userId, weekId, startDate, endDate) {
  try {
    const data = {
      weekId,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      daysLogged: 0,
      weightChange: 0,
      weightTrend: 'stable',
      avgOvulationScore: 0,
      topSymptoms: [],
      cyclePhase: null,
      highlights: [],
      concerns: [],
      recommendations: [],
      mentalHealthAvg: {
        anxiety: 0,
        depression: 0,
        moodSwings: 0,
      },
    };

    // Get daily tracking entries for the week
    const dailyEntries = await getDailyTrackingRange(userId, startDate, endDate);
    data.daysLogged = dailyEntries.length;

    if (dailyEntries.length === 0) {
      logger.info('No daily tracking data for week', { userId, weekId });
      return data;
    }

    // Calculate weight change
    const weightsWithDates = dailyEntries
      .filter((e) => e.weight !== undefined && e.weight !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (weightsWithDates.length >= 2) {
      const firstWeight = weightsWithDates[0].weight;
      const lastWeight = weightsWithDates[weightsWithDates.length - 1].weight;
      data.weightChange = lastWeight - firstWeight;

      if (data.weightChange > 0.2) data.weightTrend = 'gain';
      else if (data.weightChange < -0.2) data.weightTrend = 'loss';
      else data.weightTrend = 'stable';
    }

    // Calculate average ovulation score
    const ovulationScores = dailyEntries
      .filter((e) => e.ovulationScore !== undefined)
      .map((e) => e.ovulationScore);

    if (ovulationScores.length > 0) {
      data.avgOvulationScore = Math.round(
        ovulationScores.reduce((sum, score) => sum + score, 0) / ovulationScores.length
      );
    }

    // Aggregate weekly symptoms (if any were logged this week)
    const weeklySymptomRef = db.collection('weeklySymptoms').doc(userId).collection('weeks').doc(weekId);
    const weeklySymptomDoc = await weeklySymptomRef.get();

    if (weeklySymptomDoc.exists) {
      const symptoms = weeklySymptomDoc.data().symptoms || {};

      // Get top 3 most severe symptoms
      const symptomArray = Object.entries(symptoms)
        .filter(([_, value]) => value.severity > 0)
        .map(([name, value]) => ({
          name,
          severity: value.severity,
          trend: value.trend || 'stable',
        }))
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 3);

      data.topSymptoms = symptomArray;

      // Calculate mental health averages
      const mentalHealthSymptoms = ['anxiety', 'depression', 'moodSwings'];
      let count = 0;
      let anxietySum = 0;
      let depressionSum = 0;
      let moodSwingsSum = 0;

      mentalHealthSymptoms.forEach((symptom) => {
        if (symptoms[symptom] && symptoms[symptom].severity > 0) {
          count++;
          if (symptom === 'anxiety') anxietySum = symptoms[symptom].severity;
          if (symptom === 'depression') depressionSum = symptoms[symptom].severity;
          if (symptom === 'moodSwings') moodSwingsSum = symptoms[symptom].severity;
        }
      });

      if (count > 0) {
        data.mentalHealthAvg.anxiety = anxietySum;
        data.mentalHealthAvg.depression = depressionSum;
        data.mentalHealthAvg.moodSwings = moodSwingsSum;
      }
    }

    // Determine cycle phase (if period tracking exists)
    const currentCycleId = await getCurrentCycleId(userId);
    if (currentCycleId) {
      const cycleDay = await calculateCurrentCycleDay(userId, new Date());

      if (cycleDay <= 5) data.cyclePhase = 'menstrual';
      else if (cycleDay <= 13) data.cyclePhase = 'follicular';
      else if (cycleDay <= 17) data.cyclePhase = 'ovulation';
      else data.cyclePhase = 'luteal';
    }

    // Generate highlights
    if (data.weightTrend === 'loss' && data.weightChange < -0.5) {
      data.highlights.push(`Lost ${Math.abs(data.weightChange).toFixed(1)}kg this week`);
    }
    if (data.daysLogged >= 6) {
      data.highlights.push('Consistent tracking - 6+ days logged');
    }
    if (data.avgOvulationScore >= 7) {
      data.highlights.push('High ovulation score - fertile window detected');
    }

    // Generate concerns
    if (data.weightTrend === 'gain' && data.weightChange > 1) {
      data.concerns.push(`Rapid weight gain: +${data.weightChange.toFixed(1)}kg`);
    }
    if (data.daysLogged < 3) {
      data.concerns.push('Low tracking consistency - only ' + data.daysLogged + ' days logged');
    }
    if (data.mentalHealthAvg.anxiety >= 7 || data.mentalHealthAvg.depression >= 7) {
      data.concerns.push('High mental health symptoms detected');
    }

    // Generate recommendations
    if (data.weightTrend === 'gain') {
      data.recommendations.push('Review your meal plans and activity levels');
      data.recommendations.push('Consider consulting with a nutritionist');
    }
    if (data.daysLogged < 5) {
      data.recommendations.push('Try to log your daily tracking more consistently');
    }
    if (data.topSymptoms.length > 0) {
      data.recommendations.push(
        'Track your top symptoms and discuss with your healthcare provider'
      );
    }
    if (data.mentalHealthAvg.anxiety >= 5 || data.mentalHealthAvg.depression >= 5) {
      data.recommendations.push('Consider stress management techniques like meditation or yoga');
    }

    return data;
  } catch (error) {
    logger.error('Failed to aggregate weekly data', { userId, weekId, error: error.message });
    throw error;
  }
}

/**
 * Generate weekly summary for a specific week
 */
export async function generateWeeklySummary(userId, weekId) {
  try {
    // Parse weekId to get start and end dates
    const [year, week] = weekId.split('-').map(Number);

    // Calculate start date (Monday) of the week
    const januaryFirst = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7;
    const weekStart = new Date(januaryFirst);
    weekStart.setDate(januaryFirst.getDate() + daysOffset);

    // Adjust to Monday
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diff);

    // Calculate end date (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    logger.info('Generating weekly summary', {
      userId,
      weekId,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    });

    // Aggregate data
    const summaryData = await aggregateWeeklyData(userId, weekId, weekStart, weekEnd);

    // Save to Firestore
    const summaryRef = db.collection('weeklySummaries').doc(userId).collection('weeks').doc(weekId);

    const dataToSave = {
      ...summaryData,
      generatedAt: FieldValue.serverTimestamp(),
    };

    await summaryRef.set(dataToSave, { merge: true });

    logger.info('Weekly summary generated', { userId, weekId });

    return {
      success: true,
      weekId,
      data: dataToSave,
    };
  } catch (error) {
    logger.error('Failed to generate weekly summary', { userId, weekId, error: error.message });
    throw error;
  }
}

// =====================================================
// MONTHLY REPORT FUNCTIONS
// =====================================================

/**
 * Get monthly report for a specific month
 */
export async function getMonthlyReport(userId, monthId) {
  try {
    const reportRef = db.collection('monthlyReports').doc(userId).collection('months').doc(monthId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      logger.info('Monthly report not found', { userId, monthId });
      return null;
    }

    return reportDoc.data();
  } catch (error) {
    logger.error('Failed to get monthly report', { userId, monthId, error: error.message });
    throw error;
  }
}

/**
 * Get multiple monthly reports
 */
export async function getMonthlyReportsRange(userId, numberOfMonths = 6) {
  try {
    const reportsRef = db.collection('monthlyReports').doc(userId).collection('months');
    const snapshot = await reportsRef.orderBy('startDate', 'desc').limit(numberOfMonths).get();

    if (snapshot.empty) {
      logger.info('No monthly reports found', { userId });
      return [];
    }

    return snapshot.docs.map((doc) => ({
      monthId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Failed to get monthly reports range', { userId, error: error.message });
    throw error;
  }
}

/**
 * Aggregate monthly data from all tracking sources
 */
async function aggregateMonthlyData(userId, monthId, startDate, endDate) {
  try {
    const [year, month] = monthId.split('-').map(Number);

    const data = {
      monthId,
      month,
      year,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      totalDaysTracked: 0,
      trackingCompletion: 0,

      // Weight metrics
      weightData: [],
      startWeight: 0,
      endWeight: 0,
      weightChange: 0,
      weightTrend: 'stable',
      avgWeight: 0,

      // Period metrics
      periodsLogged: 0,
      avgCycleLength: null,
      cycleRegularity: 'unknown',

      // Symptom patterns
      topSymptoms: [],

      // Ovulation metrics
      avgOvulationScore: 0,
      ovulationRegularity: 'unknown',
      fertileWindowsDetected: 0,

      // Mental health
      mentalHealthAvg: {
        anxiety: 0,
        depression: 0,
        moodSwings: 0,
      },

      // Activity & lifestyle
      avgActivityLevel: 0,
      avgSleepQuality: 0,
      avgEnergyLevel: 0,

      // Insights
      achievements: [],
      concerns: [],
      recommendations: [],
    };

    // Get daily tracking entries for the month
    const dailyEntries = await getDailyTrackingRange(userId, startDate, endDate);
    data.totalDaysTracked = dailyEntries.length;

    const daysInMonth = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    data.trackingCompletion = Math.round((dailyEntries.length / daysInMonth) * 100);

    if (dailyEntries.length === 0) {
      logger.info('No daily tracking data for month', { userId, monthId });
      return data;
    }

    // Calculate weight metrics
    const weightsWithDates = dailyEntries
      .filter((e) => e.weight !== undefined && e.weight !== null)
      .map((e) => ({ date: e.date, weight: e.weight }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (weightsWithDates.length > 0) {
      data.weightData = weightsWithDates;
      data.startWeight = weightsWithDates[0].weight;
      data.endWeight = weightsWithDates[weightsWithDates.length - 1].weight;
      data.weightChange = data.endWeight - data.startWeight;

      // Calculate average weight
      const totalWeight = weightsWithDates.reduce((sum, entry) => sum + entry.weight, 0);
      data.avgWeight = totalWeight / weightsWithDates.length;

      // Determine trend
      if (data.weightChange > 0.5) data.weightTrend = 'gain';
      else if (data.weightChange < -0.5) data.weightTrend = 'loss';
      else data.weightTrend = 'stable';
    }

    // Calculate activity, sleep, and energy averages
    const activityLevels = dailyEntries.filter((e) => e.activityLevel).map((e) => e.activityLevel);
    const sleepQualities = dailyEntries.filter((e) => e.sleepQuality).map((e) => e.sleepQuality);
    const energyLevels = dailyEntries.filter((e) => e.energyLevel).map((e) => e.energyLevel);

    if (activityLevels.length > 0) {
      data.avgActivityLevel = Math.round(
        activityLevels.reduce((sum, val) => sum + val, 0) / activityLevels.length
      );
    }
    if (sleepQualities.length > 0) {
      data.avgSleepQuality = Math.round(
        sleepQualities.reduce((sum, val) => sum + val, 0) / sleepQualities.length
      );
    }
    if (energyLevels.length > 0) {
      data.avgEnergyLevel = Math.round(
        energyLevels.reduce((sum, val) => sum + val, 0) / energyLevels.length
      );
    }

    // Calculate ovulation averages
    const ovulationScores = dailyEntries
      .filter((e) => e.ovulationScore !== undefined)
      .map((e) => e.ovulationScore);

    if (ovulationScores.length > 0) {
      data.avgOvulationScore = Math.round(
        ovulationScores.reduce((sum, score) => sum + score, 0) / ovulationScores.length
      );

      // Detect fertile windows (score >= 7)
      data.fertileWindowsDetected = ovulationScores.filter((score) => score >= 7).length;

      // Determine ovulation regularity (simplified - can be enhanced)
      data.ovulationRegularity = data.fertileWindowsDetected >= 1 ? 'regular' : 'irregular';
    }

    // Get period cycles for the month
    const cyclesSnapshot = await db.collection('periodTracking').doc(userId).collection('cycles')
      .where('month', '==', month).where('year', '==', year).get();

    data.periodsLogged = cyclesSnapshot.size;

    if (cyclesSnapshot.size > 0) {
      const cycleLengths = cyclesSnapshot.docs
        .map((doc) => doc.data().cycleLength)
        .filter((length) => length !== null && length !== undefined);

      if (cycleLengths.length > 0) {
        data.avgCycleLength = Math.round(
          cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
        );

        // Determine regularity (28 ±7 days is regular)
        const variance = cycleLengths.map((l) => Math.abs(l - 28));
        const avgVariance = variance.reduce((sum, v) => sum + v, 0) / variance.length;
        data.cycleRegularity = avgVariance <= 7 ? 'regular' : 'irregular';
      }
    }

    // Aggregate symptoms from weekly summaries
    const symptomMap = new Map();

    // Get all weeks in this month
    const weeksInMonth = [];
    let currentWeekStart = new Date(startDate);
    while (currentWeekStart < endDate) {
      const weekId = getWeekId(currentWeekStart);
      weeksInMonth.push(weekId);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Fetch weekly symptoms for each week
    for (const weekId of weeksInMonth) {
      const weeklySymptomRef = db.collection('weeklySymptoms').doc(userId).collection('weeks').doc(weekId);
      const weeklySymptomDoc = await weeklySymptomRef.get();

      if (weeklySymptomDoc.exists) {
        const symptoms = weeklySymptomDoc.data().symptoms || {};

        Object.entries(symptoms).forEach(([name, value]) => {
          if (value.severity > 0) {
            if (!symptomMap.has(name)) {
              symptomMap.set(name, {
                name,
                totalSeverity: 0,
                count: 0,
                severities: [],
              });
            }

            const symptom = symptomMap.get(name);
            symptom.totalSeverity += value.severity;
            symptom.count += 1;
            symptom.severities.push(value.severity);
          }
        });
      }
    }

    // Calculate top symptoms and trends
    const symptomArray = Array.from(symptomMap.values())
      .map((symptom) => ({
        name: symptom.name,
        avgSeverity: symptom.totalSeverity / symptom.count,
        frequency: symptom.count,
        trend: calculateSymptomTrend(symptom.severities),
      }))
      .sort((a, b) => b.avgSeverity - a.avgSeverity)
      .slice(0, 5); // Top 5 symptoms

    data.topSymptoms = symptomArray;

    // Calculate mental health averages from weekly data
    const mentalHealthData = {
      anxiety: [],
      depression: [],
      moodSwings: [],
    };

    for (const weekId of weeksInMonth) {
      const weeklySymptomRef = db.collection('weeklySymptoms').doc(userId).collection('weeks').doc(weekId);
      const weeklySymptomDoc = await weeklySymptomRef.get();

      if (weeklySymptomDoc.exists) {
        const symptoms = weeklySymptomDoc.data().symptoms || {};

        if (symptoms.anxiety?.severity) mentalHealthData.anxiety.push(symptoms.anxiety.severity);
        if (symptoms.depression?.severity)
          mentalHealthData.depression.push(symptoms.depression.severity);
        if (symptoms.moodSwings?.severity)
          mentalHealthData.moodSwings.push(symptoms.moodSwings.severity);
      }
    }

    if (mentalHealthData.anxiety.length > 0) {
      data.mentalHealthAvg.anxiety = Math.round(
        mentalHealthData.anxiety.reduce((sum, val) => sum + val, 0) /
          mentalHealthData.anxiety.length
      );
    }
    if (mentalHealthData.depression.length > 0) {
      data.mentalHealthAvg.depression = Math.round(
        mentalHealthData.depression.reduce((sum, val) => sum + val, 0) /
          mentalHealthData.depression.length
      );
    }
    if (mentalHealthData.moodSwings.length > 0) {
      data.mentalHealthAvg.moodSwings = Math.round(
        mentalHealthData.moodSwings.reduce((sum, val) => sum + val, 0) /
          mentalHealthData.moodSwings.length
      );
    }

    // Generate achievements
    if (data.weightTrend === 'loss' && data.weightChange < -1) {
      data.achievements.push(`Lost ${Math.abs(data.weightChange).toFixed(1)}kg this month`);
    }
    if (data.trackingCompletion >= 85) {
      data.achievements.push('Excellent tracking consistency - 85%+ completion');
    }
    if (data.cycleRegularity === 'regular') {
      data.achievements.push('Regular menstrual cycles maintained');
    }
    if (data.avgActivityLevel >= 4) {
      data.achievements.push('High activity levels maintained');
    }
    if (data.avgSleepQuality >= 4) {
      data.achievements.push('Good sleep quality maintained');
    }

    // Generate concerns
    if (data.weightTrend === 'gain' && data.weightChange > 2) {
      data.concerns.push(`Significant weight gain: +${data.weightChange.toFixed(1)}kg`);
    }
    if (data.trackingCompletion < 50) {
      data.concerns.push('Low tracking consistency - less than 50%');
    }
    if (data.mentalHealthAvg.anxiety >= 7 || data.mentalHealthAvg.depression >= 7) {
      data.concerns.push('High mental health symptoms detected');
    }
    if (data.cycleRegularity === 'irregular') {
      data.concerns.push('Irregular menstrual cycles detected');
    }
    if (data.avgEnergyLevel <= 2) {
      data.concerns.push('Low energy levels throughout the month');
    }

    // Generate recommendations
    if (data.weightTrend === 'gain') {
      data.recommendations.push('Consider reviewing your meal plans with a nutritionist');
      data.recommendations.push('Increase activity levels gradually');
    }
    if (data.trackingCompletion < 70) {
      data.recommendations.push('Improve tracking consistency for better insights');
    }
    if (data.topSymptoms.length > 0) {
      data.recommendations.push('Discuss persistent symptoms with your healthcare provider');
    }
    if (data.mentalHealthAvg.anxiety >= 5 || data.mentalHealthAvg.depression >= 5) {
      data.recommendations.push('Consider stress management techniques or counseling');
    }
    if (data.cycleRegularity === 'irregular') {
      data.recommendations.push('Monitor cycle patterns and consult with your doctor');
    }
    if (data.avgSleepQuality <= 2) {
      data.recommendations.push('Focus on improving sleep hygiene and quality');
    }

    return data;
  } catch (error) {
    logger.error('Failed to aggregate monthly data', { userId, monthId, error: error.message });
    throw error;
  }
}

/**
 * Calculate symptom trend from severity array
 */
function calculateSymptomTrend(severities) {
  if (severities.length < 2) return 'stable';

  const firstHalf = severities.slice(0, Math.floor(severities.length / 2));
  const secondHalf = severities.slice(Math.floor(severities.length / 2));

  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const change = secondAvg - firstAvg;

  if (change > 1) return 'increasing';
  if (change < -1) return 'decreasing';
  return 'stable';
}

/**
 * Generate monthly report for a specific month
 */
export async function generateMonthlyReport(userId, monthId) {
  try {
    // Parse monthId to get start and end dates
    const [year, month] = monthId.split('-').map(Number);

    // Calculate first day of month
    const monthStart = new Date(year, month - 1, 1);

    // Calculate last day of month
    const monthEnd = new Date(year, month, 0);

    logger.info('Generating monthly report', {
      userId,
      monthId,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    });

    // Aggregate data
    const reportData = await aggregateMonthlyData(userId, monthId, monthStart, monthEnd);

    // Save to Firestore
    const reportRef = db.collection('monthlyReports').doc(userId).collection('months').doc(monthId);

    const dataToSave = {
      ...reportData,
      generatedAt: FieldValue.serverTimestamp(),
    };

    await reportRef.set(dataToSave, { merge: true });

    logger.info('Monthly report generated', { userId, monthId });

    return {
      success: true,
      monthId,
      data: dataToSave,
    };
  } catch (error) {
    logger.error('Failed to generate monthly report', { userId, monthId, error: error.message });
    throw error;
  }
}

/**
 * Get month ID in YYYY-MM format
 */
function getMonthId(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

export { getWeekId, getWeekStart, getWeekEnd, getMonthId };
