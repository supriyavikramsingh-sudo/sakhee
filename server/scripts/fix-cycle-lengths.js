/**
 * Script to recalculate and update cycle lengths for existing data
 * Run this with: node scripts/fix-cycle-lengths.js <userId>
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixCycleLengths(userId) {
  try {
    console.log(`\n🔍 Fetching cycles for user: ${userId}\n`);

    // Get all cycles for the user, ordered by start date ascending
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ No cycles found for this user.');
      return;
    }

    const cycles = [];
    snapshot.forEach((docSnap) => {
      cycles.push({
        cycleId: docSnap.id,
        ...docSnap.data(),
      });
    });

    console.log(`📊 Found ${cycles.length} cycles\n`);

    // Display current state
    console.log('Current cycle data:');
    cycles.forEach((cycle, index) => {
      const startDate = cycle.startDate?.toDate?.() || new Date(cycle.startDate);
      console.log(
        `  ${index + 1}. ${startDate.toISOString().split('T')[0]} - cycleLength: ${
          cycle.cycleLength || 'null'
        }`
      );
    });

    // Calculate and update cycle lengths
    console.log('\n🔧 Calculating cycle lengths...\n');

    for (let i = 0; i < cycles.length - 1; i++) {
      const currentCycle = cycles[i];
      const nextCycle = cycles[i + 1];

      const currentStart = currentCycle.startDate?.toDate?.() || new Date(currentCycle.startDate);
      const nextStart = nextCycle.startDate?.toDate?.() || new Date(nextCycle.startDate);

      // Calculate days between start dates
      const diffTime = nextStart.getTime() - currentStart.getTime();
      const cycleLength = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(
        `  Cycle ${i + 1}: ${currentStart.toISOString().split('T')[0]} → ${
          nextStart.toISOString().split('T')[0]
        } = ${cycleLength} days`
      );

      // Update the cycle document
      const cycleDocRef = doc(db, 'periodTracking', userId, 'cycles', currentCycle.cycleId);
      await updateDoc(cycleDocRef, {
        cycleLength: cycleLength,
      });

      console.log(`    ✅ Updated cycleLength to ${cycleLength}`);
    }

    // Last cycle has no cycle length (no next period yet)
    console.log(`  Cycle ${cycles.length}: (current cycle - no cycle length yet)`);

    console.log('\n✅ All cycle lengths updated successfully!\n');

    // Display updated state
    const updatedSnapshot = await getDocs(q);
    const updatedCycles = [];
    updatedSnapshot.forEach((docSnap) => {
      updatedCycles.push({
        cycleId: docSnap.id,
        ...docSnap.data(),
      });
    });

    console.log('Updated cycle data:');
    updatedCycles.forEach((cycle, index) => {
      const startDate = cycle.startDate?.toDate?.() || new Date(cycle.startDate);
      console.log(
        `  ${index + 1}. ${startDate.toISOString().split('T')[0]} - cycleLength: ${
          cycle.cycleLength || 'null'
        }`
      );
    });

    console.log('\n🎉 Migration complete!\n');
  } catch (error) {
    console.error('❌ Error fixing cycle lengths:', error);
    throw error;
  }
}

// Get userId from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a userId as an argument');
  console.log('Usage: node scripts/fix-cycle-lengths.js <userId>');
  process.exit(1);
}

fixCycleLengths(userId)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
