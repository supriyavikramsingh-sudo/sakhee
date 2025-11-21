/**
 * Period Setup Wizard
 * Multi-step form for first-time period tracking setup
 */

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface PeriodSetupWizardProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const PeriodSetupWizard = ({ userId, onComplete, onCancel }: PeriodSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    currentlyOnPeriod: null as boolean | null,
    lastPeriodStart: '',
    lastPeriodEnd: '',
    expectedEnd: '',
    averageCycleLength: '',
    flow: '',
    color: '',
    colorConsistency: '',
    clots: '',
    spotting: null as boolean | null,
    odor: '',
  });

  const totalSteps = 7;

  // Step content configuration
  const steps = [
    {
      title: "Let's Track Your Menstrual Cycle",
      subtitle:
        'Understanding your cycle patterns helps identify PCOS symptoms and track improvements over time. This setup takes 2-3 minutes.',
      component: <IntroductionStep />,
    },
    {
      title: 'Are you on your period?',
      subtitle: '',
      component: <CurrentPeriodStep formData={formData} onChange={setFormData} />,
    },
    {
      title: formData.currentlyOnPeriod
        ? 'When did this period start?'
        : 'When did your last period start?',
      subtitle: '',
      component: <PeriodDatesStep formData={formData} onChange={setFormData} />,
    },
    {
      title: 'What is your average cycle length?',
      subtitle: '',
      component: <CycleLengthStep formData={formData} onChange={setFormData} />,
    },
    {
      title: 'How would you describe your flow?',
      subtitle: '',
      component: <FlowStep formData={formData} onChange={setFormData} />,
    },
    {
      title: 'Period Blood Color & Consistency',
      subtitle: '',
      component: <ColorStep formData={formData} onChange={setFormData} />,
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
        if (formData.currentlyOnPeriod) {
          return formData.lastPeriodStart && formData.expectedEnd;
        } else {
          return formData.lastPeriodStart && formData.lastPeriodEnd;
        }
      case 3:
        return formData.averageCycleLength !== '';
      case 4:
        return formData.flow !== '';
      case 5:
        return formData.color !== '' && formData.colorConsistency !== '';
      case 6:
        return formData.clots !== '' && formData.spotting !== null && formData.odor !== '';
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
      await progressTrackerApi.initializePeriodSetup(userId, formData);
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
              {currentStep === 5 && <span className="text-primary"> - Almost done!</span>}
              {currentStep === 6 && <span className="text-primary"> - Final step</span>}
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

const PeriodDatesStep = ({ formData, onChange }: any) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {formData.currentlyOnPeriod ? 'Period start date' : 'Last period start date'}
      </label>
      <input
        type="date"
        value={formData.lastPeriodStart}
        onChange={(e) => onChange({ ...formData, lastPeriodStart: e.target.value })}
        max={new Date().toISOString().split('T')[0]}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
      />
    </div>
    {formData.currentlyOnPeriod ? (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Expected end date</label>
        <input
          type="date"
          value={formData.expectedEnd}
          onChange={(e) => onChange({ ...formData, expectedEnd: e.target.value })}
          min={formData.lastPeriodStart}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
        />
      </div>
    ) : (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Last period end date</label>
        <input
          type="date"
          value={formData.lastPeriodEnd}
          onChange={(e) => onChange({ ...formData, lastPeriodEnd: e.target.value })}
          min={formData.lastPeriodStart}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none transition-colors"
        />
      </div>
    )}
  </div>
);

const CycleLengthStep = ({ formData, onChange }: any) => {
  const [showNote, setShowNote] = useState(true);
  const options = ['<24 days', '24-35 days', '35-60 days', '60+ days'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-sm text-muted">
        <span className="bg-secondary px-3 py-1 rounded-full">
          💡 Cycle length = days from first day of one period to first day of next
        </span>
      </div>
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange({ ...formData, averageCycleLength: option })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
              formData.averageCycleLength === option
                ? 'border-primary bg-secondary shadow-md'
                : 'border-gray-200 hover:border-primary/50'
            }`}
          >
            <span className="text-lg">{option}</span>
            {option === '24-35 days' && (
              <span className="ml-2 text-xs text-success font-medium">(Normal range)</span>
            )}
          </button>
        ))}
      </div>

      {showNote && (
        <div
          className="relative bg-[#FFE2E2] text-[#9a8c98] rounded-lg p-3 transition-all duration-300"
          style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 400 }}
        >
          <button
            onClick={() => setShowNote(false)}
            className="absolute top-2 right-2 text-[#9a8c98] hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-start gap-2 pr-6">
            <span className="text-lg">💡</span>
            <p className="leading-relaxed">
              If you haven't had a period in 6+ months, we recommend consulting your doctor before
              starting tracking.
            </p>
          </div>
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
          <div
            className="text-[#9a8c98] mt-1"
            style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 400, lineHeight: 1.4 }}
          >
            {option.helper}
          </div>
        </button>
      ))}
    </div>
  );
};

const ColorStep = ({ formData, onChange }: any) => {
  const colorOptions = ['Bright red', 'Dark red', 'Brown/old blood', 'Blackish', 'Pinkish'];
  const consistencyOptions = [
    'Starts brown → red → brown',
    'Mostly red only',
    'Mostly dark/brown only',
  ];

  return (
    <div className="space-y-6">
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
    </div>
  );
};

const AdditionalDetailsStep = ({ formData, onChange }: any) => {
  const clotOptions = ['No', 'Small clots', 'Large clots'];
  const odorOptions = ['No', 'Mild / normal metallic smell', 'Strong / foul smell', 'Fishy smell'];

  return (
    <div className="space-y-5" style={{ gap: '20px' }}>
      <div>
        <label className="block font-medium text-gray-700 mb-3">Do you pass blood clots?</label>
        <div className="space-y-2" style={{ gap: '8px' }}>
          {clotOptions.map((option) => (
            <button
              key={option}
              onClick={() => onChange({ ...formData, clots: option })}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all duration-300 ${
                formData.clots === option
                  ? 'border-primary bg-secondary shadow-md'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
            >
              {option}
              {option === 'Large clots' && (
                <span className="ml-2 text-xs text-muted">({'>'}₹5 coin size)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-3">
          Did you experience spotting between periods?
        </label>
        <div className="grid grid-cols-2 gap-3" style={{ gap: '8px' }}>
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

      <div>
        <label className="block font-medium text-gray-700 mb-3">
          Do you notice an unusual odor during your periods?
        </label>
        <div className="space-y-2" style={{ gap: '8px' }}>
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
