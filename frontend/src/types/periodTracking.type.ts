/**
 * Period Tracking Type Definitions
 * Defines interfaces for period tracking, cycles, and medical warnings
 */

export interface MedicalWarnings {
  irregularCycleWarning?: boolean; // Shown when last period >60 days ago
  longCycleLengthWarning?: boolean; // Shown when user inputs cycle length >35 days
  longDurationWarning?: boolean; // Shown when user selects 7+ days duration
}

export interface PeriodTracking {
  lastPeriodStart: string; // ISO date string
  lastPeriodEnd: string; // ISO date string (calculated)
  onboardingDuration: number; // Average period duration: 2, 4, 5, 6, or 7
  avgCycleLength: number; // Average cycle length in days
  setupCompleted: boolean;
  setupCompletedAt: Date | any; // Firebase Timestamp
  medicalWarnings?: MedicalWarnings;
  durationUpdateOffered?: boolean; // Whether user has been offered duration update
  durationUpdateDeclined?: boolean; // Whether user declined duration update
  durationUpdatedAt?: Date | any; // Firebase Timestamp
  durationUpdateDeclinedAt?: Date | any; // Firebase Timestamp
}

export interface CycleData {
  cycleId: string;
  startDate: string | Date; // ISO date string or Date object
  endDate: string | Date; // ISO date string or Date object (calculated from start + duration)
  cycleLength: number | null; // Days between this period start and previous (null for first cycle)
  periodDuration: number; // Duration from onboarding or user's typical duration
  actualDuration?: number; // Actual logged duration if different from onboarding
  durationDiffersFromOnboarding?: boolean; // Flag indicating duration differs from onboarding
  usedForDurationUpdate?: boolean; // Flag indicating this cycle was used in duration update decision
  flow?: string; // Light, Moderate, Heavy, Very heavy
  color?: string; // Bright red, Dark red, Brown/old blood, etc.
  colorConsistency?: string;
  clots?: string; // No, Small clots, Large clots
  spotting?: boolean;
  odor?: string;
  comparedToLast?: string;
  symptoms?: string[];
  month: number; // 1-12
  year: number;
  createdAt?: Date | any; // Firebase Timestamp
  updatedAt?: Date | any; // Firebase Timestamp
  source?: 'setup' | 'manual'; // How the cycle was created
  insightsButtonVisible?: boolean;
  aiInsights?: string | null;
  insightsGeneratedAt?: Date | any;
}

export interface SetupFormData {
  currentlyOnPeriod: boolean | null;
  lastPeriodStart: string;
  onboardingDuration: number | null; // Replaces lastPeriodEnd/expectedEnd
  averageCycleLength: string | number; // Only asked conditionally
  flow: string;
  color: string;
  colorConsistency: string;
  clots: string;
  spotting: boolean | null;
  odor: string;
}

export interface DurationUpdateData {
  current: number; // Current onboarding duration
  suggested: number; // Recommended duration based on median
  recent: number[]; // Recent 3 actual durations
}

export interface DurationUpdateRequest {
  userId: string;
  newDuration?: number; // Only if accepted
  declined: boolean;
}

export interface DurationUpdateResponse {
  success: boolean;
  message: string;
  newDuration?: number;
}

export interface EditPeriodResponse {
  success: boolean;
  message: string;
  offerDurationUpdate?: boolean;
  suggestedDuration?: number;
  currentDuration?: number;
  recentDurations?: number[];
}
