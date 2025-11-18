import { Utensils } from 'lucide-react';
import { format } from 'date-fns';

interface MealPlanHistoryItemProps {
  planId: string;
  planName: string;
  generatedAt: Date | any; // Firestore timestamp or Date
  isActive: boolean;
  onClick: () => void;
}

const MealPlanHistoryItem = ({
  planName,
  generatedAt,
  isActive,
  onClick,
}: MealPlanHistoryItemProps) => {
  // Format date from Firestore timestamp or Date object
  const formatDate = (date: Date | any) => {
    try {
      // Handle null or undefined
      if (!date) {
        return 'Date unavailable';
      }

      // Handle Firestore Timestamp (has seconds and nanoseconds properties)
      if (date?.seconds && typeof date.seconds === 'number') {
        const jsDate = new Date(date.seconds * 1000);
        return format(jsDate, 'MMM dd, yyyy • h:mm a');
      }

      // Handle Firestore Timestamp with toDate method
      if (date?.toDate && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM dd, yyyy • h:mm a');
      }

      // Handle Date object
      if (date instanceof Date) {
        return format(date, 'MMM dd, yyyy • h:mm a');
      }

      // Handle ISO string
      if (typeof date === 'string') {
        return format(new Date(date), 'MMM dd, yyyy • h:mm a');
      }

      // Handle timestamp number
      if (typeof date === 'number') {
        return format(new Date(date), 'MMM dd, yyyy • h:mm a');
      }

      console.warn('Unknown date format:', date);
      return 'Date unavailable';
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Date unavailable';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer
        transition-all duration-300 ease-in-out
        ${
          isActive
            ? 'bg-primary text-white shadow-md'
            : 'bg-transparent border border-primary/30 text-gray-800 hover:bg-primary/10 hover:border-primary hover:shadow-sm hover:scale-[1.02]'
        }
      `}
    >
      {/* Icon */}
      <div
        className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        ${isActive ? 'bg-white/20' : 'bg-primary/10'}
      `}
      >
        <Utensils
          size={20}
          className={isActive ? 'text-white' : 'text-primary'}
          strokeWidth={2.5}
        />
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`
          text-sm font-semibold truncate
          ${isActive ? 'text-white' : 'text-gray-900'}
        `}
        >
          {planName}
        </h4>
        <p
          className={`
          text-xs truncate
          ${isActive ? 'text-white/80' : 'text-muted'}
        `}
        >
          {formatDate(generatedAt)}
        </p>
      </div>
    </div>
  );
};

export default MealPlanHistoryItem;
