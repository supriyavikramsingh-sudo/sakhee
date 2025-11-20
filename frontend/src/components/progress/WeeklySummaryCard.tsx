/**
 * Weekly Summary Card Component
 * Displays aggregated weekly summary with key metrics and insights
 */

import { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Droplet,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WeeklySummary {
  weekId: string; // Format: "YYYY-WW"
  startDate: string;
  endDate: string;

  // Weight Metrics
  weightChange: number; // kg
  weightTrend: 'gain' | 'loss' | 'stable';
  averageWeight: number;

  // Activity Metrics
  daysLogged: number; // out of 7
  averageActivityLevel: number; // 1-4
  averageSleepHours: number;
  averageEnergyLevel: number; // 1-10

  // Ovulation Metrics
  ovulationDetected: boolean;
  averageOvulationScore: number;
  fertileWindowDays: string[];

  // Symptom Highlights
  topSymptoms: Array<{
    symptom: string;
    severity: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;

  // Mental Health
  averageAnxiety: number;
  averageDepression: number;
  averageMoodSwings: number;

  // Period Tracking
  periodOccurred: boolean;
  periodDays: number;
  cycleDay: number;

  // Key Insights
  highlights: string[];
  concerns: string[];
  recommendations: string[];

  generatedAt: string;
}

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const WeeklySummaryCard = ({
  summary,
  isExpanded = false,
  onToggleExpand,
}: WeeklySummaryCardProps) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setExpanded(!expanded);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeightTrendIcon = () => {
    if (summary.weightTrend === 'gain') return <TrendingUp className="text-primary" size={16} />;
    if (summary.weightTrend === 'loss') return <TrendingDown className="text-success" size={16} />;
    return <Activity className="text-gray-400" size={16} />;
  };

  const getWeightTrendColor = () => {
    if (summary.weightTrend === 'gain') return 'text-primary';
    if (summary.weightTrend === 'loss') return 'text-success';
    return 'text-gray-600';
  };

  const getCompletionPercentage = () => {
    return Math.round((summary.daysLogged / 7) * 100);
  };

  const getActivityLevelLabel = (level: number) => {
    if (level <= 1.5) return 'Sedentary';
    if (level <= 2.5) return 'Light Activity';
    if (level <= 3.5) return 'Moderate';
    return 'Very Active';
  };

  return (
    <div className="bg-surface rounded-3xl shadow-lg overflow-hidden border-2 border-gray-100 hover:border-primary/30 transition-all duration-300">
      {/* Header - Always Visible */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-primary" size={20} />
              <h3 className="text-lg font-serif font-bold text-gray-800">
                Week {summary.weekId.split('-')[1]}, {summary.weekId.split('-')[0]}
              </h3>
            </div>
            <p className="text-sm text-muted">
              {formatDate(summary.startDate)} - {formatDate(summary.endDate)}
            </p>
          </div>

          <button
            onClick={handleToggle}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            {expanded ? (
              <ChevronUp size={24} className="text-gray-600" />
            ) : (
              <ChevronDown size={24} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Quick Stats - Always Visible */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          {/* Weight Change */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {getWeightTrendIcon()}
              <span className={`text-xl font-bold ${getWeightTrendColor()}`}>
                {summary.weightChange > 0 ? '+' : ''}
                {summary.weightChange.toFixed(1)}kg
              </span>
            </div>
            <p className="text-xs text-muted">Weight</p>
          </div>

          {/* Days Logged */}
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800 mb-1">{summary.daysLogged}/7</div>
            <p className="text-xs text-muted">Days Logged</p>
          </div>

          {/* Ovulation */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Droplet
                className={summary.ovulationDetected ? 'text-success' : 'text-gray-300'}
                size={24}
              />
            </div>
            <p className="text-xs text-muted">Ovulation</p>
          </div>

          {/* Symptoms */}
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800 mb-1">{summary.topSymptoms.length}</div>
            <p className="text-xs text-muted">Top Symptoms</p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* Tracking Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Weekly Tracking Completion</h4>
              <span className="text-sm font-bold text-primary">{getCompletionPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-success h-3 rounded-full transition-all duration-500"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>

          {/* Weight & Activity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Weight & Activity
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Average Weight:</span>
                  <span className="font-semibold text-gray-800">
                    {summary.averageWeight.toFixed(1)} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Activity Level:</span>
                  <span className="font-semibold text-gray-800">
                    {getActivityLevelLabel(summary.averageActivityLevel)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Sleep:</span>
                  <span className="font-semibold text-gray-800">
                    {summary.averageSleepHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Energy Level:</span>
                  <span className="font-semibold text-gray-800">
                    {summary.averageEnergyLevel.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Droplet size={16} className="text-success" />
                Cycle & Ovulation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Cycle Day:</span>
                  <span className="font-semibold text-gray-800">Day {summary.cycleDay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Period:</span>
                  <span className="font-semibold text-gray-800">
                    {summary.periodOccurred ? `${summary.periodDays} days` : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Ovulation Score:</span>
                  <span
                    className={`font-semibold ${
                      summary.averageOvulationScore >= 70 ? 'text-success' : 'text-gray-800'
                    }`}
                  >
                    {summary.averageOvulationScore.toFixed(0)}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fertile Days:</span>
                  <span className="font-semibold text-gray-800">
                    {summary.fertileWindowDays.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mental Health */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Brain size={16} className="text-success" />
              Mental Health Average
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Anxiety</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-warning h-2 rounded-full"
                      style={{ width: `${(summary.averageAnxiety / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {summary.averageAnxiety.toFixed(1)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Depression</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-warning h-2 rounded-full"
                      style={{ width: `${(summary.averageDepression / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {summary.averageDepression.toFixed(1)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Mood Swings</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-warning h-2 rounded-full"
                      style={{ width: `${(summary.averageMoodSwings / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {summary.averageMoodSwings.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Symptoms */}
          {summary.topSymptoms.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Symptoms This Week</h4>
              <div className="space-y-2">
                {summary.topSymptoms.map((symptom, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{index + 1}.</span>
                      <span className="font-medium text-gray-800 capitalize">
                        {symptom.symptom.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">
                        {symptom.severity.toFixed(1)}/10
                      </span>
                      {symptom.trend === 'increasing' && (
                        <TrendingUp size={16} className="text-primary" />
                      )}
                      {symptom.trend === 'decreasing' && (
                        <TrendingDown size={16} className="text-success" />
                      )}
                      {symptom.trend === 'stable' && (
                        <Activity size={16} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {summary.highlights.length > 0 && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                ✨ Highlights
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {summary.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-success mt-0.5">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {summary.concerns.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="text-warning" />
                Areas to Monitor
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {summary.concerns.map((concern, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {summary.recommendations.length > 0 && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                💡 Recommendations
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {summary.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Timestamp */}
          <div className="text-xs text-muted text-center pt-4 border-t border-gray-100">
            Generated on{' '}
            {new Date(summary.generatedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySummaryCard;
