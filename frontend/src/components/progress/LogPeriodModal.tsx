/**
 * Log Period Modal
 * Form to log a new period cycle with auto-calculated end date
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface LogPeriodModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'new' | 'edit';
  initialData?: any;
}

const LogPeriodModal = ({
  userId,
  onClose,
  onSuccess,
  mode = 'new',
  initialData,
}: LogPeriodModalProps) => {
  const [loading, setLoading] = useState(false);
  const [onboardingDuration, setOnboardingDuration] = useState<number | null>(null);
  const [lastPeriodStart, setLastPeriodStart] = useState<string | null>(null); // First setup period date
  const [nextPeriod, setNextPeriod] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [validationWarning, setValidationWarning] = useState<string>('');
  const [formData, setFormData] = useState({
    startDate: initialData?.startDate
      ? new Date(initialData.startDate).toISOString().split('T')[0]
      : '',
    endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
    flow: initialData?.flow || '',
    color: initialData?.color || '',
    colorConsistency: initialData?.colorConsistency || '',
    clots: initialData?.clots || '',
    spotting: initialData?.spotting ?? (null as boolean | null),
    odor: initialData?.odor || '',
    comparedToLast: initialData?.comparedToLast || '',
  });

  // Fetch onboarding duration, lastPeriodStart, and next period when modal opens
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch onboarding duration and lastPeriodStart
        const setupResponse = await progressTrackerApi.getPeriodSetup(userId);
        if (setupResponse.success && setupResponse.data) {
          setOnboardingDuration(setupResponse.data.onboardingDuration || 5);
          // Set the first setup period date as the minimum allowed date
          if (setupResponse.data.lastPeriodStart) {
            setLastPeriodStart(setupResponse.data.lastPeriodStart);
          }
        }

        // In edit mode, fetch the next period to set max end date
        // Note: We're editing the most recent period, so there usually won't be a next period
        // unless the user has already logged a newer period
        if (mode === 'edit' && initialData?.cycleId) {
          const cyclesResponse = await progressTrackerApi.getCycles(userId, 100); // Get all cycles
          if (cyclesResponse.success && cyclesResponse.data) {
            const cycles = cyclesResponse.data;
            // Find the current cycle being edited
            const currentIndex = cycles.findIndex((c: any) => c.cycleId === initialData.cycleId);

            // Check if there's a period logged after this one (rare case)
            if (currentIndex !== -1 && currentIndex < cycles.length - 1) {
              setNextPeriod(cycles[currentIndex + 1]);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setOnboardingDuration(5);
      }
    };

    fetchData();
  }, [userId, mode, initialData?.cycleId]);

  // Handle start date change with auto-adjustment of end date
  const handleStartDateChange = (newStartDate: string) => {
    setFormData((prev) => {
      const newData = { ...prev, startDate: newStartDate };

      // If in edit mode and end date exists, check if it needs adjustment
      if (mode === 'edit' && prev.endDate) {
        const startTime = new Date(newStartDate).getTime();
        const endTime = new Date(prev.endDate).getTime();

        // If end date is now before or equal to start date, adjust it
        if (endTime <= startTime) {
          // Set end date to one day after start date
          const adjustedEndDate = new Date(startTime + 24 * 60 * 60 * 1000);
          newData.endDate = adjustedEndDate.toISOString().split('T')[0];
        }
      }

      return newData;
    });
  };

  // Calculate minimum end date (must be after start date)
  const getMinEndDate = () => {
    if (!formData.startDate) return undefined;
    const startTime = new Date(formData.startDate).getTime();
    const minEndTime = startTime + 24 * 60 * 60 * 1000; // One day after start
    return new Date(minEndTime).toISOString().split('T')[0];
  };

  // Calculate maximum end date (must be before next period if it exists)
  const getMaxEndDate = () => {
    if (mode === 'edit' && nextPeriod?.startDate) {
      // Max is one day before next period starts
      const nextStartTime = new Date(nextPeriod.startDate).getTime();
      const maxEndTime = nextStartTime - 24 * 60 * 60 * 1000;
      return new Date(maxEndTime).toISOString().split('T')[0];
    }
    // If no next period, max is today
    return new Date().toISOString().split('T')[0];
  };

  // Validate dates
  const validateDates = (): { valid: boolean; error?: string; warning?: string } => {
    if (mode === 'edit') {
      if (!formData.endDate) {
        return { valid: false, error: 'End date is required' };
      }

      const startTime = new Date(formData.startDate).getTime();
      const endTime = new Date(formData.endDate).getTime();

      if (endTime <= startTime) {
        return { valid: false, error: 'End date must be after start date' };
      }

      // Check if period is unusually long
      const durationDays = Math.floor((endTime - startTime) / (24 * 60 * 60 * 1000));
      let warning = undefined;
      if (durationDays > 10) {
        warning = `This period duration is ${durationDays} days, which is longer than typical. Please verify your dates are correct.`;
      }

      // Check overlap with next period
      if (nextPeriod?.startDate) {
        const nextStartTime = new Date(nextPeriod.startDate).getTime();
        if (endTime >= nextStartTime) {
          return {
            valid: false,
            error: `End date cannot overlap with your next period starting on ${new Date(
              nextPeriod.startDate
            ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          };
        }
      }

      return { valid: true, warning };
    }

    return { valid: true };
  };

  // Use effect to update validation warning without causing re-renders
  useEffect(() => {
    if (mode === 'edit' && formData.startDate && formData.endDate) {
      const validation = validateDates();
      if (validation.warning) {
        setValidationWarning(validation.warning);
      } else {
        setValidationWarning('');
      }
    }
  }, [formData.startDate, formData.endDate, mode, nextPeriod]);

  const canSubmit = () => {
    const baseValidation =
      formData.startDate &&
      formData.flow &&
      formData.color &&
      formData.colorConsistency &&
      formData.clots &&
      formData.spotting !== null &&
      formData.odor &&
      formData.comparedToLast;

    if (mode === 'edit') {
      return baseValidation && formData.endDate && validateDates().valid;
    }

    return baseValidation;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    // Clear previous errors/warnings
    setValidationError('');
    setValidationWarning('');

    // Validate dates in edit mode
    if (mode === 'edit') {
      const validation = validateDates();
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid dates');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'edit' && initialData?.cycleId) {
        // Include endDate in the update payload
        const updateData = {
          ...formData,
          newEndDate: formData.endDate, // Backend expects 'newEndDate'
        };
        result = await progressTrackerApi.updateCycle(userId, initialData.cycleId, updateData);

        // Check if duration update should be offered
        if (result.data?.offerDurationUpdate) {
          const { suggestedDuration, currentDuration, recentDurations } = result.data;

          // Show confirmation dialog
          const userConfirmed = window.confirm(
            `📊 Duration Pattern Detected!\n\n` +
              `Your last 3 periods have consistently been different from your current setting of ${currentDuration} days.\n\n` +
              `Recent period durations: ${recentDurations.join(', ')} days\n` +
              `Suggested new default: ${suggestedDuration} days\n\n` +
              `Would you like to update your default period duration to ${suggestedDuration} days?\n\n` +
              `This will be used for future period end date calculations.`
          );

          if (userConfirmed) {
            // Call API to update duration
            try {
              await progressTrackerApi.updatePeriodDuration(userId, suggestedDuration);
              toast.success(`Default period duration updated to ${suggestedDuration} days!`);
            } catch (error) {
              console.error('Failed to update duration:', error);
              toast.error('Period updated, but failed to update default duration setting.');
            }
          } else {
            // User declined - mark as offered
            try {
              await progressTrackerApi.declinePeriodDurationUpdate(userId);
            } catch (error) {
              console.error('Failed to mark duration update as declined:', error);
            }
          }
        }

        toast.success('Period updated successfully!');
      } else {
        // For new periods, backend will auto-calculate end date
        result = await progressTrackerApi.logPeriod(userId, formData);
        toast.success('Period logged successfully!');
      }

      // Check for backend warnings
      if (result.data?.warnings && result.data.warnings.length > 0) {
        result.data.warnings.forEach((warning: string) => {
          toast.warning(warning, { autoClose: 5000 });
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Failed to ${mode} period:`, error);
      setValidationError(error.message || `Failed to ${mode} period. Please try again.`);
      toast.error(error.details || `Failed to ${mode} period. Please try again.`);
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800">
              {mode === 'edit' ? 'Edit Period' : 'Log Your Period'}
            </h2>
            {mode === 'edit' && initialData?.startDate && (
              <p className="text-sm text-muted mt-1">
                Editing period from{' '}
                {new Date(initialData.startDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
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

          {/* Validation Warning */}
          {validationWarning && (
            <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 flex items-start gap-3">
              <span className="text-warning text-xl">💡</span>
              <p className="text-sm text-warning font-medium">{validationWarning}</p>
            </div>
          )}

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When did this period start? <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={
                mode === 'edit' && initialData?.startDate
                  ? new Date(new Date(initialData.startDate).getTime() - 5 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0]
                  : mode === 'new' && lastPeriodStart
                  ? lastPeriodStart
                  : undefined
              }
              max={
                mode === 'edit' && initialData?.startDate
                  ? new Date(new Date(initialData.startDate).getTime() + 5 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0]
                  : new Date().toISOString().split('T')[0]
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
            />
            {mode === 'edit' && initialData?.startDate ? (
              <p className="text-sm text-muted mt-2">
                � You can adjust the start date by ±5 days (
                {new Date(
                  new Date(initialData.startDate).getTime() - 5 * 24 * 60 * 60 * 1000
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                -{' '}
                {new Date(
                  new Date(initialData.startDate).getTime() + 5 * 24 * 60 * 60 * 1000
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                ) for minor corrections.
              </p>
            ) : mode === 'new' && lastPeriodStart ? (
              <p className="text-sm text-muted mt-2">
                💡 You can only log periods on or after{' '}
                {new Date(lastPeriodStart).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                (your first setup period)
              </p>
            ) : (
              <p className="text-sm text-[#9a8c98] mt-2">
                Your period end date will be calculated based on your typical duration
                {onboardingDuration && ` (${onboardingDuration} days)`}.
              </p>
            )}
          </div>

          {/* End Date (Edit Mode Only) */}
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When did this period end? <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={getMinEndDate()}
                max={getMaxEndDate()}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
              />
              <p className="text-sm text-muted mt-2">
                {nextPeriod?.startDate ? (
                  <>
                    📌 Must be after start date and before your next period (
                    {new Date(nextPeriod.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    )
                  </>
                ) : (
                  <>📌 Must be after start date</>
                )}
              </p>
            </div>
          )}

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
            ) : mode === 'edit' ? (
              'Update Period'
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
