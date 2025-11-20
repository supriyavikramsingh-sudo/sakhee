/**
 * AI Insights Panel Component
 * Displays AI-generated insights with sections for summary, patterns, predictions, and recommendations
 */

import { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Target,
  Activity,
  Heart,
  Brain,
  Moon,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface Pattern {
  title: string;
  description: string;
  significance: string;
  type: 'positive' | 'neutral' | 'negative';
}

interface Prediction {
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  basis: string;
}

interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  expectedBenefit: string;
}

interface AIInsights {
  monthId: string;
  generatedAt: string;
  model: string;
  summary: string;
  patternsDetected: Pattern[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  keyInsights: string[];
  healthScore: number | null;
  comparisonToPrevious: string | null;
  tokensUsed?: number;
  fromCache?: boolean;
}

interface AIInsightsPanelProps {
  insights: AIInsights | null;
  loading: boolean;
  error: string | null;
  onRegenerate?: () => void;
}

export default function AIInsightsPanel({
  insights,
  loading,
  error,
  onRegenerate,
}: AIInsightsPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    patterns: true,
    predictions: true,
    recommendations: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border-2 border-purple-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <Sparkles className="w-16 h-16 text-purple-500 animate-pulse" />
            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30 animate-pulse"></div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-heading font-semibold text-purple-900 mb-2">
              AI Analysis in Progress...
            </h3>
            <p className="text-purple-700 text-sm">
              Our AI is analyzing your data and generating personalized insights.
            </p>
            <p className="text-purple-600 text-xs mt-2">This usually takes 5-10 seconds.</p>
          </div>
          <div className="flex space-x-2">
            <div
              className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
        <div className="flex items-start space-x-4">
          <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-heading font-semibold text-red-900 mb-2">
              Failed to Generate AI Insights
            </h3>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no insights yet)
  if (!insights) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8 border-2 border-purple-200">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Sparkles className="w-16 h-16 text-purple-400" />
          <div>
            <h3 className="text-xl font-heading font-semibold text-purple-900 mb-2">
              AI Insights Not Generated Yet
            </h3>
            <p className="text-purple-700 text-sm max-w-md">
              Get personalized, AI-powered insights about your PCOS management journey. Our AI will
              analyze patterns, predict trends, and provide actionable recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      weight: TrendingDown,
      activity: Activity,
      sleep: Moon,
      stress: Brain,
      medical: Heart,
      tracking: Target,
    };
    const Icon = icons[category] || Lightbulb;
    return <Icon className="w-5 h-5" />;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-orange-100 text-orange-800 border-orange-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[priority] || colors.medium;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[confidence] || colors.medium;
  };

  // Get pattern icon
  const getPatternIcon = (type: string) => {
    const icons: Record<string, any> = {
      positive: TrendingUp,
      negative: TrendingDown,
      neutral: Minus,
    };
    const Icon = icons[type] || Minus;
    return Icon;
  };

  // Get pattern color
  const getPatternColor = (type: string) => {
    const colors: Record<string, string> = {
      positive: 'bg-green-50 border-green-200',
      negative: 'bg-red-50 border-red-200',
      neutral: 'bg-gray-50 border-gray-200',
    };
    return colors[type] || colors.neutral;
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Score */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <div className="bg-white/20 rounded-lg p-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold mb-1">AI-Powered Insights</h2>
              <p className="text-purple-100 text-sm">
                Generated by GPT-4o-mini • {new Date(insights.generatedAt).toLocaleDateString()}
              </p>
              {insights.fromCache && (
                <p className="text-purple-200 text-xs mt-1 flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>From cache (saved API costs)</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {insights.healthScore && (
              <div className="bg-white/20 rounded-lg p-4 text-center min-w-[100px]">
                <div className="text-3xl font-bold mb-1">{insights.healthScore}/10</div>
                <div className="text-xs text-purple-100">Health Score</div>
              </div>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-xs font-medium flex items-center space-x-1.5"
                title="Force regenerate insights (will use API)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-heading font-semibold text-gray-900">Summary</h3>
          </div>
          {expandedSections.summary ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>
        {expandedSections.summary && (
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            {insights.comparisonToPrevious && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">vs. Previous Month:</span>{' '}
                  {insights.comparisonToPrevious}
                </p>
              </div>
            )}
            {insights.keyInsights.length > 0 && (
              <div className="mt-4 grid gap-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Key Insights:</p>
                {insights.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patterns Detected Section */}
      {insights.patternsDetected.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
          <button
            onClick={() => toggleSection('patterns')}
            className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
            aria-expanded={expandedSections.patterns}
            aria-controls="patterns-section"
            aria-label={`${
              expandedSections.patterns ? 'Collapse' : 'Expand'
            } patterns detected section`}
          >
            <div className="flex items-center space-x-3">
              <Activity className="w-6 h-6 text-purple-600" aria-hidden="true" />
              <h3 className="text-lg font-heading font-semibold text-gray-900">
                Patterns Detected ({insights.patternsDetected.length})
              </h3>
            </div>
            {expandedSections.patterns ? (
              <ChevronUp className="w-5 h-5 text-gray-600" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" aria-hidden="true" />
            )}
          </button>
          {expandedSections.patterns && (
            <div
              id="patterns-section"
              className="p-6 space-y-4"
              role="region"
              aria-label="Patterns detected details"
            >
              {insights.patternsDetected.map((pattern, index) => {
                const Icon = getPatternIcon(pattern.type);
                const colorClass = getPatternColor(pattern.type);
                return (
                  <div key={index} className={`rounded-lg border-2 p-4 ${colorClass}`}>
                    <div className="flex items-start space-x-3">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{pattern.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{pattern.description}</p>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Why it matters:</span>{' '}
                          {pattern.significance}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Predictions Section */}
      {insights.predictions.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
          <button
            onClick={() => toggleSection('predictions')}
            className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
            aria-expanded={expandedSections.predictions}
            aria-controls="predictions-section"
            aria-label={`${
              expandedSections.predictions ? 'Collapse' : 'Expand'
            } predictions section`}
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-purple-600" aria-hidden="true" />
              <h3 className="text-lg font-heading font-semibold text-gray-900">
                Predictions ({insights.predictions.length})
              </h3>
            </div>
            {expandedSections.predictions ? (
              <ChevronUp className="w-5 h-5 text-gray-600" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" aria-hidden="true" />
            )}
          </button>
          {expandedSections.predictions && (
            <div
              id="predictions-section"
              className="p-6 space-y-4"
              role="region"
              aria-label="Predictions details"
            >
              {insights.predictions.map((prediction, index) => (
                <div key={index} className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{prediction.title}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(
                        prediction.confidence
                      )}`}
                    >
                      {prediction.confidence} confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{prediction.description}</p>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Based on:</span> {prediction.basis}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      {insights.recommendations.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors"
            aria-expanded={expandedSections.recommendations}
            aria-controls="recommendations-section"
            aria-label={`${
              expandedSections.recommendations ? 'Collapse' : 'Expand'
            } recommendations section`}
          >
            <div className="flex items-center space-x-3">
              <Lightbulb className="w-6 h-6 text-purple-600" aria-hidden="true" />
              <h3 className="text-lg font-heading font-semibold text-gray-900">
                Recommendations ({insights.recommendations.length})
              </h3>
            </div>
            {expandedSections.recommendations ? (
              <ChevronUp className="w-5 h-5 text-gray-600" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" aria-hidden="true" />
            )}
          </button>
          {expandedSections.recommendations && (
            <div
              id="recommendations-section"
              className="p-6 space-y-4"
              role="region"
              aria-label="Recommendations details"
            >
              {insights.recommendations
                .sort((a, b) => {
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map((rec, index) => (
                  <div
                    key={index}
                    className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(rec.category)}
                        <h4 className="font-semibold text-gray-900 capitalize">{rec.category}</h4>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                          rec.priority
                        )}`}
                      >
                        {rec.priority} priority
                      </span>
                    </div>
                    <div className="ml-7 space-y-2">
                      <p className="text-sm font-medium text-gray-900">{rec.action}</p>
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Why:</span> {rec.rationale}
                      </p>
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Expected benefit:</span>{' '}
                        {rec.expectedBenefit}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Generated {new Date(insights.generatedAt).toLocaleString()}</span>
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Regenerate Insights
          </button>
        )}
      </div>
    </div>
  );
}
