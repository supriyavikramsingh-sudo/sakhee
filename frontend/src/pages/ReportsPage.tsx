import { Alert } from 'antd';
import { FileText, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/common/PageHeader';
import FileUpload from '../components/files/FileUpload';
import ReportAnalysis from '../components/files/ReportAnalysis';
import Navbar from '../components/layout/Navbar';
import { useAuthStore } from '../store/authStore';

const ReportsPage = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuthStore();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Load user's report on mount
  useEffect(() => {
    const loadReport = async () => {
      console.log('ReportsPage - Auth loading:', authLoading);
      console.log('ReportsPage - User:', user);

      // Wait for auth to be ready
      if (authLoading) {
        console.log('ReportsPage - Waiting for auth to load...');
        return;
      }

      // If no user after auth is loaded, stop loading
      if (!user?.uid) {
        console.log('ReportsPage - No user found after auth loaded');
        setLoading(false);
        return;
      }

      console.log('ReportsPage - Loading report for user:', user.uid);

      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3000/api/upload/user/${user.uid}/report`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            console.log('ReportsPage - Report loaded:', data.data);
            console.log('ReportsPage - uploadedAt value:', data.data.uploadedAt);
            console.log('ReportsPage - uploadedAt type:', typeof data.data.uploadedAt);
            setReport(data.data);
          }
        } else if (response.status === 404) {
          // No report found - this is okay, just set report to null
          console.log('No existing report found');
          setReport(null);
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [user, authLoading]);

  const handleDeleteReport = async () => {
    if (!user?.uid || !report) return;

    if (!confirm('Are you sure you want to delete your medical report?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/upload/user/${user.uid}/report`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReport(null);
        alert('Report deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report');
    }
  };

  // Show loading only while auth is loading (not while fetching report)
  if (authLoading) {
    return (
      <div className="min-h-screen main-bg">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated after auth is loaded
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen main-bg">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <FileText className="mx-auto mb-4 text-muted" size={64} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Please Sign In</h3>
          <p className="text-muted mb-6">
            You need to be signed in to view and manage your medical reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen main-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          title={t('reports.title')}
          description={t('reports.subtitle')}
          icon={<FileText size={30} className="text-primary" strokeWidth={3} />}
        />

        {/* Medical Disclaimer */}
        <Alert
          message="Important"
          description="This tool provides educational analysis only. Always discuss your lab results with a
                qualified healthcare professional. Do not make medical decisions based solely on
                this analysis."
          type="warning"
          showIcon
          closable
          className="mb-8"
        />

        {/* Show loading indicator while fetching report */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted text-sm">Loading report...</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Report Info */}
            {report && !loading && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-bold text-lg mb-4">Current Report</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FileText className="text-primary" size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{report.filename}</p>
                      <p className="text-xs text-muted">
                        {(() => {
                          if (!report.uploadedAt) return 'Recently uploaded';

                          // Handle Firestore Timestamp object format
                          if (report.uploadedAt.seconds !== undefined) {
                            const date = new Date(report.uploadedAt.seconds * 1000);
                            return date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            });
                          }

                          // Handle JavaScript Date or ISO string (from fresh upload)
                          try {
                            const date = new Date(report.uploadedAt);
                            if (isNaN(date.getTime())) return 'Recently uploaded';
                            return date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            });
                          } catch (e) {
                            return 'Recently uploaded';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-surface space-y-2">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <Upload size={18} />
                      Replace Report
                    </button>
                    <button
                      onClick={handleDeleteReport}
                      className="w-full btn-outline flex items-center justify-center gap-2 text-danger hover:bg-danger hover:text-white"
                    >
                      <FileText size={18} />
                      Delete Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button - Show when no report */}
            {!report && !loading && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4"
              >
                <Upload size={20} />
                {t('reports.uploadNew')}
              </button>
            )}

            {/* Upload Component */}
            {showUpload && (
              <FileUpload
                userId={user?.uid}
                onUploadComplete={(newReport) => {
                  setReport(newReport);
                  setShowUpload(false);
                }}
              />
            )}
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted">Loading report data...</p>
              </div>
            ) : report ? (
              <ReportAnalysis report={report} />
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileText className="mx-auto mb-4 text-muted" size={64} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Yet</h3>
                <p className="text-muted mb-6">
                  Upload your medical report to get AI-powered insights and analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
