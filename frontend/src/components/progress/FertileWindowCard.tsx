/**
 * Fertile Window Card Component
 * Displays current cycle day, fertile window prediction, and actionable guidance
 */

import { useState, useEffect } from 'react';
import { Calendar, Heart, TrendingUp, Droplet, AlertCircle, CheckCircle2 } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface CycleData {
  currentCycleDay: number;
  totalCycleDays: number;
  fertileWindowStart: string | null;
  fertileWindowEnd: string | null;
  ovulationDate: string | null;
  daysUntilOvulation: number | null;
  isPeriodPhase: boolean;
  isFertileWindow: boolean;
  isOvulating: boolean;
}

interface TodaySymptoms {
  cervicalMucus: string | null;
  basalBodyTemp: number | null;
  ovulationPain: boolean;
  breastTenderness: boolean;
  increasedLibido: boolean;
}

interface FertileWindowCardProps {
  userId: string;
  refreshTrigger?: number;
}

const FertileWindowCard = ({ userId, refreshTrigger = 0 }: FertileWindowCardProps) => {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<TodaySymptoms | null>(null);
  const [ovulationScore, setOvulationScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCycleData();
  }, [userId, refreshTrigger]);

  const fetchCycleData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get today's tracking data
      const todayResponse = await progressTrackerApi.getDailyTracking(userId, today);

      if (todayResponse.success && todayResponse.data) {
        setTodaySymptoms({
          cervicalMucus: todayResponse.data.cervicalMucus || null,
          basalBodyTemp: todayResponse.data.basalBodyTemp || null,
          ovulationPain: todayResponse.data.ovulationPain || false,
          breastTenderness: todayResponse.data.breastTenderness || false,
          increasedLibido: todayResponse.data.increasedLibido || false,
        });

        if (todayResponse.data.ovulationScore) {
          setOvulationScore(todayResponse.data.ovulationScore.totalScore);
        }
      }

      // Get recent periods to calculate cycle data
      const periodsResponse = await progressTrackerApi.getCycles(userId, 3);

      if (
        periodsResponse.success &&
        periodsResponse.data.cycles &&
        periodsResponse.data.cycles.length > 0
      ) {
        const currentPeriod = periodsResponse.data.cycles[0];
        const periodStartDate = new Date(currentPeriod.startDate);
        const todayDate = new Date(today);

        // Calculate current cycle day
        const currentCycleDay =
          Math.floor((todayDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Average cycle length (default to 28 days for PCOS, can be irregular)
        const totalCycleDays = currentPeriod.cycleLength || 28;

        // Fertile window is typically 5-6 days before ovulation
        // Ovulation usually occurs 14 days before next period
        const ovulationDay = totalCycleDays - 14;
        const fertileWindowStartDay = ovulationDay - 5;

        const ovulationDate = new Date(periodStartDate);
        ovulationDate.setDate(ovulationDate.getDate() + ovulationDay - 1);

        const fertileStartDate = new Date(periodStartDate);
        fertileStartDate.setDate(fertileStartDate.getDate() + fertileWindowStartDay - 1);

        const fertileEndDate = new Date(ovulationDate);
        fertileEndDate.setDate(fertileEndDate.getDate() + 1);

        const daysUntilOvulation = ovulationDay - currentCycleDay;

        setCycleData({
          currentCycleDay,
          totalCycleDays,
          fertileWindowStart: fertileStartDate.toISOString().split('T')[0],
          fertileWindowEnd: fertileEndDate.toISOString().split('T')[0],
          ovulationDate: ovulationDate.toISOString().split('T')[0],
          daysUntilOvulation,
          isPeriodPhase: currentCycleDay <= (currentPeriod.periodLength || 5),
          isFertileWindow:
            currentCycleDay >= fertileWindowStartDay && currentCycleDay <= ovulationDay + 1,
          isOvulating: currentCycleDay === ovulationDay,
        });
      }
    } catch (error) {
      console.error('Failed to fetch cycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCervicalMucusLabel = (mucus: string | null) => {
    if (!mucus) return 'Not tracked';
    const labels: { [key: string]: string } = {
      dry: 'Dry',
      sticky: 'Sticky',
      creamy: 'Creamy',
      watery: 'Watery',
      egg_white: 'Egg White (Peak Fertility)',
    };
    return labels[mucus] || mucus;
  };

  const getFertilityMessage = () => {
    if (!cycleData) return '';

    if (cycleData.isOvulating) {
      return 'Peak fertility - ovulation likely today!';
    } else if (cycleData.isFertileWindow) {
      return `Fertile window - ${Math.abs(cycleData.daysUntilOvulation || 0)} days until ovulation`;
    } else if (cycleData.isPeriodPhase) {
      return 'Low fertility - period phase';
    } else if ((cycleData.daysUntilOvulation || 0) > 0) {
      return `${cycleData.daysUntilOvulation} days until fertile window`;
    } else {
      return 'Low fertility - post-ovulation phase';
    }
  };

  const getPhaseColor = () => {
    if (!cycleData) return 'bg-gray-100 border-gray-300';

    if (cycleData.isOvulating) {
      return 'bg-success/20 border-success';
    } else if (cycleData.isFertileWindow) {
      return 'bg-primary/20 border-primary';
    } else if (cycleData.isPeriodPhase) {
      return 'bg-pink-100 border-pink-400';
    } else {
      return 'bg-gray-100 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!cycleData) {
    return (
      <div className="bg-surface rounded-3xl p-6 shadow-lg text-center">
        <Calendar size={40} className="mx-auto mb-3 text-primary/30" />
        <p className="text-muted text-sm">
          Log your first period to see fertile window predictions!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-3xl p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
          <Heart className="text-primary" size={24} />
          Fertility Tracker
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">Day {cycleData.currentCycleDay}</div>
          <div className="text-xs text-muted">of {cycleData.totalCycleDays} day cycle</div>
        </div>
      </div>

      {/* Cycle Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary via-success to-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${(cycleData.currentCycleDay / cycleData.totalCycleDays) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Period</span>
          <span>Fertile Window</span>
          <span>Next Period</span>
        </div>
      </div>

      {/* Fertility Status */}
      <div className={`p-4 rounded-xl border-2 ${getPhaseColor()}`}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp
            size={18}
            className={cycleData.isFertileWindow ? 'text-success' : 'text-gray-600'}
          />
          <span className="font-semibold text-gray-800">{getFertilityMessage()}</span>
        </div>
        {ovulationScore !== null && (
          <div className="text-sm text-gray-700">
            Current ovulation score: <strong>{ovulationScore}/100</strong>
          </div>
        )}
      </div>

      {/* Fertile Window Dates */}
      {cycleData.fertileWindowStart && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-success/10 rounded-xl p-4 border border-success/30">
            <p className="text-xs text-muted mb-1">Fertile Window Starts</p>
            <p className="text-lg font-bold text-gray-800">
              {new Date(cycleData.fertileWindowStart).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/30">
            <p className="text-xs text-muted mb-1">Predicted Ovulation</p>
            <p className="text-lg font-bold text-success">
              {cycleData.ovulationDate
                ? new Date(cycleData.ovulationDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'TBD'}
            </p>
          </div>
        </div>
      )}

      {/* Today's Symptoms */}
      {todaySymptoms && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Droplet size={16} className="text-primary" />
            Today's Tracking
          </h4>

          <div className="space-y-2">
            {/* Cervical Mucus */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Cervical Mucus:</span>
              <span className="font-semibold text-gray-800">
                {getCervicalMucusLabel(todaySymptoms.cervicalMucus)}
              </span>
            </div>

            {/* Basal Body Temp */}
            {todaySymptoms.basalBodyTemp && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">BBT:</span>
                <span className="font-semibold text-gray-800">
                  {todaySymptoms.basalBodyTemp.toFixed(2)}°C
                </span>
              </div>
            )}

            {/* Symptoms */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div
                className={`text-center py-2 px-2 rounded-lg text-xs ${
                  todaySymptoms.ovulationPain
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-gray-100 text-muted'
                }`}
              >
                <CheckCircle2 size={14} className="mx-auto mb-1" />
                Ovulation Pain
              </div>
              <div
                className={`text-center py-2 px-2 rounded-lg text-xs ${
                  todaySymptoms.breastTenderness
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-gray-100 text-muted'
                }`}
              >
                <CheckCircle2 size={14} className="mx-auto mb-1" />
                Tenderness
              </div>
              <div
                className={`text-center py-2 px-2 rounded-lg text-xs ${
                  todaySymptoms.increasedLibido
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-gray-100 text-muted'
                }`}
              >
                <CheckCircle2 size={14} className="mx-auto mb-1" />
                High Libido
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guidance Section */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-primary flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-gray-700">
            {cycleData.isFertileWindow ? (
              <>
                <strong>Fertile window:</strong> Track ovulation symptoms daily for accurate
                predictions. Egg white cervical mucus and BBT spike indicate peak fertility.
              </>
            ) : (
              <>
                <strong>PCOS Note:</strong> Irregular cycles are common. Continue daily tracking to
                identify your unique ovulation patterns.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FertileWindowCard;
