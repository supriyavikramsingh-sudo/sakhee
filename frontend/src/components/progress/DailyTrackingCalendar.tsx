import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lock,
  Grid3x3,
  CalendarDays,
  Check,
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import {
  useDailyTrackingCalendar,
  type CalendarEntry,
} from '../../hooks/useDailyTrackingCalendarOptimized';

interface DailyTrackingCalendarProps {
  userId: string;
  onDateClick: (date: string, entry: CalendarEntry | null) => void;
  onTodayClick: () => void;
  userSignupDate?: Date | null; // Task 5: Disable dates before signup
}

/**
 * Daily Tracking Calendar Component
 *
 * Phase 3: Complete calendar with real data and status indicators
 * Phase 5: Optimized with React Query for automatic caching
 *
 * Features:
 * - Monthly calendar grid view
 * - Real-time data fetching with automatic caching (5-min stale time)
 * - Completeness status indicators (✅ ⚠️ ❌)
 * - Streak tracking
 * - Navigation between months
 * - "Today" quick navigation
 * - Mobile responsive (week view for small screens)
 * - Background refetching when data becomes stale
 */
export const DailyTrackingCalendar: React.FC<DailyTrackingCalendarProps> = ({
  userId,
  onDateClick,
  onTodayClick,
  userSignupDate = null, // Task 5: Optional signup date
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month'); // Task 6: View mode toggle
  const [isTransitioning, setIsTransitioning] = useState(false); // Task 7: Smooth transitions
  const [showFAB, setShowFAB] = useState(false); // Task 8: Show FAB when scrolled

  // Detect mobile viewport (Task 6)
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-switch to week view on mobile
      if (mobile && viewMode === 'month') {
        setViewMode('week');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  // Scroll detection for FAB visibility (Task 8)
  useEffect(() => {
    if (!isMobile) {
      setShowFAB(false);
      return;
    }

    const handleScroll = () => {
      // Show FAB after scrolling down 200px
      if (window.scrollY > 200) {
        setShowFAB(true);
      } else {
        setShowFAB(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Fetch calendar data using optimized React Query hook
  const {
    data: calendarData,
    isLoading: loading,
    error,
    refetch: refresh,
    getEntryForDate,
  } = useDailyTrackingCalendar({
    userId,
    daysToFetch: 30,
    enabled: true,
  });

  // Get current month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = formatDate(today);

  // Calculate starting offset (Monday = 0, Sunday = 6)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Helper function to check if date is before user signup (Task 5)
  const isBeforeSignup = (date: Date): boolean => {
    if (!userSignupDate) return false;

    // Normalize dates to midnight for comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const normalizedSignup = new Date(userSignupDate);
    normalizedSignup.setHours(0, 0, 0, 0);

    return normalizedDate < normalizedSignup;
  };

  // Helper function to check if date is older than 7 days (backfill limit)
  const isOlderThan7Days = (date: Date): boolean => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(todayNormalized);
    sevenDaysAgo.setDate(todayNormalized.getDate() - 7);

    return normalized < sevenDaysAgo;
  };

  // Generate calendar dates
  const calendarDates: (Date | null)[] = [];

  // Add empty cells for offset
  for (let i = 0; i < startOffset; i++) {
    calendarDates.push(null);
  }

  // Add actual dates
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDates.push(new Date(year, month, day));
  }

  // Navigation handlers
  const goToPreviousMonth = () => {
    setIsTransitioning(true);
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNextMonth = () => {
    setIsTransitioning(true);
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    // Don't allow future months
    if (newDate <= new Date()) {
      setCurrentDate(newDate);
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      setIsTransitioning(false);
    }
  };

  const goToToday = () => {
    setIsTransitioning(true);
    setCurrentDate(new Date());
    onTodayClick();
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Week navigation handlers (Task 6)
  const goToPreviousWeek = () => {
    setIsTransitioning(true);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNextWeek = () => {
    setIsTransitioning(true);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    // Don't allow future weeks
    if (newDate <= new Date()) {
      setCurrentDate(newDate);
      setTimeout(() => setIsTransitioning(false), 300);
    } else {
      setIsTransitioning(false);
    }
  };

  // Get week dates (Monday to Sunday) (Task 6)
  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    const current = new Date(currentDate);

    // Get Monday of current week
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday (0) and Monday (1)
    const monday = new Date(current);
    monday.setDate(current.getDate() + diff);

    // Generate 7 days from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const weekDates = viewMode === 'week' ? getWeekDates() : [];

  // Swipe handlers (Task 6)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (viewMode === 'week') {
        goToNextWeek();
      } else {
        goToNextMonth();
      }
    },
    onSwipedRight: () => {
      if (viewMode === 'week') {
        goToPreviousWeek();
      } else {
        goToPreviousMonth();
      }
    },
    trackMouse: false, // Only for touch
    preventScrollOnSwipe: true,
  });

  // Keyboard navigation (Task 7 - Accessibility)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Arrow key navigation for month/week
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (viewMode === 'week') {
          goToPreviousWeek();
        } else {
          goToPreviousMonth();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'week') {
          goToNextWeek();
        } else {
          goToNextMonth();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToToday();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [viewMode]);

  // Refresh data when month changes
  useEffect(() => {
    refresh();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  // Format date as YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check if date is today
  function isToday(date: Date): boolean {
    return formatDate(date) === todayStr;
  }

  // Check if date is in future
  function isFuture(date: Date): boolean {
    return date > today;
  }

  // Check if entry has data (completed status)
  function hasEntry(entry: CalendarEntry | null): boolean {
    if (!entry) return false;
    return entry.status === 'complete' || entry.status === 'partial';
  }

  return (
    <div
      className="bg-white rounded-2xl p-3 shadow-md max-w-md"
      role="region"
      aria-label="Daily tracking calendar"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold font-lora text-gray-800">Daily Tracking</h3>
          {/* Compact Streak Display */}
          {calendarData && calendarData.streak > 0 && (
            <p className="text-[10px] text-orange-600 mt-0.5">
              🔥 {calendarData.streak} day streak
            </p>
          )}
        </div>
        <button
          onClick={goToToday}
          className="px-2.5 py-1 text-[10px] bg-primary/10 text-primary rounded-md font-medium hover:bg-primary/20 transition-all"
          aria-label="Jump to today's date"
        >
          Today
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Failed to load calendar data</p>
              <p className="text-xs text-red-600 mt-1">{error.message}</p>
              <button
                onClick={refresh}
                className="mt-2 text-sm text-red-700 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !calendarData && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm text-gray-600">Loading calendar...</p>
          </div>
        </div>
      )}

      {/* Navigation Header (Task 6: Adaptive for week/month) */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={viewMode === 'week' ? goToPreviousWeek : goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}
        >
          <ChevronLeft size={16} className="text-gray-700" />
        </button>

        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-gray-800">
            {viewMode === 'week'
              ? `Week of ${weekDates[0]?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`
              : monthName}
          </h4>

          {/* View Mode Toggle (Task 6) */}
          {isMobile && (
            <button
              onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
              className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label={`Switch to ${viewMode === 'week' ? 'month' : 'week'} view`}
              title={`Switch to ${viewMode === 'week' ? 'month' : 'week'} view`}
            >
              {viewMode === 'week' ? (
                <Grid3x3 size={14} className="text-gray-600" />
              ) : (
                <CalendarDays size={14} className="text-gray-600" />
              )}
            </button>
          )}
        </div>

        <button
          onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth}
          disabled={
            viewMode === 'week'
              ? weekDates[6] >= today
              : currentDate.getMonth() === today.getMonth() &&
                currentDate.getFullYear() === today.getFullYear()
          }
          className="p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}
        >
          <ChevronRight size={16} className="text-gray-700" />
        </button>
      </div>

      {/* Calendar Grid (Task 6: Swipeable wrapper) */}
      <div className="mb-2" {...swipeHandlers}>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <div
              key={`${day}-${idx}`}
              className="text-center text-[9px] font-semibold text-gray-500 py-0.5"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date Cells - Week View (Task 6) */}
        {viewMode === 'week' && (
          <div
            className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {weekDates.map((date) => {
              const dateStr = formatDate(date);
              const isTodayDate = isToday(date);
              const isFutureDate = isFuture(date);
              const isBeforeSignupDate = isBeforeSignup(date);
              const isTooOld = isOlderThan7Days(date);
              const isDisabled = isFutureDate || isBeforeSignupDate || isTooOld;
              const entry = getEntryForDate(dateStr);
              const isCompleted = hasEntry(entry);

              // Debug logging for 24th and 25th
              if (date.getDate() === 24 || date.getDate() === 25) {
                console.log(`[Week View Debug] Date: ${dateStr}`, {
                  entry,
                  status: entry?.status,
                  isCompleted,
                  hasEntry: entry !== null,
                });
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => !isDisabled && onDateClick(dateStr, entry)}
                  disabled={isDisabled}
                  aria-label={`${date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}${isCompleted ? ' - Tracked' : ' - Not tracked'}`}
                  aria-disabled={isDisabled}
                  title={
                    isBeforeSignupDate
                      ? `You joined Sakhee on ${userSignupDate?.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}`
                      : isFutureDate
                      ? 'Future date'
                      : isTooOld
                      ? 'You can only log entries for the last 7 days'
                      : undefined
                  }
                  className={`
                    rounded-full aspect-square flex items-center justify-center
                    text-sm font-medium transition-all duration-200
                    relative w-8 h-8
                    ${
                      isDisabled
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'hover:bg-primary/10 cursor-pointer active:scale-95'
                    }
                    ${
                      isTodayDate
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                        : isCompleted
                        ? 'bg-primary/10'
                        : 'bg-white border border-gray-200'
                    }
                  `}
                >
                  <span className={isTodayDate ? 'text-white font-semibold' : 'text-gray-800'}>
                    {date.getDate()}
                  </span>

                  {/* Lock Icon for dates before signup */}
                  {isBeforeSignupDate && (
                    <Lock size={8} className="text-gray-400 absolute bottom-0" />
                  )}

                  {/* Checkmark Icon for completed entries */}
                  {isCompleted && !isTodayDate && !isBeforeSignupDate && (
                    <Check
                      size={10}
                      className="text-primary absolute -bottom-0.5"
                      strokeWidth={2.5}
                    />
                  )}

                  {/* White checkmark for today if entry exists */}
                  {isCompleted && isTodayDate && (
                    <Check
                      size={10}
                      className="text-white absolute -bottom-0.5"
                      strokeWidth={2.5}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Date Cells - Month View */}
        {viewMode === 'month' && (
          <div
            className={`grid grid-cols-7 gap-1 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}
          >
            {calendarDates.map((date, index) => {
              if (!date) {
                // Empty cell
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const dateStr = formatDate(date);
              const isTodayDate = isToday(date);
              const isFutureDate = isFuture(date);
              const isBeforeSignupDate = isBeforeSignup(date); // Task 5
              const isTooOld = isOlderThan7Days(date);
              const isDisabled = isFutureDate || isBeforeSignupDate || isTooOld;
              const entry = getEntryForDate(dateStr);
              const isCompleted = hasEntry(entry);

              // Debug logging for 24th and 25th
              if (date.getDate() === 24 || date.getDate() === 25) {
                console.log(`[Calendar Debug] Date: ${dateStr}`, {
                  entry,
                  status: entry?.status,
                  isCompleted,
                  hasEntry: entry !== null,
                });
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => !isDisabled && onDateClick(dateStr, entry)}
                  disabled={isDisabled}
                  aria-label={`${date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}${isCompleted ? ' - Tracked' : ' - Not tracked'}`}
                  aria-disabled={isDisabled}
                  title={
                    isBeforeSignupDate
                      ? `You joined Sakhee on ${userSignupDate?.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}`
                      : isFutureDate
                      ? 'Future date'
                      : isTooOld
                      ? 'You can only log entries for the last 7 days'
                      : undefined
                  }
                  className={`
                    rounded-full aspect-square flex items-center justify-center
                    text-xs font-medium transition-all duration-200 relative
                    w-7 h-7 sm:w-8 sm:h-8
                    ${
                      isDisabled
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'hover:bg-primary/10 cursor-pointer active:scale-95'
                    }
                    ${
                      isTodayDate
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                        : isCompleted
                        ? 'bg-primary/10'
                        : 'bg-white border border-gray-200'
                    }
                  `}
                >
                  <span className={isTodayDate ? 'text-white font-semibold' : 'text-gray-800'}>
                    {date.getDate()}
                  </span>

                  {/* Lock Icon for dates before signup (Task 5) */}
                  {isBeforeSignupDate && (
                    <Lock size={7} className="text-gray-400 absolute bottom-0" />
                  )}

                  {/* Checkmark Icon for completed entries */}
                  {isCompleted && !isTodayDate && !isBeforeSignupDate && (
                    <Check
                      size={9}
                      className="text-primary absolute -bottom-0.5"
                      strokeWidth={2.5}
                    />
                  )}

                  {/* White checkmark for today if entry exists */}
                  {isCompleted && isTodayDate && (
                    <Check size={9} className="text-white absolute -bottom-0.5" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px]">Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/10 flex items-center justify-center">
            <Check size={6} className="text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-[10px]">Tracked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-white border border-gray-200" />
          <span className="text-[10px]">Not tracked</span>
        </div>
        {userSignupDate && (
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-50 flex items-center justify-center">
              <Lock size={6} className="text-gray-400" />
            </div>
            <span className="text-[10px]">Locked</span>
          </div>
        )}
      </div>

      {/* Mobile FAB - Quick access to today (Task 8) */}
      {showFAB && (
        <button
          onClick={goToToday}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 animate-in slide-in-from-bottom-4 fade-in"
          aria-label="Jump to today's date"
          title="Go to today"
        >
          <CalendarDays size={20} />
        </button>
      )}
    </div>
  );
};

export default DailyTrackingCalendar;
