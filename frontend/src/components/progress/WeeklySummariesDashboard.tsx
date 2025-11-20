/**
 * Weekly Summaries Dashboard Component
 * Displays list of all weekly summaries with filtering and navigation
 */

import { useState, useEffect } from 'react';
import { Calendar, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import WeeklySummaryCard from './WeeklySummaryCard';
import progressTrackerApi from '../../services/progressTrackerApi';

interface WeeklySummariesDashboardProps {
  userId: string;
  refreshTrigger?: number;
}

const WeeklySummariesDashboard = ({
  userId,
  refreshTrigger = 0,
}: WeeklySummariesDashboardProps) => {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<'4weeks' | '12weeks' | 'all'>('12weeks');
  const summariesPerPage = 5;

  useEffect(() => {
    fetchSummaries();
  }, [userId, refreshTrigger, timeRange]);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const weeksToFetch = timeRange === '4weeks' ? 4 : timeRange === '12weeks' ? 12 : 52;
      const response = await progressTrackerApi.getWeeklySummariesRange(userId, weeksToFetch);

      if (response.success && response.data) {
        // Sort by week ID descending (most recent first)
        const sorted = response.data.sort((a: any, b: any) => b.weekId.localeCompare(a.weekId));
        setSummaries(sorted);

        // Auto-expand most recent summary
        if (sorted.length > 0 && !expandedWeekId) {
          setExpandedWeekId(sorted[0].weekId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch weekly summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (weekId: string) => {
    setExpandedWeekId(expandedWeekId === weekId ? null : weekId);
  };

  const handleExport = async () => {
    // TODO: Implement PDF export
    console.log('Export summaries to PDF');
  };

  // Pagination
  const totalPages = Math.ceil(summaries.length / summariesPerPage);
  const startIndex = (currentPage - 1) * summariesPerPage;
  const endIndex = startIndex + summariesPerPage;
  const currentSummaries = summaries.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg text-center">
        <Calendar size={48} className="mx-auto mb-4 text-primary/30" />
        <h3 className="text-lg font-serif font-bold text-gray-800 mb-2">No Weekly Summaries Yet</h3>
        <p className="text-muted">
          Weekly summaries are auto-generated each Monday based on your tracking data.
          <br />
          Keep logging your daily metrics, symptoms, and ovulation data to see insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-surface rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-primary" size={28} />
              Weekly Summaries
            </h3>
            <p className="text-sm text-muted mt-1">
              {summaries.length} week{summaries.length !== 1 ? 's' : ''} of tracking data
            </p>
          </div>

          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            Export All
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter size={18} className="text-gray-600" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTimeRange('4weeks');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '4weeks'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 4 Weeks
            </button>
            <button
              onClick={() => {
                setTimeRange('12weeks');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '12weeks'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 12 Weeks
            </button>
            <button
              onClick={() => {
                setTimeRange('all');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Summaries List */}
      <div className="space-y-4">
        {currentSummaries.map((summary) => (
          <WeeklySummaryCard
            key={summary.weekId}
            summary={summary}
            isExpanded={expandedWeekId === summary.weekId}
            onToggleExpand={() => handleToggleExpand(summary.weekId)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-surface rounded-3xl p-4 shadow-lg flex items-center justify-between">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-700">
          <strong>Auto-Generated:</strong> New summaries are created every Monday at midnight. They
          aggregate all your tracking data from the previous week.
        </p>
      </div>
    </div>
  );
};

export default WeeklySummariesDashboard;
