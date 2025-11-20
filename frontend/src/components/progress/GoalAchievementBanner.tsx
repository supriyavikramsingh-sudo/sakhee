/**
 * Goal Achievement Banner Component
 * Celebration banner when user achieves their weight goal
 */

import { useState, useEffect } from 'react';
import { Trophy, X, PartyPopper, Target, TrendingDown } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface GoalAchievementData {
  goalWeight: number;
  currentWeight: number;
  startWeight: number;
  weightLost: number;
  percentageAchieved: number;
  goalAchieved: boolean;
  achievedAt: string | null;
}

interface GoalAchievementBannerProps {
  userId: string;
  goalData: GoalAchievementData;
  onDismiss: () => void;
}

const GoalAchievementBanner = ({ userId, goalData, onDismiss }: GoalAchievementBannerProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsAnimating(true), 100);
  }, []);

  const handleDismiss = async () => {
    setIsDismissing(true);

    try {
      // Call API to mark banner as dismissed
      await progressTrackerApi.dismissGoalBanner(userId);

      setTimeout(() => {
        onDismiss();
      }, 300);
    } catch (error) {
      console.error('Failed to dismiss banner:', error);
      toast.error('Failed to dismiss banner');
      setIsDismissing(false);
    }
  };

  return (
    <div
      className={`mb-6 relative overflow-hidden rounded-3xl shadow-2xl transition-all duration-500 ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      } ${isDismissing ? 'opacity-0 scale-95' : ''}`}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-success via-primary to-warning opacity-90" />

      {/* Animated Confetti Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 left-8 animate-bounce">
          <PartyPopper size={24} className="text-white" />
        </div>
        <div className="absolute top-8 right-12 animate-bounce delay-100">
          <Trophy size={28} className="text-white" />
        </div>
        <div className="absolute bottom-6 left-16 animate-bounce delay-200">
          <Target size={20} className="text-white" />
        </div>
        <div className="absolute bottom-8 right-20 animate-bounce delay-300">
          <TrendingDown size={24} className="text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} className="text-white" />
        </button>

        <div className="flex items-center gap-6">
          {/* Trophy Icon */}
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
            <Trophy size={40} className="text-white" />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h2 className="text-3xl font-serif font-bold text-white mb-2 flex items-center gap-2">
              🎉 Congratulations! Goal Achieved!
            </h2>
            <p className="text-white/90 text-lg mb-4">
              You've successfully reached your weight goal! This is a huge accomplishment on your
              PCOS wellness journey.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-white/80 text-xs mb-1">Starting Weight</p>
                <p className="text-white text-xl font-bold">{goalData.startWeight} kg</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-white/80 text-xs mb-1">Current Weight</p>
                <p className="text-white text-xl font-bold">{goalData.currentWeight} kg</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-white/80 text-xs mb-1">Total Lost</p>
                <p className="text-white text-xl font-bold">{goalData.weightLost} kg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Date */}
        {goalData.achievedAt && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white/80 text-sm text-center">
              Goal achieved on{' '}
              {new Date(goalData.achievedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Motivational Message */}
        <div className="mt-6 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
          <p className="text-white/90 text-sm text-center italic">
            "Success is the sum of small efforts repeated day in and day out. Keep up the amazing
            work!"
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -top-4 -right-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
};

export default GoalAchievementBanner;
