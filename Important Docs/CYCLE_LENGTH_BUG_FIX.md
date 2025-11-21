# Cycle Length Bug Fix

## Issue Description
The "Last Cycle Length" field in the Cycle Insights Card was showing "-" or "Not yet calculated" even after logging 2 or more periods.

## Root Cause
When a new period is logged, the system calculates the cycle length (days between the previous period start and current period start) and attempts to update the **previous cycle** with this calculated value.

The bug was in the logic that determined **which** cycle to update:

**Before (Buggy Code):**
```javascript
const cycles = await getCycles(userId, 2); // Get last 2 cycles
if (cycles.length >= 2) {
  const previousCycle = cycles[0]; // ❌ Gets the OLDEST of the 2 cycles
  await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
}
```

**Problem:**
- If you have 3+ periods logged, `cycles[0]` would be the OLDEST cycle in the database (not the most recent previous one)
- The cycle length would be incorrectly assigned to a much older cycle

## Fix Applied

**After (Fixed Code):**
```javascript
const cycles = await getCycles(userId, 50); // Get all cycles
if (cycles.length >= 2) {
  // cycles is ordered ascending (oldest first)
  // We want to update the SECOND-TO-LAST cycle (the one before the one we just created)
  const previousCycle = cycles[cycles.length - 2]; // ✅ Gets the cycle RIGHT BEFORE the new one
  await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
}
```

**Solution:**
1. Fetch more cycles (up to 50) to ensure we have the complete recent history
2. Use `cycles[cycles.length - 2]` to get the second-to-last cycle
3. This is the cycle that immediately preceded the one we just logged
4. That's the cycle whose length we can now calculate

## Example Scenario

**User has logged 3 periods:**
- Period 1: Aug 5, 2025 (cycle_1)
- Period 2: Sept 4, 2025 (cycle_2)
- Period 3: Oct 2, 2025 (cycle_3) ← **Just logged**

**What happens:**
1. User logs Period 3 (Oct 2)
2. System calculates: Oct 2 - Sept 4 = **28 days**
3. System needs to update **cycle_2** with cycleLength = 28
4. With the fix:
   - `cycles = [cycle_1, cycle_2, cycle_3]` (ascending order)
   - `cycles.length = 3`
   - `previousCycle = cycles[3 - 2] = cycles[1] = cycle_2` ✅ Correct!

**Without the fix:**
- With `limit(2)`, we'd only get `[cycle_2, cycle_3]`
- `cycles[0] = cycle_2` - This would work for this case!
- BUT if user had 10 periods, `limit(2)` would get `[cycle_9, cycle_10]`
- `cycles[0] = cycle_9` - Wrong! We'd update the wrong cycle

## Files Modified

**File:** `/Users/supriya97/Desktop/AI Projects/sakhee/server/src/routes/progressTracker.js`

**Route:** `POST /api/progress/period/log`

**Line:** ~173-184

## Testing Instructions

1. **Fresh Test:**
   - Delete all existing period data for a test user
   - Log Period 1: Aug 5, 2025 - Aug 9, 2025
   - Check: Cycle length should be null/not shown
   - Log Period 2: Sept 4, 2025 - Sept 8, 2025
   - Check: Period 1's cycle length should now show **30 days** (Aug 5 to Sept 4)
   - Log Period 3: Oct 2, 2025 - Oct 6, 2025
   - Check: Period 2's cycle length should now show **28 days** (Sept 4 to Oct 2)

2. **Existing Data Test:**
   - If you already have periods logged, log a new one
   - The PREVIOUS period's cycle length should update correctly

## Expected Behavior

**With 1 period logged:**
- Cycle Length: "Not yet calculated (need 2+ cycles)"

**With 2 periods logged:**
- First period's Cycle Length: Shows days between period 1 and period 2
- Second period's Cycle Length: null (no third period yet to calculate from)

**With 3+ periods logged:**
- Each period's Cycle Length: Shows days between that period and the next one
- Most recent period's Cycle Length: null (until next period is logged)

**Display in Cycle Insights Card:**
- Shows the `lastCycleLength` of the most recent period
- If most recent period has no cycleLength (normal), it will show "-" or "Not yet calculated"
- To see a cycle length value, you need at least 3 periods logged!

## Related Documentation

See [CYCLE_INSIGHTS_CARD_CALCULATION_REPORT.md](./CYCLE_INSIGHTS_CARD_CALCULATION_REPORT.md) for complete calculation details.

---

**Fixed By:** AI Assistant  
**Date:** November 21, 2025  
**Status:** ✅ Complete
