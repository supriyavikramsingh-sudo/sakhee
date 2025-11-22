/**
 * Period Setup Wizard
 * Multi-step form for first-time period tracking setup with branching logic
 */

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';
import type { MedicalWarnings } from '../../types/periodTracking.type';

interface PeriodSetupWizardProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const PeriodSetupWizard = ({ userId, onComplete, onCancel }: PeriodSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data with new schema
  const [formData, setFormData] = useState({
    currentlyOnPeriod: null as boolean | null,
    lastPeriodStart: '',
    onboardingDuration: null as number | null, // 2, 4, 5, 6, or 7
    averageCycleLength: null as number | null, // Only asked if last period >35 days ago
    flow: '',
    color: '',
    colorConsistency: '',
    clots: '',
    spotting: null as boolean | null,
    odor: '',
  });

  const [medicalWarnings, setMedicalWarnings] = useState<MedicalWarnings>({
    irregularCycleWarning: false,
    longCycleLengthWarning: false,
    longDurationWarning: false,
  });

  const [showCycleLengthQuestion, setShowCycleLengthQuestion] = useState(false);

  // Dynamic step count based on branching
  const getStepCount = () => {
    let count = 6; // Introduction + Currently on period + Date + Duration + Flow + Color/Details
    if (showCycleLengthQuestion) count += 1; // Add cycle length question
    return count;
  };

  const totalSteps = getStepCount();

  // Check if cycle length question should be shown
  useEffect(() => {
    if (formData.currentlyOnPeriod === false && formData.lastPeriodStart) {
      const today = new Date();
      const periodStart = new Date(formData.lastPeriodStart);
      const daysSince = Math.floor(
        (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Show warning if >60 days, clear it if <=60 days
      if (daysSince > 60) {
        setMedicalWarnings((prev) => ({
          ...prev,
          irregularCycleWarning: true,
        }));
      } else {
        setMedicalWarnings((prev) => ({
          ...prev,
          irregularCycleWarning: false,
        }));
      }

      // Show cycle length question if >35 days
      setShowCycleLengthQuestion(daysSince > 35);
    } else {
      setShowCycleLengthQuestion(false);
      // Clear warning when not on the "not currently on period" path
      setMedicalWarnings((prev) => ({
        ...prev,
        irregularCycleWarning: false,
      }));
    }
  }, [formData.currentlyOnPeriod, formData.lastPeriodStart]);

  const steps = [
    {
      title: "Let's Track Your Menstrual Cycle",
      subtitle:
        'Understanding your cycle patterns helps identify PCOS symptoms and track improvements over time. This setup takes 2-3 minutes.',
      component: <IntroductionStep />,
    },
    {
      title: 'Are you currently on your period?',
      subtitle: '',
      component: <CurrentPeriodStep formData={formData} onChange={setFormData} />,
    },
    {
      title: formData.currentlyOnPeriod
        ? 'When did this period start?'
        : 'When did your last period start?',
      subtitle: '',
      component: (
        <PeriodStartDateStep
          formData={formData}
          onChange={setFormData}
          medicalWarnings={medicalWarnings}
        />
      ),
    },
    {
      title: 'How long does your period usually last?',
      subtitle: '',
      component: (
        <DurationDropdownStep
          formData={formData}
          onChange={setFormData}
          onWarning={(warning: boolean) =>
            setMedicalWarnings((prev) => ({ ...prev, longDurationWarning: warning }))
          }
        />
      ),
    },
    // Conditional step - only shown if last period was >35 days ago
    ...(showCycleLengthQuestion
      ? [
          {
            title: 'What is your average cycle length?',
            subtitle: 'Days between period starts',
            component: (
              <CycleLengthStep
                formData={formData}
                onChange={setFormData}
                onWarning={(warning: boolean) =>
                  setMedicalWarnings((prev) => ({ ...prev, longCycleLengthWarning: warning }))
                }
              />
            ),
          },
        ]
      : []),
    {
      title: 'How would you describe your flow?',
      subtitle: '',
      component: <FlowStep formData={formData} onChange={setFormData} />,
    },
    {
      title: 'Additional Period Details',
      subtitle: '',
      component: <AdditionalDetailsStep formData={formData} onChange={setFormData} />,
    },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true; // Introduction
      case 1:
        return formData.currentlyOnPeriod !== null;
      case 2:
        return formData.lastPeriodStart !== '';
      case 3:
        return formData.onboardingDuration !== null;
      case 4:
        // If showCycleLengthQuestion, this is the cycle length step
        if (showCycleLengthQuestion) {
          return formData.averageCycleLength !== null;
        }
        // Otherwise, this is the flow step
        return formData.flow !== '';
      case 5:
        // If showCycleLengthQuestion, this is the flow step
        if (showCycleLengthQuestion) {
          return formData.flow !== '';
        }
        // Otherwise, this is the additional details step
        return (
          formData.color !== '' &&
          formData.colorConsistency !== '' &&
          formData.clots !== '' &&
          formData.spotting !== null &&
          formData.odor !== ''
        );
      case 6:
        // Only reached if showCycleLengthQuestion is true - additional details
        return (
          formData.color !== '' &&
          formData.colorConsistency !== '' &&
          formData.clots !== '' &&
          formData.spotting !== null &&
          formData.odor !== ''
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const setupPayload = {
        isCurrentlyOnPeriod: formData.currentlyOnPeriod,
        lastPeriodStart: formData.lastPeriodStart,
        onboardingDuration: formData.onboardingDuration,
        averageCycleLength: formData.averageCycleLength || undefined, // Only include if set
        flow: formData.flow,
        color: formData.color,
        colorConsistency: formData.colorConsistency,
        clots: formData.clots,
        spotting: formData.spotting,
        odor: formData.odor,
        medicalWarnings,
        symptoms: [], // Can be extended later
      };

      await progressTrackerApi.initializePeriodSetup(userId, setupPayload);
      toast.success('Period tracking setup complete! 🌸', {
        style: { background: '#06d6a0', color: '#fff' },
      });
      onComplete();
    } catch (error: any) {
      console.error('Setup failed:', error);
      toast.error(error.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              Step {currentStep + 1} of {totalSteps}
              {currentStep === totalSteps - 2 && (
                <span className="text-primary"> - Almost done!</span>
              )}
              {currentStep === totalSteps - 1 && (
                <span className="text-primary"> - Final step</span>
              )}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="ml-4 p-2 hover:bg-secondary rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <h2 className="text-3xl font-serif font-bold text-gray-800 mb-2">
            {steps[currentStep].title}
          </h2>
          {steps[currentStep].subtitle && (
            <p className="text-muted mb-6">{steps[currentStep].subtitle}</p>
          )}
          <div className="mt-6">{steps[currentStep].component}</div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="btn-outline flex items-center gap-2"
              disabled={loading}
            >
              <ChevronLeft size={20} />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className={`flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              currentStep === totalSteps - 1
                ? 'bg-[#06d6a0] hover:bg-[#05c293] text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl'
                : 'btn-primary'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Saving...
              </>
            ) : currentStep === totalSteps - 1 ? (
              <>
                <Check size={20} />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================================================
// STEP COMPONENTS
// =====================================================

const IntroductionStep = () => (
  <div className="text-center py-8">
    <div className="text-6xl mb-4">🌸</div>
    <p className="text-lg text-gray-700 leading-relaxed">
      We'll ask you a few questions about your menstrual cycle. This information helps us track
      patterns, identify changes, and provide personalized insights for managing PCOS.
    </p>
  </div>
);

const CurrentPeriodStep = ({ formData, onChange }: any) => (
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => onChange({ ...formData, currentlyOnPeriod: true })}
      className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
        formData.currentlyOnPeriod === true
          ? 'border-primary bg-secondary shadow-lg scale-105'
          : 'border-gray-200 hover:border-primary/50'
      }`}
    >
      <div className="text-4xl mb-2">✓</div>
      <div className="text-lg font-semibold">Yes</div>
    </button>
    <button
      onClick={() => onChange({ ...formData, currentlyOnPeriod: false })}
      className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
        formData.currentlyOnPeriod === false
          ? 'border-primary bg-secondary shadow-lg scale-105'
          : 'border-gray-200 hover:border-primary/50'
      }`}
    >
      <div className="text-4xl mb-2">✗</div>
      <div className="text-lg font-semibold">No</div>
    </button>
  </div>
);

const PeriodStartDateStep = ({ formData, onChange, medicalWarnings }: any) => {
  const isCurrentlyOnPeriod = formData.currentlyOnPeriod;
  const today = new Date().toISOString().split('T')[0];

  // Calculate min date based on whether currently on period
  const getMinDate = () => {
    if (isCurrentlyOnPeriod) {
      // Within last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sevenDaysAgo.toISOString().split('T')[0];
    }
    // No hard limit for past periods
    return '';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isCurrentlyOnPeriod ? 'Period start date' : 'Last period start date'}
        </label>
        <input
          type="date"
          value={formData.lastPeriodStart}
          onChange={(e) => onChange({ ...formData, lastPeriodStart: e.target.value })}
          max={today}
          min={getMinDate()}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
        />
        {isCurrentlyOnPeriod && (
          <p className="text-xs text-muted mt-1">Please select a date within the last 7 days</p>
        )}
      </div>

      {/* Warning for irregular cycles (>60 days) */}
      {medicalWarnings.irregularCycleWarning && (
        <div className="bg-warning/10 border-l-4 border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-warning">
            It's been more than 60 days since your last period. Irregular cycles are common with
            PCOS, but we recommend consulting a healthcare provider to rule out other causes.
          </p>
        </div>
      )}
    </div>
  );
};

const DurationDropdownStep = ({ formData, onChange, onWarning }: any) => {
  const options = [
    { label: 'Less than 3 days', value: 2 },
    { label: '3-5 days', value: 4 },
    { label: '5 days', value: 5 },
    { label: '5-7 days', value: 6 },
    { label: '7+ days', value: 7 },
  ];

  const handleSelect = (value: number) => {
    onChange({ ...formData, onboardingDuration: value });
    onWarning(value === 7); // Show warning for 7+ days
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
              formData.onboardingDuration === option.value
                ? 'border-primary bg-secondary shadow-md'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <span className="text-lg">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Warning for 7+ days */}
      {formData.onboardingDuration === 7 && (
        <div className="bg-warning/10 border-l-4 border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-warning">
            Periods longer than 7 days can indicate hormonal imbalances. We recommend consulting a
            healthcare provider to rule out any underlying conditions.
          </p>
        </div>
      )}
    </div>
  );
};

const CycleLengthStep = ({ formData, onChange, onWarning }: any) => {
  const handleChange = (value: string) => {
    const numValue = parseInt(value) || null;
    onChange({ ...formData, averageCycleLength: numValue });

    if (numValue && numValue > 35) {
      onWarning(true);
    } else {
      onWarning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-muted">
        <span className="bg-secondary px-3 py-1 rounded-full">
          💡 Cycle length = days from first day of one period to first day of next
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter your average cycle length (in days)
        </label>
        <input
          type="number"
          min="21"
          placeholder="e.g., 28, 32, 40"
          value={formData.averageCycleLength || ''}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Warning for long cycles (>35 days) */}
      {formData.averageCycleLength && formData.averageCycleLength > 35 && (
        <div className="bg-warning/10 border-l-4 border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-warning">
            Cycle lengths longer than 35 days are common with PCOS but may indicate anovulatory
            cycles. Consider discussing this with your healthcare provider, especially if you're
            trying to conceive.
          </p>
        </div>
      )}
    </div>
  );
};

const FlowStep = ({ formData, onChange }: any) => {
  const options = [
    {
      label: 'Light',
      helper: '(Need to change pad/tampon every 4-6 hours or less)',
    },
    {
      label: 'Moderate',
      helper: '(Need to change pad/tampon every 3-4 hours)',
    },
    {
      label: 'Heavy',
      helper: '(Need to change pad/tampon every 2-3 hours)',
    },
    {
      label: 'Very heavy',
      helper: '(Soaking pads/cups every 1-2 hours)',
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <button
          key={option.label}
          onClick={() => onChange({ ...formData, flow: option.label })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
            formData.flow === option.label
              ? 'border-primary bg-secondary shadow-md'
              : 'border-gray-200 hover:border-primary/50'
          }`}
        >
          <div className="text-lg">{option.label}</div>
          <div className="text-[#9a8c98] mt-1 text-sm">{option.helper}</div>
        </button>
      ))}
    </div>
  );
};

const AdditionalDetailsStep = ({ formData, onChange }: any) => {
  const colorOptions = ['Bright red', 'Dark red', 'Brown/old blood', 'Blackish', 'Pinkish'];
  const consistencyOptions = [
    'Starts brown → red → brown',
    'Mostly red only',
    'Mostly dark/brown only',
  ];
  const clotOptions = ['No', 'Small clots', 'Large clots'];
  const odorOptions = ['No', 'Mild / normal metallic smell', 'Strong / foul smell', 'Fishy smell'];

  return (
    <div className="space-y-6">
      {/* Color */}
      <div>
        <label className="block font-medium text-gray-700 mb-3">
          What is the color of your period blood usually?
        </label>
        <div className="space-y-2">
          {colorOptions.map((option) => (
            <button
              key={option}
              onClick={() => onChange({ ...formData, color: option })}
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
        <label className="block font-medium text-gray-700 mb-3">
          Does the color stay consistent or change throughout your period?
        </label>
        <div className="space-y-2">
          {consistencyOptions.map((option) => (
            <button
              key={option}
              onClick={() => onChange({ ...formData, colorConsistency: option })}
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
        <label className="block font-medium text-gray-700 mb-3">Do you pass blood clots?</label>
        <div className="grid grid-cols-3 gap-2">
          {clotOptions.map((option) => (
            <button
              key={option}
              onClick={() => onChange({ ...formData, clots: option })}
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
        <label className="block font-medium text-gray-700 mb-3">
          Did you experience spotting between periods?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChange({ ...formData, spotting: true })}
            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
              formData.spotting === true
                ? 'border-primary bg-secondary shadow-md'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => onChange({ ...formData, spotting: false })}
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
        <label className="block font-medium text-gray-700 mb-3">
          Do you notice an unusual odor during your periods?
        </label>
        <div className="space-y-2">
          {odorOptions.map((option) => (
            <button
              key={option}
              onClick={() => onChange({ ...formData, odor: option })}
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
    </div>
  );
};

export default PeriodSetupWizard;
