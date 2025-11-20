/**
 * Progress Tracker Service
 * Handles all database operations for period tracking, daily tracking, ovulation, and reports
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
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
    const setupRef = doc(db, 'periodTracking', userId);

    const dataToSave = {
      ...setupData,
      setupCompletedAt: serverTimestamp(),
      setupCompleted: true,
    };

    await setDoc(setupRef, dataToSave);

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
    const setupRef = doc(db, 'periodTracking', userId);
    const setupDoc = await getDoc(setupRef);

    if (!setupDoc.exists()) {
      return { setupCompleted: false };
    }

    return setupDoc.data();
  } catch (error) {
    logger.error('Failed to get period setup', { userId, error: error.message });
    throw error;
  }
}

/**
 * Create a new period cycle entry
 */
export async function createCycle(userId, cycleData) {
  try {
    const cycleId = `cycle_${Date.now()}`;
    const cycleRef = doc(db, 'periodTracking', userId, 'cycles', cycleId);

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

    // Convert to Firestore Timestamps for storage
    const dataToSave = {
      ...cycleData,
      startDate: Timestamp.fromDate(startDate),
      endDate: endDate ? Timestamp.fromDate(endDate) : null,
      cycleId,
      month: startDate.getMonth() + 1, // 1-12
      year: startDate.getFullYear(),
      loggedAt: serverTimestamp(),
      insightsButtonVisible: true,
      aiInsights: null,
      insightsGeneratedAt: null,
    };

    await setDoc(cycleRef, dataToSave);

    logger.info('Cycle created', { userId, cycleId });
    return { success: true, cycleId, data: dataToSave };
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
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    const cycles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      cycles.push({
        ...data,
        startDate: data.startDate?.toDate?.() || data.startDate,
        endDate: data.endDate?.toDate?.() || data.endDate,
        loggedAt: data.loggedAt?.toDate?.() || data.loggedAt,
        insightsGeneratedAt: data.insightsGeneratedAt?.toDate?.() || data.insightsGeneratedAt,
      });
    });

    return cycles;
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
    const cycleRef = doc(db, 'periodTracking', userId, 'cycles', cycleId);
    const cycleDoc = await getDoc(cycleRef);

    if (!cycleDoc.exists()) {
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
 * Save AI insights for a cycle
 */
export async function saveCycleInsights(userId, cycleId, insights) {
  try {
    const cycleRef = doc(db, 'periodTracking', userId, 'cycles', cycleId);

    await updateDoc(cycleRef, {
      aiInsights: insights,
      insightsGeneratedAt: serverTimestamp(),
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
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(2));
    const snapshot = await getDocs(q);

    if (snapshot.size < 2) {
      return null; // Not enough data
    }

    const docs = [];
    snapshot.forEach((doc) => docs.push(doc.data()));

    const previousStartDate = docs[1].startDate?.toDate?.() || docs[1].startDate;
    const currentStart =
      currentStartDate instanceof Date ? currentStartDate : currentStartDate.toDate();

    const diffTime = Math.abs(currentStart - previousStartDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    logger.error('Failed to calculate cycle length', { userId, error: error.message });
    return null;
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

    const dailyRef = doc(db, 'dailyTracking', userId, 'entries', dateStr);

    // Calculate cycle day
    const cycleDay = await calculateCurrentCycleDay(userId, new Date(dateStr));

    const dataToSave = {
      ...trackingData,
      date: dateStr,
      cycleDay,
      timestamp: serverTimestamp(),
    };

    await setDoc(dailyRef, dataToSave, { merge: true });

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
    const dailyRef = doc(db, 'dailyTracking', userId, 'entries', dateStr);
    const dailyDoc = await getDoc(dailyRef);

    if (!dailyDoc.exists()) {
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
    const dailyRef = collection(db, 'dailyTracking', userId, 'entries');
    const snapshot = await getDocs(dailyRef);

    const entries = [];
    snapshot.forEach((doc) => {
      const dateStr = doc.id;
      const entryDate = new Date(dateStr);

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
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(1));
    const snapshot = await getDocs(q);

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
    const weeklyRef = doc(db, 'users', userId, 'weightTracking', 'weeklyAverages', weekId);
    const existingDoc = await getDoc(weeklyRef);
    const existingTDEE = existingDoc.exists() ? existingDoc.data().tdeeAtThisWeight : null;
    const mealPlanUpdateNeeded = existingTDEE ? Math.abs(existingTDEE - newTDEE) > 50 : false;

    const weeklyData = {
      average,
      startDate: Timestamp.fromDate(weekStart),
      endDate: Timestamp.fromDate(weekEnd),
      numberOfEntries: weightEntries.length,
      tdeeAtThisWeight: newTDEE,
      mealPlanUpdateNeeded,
      calculatedAt: serverTimestamp(),
    };

    await setDoc(weeklyRef, weeklyData);

    // Update user profile
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentWeight: average,
      tdeeRequirement: newTDEE,
      updatedAt: serverTimestamp(),
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
  const activityLevel =
    userProfile.profileData?.activityLevel || userProfile.activityLevel || 'moderate';
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
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
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
 * Get user profile helper
 */
async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
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
      const achievementRef = doc(db, 'users', userId, 'weightTracking', 'goalAchievement');

      await setDoc(achievementRef, {
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
    const achievementRef = doc(db, 'users', userId, 'weightTracking', 'goalAchievement');
    const achievementDoc = await getDoc(achievementRef);

    if (!achievementDoc.exists()) {
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
    const achievementRef = doc(db, 'users', userId, 'weightTracking', 'goalAchievement');

    await updateDoc(achievementRef, {
      bannerDismissed: true,
    });

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

    const scoreRef = doc(
      db,
      'users',
      userId,
      'ovulationPrediction',
      cycleId,
      'dailyScores',
      dateStr
    );

    const dataToSave = {
      ...scoreData,
      calculatedAt: serverTimestamp(),
    };

    await setDoc(scoreRef, dataToSave);

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
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().cycleId;
  } catch (error) {
    logger.error('Failed to get current cycle ID', { userId, error: error.message });
    return null;
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
    const symptomsRef = doc(db, 'weeklySymptoms', userId, 'weeks', weekId);

    const dataToSave = {
      weekId,
      ...symptomData,
      loggedAt: serverTimestamp(),
    };

    await setDoc(symptomsRef, dataToSave, { merge: true });

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
    const symptomsRef = doc(db, 'weeklySymptoms', userId, 'weeks', weekId);
    const symptomsDoc = await getDoc(symptomsRef);

    if (!symptomsDoc.exists()) {
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
    const symptomsRef = collection(db, 'weeklySymptoms', userId, 'weeks');
    const snapshot = await getDocs(symptomsRef);

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
    const summaryRef = doc(db, 'weeklySummaries', userId, 'weeks', weekId);
    const summaryDoc = await getDoc(summaryRef);

    if (!summaryDoc.exists()) {
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
    const summariesRef = collection(db, 'weeklySummaries', userId, 'weeks');

    const q = query(summariesRef, orderBy('startDate', 'desc'), limit(numberOfWeeks));

    const snapshot = await getDocs(q);

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
    const weeklySymptomRef = doc(db, 'weeklySymptoms', userId, 'weeks', weekId);
    const weeklySymptomDoc = await getDoc(weeklySymptomRef);

    if (weeklySymptomDoc.exists()) {
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
    const summaryRef = doc(db, 'weeklySummaries', userId, 'weeks', weekId);

    const dataToSave = {
      ...summaryData,
      generatedAt: serverTimestamp(),
    };

    await setDoc(summaryRef, dataToSave, { merge: true });

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
    const reportRef = doc(db, 'monthlyReports', userId, 'months', monthId);
    const reportDoc = await getDoc(reportRef);

    if (!reportDoc.exists()) {
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
    const reportsRef = collection(db, 'monthlyReports', userId, 'months');

    const q = query(reportsRef, orderBy('startDate', 'desc'), limit(numberOfMonths));

    const snapshot = await getDocs(q);

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
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const cyclesQuery = query(cyclesRef, where('month', '==', month), where('year', '==', year));
    const cyclesSnapshot = await getDocs(cyclesQuery);

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
      const weeklySymptomRef = doc(
        db,
        'users',
        userId,
        'progressTracking',
        'weeklySymptoms',
        weekId
      );
      const weeklySymptomDoc = await getDoc(weeklySymptomRef);

      if (weeklySymptomDoc.exists()) {
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
      const weeklySymptomRef = doc(
        db,
        'users',
        userId,
        'progressTracking',
        'weeklySymptoms',
        weekId
      );
      const weeklySymptomDoc = await getDoc(weeklySymptomRef);

      if (weeklySymptomDoc.exists()) {
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
    const reportRef = doc(db, 'monthlyReports', userId, 'months', monthId);

    const dataToSave = {
      ...reportData,
      generatedAt: serverTimestamp(),
    };

    await setDoc(reportRef, dataToSave, { merge: true });

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
