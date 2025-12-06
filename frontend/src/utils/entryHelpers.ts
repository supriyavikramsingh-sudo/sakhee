/**
 * Entry Helpers
 * Utility functions for daily tracking entry management
 */

/**
 * Check if an entry can be edited
 * Entries can only be edited within 7 days of creation
 * 
 * @param entryDate - The date of the entry (ISO string or Date object)
 * @param maxDaysBack - Maximum number of days back allowed for editing (default: 7)
 * @returns true if entry can be edited, false otherwise
 */
export const canEditEntry = (entryDate: string | Date, maxDaysBack: number = 7): boolean => {
  try {
    const entry = typeof entryDate === 'string' ? new Date(entryDate) : entryDate;
    const today = new Date();
    
    // Reset time to midnight for accurate day comparison
    entry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = today.getTime() - entry.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Entry must be in the past (or today) and within maxDaysBack
    return diffDays >= 0 && diffDays < maxDaysBack;
  } catch (error) {
    console.error('Error checking if entry can be edited:', error);
    return false;
  }
};

/**
 * Get the number of days ago an entry was created
 * 
 * @param entryDate - The date of the entry (ISO string or Date object)
 * @returns Number of days ago (0 for today, positive for past)
 */
export const getDaysAgo = (entryDate: string | Date): number => {
  try {
    const entry = typeof entryDate === 'string' ? new Date(entryDate) : entryDate;
    const today = new Date();
    
    // Reset time to midnight for accurate day comparison
    entry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - entry.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days ago:', error);
    return -1;
  }
};

/**
 * Get human-readable text for when an entry can be edited
 * 
 * @param entryDate - The date of the entry (ISO string or Date object)
 * @param maxDaysBack - Maximum number of days back allowed for editing (default: 7)
 * @returns Human-readable message
 */
export const getEditableMessage = (entryDate: string | Date, maxDaysBack: number = 7): string => {
  const daysAgo = getDaysAgo(entryDate);
  
  if (daysAgo < 0) {
    return 'Future entries cannot be edited';
  }
  
  if (daysAgo === 0) {
    return 'Can edit (today)';
  }
  
  if (daysAgo === 1) {
    return 'Can edit (yesterday)';
  }
  
  if (daysAgo < maxDaysBack) {
    return `Can edit (${daysAgo} days ago)`;
  }
  
  return `Cannot edit (${daysAgo} days old - limit is ${maxDaysBack} days)`;
};

/**
 * Format date for display
 * 
 * @param date - Date to format (ISO string or Date object)
 * @param includeYear - Whether to include year (default: false)
 * @returns Formatted date string (e.g., "Mon, Nov 24" or "Mon, Nov 24, 2025")
 */
export const formatEntryDate = (date: string | Date, includeYear: boolean = false): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric'
    };
    
    if (includeYear) {
      options.year = 'numeric';
    }
    
    return d.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return typeof date === 'string' ? date : date.toISOString();
  }
};
