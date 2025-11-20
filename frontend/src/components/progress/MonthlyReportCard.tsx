/**
 * Monthly Report Card Component
 * Displays comprehensive monthly analysis with trends, charts, and insights
 */

import { useState, lazy, Suspense } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
  CheckCircle,
  Scale,
  Droplet,
  Moon,
  Smile,
  Sparkles,
  FileText,
} from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';
import { useAnnounce, getButtonAriaLabel } from '../../utils/accessibility';
import { WeightTrendChartSkeleton, AIInsightsPanelSkeleton } from './LoadingSkeletons';

// Lazy load heavy components
const WeightTrendChart = lazy(() => import('./WeightTrendChart'));
const AIInsightsPanel = lazy(() => import('./AIInsightsPanel'));

interface MonthlyReport {
  monthId: string; // Format: "YYYY-MM" (e.g., "2025-11")
  month: number; // 1-12
  year: number;
  startDate: string | Date;
  endDate: string | Date;

  // Overview Stats
  totalDaysTracked: number; // Days with any tracking data
  trackingCompletion: number; // Percentage (0-100)

  // Weight Metrics
  weightData: Array<{
    date: string;
    weight: number;
  }>;
  startWeight: number;
  endWeight: number;
  weightChange: number;
  weightTrend: 'gain' | 'loss' | 'stable';
  avgWeight: number;
  goalWeight?: number;

  // Period Metrics
  periodsLogged: number;
  avgCycleLength: number | null;
  cycleRegularity: 'regular' | 'irregular' | 'unknown';

  // Symptom Patterns
  topSymptoms: Array<{
    name: string;
    avgSeverity: number;
    frequency: number; // How many weeks it appeared
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;

  // Ovulation Metrics
  avgOvulationScore: number;
  ovulationRegularity: 'regular' | 'irregular' | 'unknown';
  fertileWindowsDetected: number;

  // Mental Health
  mentalHealthAvg: {
    anxiety: number;
    depression: number;
    moodSwings: number;
  };

  // Activity & Lifestyle
  avgActivityLevel: number; // 1-5
  avgSleepQuality: number; // 1-5
  avgEnergyLevel: number; // 1-5

  // Insights
  achievements: string[]; // Positive highlights
  concerns: string[]; // Areas needing attention
  recommendations: string[]; // Action items

  // Comparison to Previous Month
  comparisonToPrevious?: {
    weightChange: number;
    symptomChange: number;
    trackingImprovement: number;
  };

  generatedAt: string | Date;
}

interface MonthlyReportCardProps {
  report: MonthlyReport;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  userId: string; // Required for AI insights generation
}

const MonthlyReportCard = ({
  report,
  isExpanded = false,
  onToggleExpand,
  userId,
}: MonthlyReportCardProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Accessibility hook
  const { announce, announceRef } = useAnnounce();

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
      announce(`${section} section collapsed`, 'polite');
    } else {
      newExpanded.add(section);
      announce(`${section} section expanded`, 'polite');
    }
    setExpandedSections(newExpanded);
  };

  const generateAIInsights = async (forceRegenerate: boolean = false) => {
    setLoadingAI(true);
    setAiError(null);
    setShowAIInsights(true);

    try {
      const response = await progressTrackerApi.generateAIInsights(userId, report.monthId, {
        forceRegenerate,
      });
      setAiInsights(response.data);

      if (response.data.fromCache && !forceRegenerate) {
        toast.success('AI insights loaded from cache (free)!');
        announce('AI insights loaded from cache', 'polite');
      } else {
        toast.success('AI insights generated successfully!');
        announce('AI insights generated successfully', 'polite');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to generate AI insights';
      setAiError(errorMessage);
      toast.error(errorMessage);
      announce(`Error: ${errorMessage}`, 'assertive');
    } finally {
      setLoadingAI(false);
    }
  };

  const toggleAIInsights = () => {
    if (!showAIInsights && !aiInsights) {
      // First time opening, generate insights (will check cache first)
      generateAIInsights(false);
    } else {
      setShowAIInsights(!showAIInsights);
    }
  };

  const regenerateAIInsights = () => {
    // Force regenerate (skip cache)
    generateAIInsights(true);
  };

  const exportPDF = async () => {
    setExportingPDF(true);
    try {
      await progressTrackerApi.exportMonthlyReportPDF(userId, report.monthId, !!aiInsights);
      toast.success('PDF exported successfully!');
      announce('Monthly report PDF exported successfully', 'polite');
    } catch (error: any) {
      console.error('PDF export failed:', error);
      const errorMessage = error.message || 'Failed to export PDF';
      toast.error(errorMessage);
      announce(`PDF export failed: ${errorMessage}`, 'assertive');
    } finally {
      setExportingPDF(false);
    }
  };

  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMonthName = (month: number): string => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1];
  };

  const getWeightTrendIcon = () => {
    if (report.weightTrend === 'gain') return <TrendingUp className="text-primary" size={20} />;
    if (report.weightTrend === 'loss') return <TrendingDown className="text-success" size={20} />;
    return <Minus className="text-muted" size={20} />;
  };

  const getWeightTrendColor = () => {
    if (report.weightTrend === 'gain') return 'text-primary';
    if (report.weightTrend === 'loss') return 'text-success';
    return 'text-muted';
  };

  const getCompletionColor = () => {
    if (report.trackingCompletion >= 85) return 'bg-success';
    if (report.trackingCompletion >= 60) return 'bg-warning';
    return 'bg-primary';
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-primary';
    if (severity >= 4) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="bg-surface rounded-3xl shadow-lg overflow-hidden transition-all duration-300">
      {/* Header - Always Visible */}
      <div
        className="p-6 cursor-pointer hover:bg-surface-hover transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Calendar className="text-primary" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-heading font-semibold text-text">
                {getMonthName(report.month)} {report.year}
              </h3>
              <p className="text-sm text-muted mt-1">
                {formatDate(report.startDate)} - {formatDate(report.endDate)}
              </p>
            </div>
          </div>

          <button className="p-2 hover:bg-surface-hover rounded-full transition-colors">
            {isExpanded ? (
              <ChevronUp className="text-muted" size={24} />
            ) : (
              <ChevronDown className="text-muted" size={24} />
            )}
          </button>
        </div>

        {/* Quick Stats - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div
              className={`text-2xl font-semibold ${getWeightTrendColor()} flex items-center justify-center gap-2`}
            >
              {getWeightTrendIcon()}
              {report.weightChange > 0 ? '+' : ''}
              {report.weightChange.toFixed(1)}kg
            </div>
            <div className="text-xs text-muted mt-1">Weight Change</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-text">{report.trackingCompletion}%</div>
            <div className="text-xs text-muted mt-1">Tracking Rate</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-text">{report.periodsLogged}</div>
            <div className="text-xs text-muted mt-1">Periods Logged</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-text">{report.topSymptoms.length}</div>
            <div className="text-xs text-muted mt-1">Top Symptoms</div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Overview Section */}
          <div className="border-b border-border">
            <button
              className="w-full p-6 flex items-center justify-between hover:bg-surface-hover transition-colors"
              onClick={() => toggleSection('overview')}
            >
              <div className="flex items-center gap-3">
                <Activity className="text-primary" size={20} />
                <h4 className="font-heading font-semibold text-lg text-text">Overview</h4>
              </div>
              {expandedSections.has('overview') ? (
                <ChevronUp className="text-muted" size={20} />
              ) : (
                <ChevronDown className="text-muted" size={20} />
              )}
            </button>

            {expandedSections.has('overview') && (
              <div className="px-6 pb-6">
                {/* Tracking Completion Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted">Monthly Tracking Completion</span>
                    <span className="text-sm font-semibold text-text">
                      {report.totalDaysTracked} days logged
                    </span>
                  </div>
                  <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCompletionColor()} transition-all duration-500`}
                      style={{ width: `${report.trackingCompletion}%` }}
                    />
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weight Summary */}
                  <div className="bg-surface-dark rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="text-primary" size={18} />
                      <span className="font-medium text-text">Weight Journey</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted">Start:</span>
                        <span className="font-medium text-text">
                          {report.startWeight.toFixed(1)}kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">End:</span>
                        <span className="font-medium text-text">
                          {report.endWeight.toFixed(1)}kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Average:</span>
                        <span className="font-medium text-text">
                          {report.avgWeight.toFixed(1)}kg
                        </span>
                      </div>
                      {report.goalWeight && (
                        <div className="flex justify-between">
                          <span className="text-muted">Goal:</span>
                          <span className="font-medium text-text">
                            {report.goalWeight.toFixed(1)}kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity & Lifestyle */}
                  <div className="bg-surface-dark rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="text-primary" size={18} />
                      <span className="font-medium text-text">Activity & Lifestyle</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Activity Level:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-6 h-2 rounded-full ${
                                level <= report.avgActivityLevel ? 'bg-success' : 'bg-surface'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Sleep Quality:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-6 h-2 rounded-full ${
                                level <= report.avgSleepQuality ? 'bg-success' : 'bg-surface'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Energy Level:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`w-6 h-2 rounded-full ${
                                level <= report.avgEnergyLevel ? 'bg-success' : 'bg-surface'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weight Trend Chart */}
                {report.weightData && report.weightData.length > 0 && (
                  <div className="mt-6">
                    <Suspense fallback={<WeightTrendChartSkeleton />}>
                      <WeightTrendChart
                        weightData={report.weightData}
                        goalWeight={report.goalWeight}
                        startWeight={report.startWeight}
                        endWeight={report.endWeight}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Period & Cycle Section */}
          <div className="border-b border-border">
            <button
              className="w-full p-6 flex items-center justify-between hover:bg-surface-hover transition-colors"
              onClick={() => toggleSection('period')}
            >
              <div className="flex items-center gap-3">
                <Droplet className="text-primary" size={20} />
                <h4 className="font-heading font-semibold text-lg text-text">Period & Cycle</h4>
              </div>
              {expandedSections.has('period') ? (
                <ChevronUp className="text-muted" size={20} />
              ) : (
                <ChevronDown className="text-muted" size={20} />
              )}
            </button>

            {expandedSections.has('period') && (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div className="text-3xl font-semibold text-text mb-1">
                      {report.periodsLogged}
                    </div>
                    <div className="text-sm text-muted">Periods Logged</div>
                  </div>

                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div className="text-3xl font-semibold text-text mb-1">
                      {report.avgCycleLength || 'N/A'}
                    </div>
                    <div className="text-sm text-muted">Avg Cycle Length</div>
                  </div>

                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        report.cycleRegularity === 'regular'
                          ? 'text-success'
                          : report.cycleRegularity === 'irregular'
                          ? 'text-warning'
                          : 'text-muted'
                      }`}
                    >
                      {report.cycleRegularity.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted">Regularity</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Symptoms Section */}
          {report.topSymptoms.length > 0 && (
            <div className="border-b border-border">
              <button
                className="w-full p-6 flex items-center justify-between hover:bg-surface-hover transition-colors"
                onClick={() => toggleSection('symptoms')}
              >
                <div className="flex items-center gap-3">
                  <Heart className="text-primary" size={20} />
                  <h4 className="font-heading font-semibold text-lg text-text">
                    Symptom Patterns ({report.topSymptoms.length})
                  </h4>
                </div>
                {expandedSections.has('symptoms') ? (
                  <ChevronUp className="text-muted" size={20} />
                ) : (
                  <ChevronDown className="text-muted" size={20} />
                )}
              </button>

              {expandedSections.has('symptoms') && (
                <div className="px-6 pb-6 space-y-3">
                  {report.topSymptoms.map((symptom, index) => (
                    <div key={index} className="bg-surface-dark rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-text capitalize">
                          {symptom.name.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">{symptom.frequency}/4 weeks</span>
                          {symptom.trend === 'increasing' && (
                            <TrendingUp className="text-primary" size={16} />
                          )}
                          {symptom.trend === 'decreasing' && (
                            <TrendingDown className="text-success" size={16} />
                          )}
                          {symptom.trend === 'stable' && <Minus className="text-muted" size={16} />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getSeverityColor(
                              symptom.avgSeverity
                            )} transition-all duration-500`}
                            style={{ width: `${(symptom.avgSeverity / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-text w-12 text-right">
                          {symptom.avgSeverity.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Mental Health Summary */}
                  {(report.mentalHealthAvg.anxiety > 0 ||
                    report.mentalHealthAvg.depression > 0 ||
                    report.mentalHealthAvg.moodSwings > 0) && (
                    <div className="mt-6 bg-primary/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Smile className="text-primary" size={18} />
                        <span className="font-medium text-text">Mental Health Average</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {report.mentalHealthAvg.anxiety > 0 && (
                          <div>
                            <div className="text-2xl font-semibold text-text">
                              {report.mentalHealthAvg.anxiety.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted mt-1">Anxiety</div>
                          </div>
                        )}
                        {report.mentalHealthAvg.depression > 0 && (
                          <div>
                            <div className="text-2xl font-semibold text-text">
                              {report.mentalHealthAvg.depression.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted mt-1">Depression</div>
                          </div>
                        )}
                        {report.mentalHealthAvg.moodSwings > 0 && (
                          <div>
                            <div className="text-2xl font-semibold text-text">
                              {report.mentalHealthAvg.moodSwings.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted mt-1">Mood Swings</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ovulation Section */}
          <div className="border-b border-border">
            <button
              className="w-full p-6 flex items-center justify-between hover:bg-surface-hover transition-colors"
              onClick={() => toggleSection('ovulation')}
            >
              <div className="flex items-center gap-3">
                <Moon className="text-primary" size={20} />
                <h4 className="font-heading font-semibold text-lg text-text">Ovulation Tracking</h4>
              </div>
              {expandedSections.has('ovulation') ? (
                <ChevronUp className="text-muted" size={20} />
              ) : (
                <ChevronDown className="text-muted" size={20} />
              )}
            </button>

            {expandedSections.has('ovulation') && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div className="text-3xl font-semibold text-text mb-1">
                      {report.avgOvulationScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted">Avg Score</div>
                  </div>

                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div className="text-3xl font-semibold text-text mb-1">
                      {report.fertileWindowsDetected}
                    </div>
                    <div className="text-sm text-muted">Fertile Windows</div>
                  </div>

                  <div className="bg-surface-dark rounded-2xl p-4 text-center">
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        report.ovulationRegularity === 'regular'
                          ? 'text-success'
                          : report.ovulationRegularity === 'irregular'
                          ? 'text-warning'
                          : 'text-muted'
                      }`}
                    >
                      {report.ovulationRegularity.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted">Regularity</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Achievements & Insights */}
          <div className="p-6 space-y-4">
            {/* Achievements */}
            {report.achievements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="text-success" size={18} />
                  <h5 className="font-medium text-text">Achievements This Month</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.achievements.map((achievement, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium"
                    >
                      {achievement}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Concerns */}
            {report.concerns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-warning" size={18} />
                  <h5 className="font-medium text-text">Areas to Monitor</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.concerns.map((concern, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-warning/10 text-warning rounded-full text-sm font-medium"
                    >
                      {concern}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="text-primary" size={18} />
                  <h5 className="font-medium text-text">Recommendations</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.recommendations.map((rec, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {rec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights Toggle Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {/* Screen reader announcements */}
              <div ref={announceRef} className="sr-only" aria-live="polite" aria-atomic="true" />

              <div className="flex gap-3">
                <button
                  onClick={toggleAIInsights}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                  aria-label={getButtonAriaLabel(
                    showAIInsights ? 'Hide AI Insights' : 'Generate AI Insights',
                    loadingAI ? 'loading' : 'default'
                  )}
                  aria-expanded={showAIInsights}
                >
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                  {showAIInsights ? 'Hide AI Insights' : 'Generate AI Insights'}
                </button>

                <button
                  onClick={exportPDF}
                  disabled={exportingPDF}
                  className="px-6 py-4 bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={getButtonAriaLabel(
                    'Export monthly report as PDF',
                    exportingPDF ? 'loading' : 'default'
                  )}
                >
                  {exportingPDF ? (
                    <>
                      <div
                        className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"
                        aria-hidden="true"
                      ></div>
                      <span className="hidden md:inline">Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" aria-hidden="true" />
                      <span className="hidden md:inline">Export PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Insights Panel */}
            {showAIInsights && (
              <div className="mt-4">
                <Suspense fallback={<AIInsightsPanelSkeleton />}>
                  <AIInsightsPanel
                    insights={aiInsights}
                    loading={loadingAI}
                    error={aiError}
                    onRegenerate={regenerateAIInsights}
                  />
                </Suspense>
              </div>
            )}
          </div>

          {/* Generated Timestamp */}
          <div className="px-6 pb-6">
            <p className="text-xs text-muted text-center">
              Generated on: {formatDate(report.generatedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyReportCard;
