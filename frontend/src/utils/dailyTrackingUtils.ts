/**
 * Daily Tracking Utility Functions
 * Shared utilities for processing daily tracking entries
 */

export type EntryStatus = 'complete' | 'partial' | 'empty';

export interface DailyEntry {
  date: string;
  weight?: number;
  waistCircumference?: number;
  exercisedToday?: boolean;
  activityLevel?: string;
  sleepHours?: number;
  sleepQuality?: string;
  energyLevel?: number;
  mood?: string;
  stressLevel?: number;
  sugarCravings?: string;
  appetite?: string;
  cervicalMucus?: string;
  basalBodyTemp?: number;
  ovulationPain?: boolean;
  breastTenderness?: boolean;
  increasedLibido?: boolean;
  symptomsTags?: string[];
  notes?: string;
  submittedAt?: string;
}

export interface CalendarEntry extends DailyEntry {
  status: EntryStatus;
  completenessScore: number;
}

/**
 * Calculate completeness status for a daily entry
 * 
 * Rules:
 * - Complete (✅): All required fields present + at least 3 optional fields
 * - Partial (⚠️): At least 1 field present but not complete
 * - Empty (❌): No data
 */
export function calculateEntryStatus(entry: DailyEntry | null): { status: EntryStatus; score: number } {
  if (!entry) {
    return { status: 'empty', score: 0 };
  }

  console.group('🔍 calculateEntryStatus for date:', entry.date);
  console.log('Full Entry Object:', entry);
  console.log('Entry Keys:', Object.keys(entry));

  // Required fields (weight is conditionally required based on user goal, but for now we count it)
  const requiredFields = ['weight', 'exercisedToday'];
  const requiredCount = requiredFields.filter(field => {
    const value = entry[field as keyof DailyEntry];
    const exists = value !== null && value !== undefined;
    console.log(`✓ Required field '${field}': ${value} (exists: ${exists})`);
    return exists;
  }).length;

  // Optional but valuable fields (matching actual form fields)
  const optionalFields = [
    'waistCircumference',
    'sleepHours',
    'sleepQuality',
    'energyLevel',
    'mood',
    'stressLevel',
    'sugarCravings',
    'appetite',
    'cervicalMucus',
    'basalBodyTemp'
  ];
  const optionalCount = optionalFields.filter(field => {
    const value = entry[field as keyof DailyEntry];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  }).length;

  const totalFields = requiredFields.length + optionalFields.length;
  const filledFields = requiredCount + optionalCount;
  const score = Math.round((filledFields / totalFields) * 100);

  console.log('📊 Counts:', { 
    requiredCount, 
    optionalCount, 
    filledFields, 
    totalFields, 
    score 
  });

  // Determine status
  let status: EntryStatus;
  if (requiredCount === requiredFields.length && optionalCount >= 3) {
    console.log('✅ Status: complete');
    status = 'complete';
  } else if (filledFields > 0) {
    console.log('⚠️ Status: partial');
    status = 'partial';
  } else {
    console.log('❌ Status: empty');
    status = 'empty';
  }
  
  console.groupEnd();
  return { status, score };
}

/**
 * Enrich a raw backend entry with calculated status and completeness score
 */
export function enrichEntryWithStatus(entry: DailyEntry): CalendarEntry {
  const { status, score } = calculateEntryStatus(entry);
  return {
    ...entry,
    status,
    completenessScore: score,
  };
}
