/**
 * Ovulation Score Display Component
 * Shows ovulation score (0-100) with symptom breakdown and fertile window prediction
 */

import { useState, useEffect } from 'react';
import { Droplet, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import progressTrackerApi from '../../services/progressTrackerApi';

interface OvulationScore {
  date: string;
  totalScore: number; // 0-100
  cervicalMucusScore: number;
  basalBodyTempScore: number;
  symptomScore: number;
  prediction: 'unlikely' | 'possible' | 'likely' | 'very_likely';
  confidenceLevel: number; // 0-100
}

interface FertileWindow {
  startDate: string;
  endDate: string;
  ovulationDate: string | null;
  confidence: number;
}

interface OvulationScoreDisplayProps {
  userId: string;
  refreshTrigger?: number;
}

const OvulationScoreDisplay = ({ userId, refreshTrigger = 0 }: OvulationScoreDisplayProps) => {
  const [currentScore, setCurrentScore] = useState<OvulationScore | null>(null);
  const [fertileWindow, setFertileWindow] = useState<FertileWindow | null>(null);
  const [recentScores, setRecentScores] = useState<OvulationScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOvulationData();
  }, [userId, refreshTrigger]);

  const fetchOvulationData = async () => {
    setLoading(true);
    try {
      // Get current cycle's ovulation scores
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await progressTrackerApi.getDailyTrackingRange(userId, thirtyDaysAgo, today);

      if (response.success) {
        const scoresData = response.data
          .filter((entry: any) => entry.ovulationScore)
          .map((entry: any) => ({
            date: entry.date,
            totalScore: entry.ovulationScore.totalScore,
            cervicalMucusScore: entry.ovulationScore.cervicalMucusScore,
            basalBodyTempScore: entry.ovulationScore.basalBodyTempScore,
            symptomScore: entry.ovulationScore.symptomScore,
            prediction: entry.ovulationScore.prediction,
            confidenceLevel: entry.ovulationScore.confidenceLevel,
          }));

        setRecentScores(scoresData);

        if (scoresData.length > 0) {
          setCurrentScore(scoresData[scoresData.length - 1]);
        }

        // Calculate fertile window (simplified - backend should provide this)
        if (scoresData.length > 0) {
          const highScoreDates = scoresData.filter((s: OvulationScore) => s.totalScore >= 60);
          if (highScoreDates.length > 0) {
            const ovulationDate = highScoreDates[highScoreDates.length - 1].date;
            const startDate = new Date(ovulationDate);
            startDate.setDate(startDate.getDate() - 5);

            setFertileWindow({
              startDate: startDate.toISOString().split('T')[0],
              endDate: ovulationDate,
              ovulationDate,
              confidence: highScoreDates[highScoreDates.length - 1].confidenceLevel,
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch ovulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'very_likely':
        return 'text-success';
      case 'likely':
        return 'text-primary';
      case 'possible':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  const getPredictionBg = (prediction: string) => {
    switch (prediction) {
      case 'very_likely':
        return 'bg-success/10 border-success';
      case 'likely':
        return 'bg-primary/10 border-primary';
      case 'possible':
        return 'bg-warning/10 border-warning';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getPredictionLabel = (prediction: string) => {
    switch (prediction) {
      case 'very_likely':
        return 'Very Likely Ovulating';
      case 'likely':
        return 'Likely Ovulating';
      case 'possible':
        return 'Possibly Ovulating';
      default:
        return 'Unlikely Ovulating';
    }
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

  if (!currentScore) {
    return (
      <div className="bg-surface rounded-3xl p-8 shadow-lg text-center">
        <Droplet size={48} className="mx-auto mb-4 text-primary/30" />
        <p className="text-muted">
          No ovulation data yet. Track ovulation symptoms in your daily logs to see predictions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Ovulation Score Card */}
      <div className="bg-surface rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
            <Droplet className="text-primary" size={24} />
            Ovulation Tracker
          </h3>
          <span className="text-xs text-muted">
            Last updated: {new Date(currentScore.date).toLocaleDateString()}
          </span>
        </div>

        {/* Score Circle */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {/* Background Circle */}
            <svg className="transform -rotate-90" width="200" height="200">
              <circle cx="100" cy="100" r="85" stroke="#f0f0f0" strokeWidth="12" fill="none" />
              {/* Progress Circle */}
              <circle
                cx="100"
                cy="100"
                r="85"
                stroke={
                  currentScore.totalScore >= 70
                    ? '#06d6a0'
                    : currentScore.totalScore >= 40
                    ? '#ff8d8d'
                    : '#9a8c98'
                }
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(currentScore.totalScore / 100) * 534} 534`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-gray-800">{currentScore.totalScore}</div>
              <div className="text-sm text-muted">Ovulation Score</div>
            </div>
          </div>
        </div>

        {/* Prediction Badge */}
        <div
          className={`p-4 rounded-xl border-2 text-center ${getPredictionBg(
            currentScore.prediction
          )}`}
        >
          <div className={`text-lg font-bold ${getPredictionColor(currentScore.prediction)}`}>
            {getPredictionLabel(currentScore.prediction)}
          </div>
          <div className="text-xs text-muted mt-1">Confidence: {currentScore.confidenceLevel}%</div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Score Breakdown:</h4>

          {/* Cervical Mucus Score */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">Cervical Mucus</span>
              <span className="font-semibold text-gray-800">
                {currentScore.cervicalMucusScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentScore.cervicalMucusScore}%` }}
              />
            </div>
          </div>

          {/* BBT Score */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">Basal Body Temperature</span>
              <span className="font-semibold text-gray-800">
                {currentScore.basalBodyTempScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-warning h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentScore.basalBodyTempScore}%` }}
              />
            </div>
          </div>

          {/* Symptoms Score */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-700">Ovulation Symptoms</span>
              <span className="font-semibold text-gray-800">{currentScore.symptomScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentScore.symptomScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fertile Window Card */}
      {fertileWindow && (
        <div className="bg-gradient-to-r from-success/10 to-primary/10 rounded-3xl p-6 shadow-lg border-2 border-success/30">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-success" size={24} />
            <h3 className="text-xl font-serif font-bold text-gray-800">Fertile Window</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-surface/80 rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Window Start</p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(fertileWindow.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-surface/80 rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Predicted Ovulation</p>
              <p className="text-lg font-bold text-success">
                {fertileWindow.ovulationDate
                  ? new Date(fertileWindow.ovulationDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'TBD'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <TrendingUp size={16} className="text-success" />
            <span>Confidence: {fertileWindow.confidence}%</span>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {recentScores.length > 1 && (
        <div className="bg-surface rounded-3xl p-6 shadow-lg">
          <h3 className="text-lg font-serif font-bold text-gray-800 mb-4">30-Day Trend</h3>
          <div className="space-y-2">
            {recentScores.slice(-10).map((score) => (
              <div key={score.date} className="flex items-center gap-3">
                <span className="text-xs text-muted w-20">
                  {new Date(score.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      score.totalScore >= 70
                        ? 'bg-success'
                        : score.totalScore >= 40
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                    style={{ width: `${score.totalScore}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-800 w-12 text-right">
                  {score.totalScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-gray-700">
          <strong>How it works:</strong> Ovulation score combines cervical mucus consistency (most
          important), basal body temperature patterns, and physical symptoms. Scores above 70
          indicate high likelihood of ovulation. PCOS can cause irregular ovulation, so tracking
          helps identify patterns.
        </div>
      </div>
    </div>
  );
};

export default OvulationScoreDisplay;
