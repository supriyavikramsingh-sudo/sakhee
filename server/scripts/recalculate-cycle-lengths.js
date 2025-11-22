/**
 * Script to recalculate cycle lengths for all existing cycles
 * Run this once to fix any missing cycle length data
 *
 * Usage: node scripts/recalculate-cycle-lengths.js <userId>
 */

import { db } from '../src/config/firebase.js';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore';

async function recalculateCycleLengths(userId) {
  try {
    console.log(`\n🔄 Recalculating cycle lengths for user: ${userId}\n`);

    // Get all cycles for this user, ordered by start date
    const cyclesRef = collection(db, 'periodTracking', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);

    const cycles = [];
    snapshot.forEach((docSnap) => {
      cycles.push({
        cycleId: docSnap.id,
        ...docSnap.data(),
        startDate: docSnap.data().startDate?.toDate?.() || new Date(docSnap.data().startDate),
      });
    });

    console.log(`📊 Found ${cycles.length} cycles\n`);

    if (cycles.length === 0) {
      console.log('❌ No cycles found for this user');
      return;
    }

    // Process each cycle (skip the last one as it has no next cycle yet)
    for (let i = 0; i < cycles.length - 1; i++) {
      const currentCycle = cycles[i];
      const nextCycle = cycles[i + 1];

      const currentStart = currentCycle.startDate;
      const nextStart = nextCycle.startDate;

      // Calculate cycle length (days between this period start and next period start)
      const diffTime = nextStart.getTime() - currentStart.getTime();
      const cycleLength = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Update the cycle
      const cycleRef = doc(db, 'periodTracking', userId, 'cycles', currentCycle.cycleId);
      await updateDoc(cycleRef, {
        cycleLength: cycleLength,
      });

      console.log(`✅ Updated ${currentCycle.cycleId}:`);
      console.log(`   Start: ${currentStart.toLocaleDateString()}`);
      console.log(`   Next:  ${nextStart.toLocaleDateString()}`);
      console.log(`   Cycle Length: ${cycleLength} days\n`);
    }

    // The last cycle doesn't have a cycle length yet (no next period)
    console.log(`ℹ️  Last cycle (${cycles[cycles.length - 1].cycleId}) has no cycle length yet`);
    console.log(`   (Will be calculated when next period is logged)\n`);

    console.log(`✨ Done! Successfully updated ${cycles.length - 1} cycle(s)\n`);
  } catch (error) {
    console.error('❌ Error recalculating cycle lengths:', error);
    throw error;
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: Please provide a userId');
  console.log('Usage: node scripts/recalculate-cycle-lengths.js <userId>');
  process.exit(1);
}

recalculateCycleLengths(userId)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
