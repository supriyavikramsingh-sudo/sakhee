# Cycle Insights Card - Calculation Report

## Overview
This document details how each component in the **Cycle Insights Card** is calculated, where the data comes from, and the exact formulas used.

**Component Location:** `frontend/src/components/progress/CycleInsightsCard.tsx`  
**Last Updated:** November 21, 2025

---

## Data Sources

### 1. **Cycles Data**
- **API Call:** `progressTrackerApi.getCycles(userId, 12)`
- **Backend Route:** `GET /api/progress/period/cycles/:userId`
- **Backend Service:** `getCycles()` in `progressTrackerService.js`
- **Database:** Firestore collection `periodTracking/{userId}/cycles`
- **Sort Order:** Ascending by `startDate` (oldest first)
- **Limit:** Last 12 cycles

### 2. **Ovulation Prediction**
- **API Call:** `progressTrackerApi.getOvulationPrediction(userId)`
- **Backend Route:** `GET /api/progress/period/ovulation-prediction/:userId`
- **Backend Service:** `getOvulationPrediction()` in `progressTrackerService.js`

### 3. **Today's Tracking**
- **API Call:** `progressTrackerApi.getDailyTracking(userId, today)`
- **Backend Route:** `GET /api/progress/daily/:userId/:date`
- **Backend Service:** `getDailyTracking()` in `progressTrackerService.js`
- **Database:** Firestore collection `dailyTracking/{userId}/entries/{YYYY-MM-DD}`

---

## Component Calculations

### 📊 **1. Current Cycle Day (51/28)**

**Display Location:** Top left metric  
**Label:** "Current Day"  

**Calculation:**
```javascript
const currentPeriod = cycles[cycles.length - 1]; // Most recent cycle
const periodStartDate = new Date(currentPeriod.startDate);
const todayDate = new Date(today);

const currentCycleDay = Math.floor(
  (todayDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1;
```

**Formula:**
```
Current Cycle Day = Floor((Today - Last Period Start Date) / 86400000ms) + 1
```

**Example:**
- Last Period Start: Oct 2, 2025
- Today: Nov 21, 2025
- Days elapsed: 50 days
- **Current Cycle Day: 51**

**Notes:**
- Adds +1 because cycle day 1 is the first day of period (not day 0)
- Uses milliseconds for precision: 1 day = 1000 * 60 * 60 * 24 = 86,400,000ms

---

### 📊 **2. Last Cycle Length**

**Display Location:** Bottom of metrics section  
**Label:** "Cycle Length"  
**Current Issue:** Shows "-" or "Not yet calculated"

**Expected Calculation:**
```javascript
const lastCycleLength = currentPeriod.cycleLength;
```

**How It SHOULD Be Set (Backend):**

When a **second period is logged**, the backend calculates:
```javascript
// In progressTracker.js POST /period/log route
const cycleLength = await calculateCycleLength(userId, cycleData.startDate);
```

**Backend Logic (progressTrackerService.js):**
```javascript
export async function calculateCycleLength(userId, currentStartDate) {
  // Get last 2 cycles sorted by date (descending)
  const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(2));
  
  // docs[0] = newest cycle (just logged)
  // docs[1] = previous cycle
  
  const previousStartDate = docs[1].startDate;
  const currentStart = currentStartDate;
  
  const diffDays = Math.ceil(
    Math.abs(currentStart - previousStartDate) / (1000 * 60 * 60 * 24)
  );
  
  return diffDays;
}
```

**Formula:**
```
Cycle Length = Ceil(|Current Period Start - Previous Period Start| / 86400000ms)
```

**Example:**
- Previous period: Aug 5, 2025
- Current period: Sept 4, 2025
- Days between: 30 days
- **Cycle Length: 30 days**

**Storage:**
- The cycle length is saved to the **PREVIOUS** cycle document
- NOT the current cycle (since we don't know current cycle's length yet)

**🔴 CURRENT BUG:**
The calculation runs but may not be updating the correct cycle. The issue is in the route logic:

```javascript
// After creating new cycle
const cycles = await getCycles(userId, 2); // Returns [oldest, newest]
const previousCycle = cycles[0]; // ✅ Correct - gets oldest
await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
```

**However**, if you only have 1 cycle logged, `cycles.length` will be 1, and there's no previous cycle to update!

---

### 📊 **3. Last Period Duration**

**Display Location:** Top right metric (inside grid)  
**Label:** "Last Period Duration"

**Calculation:**
```javascript
const periodStartDate = new Date(currentPeriod.startDate);
const periodEndDate = new Date(currentPeriod.endDate);

const periodDuration = Math.floor(
  (periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1;
```

**Formula:**
```
Period Duration = Floor((Period End Date - Period Start Date) / 86400000ms) + 1
```

**Example:**
- Period Start: Oct 2, 2025
- Period End: Oct 6, 2025
- Days elapsed: 4 days
- **Period Duration: 5 days** (Oct 2, 3, 4, 5, 6)

**Notes:**
- Adds +1 to include both start and end days
- For same-day period (start = end), duration = 1 day

---

### 📊 **4. Total Cycle Days (Denominator: 51/28)**

**Display Location:** Top left metric (denominator)  
**Label:** Part of "51/28"

**Calculation:**
```javascript
const totalCycleDays = currentPeriod.cycleLength || 28;
```

**Logic:**
- If `cycleLength` exists in database → Use it
- If `cycleLength` is null/undefined → Default to 28 days

**Example:**
- If you've logged 2+ periods and cycleLength was calculated as 30
- **Total Cycle Days: 30**
- If you've only logged 1 period:
- **Total Cycle Days: 28 (default)**

---

### 📊 **5. Cycle Phase Badge**

**Display Location:** Top right badge (e.g., "Pre-Period")  
**Possible Values:**
- 🔴 On Period
- 🟢 Fertile Window
- 🟢 Ovulating
- 🔵 Post-Ovulation
- 🟣 Pre-Period

**Calculation Logic:**
```javascript
let cyclePhase = 'post-ovulation'; // Default

// 1. Check if currently on period
if (currentCycleDay <= periodDuration) {
  cyclePhase = 'period';
}

// 2. If using data-driven ovulation prediction
else if (ovulationPrediction.method === 'data-driven') {
  const ovulationDate = new Date(ovulationPrediction.ovulationDate);
  const fertileStart = new Date(ovulationPrediction.fertileWindowStart);
  const fertileEnd = new Date(ovulationPrediction.fertileWindowEnd);
  
  if (today >= fertileStart && today <= fertileEnd) {
    if (today === ovulationDate) {
      cyclePhase = 'ovulation';
    } else {
      cyclePhase = 'fertile';
    }
  } else if (currentCycleDay > totalCycleDays - 5) {
    cyclePhase = 'pre-period';
  }
}

// 3. If using formula-based estimation
else {
  const ovulationDay = totalCycleDays - 14;
  const fertileStartDay = ovulationDay - 5;
  
  if (currentCycleDay >= fertileStartDay && currentCycleDay <= ovulationDay + 1) {
    if (currentCycleDay === ovulationDay) {
      cyclePhase = 'ovulation';
    } else {
      cyclePhase = 'fertile';
    }
  } else if (currentCycleDay > totalCycleDays - 5) {
    cyclePhase = 'pre-period';
  }
}
```

**Formula (Formula-based mode):**
```
Ovulation Day = Total Cycle Days - 14
Fertile Start Day = Ovulation Day - 5
Fertile End Day = Ovulation Day + 1

If currentCycleDay ∈ [Fertile Start, Fertile End] → Fertile/Ovulating
If currentCycleDay > (Total Cycle Days - 5) → Pre-Period
Else → Post-Ovulation
```

**Example (28-day cycle):**
- Ovulation Day: 28 - 14 = **Day 14**
- Fertile Window: **Days 9-15**
- Pre-Period: **Days 24-28**

---

### 📊 **6. Fertility Status Message**

**Display Location:** Below cycle phase badge  
**Label:** e.g., "🟣 Low Fertility - Period Expected Soon"

**Calculation:**
```javascript
switch (cyclePhase) {
  case 'period':
    return '🔴 Low Fertility - Period Phase';
  case 'fertile':
    return '🟢 High Fertility - Fertile Window';
  case 'ovulation':
    return '🟢 Peak Fertility - Ovulating Today!';
  case 'post-ovulation':
    return '🔵 Decreasing Fertility - Post-Ovulation';
  case 'pre-period':
    return '🟣 Low Fertility - Period Expected Soon';
}
```

---

### 📊 **7. Progress Bar (182% Complete)**

**Display Location:** Gradient bar showing Period → Fertile → Next Period

**Calculation:**
```javascript
const progressPercent = (currentCycleDay / totalCycleDays) * 100;
```

**Formula:**
```
Progress % = (Current Cycle Day / Total Cycle Days) × 100
```

**Example:**
- Current Day: 51
- Total Days: 28
- **Progress: 182%** (cycle has exceeded expected length)

**Visual Logic:**
- 0-33%: Red (Period phase)
- 33-66%: Gradient to green (Fertile phase)
- 66-100%: Light green (Post-ovulation)
- >100%: Continues beyond bar (late period)

---

### 📊 **8. Ovulation Today Score**

**Display Location:** Right side, "Not tracked" or score value  
**Label:** "Ovulation Today"

**Calculation:**
```javascript
const todayResponse = await progressTrackerApi.getDailyTracking(userId, today);
const todayOvulationScore = todayResponse.data.ovulationScore?.totalScore || null;
```

**Backend Calculation (saveDailyTracking):**
```javascript
// In POST /api/progress/daily route
if (trackingData.cervicalMucus && trackingData.ovulationPain && trackingData.libido) {
  ovulationData = calculateOvulationScore(trackingData);
}
```

**Score Breakdown (calculateOvulationScore):**
- **Cervical Mucus:** (0-35 points)
  - Egg white: 35
  - Wet/slippery: 25
  - Creamy: 15
  - Sticky: 5
  - Dry/none: 0

- **Ovulation Pain:** (0-25 points)
  - Yes: 25
  - No: 0

- **Increased Libido:** (0-20 points)
  - Yes: 20
  - No: 0

- **Basal Body Temp:** (0-20 points)
  - Significant rise (0.5°F+): 20
  - Slight rise: 10
  - No rise: 0

**Total Score:** Sum of all (0-100 points)

**Display:**
- If no tracking data: "Not tracked"
- If tracked: Shows score/100 with confidence indicator

---

### 📊 **9. Predicted Ovulation Date**

**Display Location:** "Predicted Ovulation" section (right side)  
**Label:** "Oct 15" with "40% confidence"

**Calculation:**
```javascript
const ovulationResponse = await progressTrackerApi.getOvulationPrediction(userId);
```

**Backend Logic (getOvulationPrediction):**

**Method 1: Data-Driven (if 3+ days with score ≥60)**
```javascript
// Get daily tracking entries with ovulation scores
const entries = await getDailyTrackingRange(userId, startDate, endDate);
const highScoreDays = entries.filter(e => e.ovulationScore?.totalScore >= 60);

if (highScoreDays.length >= 3) {
  // Find highest scoring day
  const peakDay = max(highScoreDays, day => day.ovulationScore.totalScore);
  
  return {
    method: 'data-driven',
    ovulationDate: peakDay.date,
    confidence: 'high',
    fertileWindowStart: peakDay.date - 5 days,
    fertileWindowEnd: peakDay.date + 1 day
  };
}
```

**Method 2: Formula-Based (fallback)**
```javascript
// Use standard formula
const cycleLength = currentCycle.cycleLength || 28;
const ovulationDay = cycleLength - 14;
const ovulationDate = periodStartDate + ovulationDay days;

return {
  method: 'estimated',
  ovulationDate: ovulationDate,
  confidence: 'medium',
  fertileWindowStart: ovulationDate - 5 days,
  fertileWindowEnd: ovulationDate + 1 day
};
```

**Confidence Levels:**
- **High (70-100%):** Data-driven with consistent scores
- **Medium (40-60%):** Formula-based estimation
- **Low (<40%):** Limited data

---

### 📊 **10. Period Expected Banner**

**Display Location:** Below predictions  
**Label:** "Period expected in 1-4 days. Track PMS symptoms if any."

**Calculation:**
```javascript
const expectedPeriodDay = totalCycleDays + 1;
const daysUntilPeriod = expectedPeriodDay - currentCycleDay;

if (daysUntilPeriod <= 4 && daysUntilPeriod > 0) {
  // Show banner
}
```

**Formula:**
```
Days Until Period = (Total Cycle Days + 1) - Current Cycle Day
```

**Example:**
- Total Cycle Days: 28
- Current Day: 51
- **Days Until Period: 28 + 1 - 51 = -22** (period is 22 days late!)

**Display Logic:**
- If 1-4 days: Show countdown
- If ≤0 days: Show "Period expected today" or "Period is X days late"

---

## 🔴 IDENTIFIED BUGS

### Bug #1: Last Cycle Length Not Showing

**Issue:** Cycle length shows "-" even after logging 2 periods

**Root Cause:**
1. When logging the 2nd period, `calculateCycleLength()` correctly calculates the difference
2. The code tries to update the PREVIOUS cycle's cycleLength field
3. However, the query `getCycles(userId, 2)` returns cycles in ascending order
4. The logic gets `cycles[0]` which should be the oldest/previous cycle
5. But there might be a timing issue where the newly created cycle is already in the results

**Fix Required:**
The route logic needs to ensure it's updating the FIRST cycle (oldest), not the second:

```javascript
// After creating new cycle
const cycles = await getCycles(userId, 50); // Get all cycles
if (cycles.length >= 2) {
  // cycles is sorted ascending (oldest first)
  // We want to update the SECOND-TO-LAST cycle
  const previousCycle = cycles[cycles.length - 2];
  await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
}
```

### Bug #2: Incorrect cycleLength Reference in calculateCycleLength

**Issue:** The function queries with `desc` order but should use `asc`

**Current Code:**
```javascript
const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(2));
// docs[0] = newest
// docs[1] = previous
```

**Should Be:**
Consistent with other queries using `asc` order.

---

## Summary Table

| Component | Data Source | Calculation | Default/Fallback |
|-----------|-------------|-------------|------------------|
| Current Cycle Day | Last period start date | `Floor((Today - Start) / 86400000) + 1` | N/A |
| Total Cycle Days | `cycleLength` field | From database | 28 days |
| Last Cycle Length | `cycleLength` field | Calculated on 2nd+ period | null (shows "Not calculated") |
| Period Duration | Period start & end dates | `Floor((End - Start) / 86400000) + 1` | N/A |
| Cycle Phase | Current day + ovulation data | Complex logic (see above) | 'post-ovulation' |
| Progress % | Current day / Total days | `(currentDay / totalDays) × 100` | N/A |
| Ovulation Score | Daily tracking data | Sum of mucus + pain + libido + BBT | null (shows "Not tracked") |
| Predicted Ovulation | Ovulation prediction API | Data-driven or formula | Formula-based |
| Fertile Window | Ovulation date ± days | Ovulation - 5 to Ovulation + 1 | N/A |

---

**Document Version:** 1.0  
**Created:** November 21, 2025  
**Next Review:** When bugs are fixed
