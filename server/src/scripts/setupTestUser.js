// Script to configure Supriya Singh as permanent Pro user
// Run with: node server/src/scripts/setupTestUser.js

import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('SetupTestUser');

const TEST_PRO_USER_ID = 'fY42B1okA1Y2WOUSRPDp6XJQgkD2';
const TEST_USER_EMAIL = 'supriyavikramsingh@gmail.com';

async function setupTestUser() {
  try {
    logger.info('Setting up test Pro user', {
      userId: TEST_PRO_USER_ID,
      email: TEST_USER_EMAIL,
    });

    const userRef = doc(db, 'users', TEST_PRO_USER_ID);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      logger.error('User not found in Firestore', {
        userId: TEST_PRO_USER_ID,
      });
      logger.info('Please ensure the user has completed onboarding first');
      process.exit(1);
    }

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const updateData = {
      subscription_plan: 'pro',
      billing_cycle: 'monthly',
      subscription_status: 'active',
      subscription_start_date: now,
      next_billing_date: nextMonth,
      subscription_end_date: null,
      meal_plans_generated_count: userDoc.data().meal_plans_generated_count || 0,
      meal_plans_generated_this_week: userDoc.data().meal_plans_generated_this_week || 0,
      last_meal_plan_reset_date: now,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    logger.info('✅ Test Pro user configured successfully', {
      userId: TEST_PRO_USER_ID,
      email: TEST_USER_EMAIL,
      subscription_plan: 'pro',
      billing_cycle: 'monthly',
    });

    logger.info('');
    logger.info('🔐 This user now has:');
    logger.info('  - Permanent Pro access (hard-coded in backend)');
    logger.info('  - Unlimited meal plan generation');
    logger.info('  - Bypasses all payment/subscription checks');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to setup test user', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

setupTestUser();
