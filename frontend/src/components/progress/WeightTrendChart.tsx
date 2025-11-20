/**
 * Weight Trend Chart Component
 * SVG line chart showing weight trajectory over the month with goal line
 */

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WeightDataPoint {
  date: string | Date;
  weight: number;
}

interface WeightTrendChartProps {
  weightData: WeightDataPoint[];
  goalWeight?: number;
  startWeight: number;
  endWeight: number;
  height?: number;
}

const WeightTrendChart = ({
  weightData,
  goalWeight,
  startWeight,
  endWeight,
  height = 300,
}: WeightTrendChartProps) => {
  const chartMetrics = useMemo(() => {
    if (!weightData || weightData.length === 0) {
      return null;
    }

    // Sort data by date
    const sortedData = [...weightData].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
      return dateA.getTime() - dateB.getTime();
    });

    // Get weight range
    const weights = sortedData.map((d) => d.weight);
    const minWeight = Math.min(...weights, goalWeight || Infinity);
    const maxWeight = Math.max(...weights, goalWeight || -Infinity);

    // Add 5% padding to y-axis
    const padding = (maxWeight - minWeight) * 0.1;
    const yMin = minWeight - padding;
    const yMax = maxWeight + padding;

    return {
      sortedData,
      yMin,
      yMax,
      weights,
    };
  }, [weightData, goalWeight]);

  if (!chartMetrics || chartMetrics.sortedData.length === 0) {
    return (
      <div className="bg-surface-dark rounded-2xl p-8 text-center">
        <p className="text-muted">No weight data available for this period</p>
      </div>
    );
  }

  const { sortedData, yMin, yMax } = chartMetrics;
  const width = 800;
  const padding = { top: 30, right: 40, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const scaleX = (index: number) => {
    return padding.left + (index / (sortedData.length - 1)) * chartWidth;
  };

  const scaleY = (weight: number) => {
    return padding.top + chartHeight - ((weight - yMin) / (yMax - yMin)) * chartHeight;
  };

  // Generate path for weight line
  const weightLinePath = sortedData
    .map((point, index) => {
      const x = scaleX(index);
      const y = scaleY(point.weight);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Generate area fill path
  const areaPath = `${weightLinePath} L ${scaleX(sortedData.length - 1)} ${
    padding.top + chartHeight
  } L ${padding.left} ${padding.top + chartHeight} Z`;

  // Generate Y-axis labels
  const yAxisSteps = 5;
  const yAxisLabels = Array.from({ length: yAxisSteps }, (_, i) => {
    const weight = yMin + ((yMax - yMin) / (yAxisSteps - 1)) * i;
    return {
      weight: weight.toFixed(1),
      y: scaleY(weight),
    };
  }).reverse();

  // Format date for x-axis
  const formatDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate trend
  const weightChange = endWeight - startWeight;
  const trend = weightChange > 0.2 ? 'gain' : weightChange < -0.2 ? 'loss' : 'stable';

  return (
    <div className="bg-surface-dark rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-lg text-text">Weight Trajectory</h3>
          <p className="text-sm text-muted mt-1">{sortedData.length} data points</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              trend === 'gain'
                ? 'bg-primary/10 text-primary'
                : trend === 'loss'
                ? 'bg-success/10 text-success'
                : 'bg-surface text-muted'
            }`}
          >
            {trend === 'gain' && <TrendingUp size={18} />}
            {trend === 'loss' && <TrendingDown size={18} />}
            {trend === 'stable' && <Minus size={18} />}
            <span className="font-semibold">
              {weightChange > 0 ? '+' : ''}
              {weightChange.toFixed(1)}kg
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-primary"></div>
          <span className="text-muted">Weight</span>
        </div>
        {goalWeight && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-success"></div>
            <span className="text-muted">Goal ({goalWeight.toFixed(1)}kg)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-muted">Data Points</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          className="mx-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="url(#grid)"
          />

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {yAxisLabels.map((label, index) => (
            <g key={index}>
              <line
                x1={padding.left}
                y1={label.y}
                x2={padding.left + chartWidth}
                y2={label.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={label.y + 4}
                textAnchor="end"
                className="text-xs fill-muted"
              >
                {label.weight}kg
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />

          {/* X-axis labels (show every few points to avoid crowding) */}
          {sortedData.map((point, index) => {
            const showLabel =
              sortedData.length <= 10 ||
              index % Math.ceil(sortedData.length / 10) === 0 ||
              index === sortedData.length - 1;
            if (!showLabel) return null;

            return (
              <text
                key={index}
                x={scaleX(index)}
                y={padding.top + chartHeight + 25}
                textAnchor="middle"
                className="text-xs fill-muted"
              >
                {formatDate(point.date)}
              </text>
            );
          })}

          {/* Goal line (if provided) */}
          {goalWeight && (
            <line
              x1={padding.left}
              y1={scaleY(goalWeight)}
              x2={padding.left + chartWidth}
              y2={scaleY(goalWeight)}
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Area fill under line */}
          <path d={areaPath} fill="url(#gradient)" opacity="0.2" />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Weight line */}
          <path
            d={weightLinePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {sortedData.map((point, index) => (
            <g key={index}>
              {/* Outer circle (hover area) */}
              <circle
                cx={scaleX(index)}
                cy={scaleY(point.weight)}
                r="8"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {formatDate(point.date)}: {point.weight.toFixed(1)}kg
                </title>
              </circle>

              {/* Inner circle (visible dot) */}
              <circle
                cx={scaleX(index)}
                cy={scaleY(point.weight)}
                r="4"
                fill="var(--color-primary)"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
              >
                <title>
                  {formatDate(point.date)}: {point.weight.toFixed(1)}kg
                </title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-semibold text-text">{startWeight.toFixed(1)}kg</div>
          <div className="text-xs text-muted mt-1">Start Weight</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-text">{endWeight.toFixed(1)}kg</div>
          <div className="text-xs text-muted mt-1">Current Weight</div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-semibold ${
              trend === 'gain' ? 'text-primary' : trend === 'loss' ? 'text-success' : 'text-muted'
            }`}
          >
            {goalWeight ? Math.abs(endWeight - goalWeight).toFixed(1) : '-'}kg
          </div>
          <div className="text-xs text-muted mt-1">{goalWeight ? 'From Goal' : 'No Goal Set'}</div>
        </div>
      </div>
    </div>
  );
};

export default WeightTrendChart;
