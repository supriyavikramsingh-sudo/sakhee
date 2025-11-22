/**
 * Unified Cycle Insights Card Component
 * Combines fertility tracking, ovulation scoring, and cycle information in one comprehensive card
 */

import { useState, useEffect } from 'react';
import { Heart, TrendingUp, Droplet, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface CycleInsightsCardProps {
  userId: string;
  refreshTrigger?: number;
  onLogPeriod?: () => void;
  onTrackSymptoms?: () => void;
}

interface CycleData {
  currentCycleDay: number;
  totalCycleDays: number;
  lastPeriodStart: string;
  lastPeriodEnd: string;
  lastPeriodDuration: number;
  lastCycleLength: number | null;
  avgCycleLength: number; // Added for displaying assumed vs actual
  ovulationPrediction: any;
  todayOvulationScore: number | null;
  cyclePhase: 'period' | 'fertile' | 'ovulation' | 'post-ovulation' | 'pre-period';
  cyclesLogged: number;
}

interface TodayTracking {
  cervicalMucus: string | null;
  basalBodyTemp: number | null;
  ovulationPain: boolean;
  breastTenderness: boolean;
  increasedLibido: boolean;
}

/**
 * Calculates median of an array of numbers
 *
 * @param arr - Array of numbers
 * @returns Median value
 */
function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    // Even number of elements: average of two middle values
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Odd number of elements: middle value
  return sorted[mid];
}

/**
 * Calculates total cycle days using rolling 4-cycle median
 *
 * Logic:
 * - Cycle 1: Use avgCycleLength from setup (28 or user input)
 * - Cycles 2-4: Use median of (avgCycleLength + actual cycle lengths)
 * - Cycle 5+: Use median of last 4 actual cycle lengths only (drop onboarding assumption)
 *
 * @param cycles - Array of cycle objects sorted by startDate ascending
 * @param avgCycleLength - Initial assumption from onboarding (28 or user input)
 * @returns Predicted cycle length in days (rounded to nearest integer)
 */
function calculateTotalCycleDays(
  cycles: Array<{ cycleId: string; cycleLength: number | null }>,
  avgCycleLength: number
): number {
  // Filter to only cycles with calculated lengths (exclude current incomplete cycle)
  const completedCycles = cycles.filter((c) => c.cycleLength !== null);

  // Case 1: First cycle (no completed cycles yet)
  if (completedCycles.length === 0) {
    return avgCycleLength; // Use onboarding assumption
  }

  // Case 2: Cycles 2-4 (include onboarding assumption)
  if (completedCycles.length <= 3) {
    const lengths = [avgCycleLength, ...completedCycles.map((c) => c.cycleLength as number)];
    return Math.round(calculateMedian(lengths));
  }

  // Case 3: Cycle 5+ (use last 4 actual cycle lengths only)
  const recentLengths = completedCycles
    .slice(-4) // Get last 4 completed cycles
    .map((c) => c.cycleLength as number);

  return Math.round(calculateMedian(recentLengths));
}

/**
 * Calculates period due status and messaging
 *
 * @param currentCycleDay - Current day in the cycle (1-indexed)
 * @param totalCycleDays - Predicted cycle length
 * @returns Period status object with message, color, and display settings
 */
function calculatePeriodStatus(
  currentCycleDay: number,
  totalCycleDays: number
): {
  message: string;
  secondaryMessage?: string;
  status: 'upcoming' | 'imminent' | 'expected' | 'overdue';
  color: string;
  showProgressBar: boolean;
} {
  const daysUntilPeriod = totalCycleDays - currentCycleDay;

  // Case 1: Period expected in 2+ days
  if (daysUntilPeriod > 1) {
    return {
      message: `Your period is due in ${daysUntilPeriod} days`,
      status: 'upcoming',
      color: '#9a8c98', // Muted
      showProgressBar: true, // Show progress bar when under predicted length
    };
  }

  // Case 2: Period expected tomorrow
  if (daysUntilPeriod === 1) {
    return {
      message: 'Your period is due tomorrow',
      status: 'imminent',
      color: '#ff8b2e', // Warning
      showProgressBar: true,
    };
  }

  // Case 3: Period expected today
  if (daysUntilPeriod === 0) {
    return {
      message: 'Your period might start today',
      status: 'expected',
      color: '#ff8b2e', // Warning
      showProgressBar: true,
    };
  }

  // Case 4: Period overdue (past predicted date)
  const overdueDays = Math.abs(daysUntilPeriod);

  let secondaryMessage = undefined;

  // Add context for longer delays
  if (overdueDays >= 7 && overdueDays < 14) {
    secondaryMessage = 'Long cycles are common with PCOS. Keep tracking your symptoms.';
  } else if (overdueDays >= 14 && overdueDays < 30) {
    secondaryMessage =
      "Extended cycles can happen with PCOS. If you're concerned, consider consulting your healthcare provider.";
  } else if (overdueDays >= 30) {
    secondaryMessage =
      "It's been over a month since your predicted period date. We recommend consulting with your healthcare provider about your cycle patterns.";
  }

  return {
    message: `Your period is overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
    secondaryMessage,
    status: 'overdue',
    color: '#9a8c98', // Muted (NOT danger red - irregular cycles are normal for PCOS)
    showProgressBar: false, // Hide progress bar once overdue
  };
}

const CycleInsightsCard = ({
  userId,
  refreshTrigger = 0,
  onLogPeriod,
  onTrackSymptoms,
}: CycleInsightsCardProps) => {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [todayTracking, setTodayTracking] = useState<TodayTracking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCycleData();
  }, [userId, refreshTrigger]);

  const fetchCycleData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get period tracking setup (includes avgCycleLength)
      const setupResponse = await progressTrackerApi.getPeriodSetup(userId);
      const avgCycleLength = setupResponse.data?.avgCycleLength || 28;

      // Get cycles (fetch last 5: 4 for median calculation + 1 current cycle)
      const cyclesResponse = await progressTrackerApi.getCycles(userId, 5);
      const cycles = cyclesResponse.data;

      if (!cycles || cycles.length === 0) {
        setCycleData(null);
        setLoading(false);
        return;
      }

      // Get most recent cycle (backend returns ascending, so last item is newest)
      const currentPeriod = cycles[cycles.length - 1];
      const periodStartDate = new Date(currentPeriod.startDate);
      const periodEndDate = new Date(currentPeriod.endDate);
      const todayDate = new Date(today);

      // Calculate current cycle day
      const currentCycleDay =
        Math.floor((todayDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate period duration
      const periodDuration =
        Math.floor((periodEndDate.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      // Get ovulation prediction
      const ovulationResponse = await progressTrackerApi.getOvulationPrediction(userId);
      const ovulationPrediction = ovulationResponse.data;

      // Get today's tracking data
      let todayOvulationScore = null;
      let trackingData = null;
      try {
        const todayResponse = await progressTrackerApi.getDailyTracking(userId, today);
        if (todayResponse.success && todayResponse.data) {
          trackingData = {
            cervicalMucus: todayResponse.data.cervicalMucus || null,
            basalBodyTemp: todayResponse.data.basalBodyTemp || null,
            ovulationPain: todayResponse.data.ovulationPain || false,
            breastTenderness: todayResponse.data.breastTenderness || false,
            increasedLibido: todayResponse.data.increasedLibido || false,
          };
          todayOvulationScore = todayResponse.data.ovulationScore?.totalScore || null;
        }
      } catch (error) {
        // No tracking data for today
      }

      setTodayTracking(trackingData);

      // Calculate total cycle days using rolling 4-cycle median
      const totalCycleDays = calculateTotalCycleDays(cycles, avgCycleLength);

      // Determine cycle phase
      let cyclePhase: CycleData['cyclePhase'] = 'post-ovulation';

      if (currentCycleDay <= periodDuration) {
        cyclePhase = 'period';
      } else if (ovulationPrediction.method === 'data-driven') {
        const ovulationDate = new Date(ovulationPrediction.ovulationDate);
        const fertileStart = new Date(ovulationPrediction.fertileWindowStart);
        const fertileEnd = new Date(ovulationPrediction.fertileWindowEnd);

        if (todayDate >= fertileStart && todayDate <= fertileEnd) {
          if (todayDate.toDateString() === ovulationDate.toDateString()) {
            cyclePhase = 'ovulation';
          } else {
            cyclePhase = 'fertile';
          }
        } else if (currentCycleDay > totalCycleDays - 5) {
          cyclePhase = 'pre-period';
        }
      } else {
        // Formula-based estimation
        const ovulationDay = totalCycleDays - 14;
        const fertileStartDay = ovulationDay - 5;

        if (currentCycleDay >= fertileStartDay && currentCycleDay <= ovulationDay + 1) {
          if (currentCycleDay === ovulationDay) {
            cyclePhase = 'ovulation';
          } else {
            cyclePhase = 'fertile';
          }
        } else if (currentCycleDay > totalCycleDays - 5) {
          cyclePhase = 'pre-period';
        }
      }

      // Get previous cycle length (ACTUAL, not median)
      // Previous cycle is second-to-last in the array (if exists)
      let previousCycleLength = null;
      if (cycles.length >= 2) {
        const previousCycle = cycles[cycles.length - 2];
        previousCycleLength = previousCycle.cycleLength;
      }

      setCycleData({
        currentCycleDay,
        totalCycleDays,
        lastPeriodStart: currentPeriod.startDate,
        lastPeriodEnd: currentPeriod.endDate,
        lastPeriodDuration: periodDuration,
        lastCycleLength: previousCycleLength,
        avgCycleLength,
        ovulationPrediction,
        todayOvulationScore,
        cyclePhase,
        cyclesLogged: cycles.length,
      });
      console.log('Fetched cycle data:', cycleData);
    } catch (error) {
      console.error('Failed to fetch cycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseLabel = (phase: CycleData['cyclePhase']) => {
    switch (phase) {
      case 'period':
        return 'On Period';
      case 'fertile':
        return 'Fertile Window';
      case 'ovulation':
        return 'Ovulating';
      case 'post-ovulation':
        return 'Post-Ovulation';
      case 'pre-period':
        return 'Pre-Period';
      default:
        return '';
    }
  };

  const getPhaseColor = (phase: CycleData['cyclePhase']) => {
    switch (phase) {
      case 'period':
        return 'bg-primary text-white';
      case 'fertile':
        return 'bg-success text-white';
      case 'ovulation':
        return 'bg-success text-white';
      case 'post-ovulation':
        return 'bg-blue-500 text-white';
      case 'pre-period':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getFertilityMessage = () => {
    if (!cycleData) return '';

    switch (cycleData.cyclePhase) {
      case 'period':
        return '🔴 Low Fertility - Period Phase';
      case 'fertile':
        return '🟢 High Fertility - Fertile Window Open!';
      case 'ovulation':
        return '🟢 Peak Fertility - Ovulation Likely Today!';
      case 'post-ovulation':
        return '🔵 Low Fertility - Post-Ovulation Phase';
      case 'pre-period':
        return '🟣 Low Fertility - Period Expected Soon';
      default:
        return '';
    }
  };

  const getGuidanceMessage = () => {
    if (!cycleData) return '';

    switch (cycleData.cyclePhase) {
      case 'fertile':
        return 'Track ovulation symptoms daily for accurate predictions! Egg white cervical mucus and BBT spike indicate peak fertility.';
      case 'ovulation':
        return 'This is your peak fertility window. Continue tracking symptoms to confirm ovulation.';
      case 'post-ovulation':
        const daysUntilPeriod = cycleData.totalCycleDays - cycleData.currentCycleDay;
        return `Next period expected in ~${daysUntilPeriod} days. Continue tracking symptoms daily.`;
      case 'period':
        return 'Low fertility during period. Rest and track flow patterns.';
      case 'pre-period':
        return 'Period expected in 1-4 days. Track PMS symptoms if any.';
      default:
        return 'PCOS Note: Irregular cycles are common. Continue daily tracking to identify your unique ovulation patterns.';
    }
  };

  const getCervicalMucusLabel = (mucus: string | null) => {
    if (!mucus) return 'Not logged';
    const labels: { [key: string]: string } = {
      dry: 'Dry',
      sticky: 'Sticky',
      creamy: 'Creamy',
      watery: 'Watery',
      egg_white: 'Egg White (Peak Fertility)',
    };
    return labels[mucus] || mucus;
  };

  const getOvulationLikelihood = (score: number | null) => {
    if (score === null) return 'Not tracked';
    if (score >= 70) return 'Very Likely';
    if (score >= 50) return 'Likely';
    if (score >= 30) return 'Possible';
    return 'Unlikely';
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Building Insights State (<3 cycles)
  if (!cycleData || cycleData.cyclesLogged < 3) {
    const progressPercent = cycleData ? (cycleData.cyclesLogged / 3) * 100 : 0;

    return (
      <div className="bg-surface rounded-3xl p-6 shadow-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-primary" size={28} />
            Building Your Cycle Insights
          </h3>
        </div>

        {/* Progress Tracker */}
        <div className="bg-gradient-to-r from-secondary/50 to-accent/30 rounded-2xl p-6 border-2 border-secondary">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🌸</div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">
              Keep Tracking to Unlock Insights!
            </h4>
            <p className="text-muted">
              We need 2-3 complete cycles to provide accurate predictions and personalized insights.
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-success flex-shrink-0" />
              <span className="text-gray-700">Period Setup Complete</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={20}
                className={
                  cycleData && cycleData.cyclesLogged >= 1 ? 'text-success' : 'text-gray-300'
                }
                fill={cycleData && cycleData.cyclesLogged >= 1 ? 'currentColor' : 'none'}
              />
              <span
                className={
                  cycleData && cycleData.cyclesLogged >= 1 ? 'text-gray-700' : 'text-muted'
                }
              >
                First Period Logged
                {cycleData && cycleData.cyclesLogged >= 1 && (
                  <span className="text-sm text-muted ml-2">
                    (
                    {new Date(cycleData.lastPeriodStart).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(cycleData.lastPeriodEnd).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    )
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2
                size={20}
                className={
                  cycleData && cycleData.cyclesLogged >= 2 ? 'text-success' : 'text-gray-300'
                }
                fill={cycleData && cycleData.cyclesLogged >= 2 ? 'currentColor' : 'none'}
              />
              <span
                className={
                  cycleData && cycleData.cyclesLogged >= 2 ? 'text-gray-700' : 'text-muted'
                }
              >
                Second Period:{' '}
                {cycleData && cycleData.cyclesLogged >= 2 ? 'Logged' : 'Not logged yet'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              <span className="text-muted">Third Period: Not logged yet</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-success h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Current Cycle Info (if first period is logged) */}
        {cycleData && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Current Cycle Info
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/20 rounded-xl p-4">
                <p className="text-xs text-muted mb-1">Current Cycle Day</p>
                <p className="text-2xl font-bold text-primary">Day {cycleData.currentCycleDay}</p>
                <p className="text-xs text-muted mt-1">
                  Since{' '}
                  {new Date(cycleData.lastPeriodStart).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="bg-secondary/20 rounded-xl p-4">
                <p className="text-xs text-muted mb-1">Last Period Duration</p>
                <p className="text-2xl font-bold text-gray-800">
                  {cycleData.lastPeriodDuration} days
                </p>
                <p className="text-xs text-muted mt-1">
                  {new Date(cycleData.lastPeriodStart).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  -{' '}
                  {new Date(cycleData.lastPeriodEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="bg-secondary/20 rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Previous Cycle Length</p>
              <p className="text-lg font-medium text-gray-700">
                {cycleData.lastCycleLength
                  ? `${cycleData.lastCycleLength} days`
                  : cycleData.avgCycleLength === 28
                  ? '28 days (assumed normal)'
                  : `${cycleData.avgCycleLength} days (your input)`}
              </p>
              {!cycleData.lastCycleLength && (
                <p className="text-xs text-muted mt-2">
                  Cycle length predictions will get better as more periods are logged into the
                  tracker.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Estimated Timeline (if first period is logged) */}
        {cycleData && cycleData.ovulationPrediction && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Estimated Timeline
            </h4>
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-3">
                Based on{' '}
                {cycleData.ovulationPrediction.method === 'estimated'
                  ? `~${cycleData.totalCycleDays}-day cycle estimate`
                  : 'your tracked data'}
                :
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fertile Window:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(cycleData.ovulationPrediction.fertileWindowStart).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                      }
                    )}{' '}
                    -{' '}
                    {new Date(cycleData.ovulationPrediction.fertileWindowEnd).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                      }
                    )}{' '}
                    <span className="text-xs text-muted">
                      ({cycleData.ovulationPrediction.method})
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Ovulation:</span>
                  <span className="font-medium text-gray-800">
                    ~
                    {new Date(cycleData.ovulationPrediction.ovulationDate).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                      }
                    )}{' '}
                    <span className="text-xs text-muted">
                      ({cycleData.ovulationPrediction.method})
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-800">
                ℹ️ This is an estimate based on your cycle pattern (
                {cycleData.cyclesLogged <= 1
                  ? 'using your initial setup'
                  : cycleData.cyclesLogged <= 4
                  ? `median of ${cycleData.cyclesLogged} cycles + setup assumption`
                  : `median of last 4 cycles`}
                ). Track daily symptoms for more accurate ovulation detection.
              </p>
            </div>
          </div>
        )}

        {/* What to Track */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
            What to Track
          </h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 text-sm">
              <span className="text-lg">📌</span>
              <div>
                <strong className="text-gray-800">Daily:</strong>
                <span className="text-gray-600 ml-1">
                  Cervical mucus, body temperature, ovulation symptoms
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-lg">📌</span>
              <div>
                <strong className="text-gray-800">Monthly:</strong>
                <span className="text-gray-600 ml-1">Log each period when it starts/ends</span>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <span className="text-lg">📌</span>
              <div>
                <strong className="text-gray-800">Weekly:</strong>
                <span className="text-gray-600 ml-1">Complete symptom check-ins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Insights State (3+ cycles)
  return (
    <div className="bg-surface rounded-3xl p-6 shadow-lg space-y-6">
      {/* Header with Phase Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
          <Heart className="text-primary" size={28} />
          Cycle Insights
        </h3>
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold ${getPhaseColor(
            cycleData.cyclePhase
          )}`}
        >
          {getPhaseLabel(cycleData.cyclePhase)}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-secondary/30 rounded-xl p-4 text-center border border-secondary">
          <div className="text-3xl font-bold text-primary">{cycleData.currentCycleDay}</div>
          <div className="text-xs text-muted mt-1">Current Day</div>
        </div>
        <div className="bg-secondary/30 rounded-xl p-4 text-center border border-secondary">
          <div className="text-3xl font-bold text-gray-800">
            {cycleData.lastCycleLength
              ? `${cycleData.lastCycleLength}`
              : `${cycleData.avgCycleLength}`}
          </div>
          <div className="text-xs text-muted mt-1">Last Cycle Length (Days)</div>
          {!cycleData.lastCycleLength && (
            <div className="text-[10px] text-muted mt-0.5">
              {cycleData.avgCycleLength === 28 ? '(assumed)' : '(your input)'}
            </div>
          )}
        </div>
        <div className="bg-secondary/30 rounded-xl p-4 text-center border border-secondary">
          <div className="text-3xl font-bold text-gray-800">
            {getOvulationLikelihood(cycleData.todayOvulationScore)}
          </div>
          <div className="text-xs text-muted mt-1">Ovulation Today</div>
        </div>
      </div>

      {/* Period Status Section */}
      {(() => {
        const periodStatus = calculatePeriodStatus(
          cycleData.currentCycleDay,
          cycleData.totalCycleDays
        );
        return (
          <div className="space-y-4">
            {/* Show progress bar only if not overdue */}
            {periodStatus.showProgressBar && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Period</span>
                  <span>Fertile Window</span>
                  <span>Next Period</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary via-success to-primary h-4 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (cycleData.currentCycleDay / cycleData.totalCycleDays) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-center text-xs text-gray-600">
                  Day {cycleData.currentCycleDay} of ~{cycleData.totalCycleDays}
                </div>
              </div>
            )}

            {/* Period due message */}
            <div
              className="p-4 rounded-lg border-l-4"
              style={{
                backgroundColor: periodStatus.status === 'overdue' ? '#f5f5f5' : '#fff5f0',
                borderColor: periodStatus.color,
              }}
            >
              <div className="flex items-center gap-2">
                {/* Icon based on status */}
                <span className="text-xl">
                  {periodStatus.status === 'upcoming' && '📅'}
                  {periodStatus.status === 'imminent' && '⏰'}
                  {periodStatus.status === 'expected' && '🔔'}
                  {periodStatus.status === 'overdue' && '📊'}
                </span>

                <div className="flex-1">
                  <p className="font-semibold font-inter" style={{ color: periodStatus.color }}>
                    {periodStatus.message}
                  </p>

                  {periodStatus.secondaryMessage && (
                    <p className="text-xs text-muted mt-1">{periodStatus.secondaryMessage}</p>
                  )}
                </div>
              </div>

              {/* Additional context for overdue state */}
              {periodStatus.status === 'overdue' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-muted">
                    <strong>Day {cycleData.currentCycleDay}</strong> - Extended cycle in progress
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Fertility Status */}
      <div
        className={`p-4 rounded-xl border-2 ${
          cycleData.cyclePhase === 'fertile' || cycleData.cyclePhase === 'ovulation'
            ? 'bg-success/10 border-success'
            : cycleData.cyclePhase === 'period'
            ? 'bg-primary/10 border-primary'
            : 'bg-gray-100 border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp
            size={18}
            className={
              cycleData.cyclePhase === 'fertile' || cycleData.cyclePhase === 'ovulation'
                ? 'text-success'
                : 'text-gray-600'
            }
          />
          <span className="font-semibold text-gray-800">{getFertilityMessage()}</span>
        </div>
        {cycleData.todayOvulationScore !== null && (
          <div className="text-sm text-gray-700">
            Ovulation Score: <strong>{cycleData.todayOvulationScore}/100</strong>
            <span className="text-xs text-muted ml-2">
              (
              {cycleData.ovulationPrediction.method === 'data-driven'
                ? 'Based on your tracked symptoms'
                : 'Estimated from cycle average'}
              )
            </span>
          </div>
        )}
      </div>

      {/* Key Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Last Period</h4>
          <div className="bg-secondary/20 rounded-xl p-3">
            <p className="text-sm font-medium text-gray-800">
              {new Date(cycleData.lastPeriodStart).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-muted">{cycleData.lastPeriodDuration} days</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Predicted Ovulation
            {cycleData.ovulationPrediction.method === 'data-driven' && (
              <span className="text-success ml-1">✓</span>
            )}
          </h4>
          <div className="bg-success/10 rounded-xl p-3 border border-success/30">
            <p className="text-sm font-medium text-success">
              {new Date(cycleData.ovulationPrediction.ovulationDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="text-xs text-muted">
              {cycleData.ovulationPrediction.confidence}% confidence
            </p>
          </div>
        </div>
      </div>

      {/* Today's Tracking */}
      {todayTracking && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Droplet size={16} className="text-primary" />
            Today's Tracking
          </h4>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cervical Mucus:</span>
              <span className="font-medium text-gray-800">
                {getCervicalMucusLabel(todayTracking.cervicalMucus)}
              </span>
            </div>
            {todayTracking.basalBodyTemp && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">BBT:</span>
                <span className="font-medium text-gray-800">
                  {todayTracking.basalBodyTemp.toFixed(2)}°C
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div
              className={`text-center py-2 px-2 rounded-lg text-xs ${
                todayTracking.ovulationPain
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-gray-100 text-muted'
              }`}
            >
              <CheckCircle2 size={14} className="mx-auto mb-1" />
              Ovulation Pain
            </div>
            <div
              className={`text-center py-2 px-2 rounded-lg text-xs ${
                todayTracking.breastTenderness
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-gray-100 text-muted'
              }`}
            >
              <CheckCircle2 size={14} className="mx-auto mb-1" />
              Tenderness
            </div>
            <div
              className={`text-center py-2 px-2 rounded-lg text-xs ${
                todayTracking.increasedLibido
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-gray-100 text-muted'
              }`}
            >
              <CheckCircle2 size={14} className="mx-auto mb-1" />
              High Libido
            </div>
          </div>
        </div>
      )}

      {/* Guidance */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-primary flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-gray-700">{getGuidanceMessage()}</div>
        </div>
      </div>
    </div>
  );
};

export default CycleInsightsCard;
