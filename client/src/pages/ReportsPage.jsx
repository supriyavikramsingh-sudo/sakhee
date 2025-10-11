import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store'
import Navbar from '../components/layout/Navbar'
import FileUpload from '../components/files/FileUpload'
import ReportList from '../components/files/ReportList'
import ReportAnalysis from '../components/files/ReportAnalysis'
import { Upload, FileText, AlertCircle } from 'lucide-react'

const ReportsPage = () => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    if (!user) {
      window.location.href = '/onboarding'
    }
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
            <FileText size={40} />
            {t('reports.title')}
          </h1>
          <p className="text-muted">
            {t('reports.subtitle')}
          </p>
        </div>

        {/* Medical Disclaimer */}
        <div className="mb-8 p-6 bg-warning bg-opacity-10 border-l-4 border-warning rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-warning flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-warning mb-2">⚠️ Important</h3>
              <p className="text-sm text-gray-700">
                This tool provides educational analysis only. Always discuss your lab results with a qualified healthcare professional. Do not make medical decisions based solely on this analysis.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Button */}
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4"
            >
              <Upload size={20} />
              {t('reports.uploadNew')}
            </button>

            {/* Upload Component */}
            {showUpload && (
              <FileUpload
                userId={user?.id}
                onUploadComplete={(report) => {
                  setReports([report, ...reports])
                  setSelectedReport(report)
                  setShowUpload(false)
                }}
              />
            )}

            {/* Report List */}
            <ReportList
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={setSelectedReport}
            />
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <ReportAnalysis report={selectedReport} />
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileText className="mx-auto mb-4 text-muted" size={64} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('reports.noSelection')}
                </h3>
                <p className="text-muted mb-6">
                  {t('reports.selectOrUpload')}
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="btn-primary"
                >
                  {t('reports.uploadFirst')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage