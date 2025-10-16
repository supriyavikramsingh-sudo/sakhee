import { AlertTriangle, CheckCircle, Info, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import { formatLabName, groupLabValuesByCategory, CATEGORY_NAMES } from '../../utils/labFormatter';

const ReportAnalysis = ({ report }) => {
  if (!report) return null;

  const { labValues, analysis } = report;

  // Helper to safely parse analysis text
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

  // FIXED: Added deficient severity and proper color coding
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

  // FIXED: Added deficient and low to danger/warning
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

  // FIXED: Added severity label formatter
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

  // Helper to get reference ranges for cycle-dependent hormones
  const getCycleDependentRanges = (key) => {
    const ranges = {
      estradiol: 'Follicular: 19.5-144.2 | Mid-cycle: 63.9-356.7 | Luteal: 55.8-214.2 pg/mL',
      progesterone: 'Follicular: 0.1-0.3 | Luteal: 1.2-25.0 ng/mL',
    };
    return ranges[key] || null;
  };

  // Check if labValues is empty or not an object
  const hasLabValues =
    labValues && typeof labValues === 'object' && Object.keys(labValues).length > 0;

  // Group lab values by category
  const groupedLabValues = hasLabValues ? groupLabValuesByCategory(labValues) : {};

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-primary mb-2">{report.filename}</h2>
        <p className="text-sm text-muted">
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
                            {/* FIXED: Show severity label with proper color coding */}
                            <p
                              className={`text-xs mt-1 font-medium ${
                                displaySeverity === 'normal'
                                  ? 'text-success'
                                  : displaySeverity === 'deficient' ||
                                    displaySeverity === 'critical'
                                  ? 'text-danger'
                                  : displaySeverity === 'cycle-dependent'
                                  ? 'text-[#9d4edd]'
                                  : 'text-warning'
                              }`}
                            >
                              {getSeverityLabel(displaySeverity)}
                            </p>
                            {/* Show reference ranges for cycle-dependent hormones */}
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

            {/* Debug info in development */}
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

      {/* AI Analysis */}
      {analysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-primary" />
            AI Analysis
          </h3>

          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">{parseAnalysisText(analysis)}</div>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="p-6 bg-warning bg-opacity-10 border-l-4 border-warning rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-1" size={20} />
          <div>
            <p className="text-sm text-gray-700">
              <strong>⚠️ Medical Disclaimer:</strong> This analysis is for educational purposes
              only. Always discuss your lab results with a qualified healthcare professional. Do not
              make medical decisions based solely on this analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportAnalysis;
