/**
 * Daily Tracking Form Component
 * Multi-step form for logging daily health metrics
 * Step 1: Physical Metrics (Weight, Waist, Activity)
 * Step 2: Energy & Sleep (Hours, Quality, Energy Level)
 * Step 3: Mood & Cravings (Mood, Stress, Sugar Cravings, Appetite)
 * Step 4: Ovulation Tracking (Optional - Cervical Mucus, BBT, Symptoms)
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Activity, Moon, Heart, Droplet } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface DailyTrackingData {
  // Physical Metrics
  weight: number | null;
  waistCircumference: number | null;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;

  // Energy & Sleep
  sleepHours: number | null;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent' | null;
  energyLevel: number | null; // 1-10 scale

  // Mood & Cravings
  mood: 'very_low' | 'low' | 'neutral' | 'good' | 'excellent' | null;
  stressLevel: number | null; // 1-10 scale
  sugarCravings: 'none' | 'mild' | 'moderate' | 'intense' | null;
  appetite: 'very_low' | 'low' | 'normal' | 'high' | 'very_high' | null;

  // Ovulation Tracking (Optional)
  cervicalMucus: 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white' | null;
  basalBodyTemp: number | null; // Celsius
  ovulationPain: boolean | null;
  breastTenderness: boolean | null;
  increasedLibido: boolean | null;
}

interface DailyTrackingFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
}

const DailyTrackingForm = ({ userId, onClose, onSuccess, initialDate }: DailyTrackingFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );

  const [formData, setFormData] = useState<DailyTrackingData>({
    weight: null,
    waistCircumference: null,
    activityLevel: null,
    sleepHours: null,
    sleepQuality: null,
    energyLevel: null,
    mood: null,
    stressLevel: null,
    sugarCravings: null,
    appetite: null,
    // Ovulation tracking (optional)
    cervicalMucus: null,
    basalBodyTemp: null,
    ovulationPain: null,
    breastTenderness: null,
    increasedLibido: null,
  });

  // Validation for each step
  const isStep1Valid = () => {
    return formData.weight !== null && formData.activityLevel !== null;
  };

  const isStep2Valid = () => {
    return (
      formData.sleepHours !== null &&
      formData.sleepQuality !== null &&
      formData.energyLevel !== null
    );
  };

  const isStep3Valid = () => {
    return (
      formData.mood !== null &&
      formData.stressLevel !== null &&
      formData.sugarCravings !== null &&
      formData.appetite !== null
    );
  };

  const canProceed = () => {
    if (currentStep === 1) return isStep1Valid();
    if (currentStep === 2) return isStep2Valid();
    return true;
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!isStep3Valid()) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await progressTrackerApi.saveDailyTracking(userId, selectedDate, formData);

      if (response.success) {
        toast.success('Daily tracking logged successfully! 🎉');
        onSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to save daily tracking');
      }
    } catch (error: any) {
      console.error('Failed to save daily tracking:', error);
      toast.error(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Render progress indicator
  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
              step === currentStep
                ? 'bg-primary text-white scale-110 shadow-lg'
                : step < currentStep
                ? 'bg-success text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check size={20} /> : step}
          </div>
          {step < 4 && (
            <div
              className={`w-12 h-1 mx-2 transition-all duration-300 ${
                step < currentStep ? 'bg-success' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Physical Metrics
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Activity className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Physical Metrics</h3>
        <p className="text-muted">Track your body measurements and activity</p>
      </div>

      {/* Date Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Date <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Weight (kg) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          step="0.1"
          min="30"
          max="300"
          value={formData.weight || ''}
          onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || null })}
          placeholder="Enter your weight"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Waist Circumference */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Waist Circumference (cm) <span className="text-muted text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          step="0.1"
          min="40"
          max="200"
          value={formData.waistCircumference || ''}
          onChange={(e) =>
            setFormData({ ...formData, waistCircumference: parseFloat(e.target.value) || null })
          }
          placeholder="Measure at belly button level"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Activity Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Activity Level <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
            { value: 'light', label: 'Light', desc: '1-3 days/week' },
            { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
            { value: 'active', label: 'Active', desc: '6-7 days/week' },
            { value: 'very_active', label: 'Very Active', desc: 'Intense daily exercise' },
          ].map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData({ ...formData, activityLevel: level.value as any })}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                formData.activityLevel === level.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
              }`}
            >
              <div className="font-semibold text-gray-800">{level.label}</div>
              <div className="text-xs text-muted mt-1">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 2: Energy & Sleep
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Moon className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Energy & Sleep</h3>
        <p className="text-muted">How well did you rest and feel today?</p>
      </div>

      {/* Sleep Hours */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Sleep Duration (hours) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={formData.sleepHours || ''}
          onChange={(e) =>
            setFormData({ ...formData, sleepHours: parseFloat(e.target.value) || null })
          }
          placeholder="How many hours did you sleep?"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Sleep Quality */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Sleep Quality <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: 'poor',
              label: 'Poor',
              emoji: '😴',
              color: 'border-danger/50 hover:border-danger',
            },
            {
              value: 'fair',
              label: 'Fair',
              emoji: '😐',
              color: 'border-warning/50 hover:border-warning',
            },
            {
              value: 'good',
              label: 'Good',
              emoji: '😊',
              color: 'border-success/50 hover:border-success',
            },
            {
              value: 'excellent',
              label: 'Excellent',
              emoji: '😄',
              color: 'border-primary/50 hover:border-primary',
            },
          ].map((quality) => (
            <button
              key={quality.value}
              type="button"
              onClick={() => setFormData({ ...formData, sleepQuality: quality.value as any })}
              className={`p-4 border-2 rounded-xl text-center transition-all duration-300 ${
                formData.sleepQuality === quality.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : `border-gray-200 ${quality.color}`
              }`}
            >
              <div className="text-3xl mb-2">{quality.emoji}</div>
              <div className="font-semibold text-gray-800">{quality.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Energy Level <span className="text-danger">*</span>
          {formData.energyLevel && (
            <span className="ml-2 text-primary font-bold">{formData.energyLevel}/10</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Low</span>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.energyLevel || 5}
            onChange={(e) => setFormData({ ...formData, energyLevel: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted">High</span>
        </div>
        <div className="flex justify-between text-xs text-muted mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span key={num}>{num}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 3: Mood & Cravings
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Heart className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Mood & Cravings</h3>
        <p className="text-muted">Track your emotional and dietary patterns</p>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Overall Mood <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'very_low', label: 'Very Low', emoji: '😢' },
            { value: 'low', label: 'Low', emoji: '😔' },
            { value: 'neutral', label: 'Neutral', emoji: '😐' },
            { value: 'good', label: 'Good', emoji: '😊' },
            { value: 'excellent', label: 'Excellent', emoji: '😄' },
          ].map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setFormData({ ...formData, mood: mood.value as any })}
              className={`p-4 border-2 rounded-xl text-center transition-all duration-300 ${
                formData.mood === mood.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
              }`}
            >
              <div className="text-3xl mb-2">{mood.emoji}</div>
              <div className="font-semibold text-gray-800 text-sm">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Stress Level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Stress Level <span className="text-danger">*</span>
          {formData.stressLevel && (
            <span className="ml-2 text-primary font-bold">{formData.stressLevel}/10</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Low</span>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.stressLevel || 5}
            onChange={(e) => setFormData({ ...formData, stressLevel: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-xs text-muted">High</span>
        </div>
        <div className="flex justify-between text-xs text-muted mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span key={num}>{num}</span>
          ))}
        </div>
      </div>

      {/* Sugar Cravings */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Sugar Cravings <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'none', label: 'None', desc: 'No cravings' },
            { value: 'mild', label: 'Mild', desc: 'Slight cravings' },
            { value: 'moderate', label: 'Moderate', desc: 'Noticeable cravings' },
            { value: 'intense', label: 'Intense', desc: 'Strong cravings' },
          ].map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData({ ...formData, sugarCravings: level.value as any })}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                formData.sugarCravings === level.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
              }`}
            >
              <div className="font-semibold text-gray-800">{level.label}</div>
              <div className="text-xs text-muted mt-1">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Appetite */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Appetite Level <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'very_low', label: 'Very Low', desc: 'No appetite' },
            { value: 'low', label: 'Low', desc: 'Less than usual' },
            { value: 'normal', label: 'Normal', desc: 'Average appetite' },
            { value: 'high', label: 'High', desc: 'More than usual' },
            { value: 'very_high', label: 'Very High', desc: 'Constant hunger' },
          ].map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => setFormData({ ...formData, appetite: level.value as any })}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                formData.appetite === level.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
              }`}
            >
              <div className="font-semibold text-gray-800">{level.label}</div>
              <div className="text-xs text-muted mt-1">{level.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 4: Ovulation Tracking (Optional)
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Droplet className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800 mb-2">Ovulation Tracking</h3>
        <p className="text-muted">Track ovulation symptoms (Optional but helps with predictions)</p>
      </div>

      {/* Cervical Mucus */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Cervical Mucus Consistency <span className="text-muted text-xs">(Optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'dry', label: 'Dry', desc: 'No mucus present', score: 0 },
            { value: 'sticky', label: 'Sticky', desc: 'Thick, not stretchy', score: 20 },
            { value: 'creamy', label: 'Creamy', desc: 'Lotion-like', score: 40 },
            { value: 'watery', label: 'Watery', desc: 'Clear, thin', score: 60 },
            { value: 'egg_white', label: 'Egg White', desc: 'Clear, stretchy (peak)', score: 100 },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, cervicalMucus: type.value as any })}
              className={`p-4 border-2 rounded-xl text-left transition-all duration-300 ${
                formData.cervicalMucus === type.value
                  ? 'border-primary bg-secondary shadow-lg scale-105'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
              }`}
            >
              <div className="font-semibold text-gray-800">{type.label}</div>
              <div className="text-xs text-muted mt-1">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Basal Body Temperature */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Basal Body Temperature (°C) <span className="text-muted text-xs">(Optional)</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="35"
          max="39"
          value={formData.basalBodyTemp || ''}
          onChange={(e) =>
            setFormData({ ...formData, basalBodyTemp: parseFloat(e.target.value) || null })
          }
          placeholder="e.g., 36.5"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        <p className="text-xs text-muted mt-1">
          📌 Take immediately upon waking, before getting out of bed
        </p>
      </div>

      {/* Ovulation Symptoms */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Ovulation Symptoms <span className="text-muted text-xs">(Select all that apply)</span>
        </label>
        <div className="space-y-3">
          {/* Ovulation Pain */}
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                ovulationPain: formData.ovulationPain === true ? null : true,
              })
            }
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-300 ${
              formData.ovulationPain
                ? 'border-primary bg-secondary shadow-lg'
                : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Ovulation Pain (Mittelschmerz)</div>
                <div className="text-xs text-muted mt-1">One-sided lower abdominal pain</div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  formData.ovulationPain ? 'border-primary bg-primary' : 'border-gray-300'
                }`}
              >
                {formData.ovulationPain && <Check size={16} className="text-white" />}
              </div>
            </div>
          </button>

          {/* Breast Tenderness */}
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                breastTenderness: formData.breastTenderness === true ? null : true,
              })
            }
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-300 ${
              formData.breastTenderness
                ? 'border-primary bg-secondary shadow-lg'
                : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Breast Tenderness</div>
                <div className="text-xs text-muted mt-1">Increased sensitivity or soreness</div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  formData.breastTenderness ? 'border-primary bg-primary' : 'border-gray-300'
                }`}
              >
                {formData.breastTenderness && <Check size={16} className="text-white" />}
              </div>
            </div>
          </button>

          {/* Increased Libido */}
          <button
            type="button"
            onClick={() =>
              setFormData({
                ...formData,
                increasedLibido: formData.increasedLibido === true ? null : true,
              })
            }
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-300 ${
              formData.increasedLibido
                ? 'border-primary bg-secondary shadow-lg'
                : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">Increased Libido</div>
                <div className="text-xs text-muted mt-1">Higher sex drive than usual</div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  formData.increasedLibido ? 'border-primary bg-primary' : 'border-gray-300'
                }`}
              >
                {formData.increasedLibido && <Check size={16} className="text-white" />}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-secondary/30 rounded-xl border border-secondary">
        <p className="text-sm text-gray-700">
          <strong>💡 Why track ovulation?</strong> These symptoms help predict your fertile window
          and can identify ovulation irregularities common with PCOS. Cervical mucus is the most
          reliable indicator - "egg white" consistency typically occurs 1-2 days before ovulation.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800">Daily Tracking</h2>
            <p className="text-sm text-muted mt-1">Step {currentStep} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-6">{renderProgressIndicator()}</div>

        {/* Form Content */}
        <div className="px-6 pb-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-surface border-t border-gray-200 px-6 py-4 flex items-center justify-between rounded-b-3xl">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !isStep3Valid()}
              className="px-6 py-3 bg-success text-white rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Complete
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyTrackingForm;
