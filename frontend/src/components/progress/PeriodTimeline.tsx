import { useState, useEffect, useRef } from 'react';
import { Calendar, Droplet, Heart } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface Cycle {
  cycleId: string;
  startDate: Date;
  endDate: Date;
  flow: string;
  color: string;
  colorConsistency: string;
  clots: string;
  spotting: boolean;
  odor: string;
  cycleLength: number | null;
  aiInsights: string | null;
  insightsGeneratedAt: Date | null;
  month: number;
  year: number;
  loggedAt: Date;
}

interface PeriodTimelineProps {
  userId: string;
  onCycleClick: (cycle: Cycle) => void;
  refreshTrigger?: number;
}

const PeriodTimeline = ({ userId, onCycleClick, refreshTrigger }: PeriodTimelineProps) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCycles();
  }, [userId, zoomLevel, refreshTrigger]);

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const response = await progressTrackerApi.getCycles(userId, zoomLevel);
      if (response.success) {
        // Backend returns in ascending order (oldest first), keep that order
        // Timeline displays left to right: oldest → newest
        console.log('Fetched cycle data:', response.data);
        setCycles(response.data);
        // Auto-scroll to most recent (rightmost)
        setTimeout(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to fetch cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthRange = () => {
    return `Last ${zoomLevel} months`;
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

  if (cycles.length === 0) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg">
        <div className="text-center text-muted">
          <Droplet size={48} className="mx-auto mb-4 text-primary/30" />
          <p>No period data yet. Log your first period to start tracking!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-3xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-primary" size={24} />
            Your Cycle Timeline
          </h3>
          <p className="text-sm text-muted mt-1">{getMonthRange()}</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 3, 6, 12].map((level) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              disabled={zoomLevel === level}
              className="p-2 rounded-lg border border-gray-200 text-primary hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Zoom in (${level} months)`}
            >
              <span>{level} months</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline - Vertical List Layout */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-gray-100">
        {cycles
          .slice()
          .reverse()
          .map((cycle, index) => {
            const startDate = new Date(cycle.startDate);
            const endDate = new Date(cycle.endDate);
            const cycleLength = cycle.cycleLength || 28;

            // Calculate days since start
            const today = new Date();
            const daysSinceStart = Math.floor(
              (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const currentDay = Math.min(Math.max(daysSinceStart + 1, 1), cycleLength);

            // Calculate fertile window and ovulation
            const ovulationDay = cycleLength - 14;
            const fertileStartDay = ovulationDay - 5;
            const fertileEndDay = ovulationDay + 1;
            const ovulationDate = new Date(startDate);
            ovulationDate.setDate(startDate.getDate() + ovulationDay - 1);

            // Period duration (from startDate to endDate)
            const periodDuration =
              Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Most recent cycle is first in reversed array
            const isCurrentCycle = index === 0;

            // Create cycle dots visualization
            const cycleDots = Array.from({ length: cycleLength }, (_, i) => {
              const day = i + 1;
              let dotColor = 'bg-gray-200'; // Default

              if (day <= periodDuration) {
                dotColor = 'bg-primary'; // Period days
              } else if (day >= fertileStartDay && day <= fertileEndDay) {
                dotColor = 'bg-teal-400'; // Fertile window
              } else if (day === ovulationDay) {
                dotColor = 'bg-teal-600'; // Ovulation day
              }

              return (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${dotColor} transition-all`}
                  title={`Day ${day}`}
                />
              );
            });

            return (
              <button
                key={cycle.cycleId}
                onClick={() => onCycleClick(cycle)}
                className={`w-full bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border-2 ${
                  isCurrentCycle ? 'border-primary' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isCurrentCycle && (
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          CURRENT
                        </span>
                      )}
                      <h4 className="text-base font-semibold text-gray-800">
                        {isCurrentCycle
                          ? `Current cycle: ${currentDay} day${currentDay !== 1 ? 's' : ''}`
                          : `${cycleLength} days`}
                      </h4>
                    </div>
                    <p className="flex justify-start text-sm text-gray-600">
                      Started{' '}
                      {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {endDate &&
                        endDate > startDate &&
                        ` – ${endDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}`}
                    </p>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Cycle Visualization Dots */}
                <div className="flex gap-1 flex-wrap mb-3">{cycleDots}</div>

                {/* Additional Info for Current Cycle */}
                {isCurrentCycle && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Heart size={14} className="text-teal-500" />
                      <span className="text-gray-700 font-medium">
                        Fertile window: Day {fertileStartDay}-{fertileEndDay}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-teal-600" />
                      <span className="text-gray-700">
                        Predicted ovulation:{' '}
                        {ovulationDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        (Day {ovulationDay})
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3 font-medium">Legend:</p>
        <div className="flex items-center justify-start gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-gray-600">Period Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-400" />
            <span className="text-xs text-gray-600">Fertile Window</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-600" />
            <span className="text-xs text-gray-600">Ovulation Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <span className="text-xs text-gray-600">Other Days</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodTimeline;
