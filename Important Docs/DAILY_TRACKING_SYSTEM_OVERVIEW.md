# Daily Tracking System - Complete Overview

**Last Updated**: November 24, 2025 (Post Phase 5 Implementation)  
**Status**: ✅ Production Ready (Phase 5 Complete + UX Enhancements)  
**Version**: 2.1

---

## Table of Contents

1. [System Overview](#system-overview)
   - Phase 5 UX Enhancements
2. [Daily Tracking Form - What Users Log](#daily-tracking-form---what-users-log)
3. [Data Flow Architecture](#data-flow-architecture)
4. [How Each Metric is Used](#how-each-metric-is-used)
5. [Weight Calculation System](#weight-calculation-system)
6. [Activity Level Calculation](#activity-level-calculation)
7. [AI Insights Integration](#ai-insights-integration)
8. [Automated Processes](#automated-processes)
9. [Calendar Visualization](#calendar-visualization)
   - Responsive Design (Mobile/Desktop)
   - Smart Date Validation
   - Streak Enhancements
   - Smart Backfill with Pre-filled Defaults
10. [Technical Implementation](#technical-implementation)
11. [Key Takeaways](#key-takeaways)
    - Phase 5 Achievements

---

## System Overview

The **Daily Tracking System** is the core data collection mechanism for Sakhee's PCOS health platform. It captures 12+ health metrics daily and uses this data to:

- 📊 **Dynamically adjust calorie targets** based on weight trends and activity
- 🤖 **Power AI-driven health insights** with personalized recommendations
- 🌸 **Predict ovulation windows** using fertility indicators
- 📈 **Track progress** toward health goals
- 📋 **Generate medical reports** for healthcare providers

### Key Statistics

| Metric | Value |
|--------|-------|
| **Daily Metrics Tracked** | 12 fields |
| **Data Storage** | Firestore subcollections |
| **Auto-Calculations** | 3 (weight avg, activity level, TDEE) |
| **AI Integration Points** | 4 (insights, predictions, reports, chat) |
| **Calendar Visualization** | 30-day rolling window |
| **Edit Window** | 7 days (enforced across 3 layers) |
| **Mobile Support** | Week view + swipe gestures |
| **Smart Features** | Auto pre-fill, calorie warnings, signup validation |

### 🆕 Phase 5 UX Enhancements (November 2025)

**Calendar Intelligence**:
- ✅ **Smart "Log Today" Button** - Text changes based on entry state (Log/Edit/Complete)
- ✅ **Signup Date Validation** - Prevents logging before user joined
- ✅ **7-Day Backfill Limit** - Three-layer enforcement (form, clicks, visual)
- ✅ **Educational Info Strip** - Explains edit rules and limitations

**Mobile-First Design**:
- ✅ **Week View** - Optimized for mobile screens (<768px)
- ✅ **Swipe Gestures** - Navigate weeks with left/right swipes
- ✅ **Today FAB** - Floating action button appears when scrolled
- ✅ **Touch Targets** - All buttons ≥44px (WCAG accessibility)

**Smart Data Entry**:
- ✅ **Smart Defaults** - Pre-fills backfill forms with median/mode values
- ✅ **Calorie Warning** - Confirms before weight changes affect TDEE
- ✅ **Edit Safeguards** - Clear warnings about calculation impacts

**Visual Polish**:
- ✅ **Smooth Transitions** - Fade effects, transform animations
- ✅ **Streak Motivation** - Encouraging messages (3d, 7d, 14d, 30d milestones)
- ✅ **ARIA Labels** - Full screen reader support
- ✅ **Keyboard Navigation** - Tab, arrow keys, Enter support

---

## Daily Tracking Form - What Users Log

### Step 1: Physical Metrics (Body & Activity)

**Required Fields**:
- 📅 **Date** - Defaults to today, can select past dates
- ⚖️ **Weight (kg)** - Conditionally required (only if user has weight goal)
- 🏃 **Exercise Today?** - Yes/No buttons (replaced old 5-option dropdown)

**Optional Fields**:
- 📏 **Waist Circumference (cm)** - For tracking body composition

**How It's Used**:
- **Weight**: Triggers calorie recalculation, updates progress charts
- **Exercise**: Feeds weekly activity level calculation
- **Waist**: Tracked for body composition trends (reports only)

---

### Step 2: Energy & Sleep (Rest & Recovery)

**Required Fields**:
- 😴 **Sleep Duration (hours)** - Slider from 0-12 hours
- 🛏️ **Sleep Quality** - Poor / Fair / Good / Excellent
- ⚡ **Energy Level** - Slider from 1-10

**How It's Used**:
- **Sleep Duration**: AI correlates with energy, weight trends, cycle phases
- **Sleep Quality**: Identifies patterns affecting recovery
- **Energy Level**: Detects fatigue patterns, correlates with cycle days

---

### Step 3: Mood & Wellness (Mental Health)

**Optional Fields**:
- 😊 **Mood** - Happy / Neutral / Low / Anxious
- 😰 **Stress Level** - Slider from 1-10
- 🍬 **Sugar Cravings** - Yes/No

**How It's Used**:
- **Mood**: AI detects cycle-related mood patterns
- **Stress**: Correlates with weight plateaus, symptom flare-ups
- **Sugar Cravings**: Identifies hormonal patterns, insulin resistance signals

---

### Step 4: Cycle & Symptoms (PCOS-Specific)

**Optional Ovulation Indicators**:
- 💧 **Cervical Mucus** - Dry / Sticky / Creamy / Watery / Egg White
- 🌡️ **Basal Body Temperature (BBT)** - Temperature in Celsius
- 💫 **Ovulation Pain** - Yes/No

**Optional Symptoms**:
- Acne breakouts
- Bloating
- Headaches
- Hair changes
- Digestive issues
- Other (free text)

**How It's Used**:
- **Cervical Mucus**: Primary ovulation predictor (60% of fertility score)
- **BBT**: Confirms ovulation occurred (20% of fertility score)
- **Ovulation Pain**: Secondary indicator (20% of fertility score)
- **Symptoms**: AI identifies trigger patterns and cycle correlations

---

## Data Flow Architecture

### Data Storage Structure

```
Firestore
├── users/{userId}
│   ├── profileData
│   │   ├── current_weight_kg (onboarding baseline)
│   │   ├── activityLevel (onboarding baseline)
│   │   └── hasWeightGoal (true/false)
│   ├── currentWeight (latest weekly average)
│   ├── weeklyActivityLevel (calculated from exercise logs)
│   └── updatedAt
│
├── dailyTracking/{userId}/entries/{date}
│   ├── date: "2025-11-24"
│   ├── weight: 68.5
│   ├── exercisedToday: true
│   ├── sleepHours: 7
│   ├── sleepQuality: "good"
│   ├── energyLevel: 8
│   ├── mood: "happy"
│   ├── stress: 3
│   ├── sugarCravings: false
│   ├── cervicalMucus: "egg_white"
│   ├── bbt: 36.8
│   ├── ovulationPain: true
│   ├── symptoms: ["bloating", "headache"]
│   ├── notes: "Felt great today!"
│   └── createdAt: Timestamp
│
└── weeklyMetrics/{userId}/{weekId}
    ├── weekStartDate: Timestamp
    ├── weekEndDate: Timestamp
    ├── exerciseCount: 5
    ├── calculatedActivityLevel: "active"
    └── calculatedAt: Timestamp
```

### Automatic Triggers

**On Daily Entry Save**:
1. ✅ Save entry to `dailyTracking/{userId}/entries/{date}`
2. ✅ Check if weight changed significantly (≥0.5kg from last average)
3. ✅ If yes → Calculate new weekly weight average (last 7 days, min 5 entries)
4. ✅ Update `users/{userId}.currentWeight`
5. ✅ If exercisedToday field present → Calculate weekly activity level (last 7 days)
6. ✅ Update `users/{userId}.weeklyActivityLevel`
7. ✅ Recalculate TDEE with new weight/activity
8. ✅ Adjust calorie targets if needed

**Weekly Cron Job** (Every Monday 2 AM):
1. ✅ Find all users with entries in last 30 days
2. ✅ For each user → Calculate weekly activity level
3. ✅ Update `weeklyMetrics` collection
4. ✅ Update user's `weeklyActivityLevel`

---

## How Each Metric is Used

### 1. Weight (⚖️)

**Direct Uses**:
- **TDEE Calculation**: BMR = 10 × weight + 6.25 × height - 5 × age - 161
- **Weekly Average Calculation**: Average of last 7 days (min 5 entries)
- **Calorie Adjustment Triggers**:
  - Lost ≥2kg/month → Increase calories by 50-100 (prevent metabolic slowdown)
  - Gained ≥1kg/month → Reduce calories by 50-100
  - Lost ≥0.5kg/week → Maintain current calories
  - No change for 2 weeks → Reduce by 50-100 calories

**AI Insights Uses**:
- Trend analysis (gaining/losing/maintaining)
- Correlation with cycle phases
- Correlation with exercise frequency
- Plateau detection and recommendations
- Goal achievement predictions

**Reports**:
- Weight progress charts (daily, weekly, monthly)
- BMI calculations
- Body composition trends (with waist circumference)

---

### 2. Exercise Today (🏃)

**Direct Uses**:
- **Weekly Activity Level Calculation**:
  - 0-1 days/week → Sedentary (1.2× BMR)
  - 2-3 days/week → Light (1.375× BMR)
  - 4-5 days/week → Moderate (1.55× BMR)
  - 6 days/week → Active (1.725× BMR)
  - 7 days/week → Very Active (1.9× BMR)

**Impact on Calories**:
- Example: 65kg woman, sedentary vs. active = +525 calories/day difference!

**AI Insights Uses**:
- Exercise consistency tracking
- Correlation with energy levels
- Correlation with sleep quality
- Impact on weight loss rate
- Burnout risk detection (overtraining)

---

### 3. Sleep (😴)

**AI Insights Uses**:
- **Sleep-Energy Correlation**: "You averaged 9/10 energy on days with 8+ hours sleep vs 5/10 on days with <6 hours"
- **Sleep-Weight Correlation**: "Weight loss slowed during weeks with poor sleep quality"
- **Sleep-Cycle Correlation**: "Sleep quality drops 2 days before menstruation starts"
- **Recovery Recommendations**: "Aim for 7-8 hours to optimize recovery on workout days"

**Reports**:
- Average sleep duration by week/month
- Sleep quality trends
- Sleep impact on other metrics

---

### 4. Energy Level (⚡)

**AI Insights Uses**:
- **Cycle Phase Detection**: Energy typically drops in luteal phase, rises in follicular
- **Fatigue Pattern Detection**: Persistent low energy triggers thyroid/iron deficiency check suggestion
- **Exercise Planning**: "Your energy is highest on days 8-14 of your cycle - schedule intense workouts then"
- **Nutrition Correlation**: Low energy after high-carb days suggests insulin resistance

**Reports**:
- Energy level trends over cycle
- Average energy by cycle phase
- Correlation heatmaps

---

### 5. Mood & Stress (😊😰)

**AI Insights Uses**:
- **PMS Detection**: Mood drops consistently 5-7 days before period
- **Stress-Weight Correlation**: "Stress >7 correlates with 0.3kg weight gain/week (cortisol effect)"
- **Stress-Symptom Correlation**: "Acne flare-ups occur 80% of time when stress >6"
- **Mental Health Monitoring**: Persistent low mood triggers "consider therapy" suggestion

**Reports**:
- Mood calendar (cycle overlay)
- Stress impact analysis
- Mental health trends

---

### 6. Sugar Cravings (🍬)

**AI Insights Uses**:
- **Hormonal Pattern Detection**: "Sugar cravings spike 3 days before period (progesterone peak)"
- **Insulin Resistance Indicator**: Frequent cravings suggest metabolic issues
- **Dietary Planning**: "Increase protein on days you typically crave sugar (days 22-28)"
- **Cycle Prediction**: Cravings often precede menstruation by 2-5 days

---

### 7. Cervical Mucus (💧) - MOST IMPORTANT FERTILITY INDICATOR

**Ovulation Score Calculation** (60% weight):
- Dry: 0 points
- Sticky: 20 points
- Creamy: 40 points
- Watery: 70 points
- **Egg White: 100 points** ← Peak fertility

**AI Insights Uses**:
- **Fertile Window Prediction**: "Based on mucus patterns, you're likely 1-2 days from ovulation"
- **PCOS Ovulation Detection**: Validates that ovulation is occurring (vs anovulatory cycles)
- **Conception Timing**: "Egg white mucus detected - optimal time for conception"
- **Cycle Regularity**: Consistent ovulation patterns indicate hormone balance improvement

**Reports**:
- Fertility calendar with predicted windows
- Ovulation confirmation (if followed by BBT rise)

---

### 8. Basal Body Temperature (🌡️)

**Ovulation Score Calculation** (20% weight):
- Pre-ovulation: 36.1-36.4°C (lower range)
- Post-ovulation: 36.4-37.0°C (sustained rise of 0.3-0.6°C)

**AI Insights Uses**:
- **Ovulation Confirmation**: "Temperature rose 0.4°C for 3 days - ovulation confirmed"
- **Luteal Phase Length**: Tracks how long temperature stays elevated (normal: 12-14 days)
- **Cycle Phase Identification**: Helps divide cycle into follicular/ovulatory/luteal phases
- **Thyroid Screening**: Consistently low BBT (<36.1°C) suggests thyroid issue

---

### 9. Ovulation Pain (💫)

**Ovulation Score Calculation** (20% weight):
- Yes: 100 points
- No: 0 points

**AI Insights Uses**:
- **Ovulation Confirmation**: Pain + egg white mucus = high confidence ovulation
- **Pattern Recognition**: "You typically feel ovulation pain on day 14 of your cycle"
- **Fertility Window**: Ovulation usually occurs within 24-48 hours of pain

---

### 10. Symptoms (Various)

**AI Insights Uses**:
- **Trigger Identification**: "Acne flares up 70% of time after dairy consumption"
- **Cycle Correlation**: "Bloating occurs 5-7 days before period (progesterone-related)"
- **Supplement Effectiveness**: "Headaches reduced by 60% since starting magnesium"
- **Lifestyle Impact**: "Digestive issues correlate with high stress days"

**Reports**:
- Symptom frequency charts
- Trigger analysis
- Treatment effectiveness tracking

---

## Weight Calculation System

### Weekly Weight Average Algorithm

**Trigger**: Anytime a user logs weight

**Process**:
```javascript
1. Get last 7 days of entries (from today backwards)
2. Filter entries that have weight field
3. IF (weight entries count >= 5):
     Calculate average = sum(weights) / count
     Update users/{userId}.currentWeight
     Update users/{userId}.updatedAt
   ELSE:
     Skip (not enough data)
```

**Why 5 entries minimum?**
- Prevents outliers from skewing average
- Requires consistent tracking
- Balances accuracy with flexibility (5/7 days is achievable)

**Example**:
```
Day 1: 68.5 kg
Day 2: 68.3 kg
Day 3: [no entry]
Day 4: 68.7 kg
Day 5: 68.4 kg
Day 6: 68.6 kg
Day 7: [no entry]

Entries with weight: 5 ✅ (meets minimum)
Average: (68.5 + 68.3 + 68.7 + 68.4 + 68.6) / 5 = 68.5 kg
```

### TDEE Calculation (Total Daily Energy Expenditure)

**Formula**:
```
BMR (Basal Metabolic Rate):
  Women: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161

TDEE = BMR × Activity Multiplier

Activity Multipliers:
  - Sedentary (0-1 days exercise):    1.2
  - Light (2-3 days exercise):        1.375
  - Moderate (4-5 days exercise):     1.55
  - Active (6 days exercise):         1.725
  - Very Active (7 days exercise):    1.9
```

**Priority Order**:
1. **weeklyActivityLevel** (calculated from exercise logs) ← PRIMARY
2. **activityLevel** (from onboarding) ← Fallback
3. **'moderate'** (default) ← Last resort

**Example**:
```
User: 25 years old, 165 cm, 65 kg
BMR = 10(65) + 6.25(165) - 5(25) - 161 = 1,346 calories

If sedentary (1.2×):    1,615 calories/day
If moderate (1.55×):    2,086 calories/day
If active (1.725×):     2,322 calories/day

Difference sedentary→active: +707 calories/day! 🎯
```

### Calorie Adjustment Logic

**Automatic Recalculation Triggers**:

1. **Weight Changed ≥0.5kg from last average**:
   - Recalculate BMR with new weight
   - Recalculate TDEE
   - Adjust meal plan calories

2. **Activity Level Changed**:
   - Recalculate TDEE with new multiplier
   - Adjust meal plan calories

3. **Manual Adjustments** (based on trends):
   - **Lost ≥2kg in 30 days** → +50-100 calories (prevent metabolic adaptation)
   - **Gained ≥1kg in 30 days** → -50-100 calories
   - **No weight change for 14 days** (plateau) → -50-100 calories

---

## Activity Level Calculation

### Weekly Activity Level Algorithm

**Trigger**: 
- Every time user logs `exercisedToday: true/false`
- Weekly cron job (Mondays 2 AM)

**Process**:
```javascript
1. Get last 7 days of entries (including today)
2. Count entries where exercisedToday === true
3. Map to activity level:
   
   Exercise Days  →  Activity Level  →  TDEE Multiplier
   ─────────────────────────────────────────────────────
   0-1 days       →  sedentary       →  1.2×
   2-3 days       →  light           →  1.375×
   4-5 days       →  moderate        →  1.55×
   6 days         →  active          →  1.725×
   7 days         →  very_active     →  1.9×

4. Save to weeklyMetrics/{userId}/{weekId}
5. Update users/{userId}.weeklyActivityLevel
```

**Week ID Format**: `YYYY-Www` (ISO week number)
- Example: `2025-W47` (Week 47 of 2025)

**Example Calculation**:
```
Last 7 days:
  Nov 18: exercisedToday = true  ✅
  Nov 19: exercisedToday = false
  Nov 20: exercisedToday = true  ✅
  Nov 21: exercisedToday = true  ✅
  Nov 22: exercisedToday = false
  Nov 23: exercisedToday = true  ✅
  Nov 24: exercisedToday = true  ✅

Exercise count: 5 days
Activity level: moderate (1.55× multiplier)
```

---

## AI Insights Integration

The AI Insights system uses daily tracking data to generate 4 types of intelligence:

### 1. Pattern Recognition

**Data Sources**:
- All daily tracking entries from last 90 days
- Cycle tracking data
- Meal logs
- Symptom logs

**Insights Generated**:
- "Your energy is 40% higher during days 7-14 of your cycle (follicular phase)"
- "Weight loss slows by 30% during weeks with <7 hours sleep"
- "Bloating occurs 85% of the time after consuming dairy products"
- "Exercise 4+ days/week correlates with 50% fewer sugar cravings"

**Technical Implementation**:
```javascript
// AI receives aggregated data
const aiContext = {
  last90DaysEntries: dailyTrackingEntries,
  cyclePhases: calculatedCyclePhases,
  weightTrend: weightTrendAnalysis,
  exerciseConsistency: exercisePatterns,
  symptomCorrelations: symptomTriggerMap
};

// AI analyzes and returns insights
const insights = await openAI.generateInsights(aiContext);
```

---

### 2. Predictive Analytics

**Predictions**:
- **Ovulation Window**: "Based on mucus patterns, ovulation likely in 2-3 days"
- **Period Start Date**: "Your cycle length averages 32 days - next period: Dec 5"
- **Weight Goal Achievement**: "At current rate (-0.4kg/week), you'll reach 60kg by March 2026"
- **Symptom Forecasting**: "Headaches typically occur on cycle day 26-28"

---

### 3. Personalized Recommendations

**Based on Patterns**:
- "Your weight plateaus when exercise drops below 3 days/week - try to maintain 4-5 days"
- "Energy crashes after high-carb breakfasts - try protein-rich options"
- "Stress levels spike on Mondays - schedule self-care activities Sunday evening"
- "You sleep best on days with morning exercise - workout before 10 AM when possible"

---

### 4. RAG (Retrieval-Augmented Generation) for Chat

**Chat Context Enrichment**:
```javascript
// User asks: "Why am I so tired this week?"

// System retrieves:
- Last 7 days of sleep data
- Last 7 days of energy levels
- Current cycle phase
- Recent exercise frequency
- Recent stress levels

// AI response example:
"Looking at your data from the last week, I see a few factors:
1. Your sleep averaged 5.5 hours (down from your usual 7 hours)
2. You're on cycle day 25 (late luteal phase) - energy naturally dips
3. You exercised 6 days straight without rest - possible overtraining
4. Stress levels were 7-8 out of 10 for 4 consecutive days

Recommendation: Prioritize 8 hours sleep tonight, take a rest day 
from exercise, and consider stress-reduction techniques like meditation."
```

---

## Automated Processes

### 1. Weekly Activity Calculation Cron Job

**Schedule**: Every Monday at 2:00 AM (UTC)

**File**: `server/src/cron/weeklyActivityCron.js`

**Process**:
```javascript
async function runWeeklyActivityCalculation() {
  // 1. Find active users (logged data in last 30 days)
  const activeUsers = await getActiveUsers();
  
  // 2. For each user
  for (const userId of activeUsers) {
    // Calculate weekly activity level
    const result = await calculateWeeklyActivityLevel(userId);
    
    // Save to weeklyMetrics collection
    await saveWeeklyMetrics(userId, result);
    
    // Update user document
    await updateUserActivityLevel(userId, result.activityLevel);
  }
}
```

**Manual Trigger** (for testing):
```bash
curl -X POST http://localhost:5000/api/cron/trigger/weeklyActivity
```

---

### 2. Automatic Recalculations on Entry Edit

**Trigger**: User edits entry within 7-day window

**Recalculations**:
1. **Weight Changed**:
   - Recalculate weekly weight average
   - Recalculate TDEE
   - Update calorie targets

2. **Exercise Changed**:
   - Recalculate weekly activity level
   - Recalculate TDEE
   - Update calorie targets

3. **Cycle Data Changed** (mucus/BBT/pain):
   - Recalculate ovulation score
   - Update fertile window prediction
   - Adjust cycle phase if needed

**User Warning** (Phase 5 Enhancement):
```
⚠️ Weight Change Detected

Your weight changed from 68.2 kg to 67.5 kg (-0.7 kg).

Impact on your plan:
  • New Weekly Average: 67.8 kg (was 68.2 kg)
  • New TDEE: 2,045 cal/day (was 2,065 cal/day)
  • Calorie Change: -20 calories/day

This affects your meal plan portions and daily targets.

[Recalculate Now] [Save Without Recalculating] [Cancel]
```

**Implementation**: `CalorieRecalculationPrompt.tsx` (Phase 5)
- ✅ Detects weight changes ≥0.5kg
- ✅ Calculates impact before saving
- ✅ Offers choice to skip recalculation
- ✅ Passes `skipRecalculation` flag to backend

---

## Calendar Visualization

### 🆕 Responsive Design (Phase 5)

**Desktop View (≥768px)**:
- Full month grid (5 weeks × 7 days)
- "Today" button in header (always visible)
- Monthly navigation with ← → arrows
- Hover tooltips on all dates

**Mobile View (<768px)**:
- **Week View** (default) - Current 7 days only
- Larger date cells (60-70px height)
- **Swipe gestures** - Left/right to navigate weeks
- **View toggle button** - Switch to month view if needed
- **Floating Action Button (FAB)** - Appears when scrolled >200px
  - Quick scroll back to current week
  - Bottom-right corner, smooth fade in/out

### 30-Day Rolling Window

**Display**:
- Shows current month grid (month view) or week (mobile week view)
- Color-coded entry completeness:
  - 🟢 **Green** = Complete (all required + 3+ optional fields)
  - 🟡 **Yellow** = Partial (some fields logged)
  - ⚪ **Gray** = Empty (no entry)
  - 🔵 **Blue** = Today (highlighted)
  - 🔒 **Disabled Gray** = Before signup or >7 days old or future
- **Streak counter** with Lucide Flame icon (not emoji)
- Monthly navigation (←  November 2025  →)

### 🆕 Smart Date Validation (Phase 5)

**Three Types of Disabled Dates**:

1. **Future Dates**:
   - ❌ Grayed out, cursor: not-allowed
   - 🔒 Lock icon visible
   - Tooltip: "Future date"

2. **Pre-Signup Dates**:
   - ❌ Grayed out, cursor: not-allowed
   - 🔒 Lock icon visible
   - Tooltip: "You joined Sakhee on {signup date}"
   - **NEW**: Parsed from `userProfile.onboardedAt`

3. **Dates Older Than 7 Days**:
   - ❌ Grayed out, cursor: not-allowed
   - Tooltip: "You can only log entries for the last 7 days"
   - **NEW**: Three-layer enforcement
     - Form input: min/max date attributes
     - Click handler: Pre-validation before opening modal
     - Visual UI: Disabled state in calendar

**Educational Info Strip** (Phase 5):
```
ℹ️ Select any date to view or edit entries. You can edit entries from 
the last 7 days only. Past edits affect future insights but not existing reports.
```

### 🆕 Streak Enhancements (Phase 5)

**Visual Display**:
```tsx
<div className="flex items-center gap-2">
  <Flame className="text-success animate-pulse" size={20} />
  <span className="font-semibold">5 Day Streak</span>
  <span className="text-sm text-success">Keep it up! 💪</span>
</div>
```

**Encouraging Messages by Milestone**:
- 1 day: "Great start! 🎯"
- 3 days: "Keep it up! 💪"
- 7 days: "One week strong! 🌟"
- 14 days: "Two weeks! Amazing! 🚀"
- 30 days: "Monthly master! 👑"

**Color Coding**:
- Streaks 1-6 days: Orange accent (building momentum)
- Streaks ≥7 days: Success green (established habit)

### Entry Completeness Calculation

**Algorithm**:
```javascript
Required fields (2):
  - weight (if user has weight goal)
  - exercisedToday

Optional fields (10):
  - waist, sleepHours, sleepQuality, energyLevel
  - mood, stress, sugarCravings
  - cervicalMucus, bbt, ovulationPain

Score calculation:
  requiredScore = (filled required / total required) × 70
  optionalScore = (filled optional / total optional) × 30
  completeness = requiredScore + optionalScore

Thresholds:
  ≥90% = Complete ✅
  20-89% = Partial ⚠️
  <20% = Empty ❌
```

### 🆕 Smart Backfill with Pre-filled Defaults (Phase 5)

**When Creating Entry for Past Date**:
1. System fetches last 14 days of user data
2. Calculates typical values:
   - **Numeric fields**: Median (weight, sleep hours, energy, stress)
   - **Categorical fields**: Mode (mood, sleep quality, exercise)
   - **Excluded**: Cervical mucus, BBT, ovulation pain (too variable)
3. Pre-fills form with calculated defaults
4. Shows helper text: "📝 Pre-filled with your typical values - adjust as needed"

**Benefits**:
- ✅ Faster backfilling (fewer fields to fill manually)
- ✅ More accurate than blank forms
- ✅ Reduces user cognitive load
- ✅ Maintains data quality

**Implementation**: `smartDefaults.ts` utility + `DailyTrackingForm.tsx`

### Edit Capabilities

**7-Day Edit Window** (Enforced Across 3 Layers):

**Layer 1 - Form Input Validation**:
- HTML5 `min` date: 7 days ago
- HTML5 `max` date: Today
- JavaScript onChange validation
- Toast error if out of range
- Helper text: "📅 You can log entries for today or up to 7 days back"

**Layer 2 - Click Handler**:
- Pre-validation before opening form
- Early return with toast error if date too old
- Prevents modal from opening for invalid dates

**Layer 3 - Visual Indicators**:
- Dates >7 days old: Grayed out, cursor: not-allowed
- Tooltip explains limitation
- Lock icon for clarity
- Consistent with signup date handling

**Edit Button Behavior**:
- ✅ Entries from last 7 days: "Edit" button enabled
- ❌ Entries older than 7 days: Lock icon 🔒 + tooltip
- ⚠️ Weight edits: Calorie recalculation prompt shown
- ℹ️ Warning banner if edit affects calculations

---

## Technical Implementation

### Frontend Stack

**Components**:
- `DailyTrackingForm.tsx` - 4-step form with smart defaults (Phase 5)
- `DailyTrackingCalendar.tsx` - Responsive calendar with week/month views (Phase 5)
- `DailyTrackingEntryPreview.tsx` - Quick view/edit modal
- `EditWarningBanner.tsx` - Destructive edit warnings
- `CalorieRecalculationPrompt.tsx` - **NEW** (Phase 5) - Weight change confirmation

**Hooks**:
- `useDailyTrackingCalendar.ts` - Data fetching & state
- `useDailyTrackingCalendarOptimized.ts` - React Query version (5min cache)

**Utilities**:
- `entryHelpers.ts` - Date, completeness, edit window logic
- `smartDefaults.ts` - **NEW** (Phase 5) - Median/mode calculations

---

### Backend Stack

**Routes**:
- `POST /api/progress/daily` - Create entry
- `GET /api/progress/daily/range/:userId` - Fetch date range
- `PUT /api/progress/daily/:entryId` - Update entry

**Services**:
- `progressTrackerService.js` - Core business logic
  - `saveDailyTracking()`
  - `calculateWeeklyWeightAverage()`
  - `calculateWeeklyActivityLevel()`
  - `calculateTDEE()`

**Cron Jobs**:
- `weeklyActivityCron.js` - Weekly calculations
- `cronScheduler.js` - Job orchestration

---

### Database Schema

**Firestore Collections**:

```
users/{userId}
  ├── profileData.hasWeightGoal: boolean
  ├── profileData.current_weight_kg: number (onboarding)
  ├── profileData.activityLevel: string (onboarding)
  ├── currentWeight: number (calculated weekly avg)
  ├── weeklyActivityLevel: string (calculated from logs)
  └── updatedAt: Timestamp

dailyTracking/{userId}/entries/{date}
  ├── date: string (YYYY-MM-DD)
  ├── weight: number
  ├── exercisedToday: boolean
  ├── sleepHours: number
  ├── sleepQuality: string
  ├── energyLevel: number
  ├── mood: string
  ├── stress: number
  ├── sugarCravings: boolean
  ├── cervicalMucus: string
  ├── bbt: number
  ├── ovulationPain: boolean
  ├── symptoms: string[]
  ├── notes: string
  └── createdAt: Timestamp

weeklyMetrics/{userId}/{weekId}
  ├── weekStartDate: Timestamp
  ├── weekEndDate: Timestamp
  ├── exerciseCount: number
  ├── calculatedActivityLevel: string
  └── calculatedAt: Timestamp
```

---

## Key Takeaways

### For Users

1. **Every metric serves a purpose** - Your daily logs power 4+ systems
2. **Consistency matters** - Need 5+ weight entries/week for accurate averages
3. **Exercise tracking is simple** - Just Yes/No, system calculates the rest
4. **Cervical mucus is gold** - 60% of ovulation prediction!
5. **7-day edit window** - Can fix recent entries, enforced at all levels
6. **Automatic adjustments** - Calories update based on your actual progress
7. **🆕 Smart pre-fill** - Forms auto-fill with your typical values when backfilling
8. **🆕 Calorie warnings** - System confirms before weight changes affect your plan
9. **🆕 Mobile optimized** - Swipe gestures, week view, floating "Today" button
10. **🆕 Streak motivation** - Encouraging messages at 3d, 7d, 14d, 30d milestones

### For Developers

1. **Subcollection structure** - `dailyTracking/{userId}/entries/{date}`
2. **Automatic triggers** - Weight/exercise changes trigger recalculations
3. **Cron jobs** - Weekly activity calculation runs Mondays 2 AM
4. **React Query caching** - 5-min cache, 10-min garbage collection
5. **Edit safeguards** - 7-day window + three-layer validation
6. **AI context enrichment** - All metrics feed into RAG system
7. **🆕 Smart defaults** - Median/mode calculations from last 14 days
8. **🆕 Responsive design** - Mobile-first with week view + swipe gestures
9. **🆕 Accessibility** - WCAG 2.1 AA compliant (ARIA, keyboard nav, 44px targets)
10. **🆕 User consent** - Explicit confirmation before impactful edits

### 🆕 Phase 5 Achievements (November 2025)

**UX Improvements**:
- ✅ 8 major features implemented (info strip, smart button, calorie prompt, smart defaults, signup validation, mobile optimizations, visual polish, Today FAB)
- ✅ 1 bonus feature (7-day backfill limit enforcement)
- ✅ 95% requirement completion
- ✅ Mobile-first responsive design
- ✅ Full accessibility compliance

**Technical Excellence**:
- ✅ Three-layer validation architecture
- ✅ Optimistic UI updates with React Query
- ✅ Smart data pre-filling algorithms
- ✅ User consent before destructive operations
- ✅ Comprehensive error handling

**Developer Experience**:
- ✅ New utility files (`smartDefaults.ts`)
- ✅ New components (`CalorieRecalculationPrompt.tsx`)
- ✅ Enhanced existing components (calendar, form, page)
- ✅ Debug logging added for troubleshooting
- ✅ Updated documentation

---

## Related Documentation

- **Implementation Details**: `PHASES_1-4_MASTER_SUMMARY.md`
- **Phase 5 Audit**: `MISSING_REQUIREMENTS_AUDIT.md` (Updated November 24, 2025)
- **Firestore Setup**: `FIRESTORE_INDEXES_SETUP.md`
- **Cron Jobs**: `CRON_JOBS_GUIDE.md`
- **Quick Start**: `QUICK_START.md`
- **Developer Reference**: `QUICK_REFERENCE_GUIDE.md`

---

**Questions?** See `PRE_PRODUCTION_CHECKLIST.md` for testing procedures.
