import { AlertTriangle, CheckCircle, Info, TrendingUp, Activity } from 'lucide-react'

const ReportAnalysis = ({ report }) => {
  if (!report) return null

  const { labValues, analysis } = report

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="text-danger" size={20} />
      case 'high':
      case 'elevated':
        return <AlertTriangle className="text-warning" size={20} />
      case 'normal':
        return <CheckCircle className="text-success" size={20} />
      default:
        return <Info className="text-muted" size={20} />
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-danger bg-danger'
      case 'high':
      case 'elevated':
        return 'border-warning bg-warning'
      case 'normal':
        return 'border-success bg-success'
      default:
        return 'border-muted bg-muted'
    }
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-primary mb-2">
          {report.filename}
        </h2>
        <p className="text-sm text-muted">
          Uploaded on {new Date(report.uploadedAt).toLocaleString()}
        </p>
      </div>

      {/* Lab Values Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="text-primary" />
          Lab Values Detected
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(labValues || {}).map(([key, data]) => (
            <div
              key={key}
              className={`border-l-4 ${getSeverityColor(data.severity || 'normal')} bg-opacity-10 p-4 rounded`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getSeverityIcon(data.severity)}
                    <h4 className="font-bold capitalize">
                      {key.replace(/_/g, ' ')}
                    </h4>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.value} <span className="text-sm font-normal text-muted">{data.unit}</span>
                  </p>
                  {data.referenceRange && (
                    <p className="text-xs text-muted mt-1">
                      Normal: {data.referenceRange}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(labValues || {}).length === 0 && (
          <div className="text-center py-8">
            <Info className="mx-auto mb-3 text-muted" size={48} />
            <p className="text-muted">No lab values detected in this report</p>
            <p className="text-xs text-muted mt-2">
              Make sure the report contains clear lab results
            </p>
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
            <div className="whitespace-pre-wrap text-gray-700">
              {analysis.analysis || analysis}
            </div>
          </div>
        </div>
      )}

      {/* Medical Disclaimer */}
      <div className="p-6 bg-warning bg-opacity-10 border-l-4 border-warning rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>⚠️ Medical Disclaimer:</strong> This analysis is for educational purposes only. 
          Always consult your healthcare provider for medical advice and treatment decisions. 
          Do not make changes to your treatment based solely on this analysis.
        </p>
      </div>
    </div>
  )
}

export default ReportAnalysis