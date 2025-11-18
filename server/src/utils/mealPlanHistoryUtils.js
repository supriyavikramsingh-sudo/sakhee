/**
 * Meal Plan History Utility Functions
 * Handles meal plan naming, Firestore operations for history management
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from './logger.js';

const logger = new Logger('MealPlanHistoryUtils');

/**
 * Generate descriptive meal plan name based on configuration
 * Format: {numberOfDays}-Day {dietType} {regionDescription} {ketoModifier}
 *
 * @param {Object} config - Meal plan configuration
 * @param {number} config.numberOfDays - Number of days in plan
 * @param {string} config.dietType - Diet type (vegetarian, non-vegetarian, vegan, jain)
 * @param {string[]} config.regions - Array of region names
 * @param {boolean} config.isKeto - Whether keto modifier is applied
 * @returns {string} Formatted plan name
 */
export function generateMealPlanName(config) {
  const { numberOfDays, dietType, regions, isKeto } = config;

  // Capitalize diet type properly
  const dietTypeMap = {
    vegetarian: 'Vegetarian',
    'non-vegetarian': 'Non-Vegetarian',
    vegan: 'Vegan',
    jain: 'Jain',
  };
  const formattedDietType = dietTypeMap[dietType] || dietType;

  // Generate region description
  let regionDescription = '';
  const regionCount = regions?.length || 0;

  if (regionCount === 0) {
    regionDescription = 'Indian';
  } else if (regionCount === 1) {
    // Full region name with proper capitalization
    const regionMap = {
      'north-indian': 'North Indian',
      'south-indian': 'South Indian',
      'east-indian': 'East Indian',
      'west-indian': 'West Indian',
      'central-indian': 'Central Indian',
    };
    regionDescription = regionMap[regions[0]] || regions[0];
  } else if (regionCount === 2) {
    // Two regions with "&" separator
    const regionMap = {
      'north-indian': 'North',
      'south-indian': 'South',
      'east-indian': 'East',
      'west-indian': 'West',
      'central-indian': 'Central',
    };
    const region1 = regionMap[regions[0]] || regions[0];
    const region2 = regionMap[regions[1]] || regions[1];
    regionDescription = `${region1} & ${region2} Indian`;
  } else if (regionCount === 3 || regionCount === 4) {
    regionDescription = 'Multi-Region';
  } else if (regionCount >= 5) {
    regionDescription = 'Pan-Indian';
  }

  // Build the name
  let planName = `${numberOfDays}-Day ${formattedDietType} ${regionDescription}`;

  // Add keto modifier if applicable
  if (isKeto) {
    planName += ' Keto';
  }

  return planName;
}

/**
 * Save meal plan to Firestore history
 * Enforces FIFO 5-plan limit
 *
 * @param {string} userId - User ID
 * @param {Object} mealPlanData - Complete meal plan data
 * @returns {Promise<{success: boolean, planId?: string, error?: string, historyFull?: boolean}>}
 */
export async function saveMealPlanToHistory(userId, mealPlanData) {
  try {
    const {
      plan,
      regions,
      cuisines,
      dietType,
      isKeto,
      budget,
      goals,
      duration,
      userCalories,
      ragMetadata,
      performanceMetrics,
      personalizationSources,
    } = mealPlanData;

    // Check existing plan count
    const historyRef = collection(db, 'users', userId, 'mealPlanHistory');
    const historyQuery = query(historyRef, orderBy('generatedAt', 'desc'));
    const historySnapshot = await getDocs(historyQuery);

    const currentPlanCount = historySnapshot.size;

    // If user has 5 plans, return historyFull flag
    if (currentPlanCount >= 5) {
      logger.info('Meal plan history full', {
        userId,
        currentCount: currentPlanCount,
      });
      return {
        success: false,
        historyFull: true,
        error:
          'You have reached the maximum of 5 saved meal plans. Please delete one to save a new plan.',
      };
    }

    // Generate plan ID and name
    const planId = 'plan_' + Date.now();
    const planName = generateMealPlanName({
      numberOfDays: duration || plan.days?.length || 3,
      dietType: dietType || 'vegetarian',
      regions: regions || [],
      isKeto: isKeto || false,
    });

    // Prepare document data
    const planDocument = {
      planId,
      planName,
      generatedAt: new Date(),
      numberOfDays: duration || plan.days?.length || 3,
      dietType: dietType || 'vegetarian',
      regions: regions || [],
      cuisines: cuisines || [],
      isKeto: isKeto || false,
      caloriesPerDay: userCalories || 2000,
      budget: budget || 200,
      goals: goals || [],

      // Complete meal plan data for full reconstruction
      completeMealPlanData: {
        plan,
        ragMetadata,
        performanceMetrics,
        personalizationSources,
      },
    };

    // Save to Firestore
    const planDocRef = doc(db, 'users', userId, 'mealPlanHistory', planId);
    await setDoc(planDocRef, planDocument);

    logger.info('Meal plan saved to history', {
      userId,
      planId,
      planName,
      currentCount: currentPlanCount + 1,
    });

    return {
      success: true,
      planId,
      planName,
    };
  } catch (error) {
    logger.error('Failed to save meal plan to history', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retrieve meal plan history metadata for a user
 * Returns list of up to 5 plans, most recent first
 * Does NOT include completeMealPlanData (for performance)
 *
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, plans?: Array, error?: string}>}
 */
export async function getMealPlanHistory(userId) {
  try {
    const historyRef = collection(db, 'users', userId, 'mealPlanHistory');
    const historyQuery = query(historyRef, orderBy('generatedAt', 'desc'), firestoreLimit(5));
    const historySnapshot = await getDocs(historyQuery);

    const plans = [];
    historySnapshot.forEach((doc) => {
      const data = doc.data();
      // Return metadata only, exclude completeMealPlanData
      plans.push({
        planId: data.planId,
        planName: data.planName,
        generatedAt: data.generatedAt,
        numberOfDays: data.numberOfDays,
        dietType: data.dietType,
        regions: data.regions,
        cuisines: data.cuisines,
        isKeto: data.isKeto,
        caloriesPerDay: data.caloriesPerDay,
        budget: data.budget,
        goals: data.goals,
      });
    });

    logger.info('Meal plan history retrieved', {
      userId,
      planCount: plans.length,
    });

    return {
      success: true,
      plans,
    };
  } catch (error) {
    logger.error('Failed to retrieve meal plan history', {
      userId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Lazy load full meal plan data for a specific plan
 * Called when user clicks a plan from history
 *
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID
 * @returns {Promise<{success: boolean, planData?: Object, error?: string}>}
 */
export async function loadFullMealPlan(userId, planId) {
  try {
    const planDocRef = doc(db, 'users', userId, 'mealPlanHistory', planId);
    const planDoc = await getDoc(planDocRef);

    if (!planDoc.exists()) {
      return {
        success: false,
        error: 'Meal plan not found',
      };
    }

    const data = planDoc.data();

    logger.info('Full meal plan loaded', {
      userId,
      planId,
    });

    return {
      success: true,
      planData: {
        planId: data.planId,
        planName: data.planName,
        plan: data.completeMealPlanData?.plan,
        regions: data.regions,
        cuisines: data.cuisines,
        dietType: data.dietType,
        isKeto: data.isKeto,
        budget: data.budget,
        goals: data.goals,
        ragMetadata: data.completeMealPlanData?.ragMetadata,
        performanceMetrics: data.completeMealPlanData?.performanceMetrics,
        personalizationSources: data.completeMealPlanData?.personalizationSources,
        generatedAt: data.generatedAt,
        numberOfDays: data.numberOfDays,
        caloriesPerDay: data.caloriesPerDay,
      },
    };
  } catch (error) {
    logger.error('Failed to load full meal plan', {
      userId,
      planId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete a meal plan from history
 * Called from deletion modal when user wants to free up space
 *
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMealPlan(userId, planId) {
  try {
    const planDocRef = doc(db, 'users', userId, 'mealPlanHistory', planId);

    // Check if plan exists before deleting
    const planDoc = await getDoc(planDocRef);
    if (!planDoc.exists()) {
      return {
        success: false,
        error: 'Meal plan not found',
      };
    }

    await deleteDoc(planDocRef);

    logger.info('Meal plan deleted from history', {
      userId,
      planId,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Failed to delete meal plan', {
      userId,
      planId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}
