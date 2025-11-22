/**
 * Edit Period Modal
 * Modal for editing the most recent period with date restrictions
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';
import type { DurationUpdateData, EditPeriodResponse } from '../../types/periodTracking.type';
import DurationUpdateModal from './DurationUpdateModal';

interface EditPeriodModalProps {
  userId: string;
  cycleId: string;
  initialData: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditPeriodModal = ({
  userId,
  cycleId,
  initialData,
  onClose,
  onSuccess,
}: EditPeriodModalProps) => {
  console.log('Initial data in EditPeriodModal:', initialData); // Debugging log
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [showDurationUpdateModal, setShowDurationUpdateModal] = useState(false);
  const [durationUpdateData, setDurationUpdateData] = useState<DurationUpdateData | null>(null);

  const originalStart = new Date(initialData.startDate);

  // Calculate date restrictions
  const minStart = new Date(originalStart);
  minStart.setDate(minStart.getDate() - 5);
  const maxStart = new Date(originalStart);
  maxStart.setDate(maxStart.getDate() + 5);

  const [formData, setFormData] = useState({
    newStartDate: new Date(initialData.startDate).toISOString().split('T')[0],
    newEndDate: new Date(initialData.endDate).toISOString().split('T')[0],
    flow: initialData?.flow || '',
    color: initialData?.color || '',
    colorConsistency: initialData?.colorConsistency || '',
    clots: initialData?.clots || '',
    spotting: initialData?.spotting ?? (null as boolean | null),
    odor: initialData?.odor || '',
    comparedToLast: initialData?.comparedToLast || '',
  });

  // Update minimum end date when start date changes
  const [minEndDate, setMinEndDate] = useState(formData.newStartDate);

  useEffect(() => {
    setMinEndDate(formData.newStartDate);

    // Adjust end date if it's now before new start date
    if (formData.newEndDate && formData.newStartDate >= formData.newEndDate) {
      const newEnd = new Date(formData.newStartDate);
      newEnd.setDate(newEnd.getDate() + 1);
      setFormData((prev) => ({ ...prev, newEndDate: newEnd.toISOString().split('T')[0] }));
    }
  }, [formData.newStartDate]);

  const canSubmit = () => {
    return (
      formData.newStartDate &&
      formData.newEndDate &&
      formData.flow &&
      formData.color &&
      formData.colorConsistency &&
      formData.clots &&
      formData.spotting !== null &&
      formData.odor &&
      formData.comparedToLast
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setValidationError('');
    setLoading(true);

    try {
      const response = (await progressTrackerApi.updateCycle(
        userId,
        cycleId,
        formData
      )) as EditPeriodResponse;

      if (!response.success) {
        setValidationError(response.message || 'Failed to update period');
        return;
      }

      toast.success('Period updated successfully!');

      // Check if duration update should be offered
      if (response.offerDurationUpdate && response.suggestedDuration) {
        setDurationUpdateData({
          current: response.currentDuration!,
          suggested: response.suggestedDuration,
          recent: response.recentDurations || [],
        });
        setShowDurationUpdateModal(true);
      } else {
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to update period:', error);
      setValidationError(error.message || 'Failed to update period. Please try again.');
      toast.error(error.message || 'Failed to update period');
    } finally {
      setLoading(false);
    }
  };

  const handleDurationUpdateAccept = async () => {
    if (!durationUpdateData) return;

    try {
      await progressTrackerApi.updatePeriodDuration(userId, durationUpdateData.suggested, false);
      toast.success(`Period duration updated to ${durationUpdateData.suggested} days!`);
      setShowDurationUpdateModal(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update duration:', error);
      toast.error('Failed to update duration');
    }
  };

  const handleDurationUpdateDecline = async () => {
    try {
      await progressTrackerApi.updatePeriodDuration(userId, undefined, true);
      setShowDurationUpdateModal(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to record decline:', error);
      setShowDurationUpdateModal(false);
      onSuccess();
      onClose();
    }
  };

  const flowOptions = ['Light', 'Moderate', 'Heavy', 'Very heavy'];
  const colorOptions = ['Bright red', 'Dark red', 'Brown/old blood', 'Blackish', 'Pinkish'];
  const consistencyOptions = [
    'Starts brown → red → brown',
    'Mostly red only',
    'Mostly dark/brown only',
  ];
  const clotOptions = ['No', 'Small clots', 'Large clots'];
  const odorOptions = ['No', 'Mild / normal metallic smell', 'Strong / foul smell', 'Fishy smell'];
  const comparisonOptions = [
    'Much lighter',
    'Slightly lighter',
    'About the same',
    'Slightly heavier',
    'Much heavier',
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-secondary flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-gray-800">Edit Period</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              disabled={loading}
            >
              <X size={20} className="text-muted" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Validation Error */}
            {validationError && (
              <div className="bg-danger/10 border-2 border-danger/30 rounded-xl p-4 flex items-start gap-3">
                <span className="text-danger text-xl">⚠️</span>
                <p className="text-sm text-danger font-medium">{validationError}</p>
              </div>
            )}

            {/* Dates with Restrictions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When did this period start? <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={formData.newStartDate}
                  onChange={(e) => setFormData({ ...formData, newStartDate: e.target.value })}
                  min={minStart.toISOString().split('T')[0]}
                  max={maxStart.toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-xs text-muted mt-1">
                  Can be changed by ±5 days from original date
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When did this period end? <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={formData.newEndDate}
                  onChange={(e) => setFormData({ ...formData, newEndDate: e.target.value })}
                  min={minEndDate}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
                />
                <p className="text-xs text-muted mt-1">Must be after start date</p>
              </div>
            </div>

            {/* Flow */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you describe your flow this cycle? <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {flowOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, flow: option })}
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.flow === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What was the color of your period blood this cycle?{' '}
                <span className="text-danger">*</span>
              </label>
              <div className="space-y-2">
                {colorOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, color: option })}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.color === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Consistency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did the color stay consistent or change throughout this period?{' '}
                <span className="text-danger">*</span>
              </label>
              <div className="space-y-2">
                {consistencyOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, colorConsistency: option })}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.colorConsistency === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Clots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did you pass blood clots this cycle? <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {clotOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, clots: option })}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-300 ${
                      formData.clots === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Spotting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did you experience spotting since your last period?{' '}
                <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, spotting: true })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.spotting === true
                      ? 'border-primary bg-secondary shadow-md'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setFormData({ ...formData, spotting: false })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.spotting === false
                      ? 'border-primary bg-secondary shadow-md'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {/* Odor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Did you notice any unusual odor during this period?{' '}
                <span className="text-danger">*</span>
              </label>
              <div className="space-y-2">
                {odorOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, odor: option })}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.odor === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How does this cycle compare to your previous one?{' '}
                <span className="text-danger">*</span>
              </label>
              <div className="space-y-2">
                {comparisonOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setFormData({ ...formData, comparedToLast: option })}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                      formData.comparedToLast === option
                        ? 'border-primary bg-secondary shadow-md'
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-secondary flex items-center justify-between">
            <button onClick={onClose} className="btn-outline" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                'Update Period'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Duration Update Modal */}
      {showDurationUpdateModal && durationUpdateData && (
        <DurationUpdateModal
          isOpen={showDurationUpdateModal}
          data={durationUpdateData}
          onAccept={handleDurationUpdateAccept}
          onDecline={handleDurationUpdateDecline}
        />
      )}
    </>
  );
};

export default EditPeriodModal;
