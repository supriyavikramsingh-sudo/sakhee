/**
 * Smart Defaults Utility
 * Calculates typical values for backfilling daily tracking entries
 * based on user's recent history (last 14 days)
 */

interface DailyEntry {
  weight?: number | null;
  sleepHours?: number | null;
  energyLevel?: number | null;
  stressLevel?: number | null;
  exercisedToday?: boolean | null;
  // Add other fields as needed
}

/**
 * Calculate median value from array of numbers
 * Excludes null/undefined values
 */
export function calculateMedian(values: (number | null | undefined)[]): number | null {
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  
  if (validValues.length === 0) return null;
  
  const sorted = [...validValues].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

/**
 * Calculate mode (most frequent value) from array
 * For boolean values or categorical data
 */
export function calculateMode<T>(values: (T | null | undefined)[]): T | null {
  const validValues = values.filter((v): v is T => v != null);
  
  if (validValues.length === 0) return null;
  
  const frequency: Map<T, number> = new Map();
  
  validValues.forEach(value => {
    frequency.set(value, (frequency.get(value) || 0) + 1);
  });
  
  let maxFreq = 0;
  let mode: T | null = null;
  
  frequency.forEach((freq, value) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = value;
    }
  });
  
  return mode;
}

/**
 * Calculate average (mean) value from array of numbers
 * Excludes null/undefined values
 */
export function calculateAverage(values: (number | null | undefined)[]): number | null {
  const validValues = values.filter((v): v is number => v != null && !isNaN(v));
  
  if (validValues.length === 0) return null;
  
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sum / validValues.length;
}

/**
 * Round number to specified decimal places
 */
export function roundTo(value: number, decimals: number = 1): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate smart defaults from recent entries
 * Returns pre-filled values and confidence level
 */
export interface SmartDefaults {
  weight?: number;
  sleepHours?: number;
  energyLevel?: number;
  stressLevel?: number;
  exercisedToday?: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  sampleSize: number;
}

export function calculateSmartDefaults(recentEntries: DailyEntry[]): SmartDefaults {
  // Filter out entries from last 14 days (should already be filtered, but double-check)
  const entries = recentEntries.slice(-14);
  
  if (entries.length === 0) {
    return {
      confidence: 'none',
      sampleSize: 0,
    };
  }
  
  // Determine confidence level based on sample size
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (entries.length >= 10) {
    confidence = 'high';
  } else if (entries.length >= 5) {
    confidence = 'medium';
  } else if (entries.length >= 2) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }
  
  // Calculate defaults for numeric fields (use median for stability)
  const weightMedian = calculateMedian(entries.map(e => e.weight));
  const sleepMedian = calculateMedian(entries.map(e => e.sleepHours));
  const energyMedian = calculateMedian(entries.map(e => e.energyLevel));
  const stressMedian = calculateMedian(entries.map(e => e.stressLevel));
  
  // Calculate defaults for boolean/categorical fields (use mode)
  const exerciseMode = calculateMode(entries.map(e => e.exercisedToday));
  
  return {
    weight: weightMedian ? roundTo(weightMedian, 1) : undefined,
    sleepHours: sleepMedian ? roundTo(sleepMedian, 1) : undefined,
    energyLevel: energyMedian ? Math.round(energyMedian) : undefined,
    stressLevel: stressMedian ? Math.round(stressMedian) : undefined,
    exercisedToday: exerciseMode ?? undefined,
    confidence,
    sampleSize: entries.length,
  };
}

/**
 * Get confidence message for UI display
 */
export function getConfidenceMessage(confidence: SmartDefaults['confidence'], sampleSize: number): string {
  switch (confidence) {
    case 'high':
      return `Pre-filled with your typical values (based on ${sampleSize} recent entries)`;
    case 'medium':
      return `Pre-filled with estimated values (based on ${sampleSize} recent entries)`;
    case 'low':
      return `Pre-filled with rough estimates (only ${sampleSize} recent ${sampleSize === 1 ? 'entry' : 'entries'})`;
    case 'none':
      return 'No recent data available - please fill manually';
    default:
      return '';
  }
}

/**
 * Get confidence color for UI styling
 */
export function getConfidenceColor(confidence: SmartDefaults['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'text-success';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-orange-500';
    case 'none':
      return 'text-muted';
    default:
      return 'text-muted';
  }
}
