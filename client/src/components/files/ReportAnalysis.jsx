import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  Activity,
  AlertCircle,
  Heart,
  Lightbulb,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { formatLabName, groupLabValuesByCategory, CATEGORY_NAMES } from '../../utils/labFormatter';

const ReportAnalysis = ({ report }) => {
  if (!report) return null;

  const { labValues, analysis } = report;
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  /**
   * Parse AI analysis into structured sections
   * Expected format:
   * **Summary**
   * text...
   *
   * **Key Observations**
   * text...
   *
   * **What This Means for You**
   * text...
   *
   * **Next Steps**
   * text...
   *
   * **When to Reach Out to Your Doctor**
   * text...
   */
  const parseAnalysisIntoSections = (text) => {
    if (!text) return null;

    // Handle if text is an object
    if (typeof text === 'object' && text.analysis) {
      text = text.analysis;
    }

    if (typeof text !== 'string') {
      text = JSON.stringify(text, null, 2);
    }

    // Split by markdown headers
    const sections = {};
    const headerPattern = /\*\*([^*]+)\*\*/g;

    let matches = [...text.matchAll(headerPattern)];

    if (matches.length === 0) {
      // No structured format, return as single section
      return {
        unstructured: text,
      };
    }

    for (let i = 0; i < matches.length; i++) {
      const header = matches[i][1].trim();
      const startIndex = matches[i].index + matches[i][0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const content = text.substring(startIndex, endIndex).trim().replace('-', '');

      sections[header] = content.replace('\n\n-', '\n').trim();
    }
    console.log('Parsed analysis sections:', sections);
    return sections;
  };

  // Parse analysis into sections
  const analysisSections = analysis ? parseAnalysisIntoSections(analysis) : null;

  // Helper to safely parse analysis text (fallback)
  const parseAnalysisText = (text) => {
    if (!text) return null;

    if (typeof text === 'object' && text.analysis) {
      return text.analysis;
    }

    if (typeof text === 'string') {
      return text;
    }

    return JSON.stringify(text, null, 2);
  };

  // Get icon for section
  const getSectionIcon = (sectionName) => {
    const iconMap = {
      Summary: <Heart className="text-primary" size={20} />,
      'Key Observations': <Activity className="text-primary" size={20} />,
      'What This Means for You': <Lightbulb className="text-warning" size={20} />,
      'Next Steps': <TrendingUp className="text-success" size={20} />,
      'When to Reach Out to Your Doctor': <AlertCircle className="text-danger" size={20} />,
    };
    return iconMap[sectionName] || <Info className="text-primary" size={20} />;
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'deficient':
        return <AlertTriangle className="text-danger" size={20} />;
      case 'high':
      case 'elevated':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'low':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'normal':
        return <CheckCircle className="text-success" size={20} />;
      case 'cycle-dependent':
        return <Info className="text-info" size={20} />;
      default:
        return <Info className="text-muted" size={20} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
      case 'deficient':
        return 'border-danger bg-danger';
      case 'high':
      case 'elevated':
      case 'low':
        return 'border-warning bg-warning';
      case 'normal':
        return 'border-success bg-success';
      case 'cycle-dependent':
        return 'border-[#9d4edd] bg-[#9d4edd]';
      default:
        return 'border-muted bg-muted';
    }
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      critical: 'Critical',
      deficient: 'Deficient',
      high: 'High',
      elevated: 'Elevated',
      low: 'Low',
      normal: 'Normal',
      abnormal: 'Abnormal',
      unknown: 'Unknown',
      'cycle-dependent': 'Varies by Cycle Phase',
    };
    return labels[severity] || severity;
  };

  const getCycleDependentRanges = (key) => {
    const ranges = {
      estradiol: 'Follicular: 19.5-144.2 | Mid-cycle: 63.9-356.7 | Luteal: 55.8-214.2 pg/mL',
      progesterone: 'Follicular: 0.1-0.3 | Luteal: 1.2-25.0 ng/mL',
    };
    return ranges[key] || null;
  };

  const hasLabValues =
    labValues && typeof labValues === 'object' && Object.keys(labValues).length > 0;

  const groupedLabValues = hasLabValues ? groupLabValuesByCategory(labValues) : {};

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-primary mb-2">{report.filename}</h2>
        <p className="text-sm text-muted flex items-center gap-2">
          <Calendar size={16} />
          Uploaded on {new Date(report.uploadedAt).toLocaleString()}
        </p>
      </div>

      {/* Lab Values Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="text-primary" />
          Lab Values Detected ({Object.keys(labValues || {}).length})
        </h3>

        {hasLabValues ? (
          <div className="space-y-6">
            {Object.entries(groupedLabValues).map(([category, values]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-700 border-b pb-2">
                  {CATEGORY_NAMES[category] || category}
                </h4>

                <div className="grid md:grid-cols-2 gap-4">
                  {values.map(({ key, value, unit, severity }) => {
                    const displayValue = typeof value === 'number' ? value : value;
                    const displayUnit = unit || '';
                    const displaySeverity = severity || 'normal';
                    const isCycleDependent = displaySeverity === 'cycle-dependent';
                    const cycleRanges = isCycleDependent ? getCycleDependentRanges(key) : null;

                    return (
                      <div
                        key={key}
                        className={`border-l-4 ${getSeverityColor(
                          displaySeverity
                        )} bg-opacity-10 p-4 rounded transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getSeverityIcon(displaySeverity)}
                              <h4 className="font-bold text-gray-800">{formatLabName(key)}</h4>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {displayValue}{' '}
                              {displayUnit && (
                                <span className="text-sm font-normal text-muted">
                                  {displayUnit}
                                </span>
                              )}
                            </p>
                            <p
                              className={`text-xs mt-1 font-medium ${
                                displaySeverity === 'normal'
                                  ? 'text-success'
                                  : displaySeverity === 'critical' ||
                                    displaySeverity === 'deficient'
                                  ? 'text-danger'
                                  : displaySeverity === 'cycle-dependent'
                                  ? 'text-[#9d4edd]'
                                  : 'text-warning'
                              }`}
                            >
                              {getSeverityLabel(displaySeverity)}
                            </p>
                            {isCycleDependent && cycleRanges && (
                              <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                                <p className="font-semibold text-gray-700 mb-1">
                                  Reference Ranges:
                                </p>
                                <p className="text-gray-600">{cycleRanges}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Info className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted mb-2">No lab values detected in this report</p>
            <p className="text-xs text-muted">
              Make sure the report contains clear lab results with values and units
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-primary">
                  Debug Info (Dev Only)
                </summary>
                <pre className="mt-2 p-3 bg-surface rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(
                    { labValues, extractedText: report.extractedText?.substring(0, 500) },
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis - Now structured and scannable with preview */}
      {analysis && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Heart className="text-white" />
              Your Report Analysis
            </h3>
            <p className="text-white text-sm opacity-90 mt-1">
              Understanding your results with care and context
            </p>
          </div>

          <div className="p-6">
            {analysisSections && !analysisSections.unstructured ? (
              <div className="space-y-6">
                {/* Preview: Show first section or summary */}
                {!isAnalysisExpanded && (
                  <div>
                    {(() => {
                      const firstSection = Object.entries(analysisSections)[0];
                      if (!firstSection) return null;
                      const [sectionName, content] = firstSection;
                      const preview = content.substring(0, 200);

                      return (
                        <div className="border-l-4 border-primary pl-4 py-2">
                          <div className="flex items-center gap-2 mb-3">
                            {getSectionIcon(sectionName)}
                            <h4 className="text-lg font-bold text-gray-800">{sectionName}</h4>
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                            <p className="mb-3">
                              {preview}
                              {content.length > 200 && '...'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setIsAnalysisExpanded(true)}
                      className="flex items-center gap-2 text-primary hover:text-secondary font-medium transition-colors mt-4"
                    >
                      <ChevronDown size={20} />
                      Expand to read more
                    </button>
                  </div>
                )}

                {/* Full content when expanded */}
                {isAnalysisExpanded && (
                  <>
                    {Object.entries(analysisSections).map(([sectionName, content]) => (
                      <div key={sectionName} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-center gap-2 mb-3">
                          {getSectionIcon(sectionName)}
                          <h4 className="text-lg font-bold text-gray-800">{sectionName}</h4>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                          {content.split('\n').map((paragraph, idx) => {
                            if (!paragraph.trim()) return null;

                            // Handle bullet points
                            if (paragraph.trim().startsWith('-')) {
                              return (
                                <div key={idx} className="flex gap-2 mb-2">
                                  <span className="text-primary mt-1">•</span>
                                  <p className="flex-1 mb-0">
                                    {paragraph.trim().substring(1).trim()}
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <p key={idx} className="mb-3">
                                {paragraph}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setIsAnalysisExpanded(false)}
                      className="flex items-center gap-2 text-primary hover:text-secondary font-medium transition-colors mt-4"
                    >
                      <ChevronUp size={20} />
                      Show less
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Fallback for unstructured text
              <div>
                {!isAnalysisExpanded && (
                  <div>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      <p className="mb-3">
                        {parseAnalysisText(analysis)?.substring(0, 200)}
                        {parseAnalysisText(analysis)?.length > 200 && '...'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAnalysisExpanded(true)}
                      className="flex items-center gap-2 text-primary hover:text-secondary font-medium transition-colors mt-4"
                    >
                      <ChevronDown size={20} />
                      Expand to read more
                    </button>
                  </div>
                )}

                {isAnalysisExpanded && (
                  <>
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      {parseAnalysisText(analysis)
                        ?.split('\n')
                        .map((paragraph, idx) => {
                          if (!paragraph.trim()) return null;

                          // Handle markdown headers
                          if (paragraph.startsWith('##')) {
                            return (
                              <h4 key={idx} className="text-lg font-bold text-gray-800 mt-6 mb-3">
                                {paragraph.replace(/^##\s*/, '')}
                              </h4>
                            );
                          }

                          // Handle bullet points
                          if (paragraph.trim().startsWith('-')) {
                            return (
                              <div key={idx} className="flex gap-2 mb-2">
                                <span className="text-primary mt-1">•</span>
                                <p className="flex-1 mb-0">
                                  {paragraph.trim().substring(1).trim()}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <p key={idx} className="mb-3">
                              {paragraph}
                            </p>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => setIsAnalysisExpanded(false)}
                      className="flex items-center gap-2 text-primary hover:text-secondary font-medium transition-colors mt-4"
                    >
                      <ChevronUp size={20} />
                      Show less
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="p-6 bg-warning bg-opacity-10 border-l-4 border-warning rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-1" size={20} />
          <div>
            <p className="text-sm text-gray-700">
              <strong>⚠️ Medical Disclaimer:</strong> This analysis is for educational purposes only
              and does not replace professional medical advice. Always consult your healthcare
              provider for personalized recommendations and treatment decisions. Lab values should
              be interpreted by a qualified medical professional in the context of your complete
              health history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportAnalysis;
