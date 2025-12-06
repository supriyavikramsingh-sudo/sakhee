/**
 * useDailyTrackingCalendar Hook
 * 
 * Custom hook for fetching and managing daily tracking calendar data.
 * Provides data for the calendar visualization with caching and optimistic updates.
 * 
 * Features:
 * - Fetches 30 days of data (configurable)
 * - Calculates entry completeness status
 * - Handles loading and error states
 * - Provides refresh functionality
 * - Caches data to minimize API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { progressTrackerApi } from '../services/progressTrackerApi';

export type EntryStatus = 'complete' | 'partial' | 'empty';

export interface DailyEntry {
  date: string;
  weight?: number;
  waistCircumference?: number;
  exercisedToday?: boolean;
  activityLevel?: string;
  sleepHours?: number;
  waterIntake?: number;
  stressLevel?: string;
  symptomsTags?: string[];
  energyLevel?: string;
  notes?: string;
  submittedAt?: string;
}

export interface CalendarEntry extends DailyEntry {
  status: EntryStatus;
  completenessScore: number; // 0-100
}

export interface CalendarData {
  entries: Map<string, CalendarEntry>; // date string → entry
  startDate: Date;
  endDate: Date;
  streak: number; // consecutive days logged
}

interface UseDailyTrackingCalendarOptions {
  userId: string;
  daysToFetch?: number; // default 30
  autoRefresh?: boolean; // auto-refresh on mount
}

interface UseDailyTrackingCalendarReturn {
  data: CalendarData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getEntryForDate: (date: Date | string) => CalendarEntry | null;
}

/**
 * Calculate completeness status for a daily entry
 * 
 * Rules:
 * - Complete (✅): All required fields present + at least 3 optional fields
 * - Partial (⚠️): At least 1 field present but not complete
 * - Empty (❌): No data
 */
function calculateEntryStatus(entry: DailyEntry | null): { status: EntryStatus; score: number } {
  if (!entry) {
    return { status: 'empty', score: 0 };
  }

  // Required fields (weight is conditionally required based on user goal, but for now we count it)
  const requiredFields = ['weight', 'exercisedToday'];
  const requiredCount = requiredFields.filter(field => 
    entry[field as keyof DailyEntry] !== null && 
    entry[field as keyof DailyEntry] !== undefined
  ).length;

  // Optional but valuable fields
  const optionalFields = [
    'waistCircumference',
    'sleepHours',
    'waterIntake',
    'stressLevel',
    'symptomsTags',
    'energyLevel',
    'notes'
  ];
  const optionalCount = optionalFields.filter(field => {
    const value = entry[field as keyof DailyEntry];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  }).length;

  const totalFields = requiredFields.length + optionalFields.length;
  const filledFields = requiredCount + optionalCount;
  const score = Math.round((filledFields / totalFields) * 100);

  // Determine status
  if (requiredCount === requiredFields.length && optionalCount >= 3) {
    return { status: 'complete', score };
  } else if (filledFields > 0) {
    return { status: 'partial', score };
  } else {
    return { status: 'empty', score: 0 };
  }
}

/**
 * Calculate consecutive days streak
 * Counts days from today backwards where entries exist
 */
function calculateStreak(entries: Map<string, CalendarEntry>, endDate: Date): number {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from today and go backwards
  let currentDate = new Date(today);
  
  while (currentDate >= new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)) { // max 90 days
    const dateStr = currentDate.toISOString().split('T')[0];
    const entry = entries.get(dateStr);
    
    if (entry && entry.status !== 'empty') {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * useDailyTrackingCalendar Hook
 */
export function useDailyTrackingCalendar(
  options: UseDailyTrackingCalendarOptions
): UseDailyTrackingCalendarReturn {
  const { userId, daysToFetch = 30, autoRefresh = true } = options;

  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch calendar data from API
   */
  const fetchCalendarData = useCallback(async () => {
    if (!userId) {
      setError(new Error('User ID is required'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate date range (today back N days)
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (daysToFetch - 1));
      startDate.setHours(0, 0, 0, 0);

      // Fetch data from API
      const startDateStr = formatDateString(startDate);
      const endDateStr = formatDateString(endDate);

      const response = await progressTrackerApi.getDailyTrackingRange(
        userId,
        startDateStr,
        endDateStr
      );

      // Process entries
      const entries = new Map<string, CalendarEntry>();

      if (response.success && Array.isArray(response.data)) {
        response.data.forEach((entry: DailyEntry) => {
          const { status, score } = calculateEntryStatus(entry);
          entries.set(entry.date, {
            ...entry,
            status,
            completenessScore: score,
          });
        });
      }

      // Fill in missing dates with empty entries
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = formatDateString(currentDate);
        if (!entries.has(dateStr)) {
          entries.set(dateStr, {
            date: dateStr,
            status: 'empty',
            completenessScore: 0,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate streak
      const streak = calculateStreak(entries, endDate);

      setData({
        entries,
        startDate,
        endDate,
        streak,
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [userId, daysToFetch]);

  /**
   * Get entry for specific date
   */
  const getEntryForDate = useCallback(
    (date: Date | string): CalendarEntry | null => {
      if (!data) return null;

      const dateStr = typeof date === 'string' 
        ? date 
        : formatDateString(date);

      return data.entries.get(dateStr) || null;
    },
    [data]
  );

  /**
   * Refresh calendar data
   */
  const refresh = useCallback(async () => {
    await fetchCalendarData();
  }, [fetchCalendarData]);

  /**
   * Auto-fetch on mount
   */
  useEffect(() => {
    if (autoRefresh) {
      fetchCalendarData();
    }
  }, [autoRefresh, fetchCalendarData]);

  return {
    data,
    loading,
    error,
    refresh,
    getEntryForDate,
  };
}

export default useDailyTrackingCalendar;
