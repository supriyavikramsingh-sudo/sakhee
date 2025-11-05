import express from 'express';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger('SubscriptionRoutes');

// Test user ID for permanent Pro access
const TEST_PRO_USER_ID = 'fY42B1okA1Y2WOUSRPDp6XJQgkD2';

/**
 * Middleware to verify authentication
 */
const verifyAuth = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.query.userId;

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

/**
 * Check if user is the test Pro user
 */
function isTestProUser(userId) {
  return userId === TEST_PRO_USER_ID;
}

/**
 * Initialize default subscription for new users
 */
function getDefaultSubscription() {
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

/**
 * Calculate next billing date based on cycle
 */
function calculateNextBillingDate(startDate, billingCycle) {
  const date = new Date(startDate);
  if (billingCycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
}

/**
 * GET /api/user/subscription
 * Get user's subscription details
 */
router.get('/subscription', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching subscription', { userId });

    // Check if test user
    if (isTestProUser(userId)) {
      logger.info('Test Pro user detected', { userId });
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const userData = userDoc.data();

    // Initialize subscription fields if they don't exist
    let subscriptionData = {
      subscription_plan: userData.subscription_plan || 'free',
      billing_cycle: userData.billing_cycle || null,
      subscription_status: userData.subscription_status || 'active',
      subscription_start_date: userData.subscription_start_date?.toDate?.() || null,
      next_billing_date: userData.next_billing_date?.toDate?.() || null,
      subscription_end_date: userData.subscription_end_date?.toDate?.() || null,
      meal_plans_generated_count: userData.meal_plans_generated_count || 0,
      meal_plans_generated_this_week: userData.meal_plans_generated_this_week || 0,
      last_meal_plan_reset_date: userData.last_meal_plan_reset_date?.toDate?.() || new Date(),
    };

    // Force Pro status for test user
    if (isTestProUser(userId)) {
      subscriptionData.subscription_plan = 'pro';
      if (!subscriptionData.billing_cycle) {
        subscriptionData.billing_cycle = 'monthly';
      }
      subscriptionData.subscription_status = 'active';
    }

    res.json({
      success: true,
      data: subscriptionData,
    });
  } catch (error) {
    logger.error('Get subscription failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch subscription',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/user/subscription/upgrade
 * Upgrade user to Pro (or change billing cycle)
 */
router.put('/subscription/upgrade', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan, billing_cycle } = req.body;

    logger.info('Upgrading subscription', { userId, plan, billing_cycle });

    // Validate plan
    if (plan !== 'pro') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only Pro plan is available for upgrade' },
      });
    }

    // Validate billing cycle
    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid billing cycle. Must be monthly or yearly' },
      });
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(now, billing_cycle);

    // Update subscription
    const updateData = {
      subscription_plan: 'pro',
      billing_cycle: billing_cycle,
      subscription_status: 'active',
      subscription_start_date: serverTimestamp(),
      next_billing_date: nextBillingDate,
      subscription_end_date: null, // Clear any cancellation
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated data
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();

    const subscriptionData = {
      subscription_plan: updatedData.subscription_plan,
      billing_cycle: updatedData.billing_cycle,
      subscription_status: updatedData.subscription_status,
      subscription_start_date: updatedData.subscription_start_date?.toDate?.() || null,
      next_billing_date: updatedData.next_billing_date?.toDate?.() || null,
      subscription_end_date: updatedData.subscription_end_date?.toDate?.() || null,
      meal_plans_generated_count: updatedData.meal_plans_generated_count || 0,
      meal_plans_generated_this_week: updatedData.meal_plans_generated_this_week || 0,
      last_meal_plan_reset_date: updatedData.last_meal_plan_reset_date?.toDate?.() || new Date(),
    };

    logger.info('Subscription upgraded successfully', { userId, plan, billing_cycle });

    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      data: subscriptionData,
    });
  } catch (error) {
    logger.error('Upgrade subscription failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to upgrade subscription',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/user/subscription/cancel
 * Cancel subscription (retain access until end of billing cycle)
 */
router.put('/subscription/cancel', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Canceling subscription', { userId });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const userData = userDoc.data();

    if (userData.subscription_plan !== 'pro') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only Pro users can cancel subscription' },
      });
    }

    // Set end date to next billing date
    const endDate = userData.next_billing_date?.toDate?.() || new Date();

    const updateData = {
      subscription_status: 'canceled',
      subscription_end_date: endDate,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated data
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();

    const subscriptionData = {
      subscription_plan: updatedData.subscription_plan,
      billing_cycle: updatedData.billing_cycle,
      subscription_status: updatedData.subscription_status,
      subscription_start_date: updatedData.subscription_start_date?.toDate?.() || null,
      next_billing_date: updatedData.next_billing_date?.toDate?.() || null,
      subscription_end_date: updatedData.subscription_end_date?.toDate?.() || null,
      meal_plans_generated_count: updatedData.meal_plans_generated_count || 0,
      meal_plans_generated_this_week: updatedData.meal_plans_generated_this_week || 0,
      last_meal_plan_reset_date: updatedData.last_meal_plan_reset_date?.toDate?.() || new Date(),
    };

    logger.info('Subscription canceled successfully', { userId, endDate });

    res.json({
      success: true,
      message: 'Subscription canceled. Access will continue until end of billing cycle',
      data: subscriptionData,
    });
  } catch (error) {
    logger.error('Cancel subscription failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to cancel subscription',
        details: error.message,
      },
    });
  }
});

/**
 * PUT /api/user/subscription/reactivate
 * Reactivate canceled subscription
 */
router.put('/subscription/reactivate', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Reactivating subscription', { userId });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const userData = userDoc.data();

    if (userData.subscription_plan !== 'pro') {
      return res.status(400).json({
        success: false,
        error: { message: 'Only Pro users can reactivate subscription' },
      });
    }

    if (userData.subscription_status !== 'canceled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Subscription is not canceled' },
      });
    }

    const updateData = {
      subscription_status: 'active',
      subscription_end_date: null,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    // Fetch updated data
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();

    const subscriptionData = {
      subscription_plan: updatedData.subscription_plan,
      billing_cycle: updatedData.billing_cycle,
      subscription_status: updatedData.subscription_status,
      subscription_start_date: updatedData.subscription_start_date?.toDate?.() || null,
      next_billing_date: updatedData.next_billing_date?.toDate?.() || null,
      subscription_end_date: updatedData.subscription_end_date?.toDate?.() || null,
      meal_plans_generated_count: updatedData.meal_plans_generated_count || 0,
      meal_plans_generated_this_week: updatedData.meal_plans_generated_this_week || 0,
      last_meal_plan_reset_date: updatedData.last_meal_plan_reset_date?.toDate?.() || new Date(),
    };

    logger.info('Subscription reactivated successfully', { userId });

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: subscriptionData,
    });
  } catch (error) {
    logger.error('Reactivate subscription failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reactivate subscription',
        details: error.message,
      },
    });
  }
});

/**
 * GET /api/user/usage
 * Get meal plan usage stats
 */
router.get('/usage', verifyAuth, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Fetching usage stats', { userId });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const userData = userDoc.data();
    const subscriptionPlan = isTestProUser(userId) ? 'pro' : userData.subscription_plan || 'free';

    // Determine limit based on plan
    let limit = 1; // Free plan default
    if (subscriptionPlan === 'pro' || subscriptionPlan === 'max') {
      limit = 3; // Pro/Max get 3 per week
    }

    // Calculate days until Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;

    const usageData = {
      totalCount: userData.meal_plans_generated_count || 0,
      weeklyCount: userData.meal_plans_generated_this_week || 0,
      lastResetDate: userData.last_meal_plan_reset_date?.toDate?.() || null,
      limitBasedOnPlan: limit,
      daysUntilMondayReset: daysUntilMonday === 0 ? 7 : daysUntilMonday,
      canGenerateMealPlan:
        subscriptionPlan === 'free'
          ? (userData.meal_plans_generated_count || 0) < 1
          : (userData.meal_plans_generated_this_week || 0) < 3,
    };

    res.json({
      success: true,
      data: usageData,
    });
  } catch (error) {
    logger.error('Get usage failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch usage stats',
        details: error.message,
      },
    });
  }
});

export { isTestProUser, getDefaultSubscription };
export default router;
