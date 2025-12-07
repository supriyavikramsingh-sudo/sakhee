import React from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface CalorieRecalculationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  oldWeight: number;
  newWeight: number;
  newWeeklyAverage: number;
  currentTDEE: number;
  newTDEE: number;
  onRecalculate: () => void;
  onSkip: () => void;
}

export const CalorieRecalculationPrompt: React.FC<CalorieRecalculationPromptProps> = ({
  isOpen,
  onClose,
  oldWeight,
  newWeight,
  newWeeklyAverage,
  currentTDEE,
  newTDEE,
  onRecalculate,
  onSkip,
}) => {
  if (!isOpen) return null;

  const weightChange = newWeight - oldWeight;
  const calorieChange = newTDEE - currentTDEE;
  const isWeightIncrease = weightChange > 0;
  const isCalorieIncrease = calorieChange > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="text-warning" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold font-lora text-gray-800">
                  Update Calorie Target?
                </h3>
                <p className="text-sm text-gray-600 mt-1">Weight change detected</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Weight Change Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              {isWeightIncrease ? (
                <TrendingUp className="text-blue-600" size={20} />
              ) : (
                <TrendingDown className="text-blue-600" size={20} />
              )}
              <p className="text-sm font-semibold text-blue-900">Weight Change</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-blue-700 mb-1">Previous</p>
                <p className="text-lg font-bold text-blue-900">{oldWeight.toFixed(1)} kg</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-blue-600 font-bold">→</div>
              </div>
              <div>
                <p className="text-xs text-blue-700 mb-1">New</p>
                <p className="text-lg font-bold text-blue-900">{newWeight.toFixed(1)} kg</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-300">
              <p className="text-xs text-blue-700 mb-1">New Weekly Average</p>
              <p className="text-base font-semibold text-blue-900">
                {newWeeklyAverage.toFixed(1)} kg
              </p>
            </div>
          </div>

          {/* Calorie Impact */}
          <div
            className={`rounded-2xl p-4 border ${
              isCalorieIncrease
                ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                : 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {isCalorieIncrease ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-orange-600" size={20} />
              )}
              <p className="text-sm font-semibold text-gray-800">Calorie Target Impact</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Current</p>
                <p className="text-lg font-bold text-gray-900">{currentTDEE}</p>
                <p className="text-xs text-gray-600">cal/day</p>
              </div>
              <div className="flex items-center justify-center">
                <div
                  className={`font-bold ${
                    isCalorieIncrease ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {isCalorieIncrease ? '+' : ''}
                  {calorieChange}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">New</p>
                <p className="text-lg font-bold text-gray-900">{newTDEE}</p>
                <p className="text-xs text-gray-600">cal/day</p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Changing your weight from <strong>{oldWeight.toFixed(1)}kg</strong> to{' '}
              <strong>{newWeight.toFixed(1)}kg</strong> will update your weekly average to{' '}
              <strong>{newWeeklyAverage.toFixed(1)}kg</strong>. This will{' '}
              {isCalorieIncrease ? 'increase' : 'decrease'} your daily calorie target by{' '}
              <strong>{Math.abs(calorieChange)} calories</strong>.
            </p>
          </div>

          {/* What happens next */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">What happens if you recalculate?</p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Your weight entry will be saved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Weekly weight average will be updated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>
                  Daily calorie target will change to <strong>{newTDEE} calories</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Future meal plans will use the new calorie target</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={onRecalculate}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            <TrendingUp size={20} />
            Recalculate Now
          </button>

          <button
            onClick={onSkip}
            className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-all"
          >
            Save Without Recalculating
          </button>

          <button
            onClick={onClose}
            className="w-full text-gray-600 font-medium py-2 rounded-xl hover:text-gray-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalorieRecalculationPrompt;
