/**
 * Duration Update Modal
 * Modal for offering to update system-wide period duration after 3 consecutive edits
 */

import { X } from 'lucide-react';
import type { DurationUpdateData } from '../../types/periodTracking.type';

interface DurationUpdateModalProps {
  isOpen: boolean;
  data: DurationUpdateData;
  onAccept: () => void;
  onDecline: () => void;
}

const DurationUpdateModal = ({ isOpen, data, onAccept, onDecline }: DurationUpdateModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-gray-800">
            Update Your Typical Period Duration?
          </h3>
          <button
            onClick={onDecline}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X size={20} className="text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-gray-700">
            We've noticed that your last 3 periods had durations different from your initial input
            during setup.
          </p>

          {/* Stats Box */}
          <div className="bg-secondary/30 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your current setting:</span>
              <span className="text-lg font-semibold text-gray-800">{data.current} days</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm text-gray-600">Recent logged periods:</span>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-800">
                  {data.recent.join(', ')} days
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Would you like to update your typical period duration? This will be used for future
            period predictions.
          </p>

          {/* Recommended Duration */}
          <div className="bg-success/10 border-2 border-success/30 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-success text-2xl">✓</span>
              <div>
                <p className="text-sm text-gray-600">Recommended duration:</p>
                <p className="text-xl font-bold text-success">{data.suggested} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            No, Keep Current
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-[#e85a5a] transition-colors shadow-lg hover:shadow-xl"
          >
            Yes, Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default DurationUpdateModal;
