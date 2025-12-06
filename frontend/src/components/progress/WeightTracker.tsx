import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Target } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeightTrackerProps {
  userId: string;
  refreshTrigger?: number;
}

const WeightTracker = ({ userId, refreshTrigger = 0 }: WeightTrackerProps) => {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeightData();
  }, [userId, refreshTrigger]);

  const fetchWeightData = async () => {
    setLoading(true);
    try {
      // Get last 90 days of data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const dailyResponse = await progressTrackerApi.getDailyTrackingRange(
        userId,
        startDate,
        endDate
      );

      if (dailyResponse.success && dailyResponse.data) {
        const weights = dailyResponse.data
          .filter((entry: any) => entry.weight)
          .map((entry: any) => ({
            date: entry.date,
            weight: entry.weight,
          }));
        setWeightHistory(weights);
      } else {
        // No data available - set empty arrays
        setWeightHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeight = (): number | null => {
    if (weightHistory.length === 0) return null;

    // Get current week's entries (last 7 days from today)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Include today, so -6 for 7 days total

    const currentWeekEntries = weightHistory.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= sevenDaysAgo && entryDate <= today;
    });

    // If we have entries this week, return the average
    if (currentWeekEntries.length > 0) {
      const sum = currentWeekEntries.reduce((acc, entry) => acc + entry.weight, 0);
      const average = sum / currentWeekEntries.length;
      return Math.round(average * 10) / 10; // Round to 1 decimal
    }

    // Fallback to most recent weight if no entries this week
    return weightHistory[weightHistory.length - 1].weight;
  };

  const getWeightChange = (): { value: number; percentage: number } | null => {
    if (weightHistory.length < 2) return null;
    const current = weightHistory[weightHistory.length - 1].weight;
    const previous = weightHistory[0].weight;
    const value = Math.round((current - previous) * 10) / 10;
    const percentage = Math.round((value / previous) * 100 * 10) / 10;
    return { value, percentage };
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const currentWeight = getCurrentWeight();
  const weightChange = getWeightChange();

  return (
    <div className="space-y-6">
      {/* Stats Cards - Only Current Weight & 90-Day Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Weight */}
        <div className="bg-surface rounded-3xl p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Current Weight (Weekly Avg)</p>
              <p className="text-3xl font-bold text-gray-800">
                {currentWeight ? `${currentWeight} kg` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Target className="text-primary" size={24} />
            </div>
          </div>
        </div>

        {/* 90-Day Change */}
        <div className="bg-surface rounded-3xl p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">90-Day Change</p>
              <p
                className={`text-3xl font-bold ${
                  weightChange && weightChange.value < 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {weightChange
                  ? `${weightChange.value > 0 ? '+' : ''}${weightChange.value} kg`
                  : '-'}
              </p>
              {weightChange && (
                <p className="text-xs text-muted mt-1">
                  {weightChange.percentage > 0 ? '+' : ''}
                  {weightChange.percentage}%
                </p>
              )}
            </div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                weightChange && weightChange.value < 0 ? 'bg-success/10' : 'bg-danger/10'
              }`}
            >
              {weightChange && weightChange.value < 0 ? (
                <TrendingDown className="text-success" size={24} />
              ) : (
                <TrendingUp className="text-danger" size={24} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightTracker;
