# Cycle Insights - Complete User Guide

## Overview
This document explains **how the Cycle Insights feature works** from setup to daily use, covering both frontend (what you see) and backend (how it works). This guide is written for anyone to understand - no technical knowledge required!

**Feature Location:** Progress Tracking Page → Period & Ovulation Tab  
**Main Component:** `frontend/src/components/progress/CycleInsightsCard.tsx`  
**Last Updated:** November 22, 2025

---

## Table of Contents
1. [What is Cycle Insights?](#what-is-cycle-insights)
2. [Initial Setup Process](#initial-setup-process)
3. [Logging Your First Period](#logging-your-first-period)
4. [Daily Tracking & Ovulation](#daily-tracking--ovulation)
5. [Editing Period Data](#editing-period-data)
6. [Understanding the Dashboard](#understanding-the-dashboard)
7. [How Calculations Work](#how-calculations-work)
8. [Technical Architecture](#technical-architecture)

---

## What is Cycle Insights?

The **Cycle Insights Card** is your personalized period and fertility tracker. It helps you:
- 📅 Track your menstrual cycle day-by-day
- 🌸 Predict ovulation and fertile windows
- 📊 Monitor fertility symptoms (cervical mucus, BBT, etc.)
- 🎯 Understand your cycle patterns
- 💡 Get personalized guidance for each phase

Think of it as a smart assistant that learns your cycle patterns and gives you accurate predictions!

---

## Initial Setup Process

### Step 1: First-Time Access
When you visit the **Progress Tracking Page** for the first time:

**What You See:**
- A setup wizard pops up asking about your period history
- Questions include: last period start date, average cycle length, symptoms

**What Happens Behind the Scenes:**
1. **Frontend** (`PeriodSetupWizard.tsx`) collects your information
2. **API Call:** `POST /api/progress/period/setup`
3. **Backend** saves your data to Firestore at `periodTracking/{userId}`
4. A flag `setupCompleted: true` is set

**Database Structure Created:**
```
periodTracking/
  {userId}/
    - avgCycleLength: 28
    - lastPeriodStart: "2025-10-02"
    - setupCompleted: true
    - setupCompletedAt: (timestamp)
```

### Step 2: First Cycle Creation
If you provided a last period date during setup:

**What Happens:**
1. Backend automatically creates your **first cycle** entry
2. Saves to: `periodTracking/{userId}/cycles/{cycleId}`
3. `cycleLength` is set to `null` (needs 2+ cycles to calculate)

---

## Logging Your First Period

### When to Log
Log a new period when your period starts! You'll update the end date once it finishes.

### How to Log

**User Interface Flow:**
1. Click **"Log Period"** button on Progress Page
2. Modal opens: `LogPeriodModal.tsx`
3. Fill in:
   - Start Date (required)
   - End Date (required or add later)
   - Flow intensity (Light/Medium/Heavy)
   - Color and characteristics
   - Symptoms (cramps, mood, etc.)

**Backend Processing:**

**API Call:** `POST /api/progress/period/log`

**What the Backend Does:**

1. **Date Validation** (Safety checks!):
   ```
   ✓ End date must be after start date
   ✓ Period can't be longer than 20 days (warns at 10+)
   ✓ No overlapping with previous periods
   ✓ Cycle length check (warns if <21 days)
   ```

2. **Creates New Cycle Document:**
   ```javascript
   cycleId: "cycle_1730000000000"
   startDate: October 2, 2025
   endDate: October 6, 2025
   cycleLength: null (first cycle)
   flow: "Medium"
   month: 10
   year: 2025
   ```

3. **Calculates Cycle Length** (only if this is your 2nd+ period):
   - Finds your previous period start date
   - Calculates days between: `Current Start - Previous Start`
   - Updates the **PREVIOUS** cycle with this length
   
   **Example:**
   - 1st period: Aug 5 → cycleLength stays `null`
   - 2nd period: Sept 4 → calculates 30 days → updates Aug 5 cycle with `cycleLength: 30`

**Why is cycleLength null for the first cycle?**
Because we need TWO periods to know how long a complete cycle is! The cycle length is the time from one period start to the next period start.

---

## Daily Tracking & Ovulation

### Purpose
Daily tracking helps predict ovulation by monitoring fertility signs like cervical mucus, body temperature, and physical symptoms.

### How to Track Daily

**User Flow:**
1. Go to **"Daily Tracking"** tab
2. Click **"Track Today"**
3. Fill in today's data:
   - 💧 Cervical Mucus (Dry/Sticky/Creamy/Watery/Egg-white)
   - 🌡️ Basal Body Temperature (optional)
   - 💫 Ovulation Pain (Yes/No)
   - ❤️ Libido Level (Low/Normal/High)
   - 🎯 Other symptoms

**Backend Processing:**

**API Call:** `POST /api/progress/daily`

**What Happens:**

1. **Saves Daily Entry:**
   - Database: `dailyTracking/{userId}/entries/2025-11-22`
   - Includes all symptoms you tracked

2. **Calculates Ovulation Score** (if enough data):
   
   **Scoring System:**
   ```
   Cervical Mucus:
   - Dry: 0 points
   - Sticky: 3 points
   - Creamy: 6 points
   - Watery: 9 points
   - Egg-white: 12 points
   
   Ovulation Pain:
   - No: 0 points
   - Mild: 1 point
   - Moderate: 2 points
   - Severe: 3 points
   
   Libido:
   - Lower: 0 points
   - Normal: 1 point
   - Higher: 2 points
   
   BBT Rise:
   - Yes: 9 points
   - No: 0 points
   
   Total Score: 0-27 points
   ```

3. **Interprets Score:**
   - 0-6 points: Low chance of ovulation
   - 7-14 points: Medium chance
   - 15+ points: High chance of ovulation TODAY!

4. **Updates Ovulation Prediction:**
   - Checks if you have 3+ high-scoring days (60+ points)
   - If yes → switches to **data-driven prediction**
   - If no → uses **formula-based estimation**

---

## Editing Period Data

### Why Edit?
- Forgot to log end date
- Made a mistake in dates
- Want to add more details about symptoms

### How to Edit

**User Flow:**
1. Click **"Edit Last Period"** on the Cycle Insights Card
2. Modal opens with pre-filled data
3. Make changes
4. Save

**Backend Processing:**

**API Call:** `PUT /api/progress/period/update/{cycleId}`

**What Happens:**

1. **Validates new dates** (same safety checks as logging)

2. **Updates the cycle document**

3. **Recalculates cycle lengths** for affected cycles:
   - If you edit Period #2's start date, it affects Period #1's cycle length
   - If you edit Period #2's dates, it affects Period #3's cycle length too!

**Example:**
```
Before Edit:
Period 1: Aug 5 - Aug 9 (cycleLength: 30)
Period 2: Sept 4 - Sept 8 (cycleLength: 28)
Period 3: Oct 2 - Oct 6 (cycleLength: null)

Edit Period 2 start to Sept 6:

After Edit:
Period 1: Aug 5 - Aug 9 (cycleLength: 32) ← Updated!
Period 2: Sept 6 - Sept 8 (cycleLength: 26) ← Updated!
Period 3: Oct 2 - Oct 6 (cycleLength: null)
```

---

## Understanding the Dashboard

### Building Phase (<2 Cycles Logged)

**What You See:**
- "Building Your Cycle Insights" header
- Progress bar showing how many cycles logged
- Checklist:
  - ✅ Period Setup Complete
  - ✅ First Period Logged
  - ⭕ Second Period: Not logged yet
  - ⭕ Third Period: Not logged yet

**Why 2-3 Cycles?**
The system needs at least 2 complete cycles to calculate accurate averages and make reliable predictions!

**What Data is Shown:**
- Current cycle day (e.g., Day 21)
- Last period duration (e.g., 5 days)
- Estimated fertile window (using 28-day average)
- Reminder to track daily symptoms

### Full Insights Phase (2+ Cycles Logged)

**What You See:**
A complete dashboard with:

#### 1. **Header with Phase Badge**
- Shows current cycle phase:
  - 🔴 On Period
  - 🟢 Fertile Window
  - 🟢 Ovulating
  - 🔵 Post-Ovulation
  - 🟣 Pre-Period

#### 2. **Key Metrics (3 boxes)**
```
┌─────────────────┬─────────────────┬──────────────────┐
│ Current Day     │ Last Cycle      │ Ovulation Today  │
│      51         │    30d          │  Very Likely     │
└─────────────────┴─────────────────┴──────────────────┘
```

#### 3. **Cycle Progress Bar**
Visual bar showing:
- Period phase (red)
- Fertile window (green)
- Post-ovulation (light green)
- Your current position

#### 4. **Fertility Status Box**
Shows detailed fertility message:
- 🟢 High Fertility - Fertile Window Open!
- Ovulation Score: 18/27 (if tracked today)
- Based on your tracked symptoms

#### 5. **Key Dates**
```
Last Period:          Predicted Ovulation:
Oct 2, 2025          Oct 15
5 days               70% confidence ✓
```

#### 6. **Today's Tracking** (if logged)
Shows what you tracked today:
- Cervical Mucus: Egg-white
- BBT: 36.8°C
- ✓ Ovulation Pain
- ✓ High Libido

#### 7. **Guidance Message**
Smart tips based on your cycle phase:
- During fertile window: "Track ovulation symptoms daily!"
- Pre-period: "Period expected in 1-4 days"
- Post-ovulation: "Next period in ~14 days"

---

## How Calculations Work

### Data Sources

The Cycle Insights Card pulls data from 3 main APIs:

1. **Cycles API** - Your period history
   - `GET /api/progress/period/cycles/:userId`
   - Returns up to 12 recent cycles
   
2. **Ovulation Prediction API** - Fertility predictions
   - `GET /api/progress/period/ovulation-prediction/:userId`
   - Returns predicted ovulation date and fertile window
   
3. **Daily Tracking API** - Today's symptoms
   - `GET /api/progress/daily/:userId/:date`
   - Returns what you tracked today

   - Returns what you tracked today

### Component-by-Component Breakdown

Let me walk you through EACH piece of information you see and how it's calculated:

---

### 📊 **1. Current Cycle Day (e.g., "Day 51")**

**What it means:** How many days since your last period started

**Formula:**
```
Current Cycle Day = (Today - Last Period Start Date) + 1
```

**Example:**
- Last period started: Oct 2, 2025
- Today: Nov 21, 2025
- Days elapsed: 50 days
- **Current Cycle Day: 51** (we add 1 because day 1 is the first day of your period, not day 0)

**Code Location:** `CycleInsightsCard.tsx`, line ~70
```javascript
const currentCycleDay = Math.floor(
  (todayDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1;
```

---

### 📊 **2. Total Cycle Days (the "28" in "51/28")**

**What it means:** Expected cycle length (denominator)

**Where it comes from:**
- Uses `cycleLength` from your last period's database entry
- If not available (first cycle), defaults to **28 days**

**Code:**
```javascript
const totalCycleDays = currentPeriod.cycleLength || 28;
```

**Why it might show 28:** You've only logged 1 cycle so far!

---

### 📊 **3. Last Cycle Length**

**What it means:** How long your PREVIOUS complete cycle was

**Calculation Process:**

1. **When you log your 2nd period:**
   - Backend calculates: `New Period Start - Previous Period Start`
   - Example: Sept 4 - Aug 5 = 30 days

2. **Where it's stored:**
   - Saved to the **first** cycle document (not the second!)
   - Because the first cycle is now "complete"

3. **Backend Code:** `progressTrackerService.js`
   ```javascript
   export async function calculateCycleLength(userId, currentStartDate) {
     // Get most recent cycle (before the one being logged)
     const previousCycle = await getLatestCycle(userId);
     
     const daysBetween = Math.ceil(
       (currentStartDate - previousCycle.startDate) / (1000 * 60 * 60 * 24)
     );
     
     return daysBetween;
   }
   ```

**Why it shows "-" or "Not yet calculated":**
- You've only logged 1 period
- Need 2+ periods to know cycle length!

---

### 📊 **4. Last Period Duration**

**What it means:** How many days your last period lasted

**Formula:**
```
Period Duration = (Period End Date - Period Start Date) + 1
```

**Example:**
- Start: Oct 2, 2025
- End: Oct 6, 2025
- Days elapsed: 4 days
- **Duration: 5 days** (Oct 2, 3, 4, 5, 6)

**Why +1?** To include both the start and end days!

**Code:**
```javascript
const periodDuration = Math.floor(
  (periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1;
```

---

### 📊 **5. Cycle Phase Badge**

**What it means:** What phase of your cycle you're in right now

**Possible Phases:**
- 🔴 **On Period** - Currently menstruating
- 🟢 **Fertile Window** - Days 9-15 in a 28-day cycle
- 🟢 **Ovulating** - Peak fertility day (usually day 14)
- 🔵 **Post-Ovulation** - After ovulation, before period
- 🟣 **Pre-Period** - Last 5 days before next period

**How it's determined:**

**Step 1:** Are you on your period?
```javascript
if (currentCycleDay <= periodDuration) {
  phase = 'period'; // You're currently menstruating
}
```

**Step 2:** Check ovulation prediction method

**Method A: Data-Driven** (if you've tracked symptoms 3+ times with high scores)
```javascript
if (ovulationPrediction.method === 'data-driven') {
  // Use your actual tracked ovulation date
  if (today is in fertile window) {
    if (today == ovulation date) {
      phase = 'ovulation';
    } else {
      phase = 'fertile';
    }
  }
}
```

**Method B: Formula-Based** (default estimate)
```javascript
else {
  ovulationDay = totalCycleDays - 14;  // Usually day 14 in 28-day cycle
  fertileStart = ovulationDay - 5;      // Day 9
  
  if (currentCycleDay is between fertileStart and ovulationDay+1) {
    phase = 'fertile' or 'ovulation';
  }
}
```

**Step 3:** Check if pre-period
```javascript
if (currentCycleDay > totalCycleDays - 5) {
  phase = 'pre-period'; // Last 5 days of cycle
}
```

**Example (28-day cycle):**
- Days 1-5: 🔴 Period
- Days 6-8: 🔵 Post-Ovulation
- Days 9-15: 🟢 Fertile Window (Day 14 = Ovulating)
- Days 16-23: 🔵 Post-Ovulation
- Days 24-28: 🟣 Pre-Period

---

### 📊 **6. Fertility Status Message**

**What it means:** Plain-English description of your fertility right now

**Messages by Phase:**
```javascript
switch (cyclePhase) {
  case 'period':
    return '🔴 Low Fertility - Period Phase';
    
  case 'fertile':
    return '🟢 High Fertility - Fertile Window Open!';
    
  case 'ovulation':
    return '🟢 Peak Fertility - Ovulation Likely Today!';
    
  case 'post-ovulation':
    return '🔵 Low Fertility - Post-Ovulation Phase';
    
  case 'pre-period':
    return '🟣 Low Fertility - Period Expected Soon';
}
```

---

### 📊 **7. Progress Bar (182% Complete)**

**What it means:** Visual representation of cycle progress

**Calculation:**
```
Progress % = (Current Cycle Day / Total Cycle Days) × 100
```

**Example:**
- Current Day: 51
- Total Days: 28
- **Progress: 182%** (Your period is 22 days late! Time to log a new one or see a doctor)

**Visual Design:**
- 0-33%: Red gradient (Period phase)
- 33-66%: Transition to green (Fertile phase)
- 66-100%: Light green (Post-ovulation)
- >100%: Bar fills completely, shows you're overdue

**Code:**
```javascript
const progressPercent = (currentCycleDay / totalCycleDays) * 100;
```

---

### 📊 **8. Ovulation Today Score**

**What it means:** Your likelihood of ovulating TODAY based on symptoms

**Shows:**
- "Not tracked" if you haven't logged symptoms today
- Score like "18/27" if you have tracked

**Backend Calculation:**
This score is calculated when you submit daily tracking:

**Scoring Formula:**
```
Cervical Mucus Score:
- Dry: 0 × 3 = 0 points
- Sticky: 1 × 3 = 3 points
- Creamy: 2 × 3 = 6 points
- Watery: 3 × 3 = 9 points
- Egg-white: 4 × 3 = 12 points

Ovulation Pain Score:
- No: 0 × 1 = 0 points
- Mild: 1 × 1 = 1 point
- Moderate: 2 × 1 = 2 points
- Severe: 3 × 1 = 3 points

Libido Score:
- Lower: 0 × 1 = 0 points
- Normal: 1 × 1 = 1 point
- Higher: 2 × 1 = 2 points

BBT Rise Score:
- No: 0 × 3 = 0 points
- Did not check: 0 × 3 = 0 points
- Yes: 3 × 3 = 9 points

TOTAL: 0-27 points
```

**Interpretation:**
- **0-6 points:** Low chance of ovulation
- **7-14 points:** Medium chance
- **15-27 points:** High chance - likely ovulating!

**Backend Code:** `progressTrackerService.js`
```javascript
export function calculateOvulationScore(dailyData) {
  const mucusScore = (mucusScores[dailyData.cervicalMucus] || 0) * 3;
  const painScore = (painScores[dailyData.ovulationPain] || 0) * 1;
  const libidoScore = (libidoScores[dailyData.libido] || 0) * 1;
  const bbtScore = (bbtScores[dailyData.bbtRise] || 0) * 3;
  
  const totalScore = mucusScore + painScore + libidoScore + bbtScore;
  
  return { totalScore, ... };
}
```

---

### 📊 **9. Predicted Ovulation Date**

**What it means:** When the system thinks you'll ovulate

**Two Prediction Methods:**

#### **Method 1: Data-Driven (Preferred)**

**Requirements:**
- You've tracked symptoms on 3+ days
- At least one day has a score ≥60 (on 0-100 scale)

**How it works:**
1. Backend scans all your daily tracking entries for this cycle
2. Finds days with ovulation scores ≥60
3. Picks the day with the HIGHEST score
4. That's your predicted ovulation day!

**Fertile Window:**
- Starts: 5 days before ovulation
- Ends: 1 day after ovulation

**Backend Code:**
```javascript
// Find peak ovulation score
const highScoreDays = entries.filter(e => e.ovulationScore >= 60);
const peakDay = max(highScoreDays, day => day.score);

return {
  method: 'data-driven',
  ovulationDate: peakDay.date,
  confidence: 'high', // 70-100%
  fertileWindowStart: peakDay.date - 5 days,
  fertileWindowEnd: peakDay.date + 1 day
};
```

#### **Method 2: Formula-Based (Fallback)**

**When it's used:**
- You haven't tracked enough symptoms yet
- No high-scoring days

**Formula:**
```
Ovulation Day = Cycle Length - 14
```

**Example (28-day cycle):**
- Ovulation Day: 28 - 14 = **Day 14**
- Fertile Start: Day 14 - 5 = **Day 9**
- Fertile End: Day 14 + 1 = **Day 15**

**Confidence Level:** Medium (40-60%)

**Backend Code:**
```javascript
const ovulationDay = cycleLength - 14;
const ovulationDate = periodStartDate + ovulationDay;

return {
  method: 'estimated',
  ovulationDate: ovulationDate,
  confidence: 40, // Medium confidence
  message: 'Track symptoms for more accuracy'
};
```

---

### 📊 **10. Period Expected Banner**

**What it means:** Warning when your next period is coming

**Calculation:**
```
Expected Period Day = Total Cycle Days + 1
Days Until Period = Expected Period Day - Current Cycle Day
```

**Example:**
- Total Cycle Days: 28
- Current Day: 25
- Days Until: 29 - 25 = **4 days**

**Display Logic:**
```javascript
if (daysUntil <= 4 && daysUntil > 0) {
  show: "Period expected in 1-4 days. Track PMS symptoms."
}
else if (daysUntil <= 0) {
  show: "Period expected today" or "Period is X days late"
}
```

---

## Technical Architecture

### Frontend Flow

**Component Hierarchy:**
```
ProgressPage.tsx
  └── CycleInsightsCard.tsx
        ├── Fetches cycle data (useEffect)
        ├── Fetches ovulation prediction
        ├── Fetches today's tracking
        └── Renders UI based on state
```

**State Management:**
```javascript
const [cycleData, setCycleData] = useState(null);
const [todayTracking, setTodayTracking] = useState(null);
const [loading, setLoading] = useState(true);
```

**Data Fetching (useEffect):**
1. Component mounts
2. Calls `fetchCycleData()`
3. Makes 3 parallel API calls:
   - `getCycles(userId, 12)` - Period history
   - `getOvulationPrediction(userId)` - Fertility prediction
   - `getDailyTracking(userId, today)` - Today's symptoms
4. Processes data and sets state
5. Component re-renders with data

**Refresh Triggers:**
- `refreshTrigger` prop changes when user logs new data
- Component re-fetches everything automatically

### Backend Architecture

**Database Structure (Firestore):**

```
firestore/
  ├── periodTracking/
  │     └── {userId}/
  │           ├── (setup document)
  │           │     - avgCycleLength: 28
  │           │     - setupCompleted: true
  │           │
  │           └── cycles/
  │                 ├── cycle_1729000000000/
  │                 │     - startDate: Oct 2, 2025
  │                 │     - endDate: Oct 6, 2025
  │                 │     - cycleLength: null
  │                 │     - flow: "Medium"
  │                 │     - month: 10
  │                 │     - year: 2025
  │                 │
  │                 └── cycle_1731000000000/
  │                       - startDate: Nov 1, 2025
  │                       - endDate: Nov 5, 2025
  │                       - cycleLength: 30
  │                       - flow: "Heavy"
  │
  ├── dailyTracking/
  │     └── {userId}/
  │           └── entries/
  │                 ├── 2025-11-21/
  │                 │     - cervicalMucus: "Egg-white"
  │                 │     - basalBodyTemp: 36.8
  │                 │     - ovulationPain: true
  │                 │     - libido: "Higher"
  │                 │     - ovulationScore:
  │                 │         - totalScore: 18
  │                 │         - fertilityStatus: "High"
  │                 │     - cycleDay: 15
  │                 │
  │                 └── 2025-11-22/
  │                       - (today's tracking)
  │
  └── users/
        └── {userId}/
              └── ovulationPrediction/
                    └── {cycleId}/
                          └── dailyScores/
                                └── 2025-11-21/
                                      - totalScore: 18
                                      - calculatedAt: (timestamp)
```

**API Routes (`progressTracker.js`):**

1. **POST /api/progress/period/setup**
   - Initializes period tracking
   - Creates setup document
   - Creates first cycle if data provided

2. **POST /api/progress/period/log**
   - Logs new period
   - Validates dates
   - Creates cycle document
   - Calculates and updates previous cycle length

3. **PUT /api/progress/period/update/:cycleId**
   - Updates existing period
   - Re-validates dates
   - Recalculates affected cycle lengths

4. **GET /api/progress/period/cycles/:userId**
   - Returns cycle history
   - Sorted ascending by startDate
   - Limited to requested count (default: 6)

5. **GET /api/progress/period/ovulation-prediction/:userId**
   - Gets current cycle
   - Checks for high-scoring tracked days
   - Returns data-driven or formula-based prediction

6. **POST /api/progress/daily**
   - Saves daily tracking entry
   - Calculates ovulation score
   - Saves score to ovulation prediction collection
   - Calculates cycle day

7. **GET /api/progress/daily/:userId/:date**
   - Returns tracking data for specific date
   - Includes ovulation score if calculated

**Service Functions (`progressTrackerService.js`):**

Key functions:
- `initializePeriodSetup()` - Setup wizard
- `createCycle()` - Log new period
- `getCycles()` - Fetch period history
- `updateCycle()` - Edit period
- `calculateCycleLength()` - Compute days between periods
- `updateCycleLength()` - Save cycle length
- `saveDailyTracking()` - Save symptoms
- `getDailyTracking()` - Fetch daily data
- `calculateOvulationScore()` - Score fertility
- `getOvulationPrediction()` - Predict ovulation

### Data Flow Example

**Scenario: User logs Period #2**

```
1. USER: Clicks "Log Period" button
   
2. FRONTEND (LogPeriodModal):
   - Opens modal form
   - User fills: Start=Nov 1, End=Nov 5, Flow=Heavy
   - User clicks "Save"
   
3. API CALL: POST /api/progress/period/log
   Body: {
     startDate: "2025-11-01",
     endDate: "2025-11-05",
     flow: "Heavy",
     userId: "abc123"
   }
   
4. BACKEND (progressTracker.js route):
   - Receives request
   - Calls createCycle()
   
5. BACKEND (progressTrackerService.js):
   a) validatePeriodDates()
      - ✓ End after start
      - ✓ Duration <20 days
      - ✓ No overlaps
      
   b) createCycle()
      - Creates: cycle_1730500000000
      - Saves to: periodTracking/abc123/cycles/cycle_1730500000000
      - Sets: cycleLength = null (for now)
      
   c) calculateCycleLength()
      - Finds previous cycle: cycle_1729000000000 (Oct 2 start)
      - Calculates: Nov 1 - Oct 2 = 30 days
      - Returns: 30
      
   d) getCycles(userId, 50)
      - Gets all cycles
      - Returns: [cycle_Oct2, cycle_Nov1]
      
   e) updateCycleLength()
      - Updates cycle_Oct2
      - Sets: cycleLength = 30
      
6. RESPONSE to Frontend:
   {
     success: true,
     cycleId: "cycle_1730500000000",
     data: { ... }
   }
   
7. FRONTEND (ProgressPage):
   - Modal closes
   - Calls handleLogPeriodSuccess()
   - Increments refreshTrigger
   
8. FRONTEND (CycleInsightsCard):
   - Detects refreshTrigger change
   - Calls fetchCycleData() again
   - Re-renders with new data
   
9. USER SEES:
   - Updated cycle day
   - "Last Cycle Length: 30 days" (now showing!)
   - Updated progress bar
```

---

## Known Issues & Fixes

### 🔴 Bug #1: Last Cycle Length Shows "-"

**Problem:** Even after logging 2 periods, cycle length shows "Not calculated"

**Root Cause:**
- The `calculateCycleLength()` function correctly calculates
- But the updating logic may target the wrong cycle

**Current Code Issue:**
```javascript
// After creating new cycle
const cycles = await getCycles(userId, 2);
const previousCycle = cycles[0]; // Gets oldest
await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
```

**Problem:** If only 1 cycle exists, `cycles[0]` is the one just created!

**Fix Applied:**
```javascript
// Get more cycles to ensure we find the right one
const cycles = await getCycles(userId, 50);
if (cycles.length >= 2) {
  // cycles is sorted ascending (oldest first)
  // Update the SECOND-TO-LAST cycle
  const previousCycle = cycles[cycles.length - 2];
  await updateCycleLength(userId, previousCycle.cycleId, cycleLength);
}
```

**Status:** ✅ Fixed in latest version

---

### 🔴 Bug #2: Inconsistent Query Ordering

**Problem:** Some functions use `desc` order, others use `asc`

**Fix:** Standardized all queries to use `asc` (ascending) order for consistency

**Status:** ✅ Fixed

---

## Summary Reference Table

| Component | Formula | Data Source | Default |
|-----------|---------|-------------|---------|
| **Current Cycle Day** | `(Today - Last Period Start) + 1` | Most recent cycle | N/A |
| **Total Cycle Days** | From `cycleLength` field | Database | 28 days |
| **Last Cycle Length** | `Current Start - Previous Start` | Calculated on 2nd+ period | null |
| **Period Duration** | `(End Date - Start Date) + 1` | Cycle start/end dates | N/A |
| **Cycle Phase** | Complex logic (see §5) | Current day + ovulation data | 'post-ovulation' |
| **Progress %** | `(Current Day / Total Days) × 100` | Calculated | N/A |
| **Ovulation Score** | Mucus + Pain + Libido + BBT | Daily tracking | null |
| **Predicted Ovulation** | Data-driven or Formula | Ovulation prediction API | Formula (day 14) |
| **Fertile Window** | `Ovulation Date ± days` | Ovulation - 5 to +1 | N/A |

---

## User Tips & Best Practices

### For Accurate Predictions:

1. **Log periods consistently**
   - Log start date as soon as period begins
   - Update end date when period ends
   - Don't skip cycles!

2. **Track daily symptoms** (especially during fertile window)
   - Cervical mucus is the #1 indicator
   - Track BBT if possible (most accurate)
   - Note ovulation pain and libido changes

3. **Give it time**
   - First cycle: Basic info only
   - After 2-3 cycles: Accurate cycle length
   - After 3+ cycles with tracking: Data-driven predictions

4. **Edit mistakes immediately**
   - Wrong dates affect all calculations
   - Use "Edit Last Period" button

### Understanding Your Data:

- **Cycle too long (>35 days)?** Common with PCOS, but track anyway!
- **Irregular cycles?** System adapts - keep tracking consistently
- **Late period?** Log new period when it arrives (helps accuracy)
- **Ovulation prediction seems off?** Track more symptoms to improve

---

## Glossary

**Term** | **Definition**
---|---
**Cycle** | Complete period from one period start to the next
**Cycle Length** | Days between period starts (e.g., 28 days)
**Cycle Day** | What day you're on in current cycle (e.g., Day 15)
**Period Duration** | How many days you bleed (e.g., 5 days)
**Ovulation** | Release of egg from ovary (usually mid-cycle)
**Fertile Window** | Days when pregnancy is possible (5 before + 1 after ovulation)
**BBT** | Basal Body Temperature (rises after ovulation)
**Cervical Mucus** | Vaginal discharge (egg-white = peak fertility)
**Data-Driven** | Predictions based on YOUR tracked data
**Formula-Based** | Predictions using standard 28-day estimate

---

**Document Version:** 2.0  
**Created:** November 21, 2025  
**Updated:** November 22, 2025  
**Next Review:** When additional features are added

---

## Quick Navigation

- **For Users:** See [Understanding the Dashboard](#understanding-the-dashboard)
- **For Developers:** See [Technical Architecture](#technical-architecture)  
- **For Bug Fixes:** See [Known Issues & Fixes](#known-issues--fixes)
- **For Formulas:** See [How Calculations Work](#how-calculations-work)
