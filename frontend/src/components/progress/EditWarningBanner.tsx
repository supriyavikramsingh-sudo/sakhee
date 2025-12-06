/**
 * EditWarningBanner Component
 *
 * Warning banner shown when editing weight or exercise data
 * Informs users about impact on calorie calculations and weekly metrics
 * Phase 4: Editing Functionality
 */

import React, { useState } from 'react';
import { AlertTriangle, Info, Check } from 'lucide-react';

export interface EditWarning {
  weightChanged: boolean;
  exerciseChanged: boolean;
}

interface EditWarningBannerProps {
  warnings: EditWarning;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EditWarningBanner: React.FC<EditWarningBannerProps> = ({
  warnings,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [understood, setUnderstood] = useState(false);

  const { weightChanged, exerciseChanged } = warnings;
  const hasWarnings = weightChanged || exerciseChanged;

  if (!hasWarnings) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Important Changes Detected</h3>
              <p className="text-sm text-gray-600 mt-1">Please review the impacts before saving</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Weight Warning */}
          {weightChanged && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Weight Change Impact</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Weekly weight average will be recalculated</li>
                    <li>• Your daily calorie goal may be adjusted</li>
                    <li>• Historical weight trend will be updated</li>
                    <li>• Progress charts will reflect the new data</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Exercise Warning */}
          {exerciseChanged && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Exercise Change Impact</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Weekly activity level will be recalculated</li>
                    <li>• Your TDEE (Total Daily Energy Expenditure) may change</li>
                    <li>• Daily calorie recommendations will be adjusted</li>
                    <li>• Activity patterns in reports will be updated</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong className="font-semibold">💡 Why does this matter?</strong>
              <br />
              These metrics are used to calculate your personalized calorie goals and track your
              progress. Changing historical data will trigger recalculations to ensure your
              recommendations stay accurate.
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="w-5 h-5 border-2 border-gray-300 rounded checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                {understood && (
                  <Check size={16} className="absolute text-white pointer-events-none" />
                )}
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors select-none">
                I understand these changes will trigger recalculations of my calorie goals, activity
                levels, and progress metrics. I want to proceed with updating this entry.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!understood || loading}
            className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <Check size={18} />
                Confirm & Update
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWarningBanner;
