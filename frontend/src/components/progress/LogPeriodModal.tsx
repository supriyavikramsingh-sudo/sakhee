/**
 * Log Period Modal
 * Form to log a new period cycle
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface LogPeriodModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const LogPeriodModal = ({ userId, onClose, onSuccess }: LogPeriodModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    flow: '',
    color: '',
    colorConsistency: '',
    clots: '',
    spotting: null as boolean | null,
    odor: '',
    comparedToLast: '',
  });

  const canSubmit = () => {
    return (
      formData.startDate &&
      formData.endDate &&
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

    setLoading(true);
    try {
      await progressTrackerApi.logPeriod(userId, formData);
      toast.success('Period logged successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to log period:', error);
      toast.error(error.message || 'Failed to log period. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const flowOptions = ['Light', 'Moderate', 'Heavy', 'Very heavy'];
  const colorOptions = ['Bright red', 'Dark red', 'Brown/old blood', 'Blackish', 'Pinkish'];
  const consistencyOptions = [
    'Stays similar',
    'Starts brown → red → brown',
    'Mostly brown only',
    'Mostly dark/thick only',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary flex items-center justify-between">
          <h2 className="text-2xl font-serif font-bold text-gray-800">Log Your Period</h2>
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
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When did this period start? <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When did this period end? <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              />
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
                Saving...
              </>
            ) : (
              'Save Period'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogPeriodModal;
