/**
 * Weight Tracker Component
 * Displays weight trends, weekly averages, and goal progress
 */

import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Target, Calendar } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeeklyAverage {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  averageWeight: number;
  weightChange: number | null;
  entriesCount: number;
}

interface GoalData {
  hasGoal: boolean;
  goalWeight: number | null;
  currentWeight: number | null;
  startWeight: number | null;
  weightLost: number | null;
  percentageAchieved: number | null;
  goalAchieved: boolean;
}

interface WeightTrackerProps {
  userId: string;
  refreshTrigger?: number;
}

const WeightTracker = ({ userId, refreshTrigger = 0 }: WeightTrackerProps) => {
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weeklyAverages, setWeeklyAverages] = useState<WeeklyAverage[]>([]);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');

  useEffect(() => {
    fetchWeightData();
  }, [userId, refreshTrigger]);

  const fetchWeightData = async () => {
    setLoading(true);
    try {
      // Get last 90 days of data
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [dailyResponse, goalResponse] = await Promise.all([
        progressTrackerApi.getDailyTrackingRange(userId, startDate, endDate),
        progressTrackerApi.getGoalAchievement(userId),
      ]);

      if (dailyResponse.success) {
        const weights = dailyResponse.data
          .filter((entry: any) => entry.weight)
          .map((entry: any) => ({
            date: entry.date,
            weight: entry.weight,
          }));
        setWeightHistory(weights);

        // Calculate weekly averages manually from daily data
        calculateWeeklyAverages(weights);
      }

      if (goalResponse.success) {
        setGoalData(goalResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyAverages = (weights: WeightEntry[]) => {
    // Group by week
    const weekMap = new Map<string, WeightEntry[]>();

    weights.forEach((entry) => {
      const date = new Date(entry.date);
      const weekStart = getWeekStart(date);
      const weekId = weekStart.toISOString().split('T')[0];

      if (!weekMap.has(weekId)) {
        weekMap.set(weekId, []);
      }
      weekMap.get(weekId)!.push(entry);
    });

    // Calculate averages
    const averages: WeeklyAverage[] = [];
    let prevAvg: number | null = null;

    Array.from(weekMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([weekId, entries]) => {
        const sum = entries.reduce((acc, e) => acc + e.weight, 0);
        const avg = sum / entries.length;
        const weekStart = new Date(weekId);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        averages.push({
          weekId,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          averageWeight: Math.round(avg * 10) / 10,
          weightChange: prevAvg ? Math.round((avg - prevAvg) * 10) / 10 : null,
          entriesCount: entries.length,
        });

        prevAvg = avg;
      });

    setWeeklyAverages(averages);
  };

  const getWeekStart = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(date.setDate(diff));
  };

  const getCurrentWeight = (): number | null => {
    if (weightHistory.length === 0) return null;
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

  if (weightHistory.length === 0) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg text-center">
        <Target size={48} className="mx-auto mb-4 text-primary/30" />
        <p className="text-muted">
          No weight data yet. Start logging daily to track your progress!
        </p>
      </div>
    );
  }

  const currentWeight = getCurrentWeight();
  const weightChange = getWeightChange();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Weight */}
        <div className="bg-surface rounded-3xl p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Current Weight</p>
              <p className="text-3xl font-bold text-gray-800">
                {currentWeight ? `${currentWeight} kg` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Target className="text-primary" size={24} />
            </div>
          </div>
        </div>

        {/* Weight Change */}
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

        {/* Goal Progress */}
        {goalData?.hasGoal && (
          <div className="bg-surface rounded-3xl p-6 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-muted mb-1">Goal Weight</p>
                <p className="text-3xl font-bold text-gray-800">{goalData.goalWeight} kg</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <Target className="text-success" size={24} />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-success h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(goalData.percentageAchieved || 0, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {goalData.percentageAchieved}% achieved • {goalData.weightLost} kg lost
            </p>
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="bg-surface rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif font-bold text-gray-800">Weight Trends</h3>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'daily'
                  ? 'bg-surface text-primary shadow'
                  : 'text-muted hover:text-gray-700'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-surface text-primary shadow'
                  : 'text-muted hover:text-gray-700'
              }`}
            >
              Weekly Avg
            </button>
          </div>
        </div>

        {/* Chart Area - Simple visualization */}
        <div className="space-y-3">
          {viewMode === 'daily'
            ? weightHistory.slice(-30).map((entry, index) => {
                const prev =
                  index > 0
                    ? weightHistory[weightHistory.length - 30 + index - 1].weight
                    : entry.weight;
                const change = entry.weight - prev;
                const isDecrease = change < 0;

                return (
                  <div key={entry.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDecrease ? 'bg-success/70' : 'bg-primary/70'
                            }`}
                            style={{ width: `${(entry.weight / 150) * 100}%` }}
                          />
                        </div>
                        <div className="w-16 text-right font-semibold text-gray-800">
                          {entry.weight} kg
                        </div>
                        {index > 0 && change !== 0 && (
                          <div className={`text-xs ${isDecrease ? 'text-success' : 'text-danger'}`}>
                            {change > 0 ? '+' : ''}
                            {change.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            : weeklyAverages.slice(-12).map((week) => {
                const isDecrease = week.weightChange !== null && week.weightChange < 0;

                return (
                  <div key={week.weekId} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-muted">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(week.weekStart).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDecrease ? 'bg-success' : 'bg-primary'
                            }`}
                            style={{ width: `${(week.averageWeight / 150) * 100}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <div className="font-semibold text-gray-800">{week.averageWeight} kg</div>
                          <div className="text-xs text-muted">{week.entriesCount} entries</div>
                        </div>
                        {week.weightChange !== null && week.weightChange !== 0 && (
                          <div
                            className={`w-16 text-xs flex items-center gap-1 ${
                              isDecrease ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {isDecrease ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                            {week.weightChange > 0 ? '+' : ''}
                            {week.weightChange}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{weightHistory.length}</p>
              <p className="text-xs text-muted mt-1">Days Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{weeklyAverages.length}</p>
              <p className="text-xs text-muted mt-1">Weeks Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">
                {weightChange && weightChange.value < 0 ? Math.abs(weightChange.value) : 0} kg
              </p>
              <p className="text-xs text-muted mt-1">Total Lost</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightTracker;
