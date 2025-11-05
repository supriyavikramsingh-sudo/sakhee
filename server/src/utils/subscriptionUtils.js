import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('SubscriptionUtils');

// Test user ID for permanent Pro access
const TEST_PRO_USER_ID = 'fY42B1okA1Y2WOUSRPDp6XJQgkD2';

/**
 * Check if user is the test Pro user
 */
export function isTestProUser(userId) {
  return userId === TEST_PRO_USER_ID;
}

/**
 * Get the last Monday from a given date
 */
function getLastMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days, else go to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if weekly reset is needed and perform it
 * Returns: { needsReset: boolean, userData: object }
 */
export async function checkAndResetWeeklyLimit(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday

    // Get last reset date
    const lastResetDate = userData.last_meal_plan_reset_date?.toDate?.() || new Date(0);
    const lastMonday = getLastMonday(currentDate);

    // Check if it's Monday (day 1) or later and last reset was before this Monday
    const needsReset = lastResetDate < lastMonday;

    if (needsReset) {
      logger.info('Resetting weekly meal plan counter', { userId });

      const updateData = {
        meal_plans_generated_this_week: 0,
        last_meal_plan_reset_date: lastMonday,
      };

      await updateDoc(userRef, updateData);

      // Return updated data
      return {
        needsReset: true,
        userData: {
          ...userData,
          meal_plans_generated_this_week: 0,
          last_meal_plan_reset_date: lastMonday,
        },
      };
    }

    return {
      needsReset: false,
      userData,
    };
  } catch (error) {
    logger.error('Check and reset weekly limit failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check if user can generate a meal plan
 * Returns: { canGenerate: boolean, reason: string, subscriptionPlan: string, count: number, limit: number }
 */
export async function canGenerateMealPlan(userId) {
  try {
    // Test user always allowed
    if (isTestProUser(userId)) {
      logger.info('Test Pro user - bypassing meal plan limits', { userId });
      return {
        canGenerate: true,
        reason: 'Test Pro user - unlimited access',
        subscriptionPlan: 'pro',
        count: 0,
        limit: 999,
      };
    }

    // Check and reset weekly counter if needed
    const { userData } = await checkAndResetWeeklyLimit(userId);

    const subscriptionPlan = userData.subscription_plan || 'free';
    const subscriptionStatus = userData.subscription_status || 'active';
    const subscriptionEndDate = userData.subscription_end_date?.toDate?.();

    // Check if canceled Pro subscription has expired
    if (
      subscriptionPlan === 'pro' &&
      subscriptionStatus === 'canceled' &&
      subscriptionEndDate &&
      new Date() > subscriptionEndDate
    ) {
      // Subscription has expired - treat as free user
      logger.info('Pro subscription expired - treating as free user', { userId });

      // Update user to free (could be done as a background job)
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscription_plan: 'free',
        subscription_status: 'expired',
        billing_cycle: null,
      });

      // Check free tier limits
      const totalCount = userData.meal_plans_generated_count || 0;
      if (totalCount >= 1) {
        return {
          canGenerate: false,
          reason: 'Free plan allows only 1 meal plan. Upgrade to Pro for 3 meal plans per week.',
          subscriptionPlan: 'free',
          count: totalCount,
          limit: 1,
        };
      }

      return {
        canGenerate: true,
        reason: 'Free plan - 1 meal plan available',
        subscriptionPlan: 'free',
        count: totalCount,
        limit: 1,
      };
    }

    // Free user check
    if (subscriptionPlan === 'free') {
      const totalCount = userData.meal_plans_generated_count || 0;
      if (totalCount >= 1) {
        return {
          canGenerate: false,
          reason: 'Free plan allows only 1 meal plan. Upgrade to Pro for 3 meal plans per week.',
          subscriptionPlan: 'free',
          count: totalCount,
          limit: 1,
        };
      }

      return {
        canGenerate: true,
        reason: 'Free plan - 1 meal plan available',
        subscriptionPlan: 'free',
        count: totalCount,
        limit: 1,
      };
    }

    // Pro/Max user check (weekly limit)
    if (subscriptionPlan === 'pro' || subscriptionPlan === 'max') {
      const weeklyCount = userData.meal_plans_generated_this_week || 0;
      if (weeklyCount >= 3) {
        return {
          canGenerate: false,
          reason: "You've used your 3 meal plans this week. Resets every Monday.",
          subscriptionPlan,
          count: weeklyCount,
          limit: 3,
        };
      }

      return {
        canGenerate: true,
        reason: `${subscriptionPlan.toUpperCase()} plan - ${
          3 - weeklyCount
        } meal plans remaining this week`,
        subscriptionPlan,
        count: weeklyCount,
        limit: 3,
      };
    }

    // Unknown plan - default to free
    return {
      canGenerate: false,
      reason: 'Unknown subscription plan',
      subscriptionPlan: 'unknown',
      count: 0,
      limit: 0,
    };
  } catch (error) {
    logger.error('Can generate meal plan check failed', {
      userId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Increment meal plan counter after successful generation
 */
export async function incrementMealPlanCounter(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const subscriptionPlan = userData.subscription_plan || 'free';

    const updateData = {
      meal_plans_generated_count: (userData.meal_plans_generated_count || 0) + 1,
    };

    // Only increment weekly counter for Pro/Max users
    if (subscriptionPlan === 'pro' || subscriptionPlan === 'max') {
      updateData.meal_plans_generated_this_week =
        (userData.meal_plans_generated_this_week || 0) + 1;
    }

    await updateDoc(userRef, updateData);

    logger.info('Meal plan counter incremented', {
      userId,
      totalCount: updateData.meal_plans_generated_count,
      weeklyCount: updateData.meal_plans_generated_this_week,
    });

    return updateData;
  } catch (error) {
    logger.error('Increment meal plan counter failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Initialize subscription fields for new users
 */
export function getDefaultSubscriptionData() {
  const now = new Date();
  return {
    subscription_plan: 'free',
    billing_cycle: null,
    subscription_status: 'active',
    subscription_start_date: null,
    next_billing_date: null,
    subscription_end_date: null,
    meal_plans_generated_count: 0,
    meal_plans_generated_this_week: 0,
    last_meal_plan_reset_date: now,
  };
}
