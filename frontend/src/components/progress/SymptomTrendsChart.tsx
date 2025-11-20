/**
 * Symptom Trends Chart Component
 * Visualizes weekly symptom tracking data over time with trend lines
 */

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface SymptomData {
  weekId: string;
  acneSeverity: number;
  hairLoss: number;
  hirsutism: number;
  fatigue: number;
  brainFog: number;
  headaches: number;
  anxiety: number;
  depression: number;
  moodSwings: number;
  bloating: number;
  jointPain: number;
}

interface SymptomTrendsChartProps {
  userId: string;
  refreshTrigger?: number;
}

const SymptomTrendsChart = ({ userId, refreshTrigger = 0 }: SymptomTrendsChartProps) => {
  const [symptomData, setSymptomData] = useState<SymptomData[]>([]);
  const [selectedSymptom, setSelectedSymptom] =
    useState<keyof Omit<SymptomData, 'weekId'>>('acneSeverity');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'4weeks' | '12weeks' | '26weeks'>('12weeks');

  useEffect(() => {
    fetchSymptomData();
  }, [userId, refreshTrigger, timeRange]);

  const fetchSymptomData = async () => {
    setLoading(true);
    try {
      const weeksToFetch = timeRange === '4weeks' ? 4 : timeRange === '12weeks' ? 12 : 26;
      const endWeek = getCurrentWeekId();
      const startWeek = getWeekId(weeksToFetch);

      const response = await progressTrackerApi.getWeeklySymptomsRange(userId, startWeek, endWeek);

      if (response.success && response.data) {
        setSymptomData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch symptom trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentWeekId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
    );
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  };

  const getWeekId = (weeksAgo: number) => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
    const year = pastDate.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((pastDate.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
    );
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  };

  const symptomOptions = [
    { key: 'acneSeverity', label: 'Acne', color: '#ff8d8d', icon: '🔴', category: 'Skin & Hair' },
    { key: 'hairLoss', label: 'Hair Loss', color: '#ff8d8d', icon: '💇', category: 'Skin & Hair' },
    {
      key: 'hirsutism',
      label: 'Excess Hair',
      color: '#ff8d8d',
      icon: '🪒',
      category: 'Skin & Hair',
    },
    { key: 'fatigue', label: 'Fatigue', color: '#ff8b2e', icon: '😴', category: 'Energy' },
    { key: 'brainFog', label: 'Brain Fog', color: '#ff8b2e', icon: '🧠', category: 'Energy' },
    { key: 'headaches', label: 'Headaches', color: '#ff8b2e', icon: '🤕', category: 'Physical' },
    { key: 'anxiety', label: 'Anxiety', color: '#06d6a0', icon: '😰', category: 'Mental Health' },
    {
      key: 'depression',
      label: 'Depression',
      color: '#06d6a0',
      icon: '😔',
      category: 'Mental Health',
    },
    {
      key: 'moodSwings',
      label: 'Mood Swings',
      color: '#06d6a0',
      icon: '😤',
      category: 'Mental Health',
    },
    { key: 'bloating', label: 'Bloating', color: '#ff8b2e', icon: '🤰', category: 'Physical' },
    { key: 'jointPain', label: 'Joint Pain', color: '#ff8b2e', icon: '🦴', category: 'Physical' },
  ];

  const getCurrentSymptom = () => symptomOptions.find((s) => s.key === selectedSymptom);

  const getSymptomValues = () => {
    return symptomData.map((week) => ({
      weekId: week.weekId,
      value: week[selectedSymptom] || 0,
    }));
  };

  const calculateTrend = () => {
    const values = getSymptomValues();
    if (values.length < 2) return 'stable';

    const recentValues = values.slice(-4); // Last 4 weeks
    const avg = recentValues.reduce((sum, v) => sum + v.value, 0) / recentValues.length;
    const previousValues = values.slice(-8, -4);

    if (previousValues.length === 0) return 'stable';

    const previousAvg = previousValues.reduce((sum, v) => sum + v.value, 0) / previousValues.length;

    if (avg > previousAvg + 1) return 'increasing';
    if (avg < previousAvg - 1) return 'decreasing';
    return 'stable';
  };

  const calculateAverage = () => {
    const values = getSymptomValues();
    if (values.length === 0) return 0;
    return (values.reduce((sum, v) => sum + v.value, 0) / values.length).toFixed(1);
  };

  const getMaxValue = () => {
    const values = getSymptomValues();
    return values.length > 0 ? Math.max(...values.map((v) => v.value)) : 0;
  };

  const getMinValue = () => {
    const values = getSymptomValues();
    return values.length > 0 ? Math.min(...values.map((v) => v.value)) : 0;
  };

  const renderChart = () => {
    const values = getSymptomValues();
    if (values.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted">
          <div className="text-center">
            <Calendar size={48} className="mx-auto mb-3 opacity-30" />
            <p>No symptom data yet. Complete a weekly check-in to see trends!</p>
          </div>
        </div>
      );
    }

    const maxValue = 10; // Fixed scale 0-10
    const chartHeight = 200;
    const chartWidth = values.length * 60;
    const padding = 20;

    // Calculate points for line chart
    const points = values.map((v, index) => ({
      x: padding + (index * (chartWidth - padding * 2)) / (values.length - 1 || 1),
      y: chartHeight - padding - (v.value / maxValue) * (chartHeight - padding * 2),
      value: v.value,
      weekId: v.weekId,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    return (
      <div className="relative overflow-x-auto pb-4">
        <svg width={Math.max(chartWidth, 600)} height={chartHeight + 40} className="min-w-full">
          {/* Grid lines */}
          {[0, 2, 4, 6, 8, 10].map((value) => {
            const y = chartHeight - padding - (value / maxValue) * (chartHeight - padding * 2);
            return (
              <g key={value}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text x="5" y={y + 4} fontSize="10" fill="#9ca3af">
                  {value}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={`${pathD} L ${points[points.length - 1].x},${chartHeight - padding} L ${padding},${
              chartHeight - padding
            } Z`}
            fill={getCurrentSymptom()?.color}
            fillOpacity="0.1"
          />

          {/* Trend line */}
          <path
            d={pathD}
            fill="none"
            stroke={getCurrentSymptom()?.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="white"
                stroke={getCurrentSymptom()?.color}
                strokeWidth="3"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={getCurrentSymptom()?.color}
                opacity="0.3"
              />
              {/* Week label */}
              <text x={point.x} y={chartHeight} fontSize="10" fill="#6b7280" textAnchor="middle">
                W{point.weekId.split('-')[1]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const trend = calculateTrend();

  if (loading) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-3xl p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-serif font-bold text-gray-800">Symptom Trends</h3>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('4weeks')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '4weeks'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            4 Weeks
          </button>
          <button
            onClick={() => setTimeRange('12weeks')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '12weeks'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            12 Weeks
          </button>
          <button
            onClick={() => setTimeRange('26weeks')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '26weeks'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            6 Months
          </button>
        </div>
      </div>

      {/* Symptom Selector */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {symptomOptions.map((symptom) => (
          <button
            key={symptom.key}
            onClick={() => setSelectedSymptom(symptom.key as any)}
            className={`p-3 rounded-xl text-center transition-all ${
              selectedSymptom === symptom.key
                ? 'bg-primary text-white shadow-lg scale-105'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className="text-2xl mb-1">{symptom.icon}</div>
            <div className="text-xs font-medium">{symptom.label}</div>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Average</p>
          <p className="text-2xl font-bold text-gray-800">{calculateAverage()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Highest</p>
          <p className="text-2xl font-bold text-primary">{getMaxValue()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Lowest</p>
          <p className="text-2xl font-bold text-success">{getMinValue()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Trend</p>
          <div className="flex items-center gap-1">
            {trend === 'increasing' && <TrendingUp size={20} className="text-primary" />}
            {trend === 'decreasing' && <TrendingDown size={20} className="text-success" />}
            {trend === 'stable' && <Minus size={20} className="text-gray-400" />}
            <span className="text-sm font-semibold text-gray-800 capitalize">{trend}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span style={{ color: getCurrentSymptom()?.color }}>{getCurrentSymptom()?.icon}</span>
          {getCurrentSymptom()?.label} -{' '}
          {timeRange === '4weeks'
            ? 'Last 4 Weeks'
            : timeRange === '12weeks'
            ? 'Last 12 Weeks'
            : 'Last 6 Months'}
        </h4>
        {renderChart()}
      </div>

      {/* Info */}
      <div className="text-xs text-muted text-center">
        Tracking symptoms helps identify patterns and triggers. Share trends with your healthcare
        provider.
      </div>
    </div>
  );
};

export default SymptomTrendsChart;
