/**
 * Loading Skeleton Components
 * Provides visual feedback during lazy loading of heavy components
 */

/**
 * Skeleton for AI Insights Panel
 */
export const AIInsightsPanelSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading AI insights">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-200 rounded-full"></div>
          <div className="h-6 bg-purple-200 rounded w-48"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-purple-100 rounded w-full"></div>
          <div className="h-4 bg-purple-100 rounded w-5/6"></div>
          <div className="h-4 bg-purple-100 rounded w-4/6"></div>
        </div>
      </div>

      {/* Sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-11/12"></div>
            <div className="h-4 bg-gray-100 rounded w-10/12"></div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading AI insights...</span>
    </div>
  );
};

/**
 * Skeleton for Weight Trend Chart
 */
export const WeightTrendChartSkeleton = () => {
  return (
    <div
      className="bg-white rounded-xl p-6 shadow-sm animate-pulse"
      role="status"
      aria-label="Loading weight chart"
    >
      <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded flex items-end justify-around p-4">
        {[40, 60, 45, 70, 55, 65, 50].map((height, i) => (
          <div key={i} className="bg-gray-200 rounded-t w-8" style={{ height: `${height}%` }}></div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-3 bg-gray-200 rounded w-8"></div>
        ))}
      </div>
      <span className="sr-only">Loading weight trend chart...</span>
    </div>
  );
};

/**
 * Skeleton for Export Data Modal
 */
export const ExportDataModalSkeleton = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full animate-pulse"
        role="status"
        aria-label="Loading export modal"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl">
          <div className="h-6 bg-white/20 rounded w-48"></div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-40"></div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="flex space-x-3">
              <div className="flex-1 h-16 bg-gray-100 rounded-lg"></div>
              <div className="flex-1 h-16 bg-gray-100 rounded-lg"></div>
            </div>
          </div>

          <div className="h-20 bg-blue-50 rounded-lg"></div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between">
          <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
          <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
        </div>
        <span className="sr-only">Loading export modal...</span>
      </div>
    </div>
  );
};

/**
 * Skeleton for Monthly Report Card
 */
export const MonthlyReportCardSkeleton = () => {
  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse"
      role="status"
      aria-label="Loading monthly report"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
        <div className="h-6 bg-white/20 rounded w-48 mb-2"></div>
        <div className="h-4 bg-white/20 rounded w-32"></div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="h-64 bg-gray-100 rounded-lg"></div>

        {/* Sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-gray-200 rounded-xl">
            <div className="p-4 bg-gray-50">
              <div className="h-5 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full"></div>
              <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading monthly report...</span>
    </div>
  );
};

/**
 * Skeleton for Weekly Summary Card
 */
export const WeeklySummaryCardSkeleton = () => {
  return (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse"
      role="status"
      aria-label="Loading weekly summary"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3">
        <div className="h-5 bg-white/20 rounded w-32 mb-1"></div>
        <div className="h-3 bg-white/20 rounded w-24"></div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>

        {/* Chart or Progress */}
        <div className="h-32 bg-gray-100 rounded-lg"></div>

        {/* Bottom Info */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-full"></div>
          <div className="h-3 bg-gray-100 rounded w-4/5"></div>
        </div>
      </div>
      <span className="sr-only">Loading weekly summary...</span>
    </div>
  );
};

/**
 * Generic Skeleton for any component
 */
export const GenericSkeleton = ({
  height = 'h-64',
  className = '',
}: {
  height?: string;
  className?: string;
}) => {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 animate-pulse ${height} ${className}`}
      role="status"
      aria-label="Loading content"
    >
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          <div className="h-4 bg-gray-100 rounded w-4/6"></div>
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
};
