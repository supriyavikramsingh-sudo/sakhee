/**
 * Script to grant Recipe Search access to test users
 * Usage: node scripts/grant-recipe-access.js <user-email> <tier>
 *
 * Example:
 *   node scripts/grant-recipe-access.js supriyavikramsingh pro
 *   node scripts/grant-recipe-access.js test@example.com max
 */

import admin from 'firebase-admin';
import { config } from '../src/config/env.js';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(config.firebase.serviceAccount),
    databaseURL: config.firebase.databaseURL,
  });
}

const db = admin.firestore();

async function grantRecipeAccess(userEmail, tier = 'pro') {
  try {
    console.log(`\n🔍 Looking up user: ${userEmail}...`);

    // Get user by email from Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    const userId = userRecord.uid;

    console.log(`✅ Found user: ${userRecord.email} (UID: ${userId})`);

    // Validate tier
    const validTiers = ['free', 'pro', 'max'];
    if (!validTiers.includes(tier.toLowerCase())) {
      console.error(`❌ Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`);
      process.exit(1);
    }

    const tierNormalized = tier.toLowerCase();

    // Update user profile in Firestore
    const userProfileRef = db.collection('users').doc(userId).collection('data').doc('profile');

    // Get current profile
    const profileDoc = await userProfileRef.get();
    const currentProfile = profileDoc.data() || {};

    // Update subscription
    const subscription = {
      tier: tierNormalized,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      updatedAt: new Date().toISOString(),
      updatedBy: 'grant-recipe-access-script',
    };

    await userProfileRef.set(
      {
        ...currentProfile,
        subscription,
      },
      { merge: true }
    );

    console.log(`\n✅ Successfully granted ${tierNormalized.toUpperCase()} tier access!`);
    console.log(`\n📊 Recipe Search Limits:`);
    console.log(`   - FREE: 0 searches/day`);
    console.log(`   - PRO:  5 searches/day`);
    console.log(`   - MAX:  10 searches/day`);
    console.log(`\n🎯 User "${userEmail}" now has: ${tierNormalized.toUpperCase()} tier`);
    console.log(
      `   Daily limit: ${
        tierNormalized === 'free' ? '0' : tierNormalized === 'pro' ? '5' : '10'
      } searches/day`
    );
    console.log(`\n💡 The user may need to refresh their browser to see the changes.\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error granting access:`, error.message);

    if (error.code === 'auth/user-not-found') {
      console.error(`\n⚠️  User not found with email: ${userEmail}`);
      console.error(`   Please check the email address and try again.\n`);
    } else if (error.code === 'auth/invalid-email') {
      console.error(`\n⚠️  Invalid email format: ${userEmail}\n`);
    } else {
      console.error(`   Stack trace:`, error.stack);
    }

    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Grant Recipe Search Access - Usage Guide            ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node scripts/grant-recipe-access.js <user-email> [tier]

Arguments:
  user-email    Required: Email address of the user
  tier          Optional: Subscription tier (default: 'pro')
                Valid values: 'free', 'pro', 'max'

Examples:
  # Grant PRO access (5 searches/day)
  node scripts/grant-recipe-access.js supriyavikramsingh pro

  # Grant MAX access (10 searches/day)  
  node scripts/grant-recipe-access.js test@example.com max

  # Remove access (set to FREE)
  node scripts/grant-recipe-access.js user@example.com free

Tier Limits:
  - FREE: 0 searches/day (blocked, upgrade required)
  - PRO:  5 searches/day
  - MAX:  10 searches/day

`);
  process.exit(1);
}

const [userEmail, tier = 'pro'] = args;

grantRecipeAccess(userEmail, tier);
