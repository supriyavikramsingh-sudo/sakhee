2;
/**
 * Period Timeline Component
 * Displays horizontal scrollable timeline of period cycles with fertile window visualization
 */

import { useState, useEffect, useRef } from 'react';
import { Calendar, ZoomIn, ZoomOut, Droplet, Heart } from 'lucide-react';
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
}

const PeriodTimeline = ({ userId, onCycleClick }: PeriodTimelineProps) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(6); // 3, 6, or 12 months
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCycles();
  }, [userId, zoomLevel]);

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

  const handleZoomIn = () => {
    if (zoomLevel > 3) setZoomLevel(3);
  };

  const handleZoomOut = () => {
    if (zoomLevel < 12) setZoomLevel(12);
  };

  const getMonthRange = () => {
    const months =
      zoomLevel === 3 ? 'Last 3 months' : zoomLevel === 6 ? 'Last 6 months' : 'Last 12 months';
    return months;
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
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel === 3}
            className="p-2 rounded-lg border border-gray-200 hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom in (3 months)"
          >
            <ZoomIn size={20} className="text-primary" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel === 12}
            className="p-2 rounded-lg border border-gray-200 hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom out (12 months)"
          >
            <ZoomOut size={20} className="text-primary" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary scrollbar-track-gray-100"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="relative min-w-max px-8">
          {/* Timeline line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted/30 transform -translate-y-1/2" />

          {/* Period points */}
          <div className="relative flex items-center gap-8 py-8" style={{ zIndex: 1 }}>
            {cycles.map((cycle, index) => {
              const startDate = new Date(cycle.startDate);
              // Next cycle is the one after (index + 1) since oldest is on left
              const nextCycle = cycles[index + 1];
              const daysApart = nextCycle
                ? Math.floor(
                    (new Date(nextCycle.startDate).getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              // Calculate fertile window (5-6 days before ovulation, ovulation ~14 days before next period)
              const cycleLength = cycle.cycleLength || 28;
              const ovulationDay = cycleLength - 14;
              const fertileStartDay = ovulationDay - 5;
              const fertileEndDay = ovulationDay + 1;
              const ovulationDate = new Date(startDate);
              ovulationDate.setDate(startDate.getDate() + ovulationDay - 1);
              const fertileStartDate = new Date(startDate);
              fertileStartDate.setDate(startDate.getDate() + fertileStartDay - 1);

              // Most recent cycle is the last one in the array
              const isCurrentCycle = index === cycles.length - 1;

              return (
                <div key={cycle.cycleId} className="relative flex flex-col items-center">
                  {/* Fertile Window Shading - Only for most recent cycle */}
                  {isCurrentCycle && (
                    <div
                      className="absolute bg-success/15 border-2 border-success/40 rounded-lg"
                      style={{
                        left: `${(fertileStartDay / cycleLength) * 100}%`,
                        width: `${((fertileEndDay - fertileStartDay) / cycleLength) * 100}%`,
                        top: '-20px',
                        height: '80px',
                        zIndex: 0,
                      }}
                    />
                  )}

                  {/* Cycle length label - show to the right, between this and next cycle */}
                  {daysApart && (
                    <div className="absolute -top-8 left-full ml-4 text-xs text-muted whitespace-nowrap">
                      {daysApart} days
                    </div>
                  )}

                  {/* Fertile window indicator */}
                  {isCurrentCycle && (
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                      <div className="bg-success/20 border-2 border-success rounded-lg px-3 py-1 text-xs font-semibold text-success whitespace-nowrap shadow-sm">
                        <Heart size={12} className="inline mr-1" />
                        Fertile: Day {fertileStartDay}-{ovulationDay + 1}
                      </div>
                    </div>
                  )}

                  {/* Period point */}
                  <button onClick={() => onCycleClick(cycle)} className="relative group">
                    <div
                      className={`w-6 h-6 rounded-full bg-primary shadow-lg cursor-pointer 
                        transform transition-all duration-300 hover:scale-125 hover:shadow-xl
                        ${isCurrentCycle ? 'animate-pulse ring-4 ring-primary/30' : ''}`}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                        {startDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <div className="text-primary/80 text-[10px]">Click for details</div>
                      </div>
                    </div>
                  </button>

                  {/* Date label */}
                  <div className="mt-4 text-xs text-center text-gray-600 whitespace-nowrap">
                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Ovulation prediction marker (only for current cycle) */}
                  {isCurrentCycle && (
                    <div className="absolute top-0 left-full ml-2">
                      <div className="flex items-center gap-1 text-[10px] text-success font-semibold whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span>
                          Ovulation ~
                          {ovulationDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary" />
          <span className="text-xs text-gray-600">Period Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-success" />
          <span className="text-xs text-gray-600">Fertile Window</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-success ring-2 ring-success/30" />
          <span className="text-xs text-gray-600">Predicted Ovulation</span>
        </div>
      </div>

      {/* Current cycle info */}
      {cycles.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/30 rounded-xl border border-secondary">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                Day {getCurrentCycleDay(cycles[cycles.length - 1])}
              </div>
              <div className="text-xs text-muted mt-1">Current Cycle Day</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {new Date(cycles[cycles.length - 1].startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted mt-1">Last Period Start</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {cycles[cycles.length - 1].cycleLength || '-'}
              </div>
              <div className="text-xs text-muted mt-1">Last Cycle Length</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate current cycle day
const getCurrentCycleDay = (latestCycle: Cycle): number => {
  const startDate = new Date(latestCycle.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

export default PeriodTimeline;
