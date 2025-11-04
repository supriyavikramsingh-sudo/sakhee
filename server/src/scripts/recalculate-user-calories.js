/**
 * Migration Script: Recalculate User Calorie Requirements
 *
 * Purpose: Update all existing users' TDEE and daily_calorie_requirement
 * with corrected activity level multipliers.
 *
 * Run this ONCE after deploying the new multipliers.
 *
 * Usage: node src/scripts/recalculate-user-calories.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateUserMetrics } from '../utils/calorieCalculations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Main migration function
 */
async function recalculateAllUsers() {
  console.log('🔧 Starting user calorie recalculation migration...\n');

  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    console.log(`📊 Found ${usersSnapshot.size} users total\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // Check if user has required data
        if (
          !userData.profileData?.height_cm ||
          !userData.profileData?.current_weight_kg ||
          !userData.profileData?.age ||
          !userData.profileData?.activityLevel
        ) {
          console.log(`⏭️  Skipping ${userId}: Missing required profile data`);
          skippedCount++;
          continue;
        }

        // Check if user already has calculations (only update those with old multipliers)
        if (!userData.daily_calorie_requirement) {
          console.log(`⏭️  Skipping ${userId}: No previous calculations`);
          skippedCount++;
          continue;
        }

        const { profileData } = userData;

        // Recalculate with NEW multipliers
        const metrics = calculateUserMetrics({
          ageRange: profileData.age,
          height_cm: profileData.height_cm,
          current_weight_kg: profileData.current_weight_kg,
          target_weight_kg: profileData.target_weight_kg || profileData.current_weight_kg,
          activityLevel: profileData.activityLevel,
          weightGoal: profileData.weight_goal || 'maintain',
        });

        // Compare old vs new
        const oldCalories = userData.daily_calorie_requirement;
        const newCalories = metrics.daily_calorie_requirement;
        const difference = newCalories - oldCalories;
        const percentChange = ((difference / oldCalories) * 100).toFixed(1);

        // Only update if there's a meaningful change (activity level affected)
        if (Math.abs(difference) < 10) {
          console.log(
            `⏭️  Skipping ${userId}: No significant change (${difference} kcal difference)`
          );
          skippedCount++;
          continue;
        }

        // Update user document
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          calculated_age: metrics.calculated_age,
          bmr: metrics.bmr,
          tdee: metrics.tdee,
          daily_calorie_requirement: metrics.daily_calorie_requirement,
          current_bmi: metrics.current_bmi,
          target_bmi: metrics.target_bmi,
          calculated_at: new Date().toISOString(),
          recalculated_at: new Date().toISOString(),
          recalculation_reason: 'activity_multiplier_correction_nov_2025',
        });

        console.log(
          `✅ Updated ${userId}: ${oldCalories} → ${newCalories} kcal (${percentChange}% change)`
        );
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating ${userId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total users: ${usersSnapshot.size}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (updatedCount > 0) {
      console.log(
        '\n✨ Migration completed successfully! Users will see updated calorie targets on next login.'
      );
    } else {
      console.log('\n⚠️  No users were updated. This is expected if:');
      console.log('   - Users have sedentary/light activity (multipliers unchanged)');
      console.log('   - Users completed onboarding after multiplier fix');
      console.log('   - Users have no previous calorie calculations');
    }
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
recalculateAllUsers()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
