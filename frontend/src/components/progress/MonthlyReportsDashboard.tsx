/**
 * Monthly Reports Dashboard Component
 * Displays all monthly reports with filtering and export functionality
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Calendar, FileText, Download, AlertCircle } from 'lucide-react';
import MonthlyReportCard from './MonthlyReportCard';
import { progressTrackerApi } from '../../services/progressTrackerApi';
import { toast } from 'react-toastify';
import { ExportDataModalSkeleton } from './LoadingSkeletons';

// Lazy load the export modal (only loads when user clicks export)
const ExportDataModal = lazy(() => import('./ExportDataModal'));

interface MonthlyReportsDashboardProps {
  userId: string;
  refreshTrigger?: number;
}

type TimeRange = '3months' | '6months' | '12months' | 'all';

const MonthlyReportsDashboard = ({ userId, refreshTrigger = 0 }: MonthlyReportsDashboardProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const reportsPerPage = 3;

  useEffect(() => {
    fetchReports();
  }, [userId, timeRange, refreshTrigger]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const monthsToFetch =
        timeRange === '3months'
          ? 3
          : timeRange === '6months'
          ? 6
          : timeRange === '12months'
          ? 12
          : 24; // All time (cap at 24 months)

      const data = await progressTrackerApi.getMonthlyReportsRange(userId, monthsToFetch);
      setReports(data);

      // Auto-expand most recent report
      if (data.length > 0 && !expandedReportId) {
        setExpandedReportId(data[0].monthId);
      }
    } catch (error) {
      console.error('Failed to fetch monthly reports:', error);
      toast.error('Failed to load monthly reports');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (monthId: string) => {
    setExpandedReportId(expandedReportId === monthId ? null : monthId);
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  // Pagination
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(reports.length / reportsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setExpandedReportId(null); // Collapse on page change
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setExpandedReportId(null); // Collapse on page change
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Calendar className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-text">Monthly Reports</h2>
            <p className="text-sm text-muted mt-1">
              Comprehensive monthly analysis of your PCOS tracking data
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          <span className="hidden md:inline">Export Data</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="text-primary mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-sm text-text">
            <strong>Auto-generated monthly reports</strong> aggregate data from your daily tracking,
            period logs, ovulation scores, and weekly symptoms. Reports are automatically created on
            the 1st of each month for the previous month.
          </p>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            setTimeRange('3months');
            setCurrentPage(1);
          }}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            timeRange === '3months'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-surface hover:bg-surface-hover text-muted'
          }`}
        >
          Last 3 Months
        </button>
        <button
          onClick={() => {
            setTimeRange('6months');
            setCurrentPage(1);
          }}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            timeRange === '6months'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-surface hover:bg-surface-hover text-muted'
          }`}
        >
          Last 6 Months
        </button>
        <button
          onClick={() => {
            setTimeRange('12months');
            setCurrentPage(1);
          }}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            timeRange === '12months'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-surface hover:bg-surface-hover text-muted'
          }`}
        >
          Last 12 Months
        </button>
        <button
          onClick={() => {
            setTimeRange('all');
            setCurrentPage(1);
          }}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            timeRange === 'all'
              ? 'bg-primary text-white shadow-lg'
              : 'bg-surface hover:bg-surface-hover text-muted'
          }`}
        >
          All Time
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-3xl">
              <FileText className="text-primary" size={48} />
            </div>
          </div>
          <h3 className="text-xl font-heading font-semibold text-text mb-2">
            No monthly reports yet
          </h3>
          <p className="text-muted max-w-md mx-auto">
            Start logging your daily tracking, period cycles, and weekly symptoms to generate
            comprehensive monthly reports. Reports are automatically created on the 1st of each
            month.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentReports.map((report) => (
              <MonthlyReportCard
                key={report.monthId}
                report={report}
                userId={userId}
                isExpanded={expandedReportId === report.monthId}
                onToggleExpand={() => handleToggleExpand(report.monthId)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface rounded-2xl p-4">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  currentPage === 1
                    ? 'bg-surface-dark text-muted cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Previous
              </button>

              <span className="text-sm text-muted">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  currentPage === totalPages
                    ? 'bg-surface-dark text-muted cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <Suspense fallback={<ExportDataModalSkeleton />}>
          <ExportDataModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            userId={userId}
          />
        </Suspense>
      )}
    </div>
  );
};

export default MonthlyReportsDashboard;
