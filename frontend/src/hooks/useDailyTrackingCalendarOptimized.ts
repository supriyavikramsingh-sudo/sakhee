import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { progressTrackerApi } from '../services/progressTrackerApi';
import { 
  calculateEntryStatus, 
  type EntryStatus, 
  type DailyEntry, 
  type CalendarEntry 
} from '../utils/dailyTrackingUtils';

// Re-export types for backward compatibility
export type { EntryStatus, DailyEntry, CalendarEntry };

export interface CalendarData {
  entries: Map<string, CalendarEntry>; // date string → entry
  startDate: Date;
  endDate: Date;
  streak: number; // consecutive days logged
}

interface UseDailyTrackingCalendarOptions {
  userId: string;
  daysToFetch?: number; // default 30
  enabled?: boolean; // control when query runs (default true)
  staleTime?: number; // override default stale time
}

interface UseDailyTrackingCalendarReturn {
  data: CalendarData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getEntryForDate: (date: Date | string) => CalendarEntry | null;
  invalidate: () => Promise<void>; // Force refetch
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
 * Fetch and process calendar data
 */
async function fetchCalendarData(
  userId: string,
  daysToFetch: number
): Promise<CalendarData> {
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

  console.log('[Calendar Hook] API Response:', { 
    success: response.success, 
    dataCount: response.data?.length,
    data: response.data 
  });

  // Handle null data gracefully
  if (response.success && Array.isArray(response.data)) {
    response.data.forEach((entry: DailyEntry) => {
      const { status, score } = calculateEntryStatus(entry);
      console.log('[Calendar Hook] Processing entry:', { 
        date: entry.date, 
        status, 
        score, 
        rawEntry: entry 
      });
      entries.set(entry.date, {
        ...entry,
        status,
        completenessScore: score,
      });
    });
  } else {
    console.warn('[Calendar Hook] No data returned from API or data is not an array:', response);
  }
  
  console.log('[Calendar Hook] Total entries processed:', entries.size);

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

  return {
    entries,
    startDate,
    endDate,
    streak,
  };
}

/**
 * useDailyTrackingCalendar Hook (Optimized with React Query)
 */
export function useDailyTrackingCalendar(
  options: UseDailyTrackingCalendarOptions
): UseDailyTrackingCalendarReturn {
  const { userId, daysToFetch = 30, enabled = true, staleTime } = options;
  const queryClient = useQueryClient();

  // Use React Query for automatic caching and refetching
  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['dailyTrackingCalendar', userId, daysToFetch],
    queryFn: () => fetchCalendarData(userId, daysToFetch),
    enabled: enabled && !!userId,
    staleTime: staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnMount: true, // Refetch on mount to get latest data
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  /**
   * Get entry for specific date (memoized)
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
   * Refresh calendar data (wrapper around React Query refetch)
   */
  const refetch = useCallback(async () => {
    await queryRefetch();
  }, [queryRefetch]);

  /**
   * Invalidate and refetch (useful after mutations)
   */
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['dailyTrackingCalendar', userId],
    });
  }, [queryClient, userId]);

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
    getEntryForDate,
    invalidate,
  };
}

/**
 * Helper hook to invalidate calendar cache after mutations
 * Use this in forms/modals that create/update daily tracking entries
 */
export function useInvalidateCalendarCache() {
  const queryClient = useQueryClient();

  return useCallback((userId: string) => {
    return queryClient.invalidateQueries({
      queryKey: ['dailyTrackingCalendar', userId],
    });
  }, [queryClient]);
}

export default useDailyTrackingCalendar;
