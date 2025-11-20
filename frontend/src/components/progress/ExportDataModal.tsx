/**
 * Export Data Modal Component
 * Allows users to export their progress tracking data in various formats
 */

import { useState } from 'react';
import { X, Download, FileText, Database, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';
import { useFocusTrap, useAnnounce, getButtonAriaLabel } from '../../utils/accessibility';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ExportDataModal({ isOpen, onClose, userId }: ExportDataModalProps) {
  const [exportType, setExportType] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeAIInsights, setIncludeAIInsights] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [numberOfWeeks, setNumberOfWeeks] = useState<number>(12);
  const [numberOfMonths, setNumberOfMonths] = useState<number>(6);
  const [exporting, setExporting] = useState(false);

  // Accessibility hooks
  const modalRef = useFocusTrap(isOpen);
  const { announce, announceRef } = useAnnounce();

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);

    try {
      switch (exportType) {
        case 'daily':
          await progressTrackerApi.exportDailyTracking(userId, {
            startDate: dateRange.startDate || undefined,
            endDate: dateRange.endDate || undefined,
            format,
          });
          toast.success('Daily tracking data exported successfully!');
          announce('Daily tracking data exported successfully!', 'polite');
          break;

        case 'weekly':
          await progressTrackerApi.exportWeeklySummaries(userId, {
            numberOfWeeks: numberOfWeeks || undefined,
            format,
          });
          toast.success('Weekly summaries exported successfully!');
          announce('Weekly summaries exported successfully!', 'polite');
          break;

        case 'monthly':
          await progressTrackerApi.exportMonthlyReports(userId, {
            numberOfMonths: numberOfMonths || undefined,
            format,
            includeAIInsights,
          });
          toast.success('Monthly reports exported successfully!');
          announce('Monthly reports exported successfully!', 'polite');
          break;

        case 'all':
          await progressTrackerApi.exportAllData(userId);
          toast.success('Complete data export successful!');
          announce('Complete data export successful!', 'polite');
          break;
      }

      onClose();
    } catch (error: any) {
      console.error('Export failed:', error);
      const errorMessage = error.message || 'Failed to export data';
      toast.error(errorMessage);
      announce(`Export failed: ${errorMessage}`, 'assertive');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Screen reader announcements */}
        <div ref={announceRef} className="sr-only" aria-live="polite" aria-atomic="true" />

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6" aria-hidden="true" />
            <h2 id="export-modal-title" className="text-xl font-heading font-bold">
              Export Your Data
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            disabled={exporting}
            aria-label="Close export modal"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Type Selection */}
          <div role="group" aria-labelledby="export-type-label">
            <label id="export-type-label" className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to export?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportType('daily')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  exportType === 'daily'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                aria-pressed={exportType === 'daily'}
                aria-label="Export daily tracking data: Weight, activity, sleep, and more"
              >
                <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-600" aria-hidden="true" />
                <div className="font-medium">Daily Tracking</div>
                <div className="text-xs text-gray-500 mt-1">Weight, activity, sleep, etc.</div>
              </button>

              <button
                onClick={() => setExportType('weekly')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  exportType === 'weekly'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                aria-pressed={exportType === 'weekly'}
                aria-label="Export weekly summaries: Aggregated weekly data"
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-purple-600" aria-hidden="true" />
                <div className="font-medium">Weekly Summaries</div>
                <div className="text-xs text-gray-500 mt-1">Aggregated weekly data</div>
              </button>

              <button
                onClick={() => setExportType('monthly')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  exportType === 'monthly'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                aria-pressed={exportType === 'monthly'}
                aria-label="Export monthly reports: Comprehensive monthly insights"
              >
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-purple-600" aria-hidden="true" />
                <div className="font-medium">Monthly Reports</div>
                <div className="text-xs text-gray-500 mt-1">Comprehensive monthly insights</div>
              </button>

              <button
                onClick={() => {
                  setExportType('all');
                  setFormat('json'); // Force JSON for all data
                }}
                className={`p-4 border-2 rounded-xl transition-all ${
                  exportType === 'all'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                aria-pressed={exportType === 'all'}
                aria-label="Export all data: Complete data export in JSON format"
              >
                <Database className="w-6 h-6 mx-auto mb-2 text-purple-600" aria-hidden="true" />
                <div className="font-medium">Complete Export</div>
                <div className="text-xs text-gray-500 mt-1">Everything (JSON only)</div>
              </button>
            </div>
          </div>

          {/* Format Selection (not for 'all') */}
          {exportType !== 'all' && (
            <div role="group" aria-labelledby="format-label">
              <label id="format-label" className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="flex space-x-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                    format === 'csv'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  aria-pressed={format === 'csv'}
                  aria-label="CSV format: Excel compatible"
                >
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-500 mt-1">Excel compatible</div>
                </button>
                <button
                  onClick={() => setFormat('json')}
                  className={`flex-1 p-3 border-2 rounded-lg transition-all ${
                    format === 'json'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  aria-pressed={format === 'json'}
                  aria-label="JSON format: Developer friendly"
                >
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-gray-500 mt-1">Developer friendly</div>
                </button>
              </div>
            </div>
          )}

          {/* Daily Tracking Options */}
          {exportType === 'daily' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start-date" className="block text-xs text-gray-600 mb-1">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-describedby="date-range-help"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-xs text-gray-600 mb-1">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-describedby="date-range-help"
                  />
                </div>
              </div>
              <p id="date-range-help" className="text-xs text-gray-500">
                Leave empty to export all daily tracking data
              </p>
            </div>
          )}

          {/* Weekly Summaries Options */}
          {exportType === 'weekly' && (
            <div>
              <label htmlFor="num-weeks" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Weeks (Optional)
              </label>
              <input
                id="num-weeks"
                type="number"
                value={numberOfWeeks}
                onChange={(e) => setNumberOfWeeks(parseInt(e.target.value) || 12)}
                min="1"
                max="52"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-describedby="weeks-help"
              />
              <p id="weeks-help" className="text-xs text-gray-500 mt-1">
                Most recent {numberOfWeeks} weeks (Leave blank for all)
              </p>
            </div>
          )}

          {/* Monthly Reports Options */}
          {exportType === 'monthly' && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="num-months"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Number of Months (Optional)
                </label>
                <input
                  id="num-months"
                  type="number"
                  value={numberOfMonths}
                  onChange={(e) => setNumberOfMonths(parseInt(e.target.value) || 6)}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  aria-describedby="months-help"
                />
                <p id="months-help" className="text-xs text-gray-500 mt-1">
                  Most recent {numberOfMonths} months (Leave blank for all)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeAI"
                  checked={includeAIInsights}
                  onChange={(e) => setIncludeAIInsights(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  aria-describedby="ai-insights-desc"
                />
                <label htmlFor="includeAI" className="text-sm text-gray-700">
                  Include AI Insights (health score & summary)
                </label>
              </div>
              <p id="ai-insights-desc" className="sr-only">
                Include AI-generated health scores and summaries in the monthly report export
              </p>
            </div>
          )}

          {/* Info Box */}
          <div
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
            role="note"
            aria-label="Data ownership information"
          >
            <div className="flex items-start space-x-3">
              <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Your data, your control</p>
                <p className="text-blue-700">
                  Export your health data anytime. Your data belongs to you and can be used with
                  other apps or for your own analysis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl flex items-center justify-between border-t">
          <button
            onClick={onClose}
            disabled={exporting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Cancel export"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center space-x-2"
            aria-label={getButtonAriaLabel(
              `Export ${exportType} data`,
              exporting ? 'loading' : 'default'
            )}
          >
            {exporting ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                ></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Export Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
