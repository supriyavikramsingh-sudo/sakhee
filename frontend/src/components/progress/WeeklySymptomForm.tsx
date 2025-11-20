/**
 * Weekly Symptom Form Component
 * Tracks 12 PCOS-specific symptoms with severity ratings (0-10)
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Activity, Brain, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';

interface WeeklySymptomData {
  // Physical Symptoms (0-10 severity)
  acneSeverity: number;
  acneLocations: string[]; // ['face', 'neck', 'chest', 'back']
  hairLoss: number;
  hairLossLocations: string[]; // ['scalp', 'eyebrows', 'body']
  hirsutism: number; // Excess hair growth
  hirsutismLocations: string[]; // ['face', 'chest', 'back', 'arms', 'legs']

  // Energy & Physical Wellbeing (0-10 severity)
  fatigue: number;
  brainFog: number;
  headaches: number;

  // Mental Health (0-10 severity)
  anxiety: number;
  depression: number;
  moodSwings: number;

  // Metabolic & Physical (0-10 severity)
  bloating: number;
  jointPain: number;

  // Notes
  additionalNotes: string;
}

interface WeeklySymptomFormProps {
  userId: string;
  weekId?: string; // Format: "YYYY-WW" (e.g., "2025-47")
  onClose: () => void;
  onSuccess: () => void;
}

const WeeklySymptomForm = ({ userId, weekId, onClose, onSuccess }: WeeklySymptomFormProps) => {
  const [currentStep, setCurrentStep] = useState(1); // 1-4 steps
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<WeeklySymptomData>({
    acneSeverity: 0,
    acneLocations: [],
    hairLoss: 0,
    hairLossLocations: [],
    hirsutism: 0,
    hirsutismLocations: [],
    fatigue: 0,
    brainFog: 0,
    headaches: 0,
    anxiety: 0,
    depression: 0,
    moodSwings: 0,
    bloating: 0,
    jointPain: 0,
    additionalNotes: '',
  });

  useEffect(() => {
    if (weekId) {
      fetchExistingData();
    }
  }, [weekId, userId]);

  const fetchExistingData = async () => {
    if (!weekId) return;

    try {
      const response = await progressTrackerApi.getWeeklySymptoms(userId, weekId);
      if (response.success && response.data) {
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch existing symptom data:', error);
    }
  };

  const getCurrentWeekId = () => {
    if (weekId) return weekId;

    const now = new Date();
    const year = now.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
    );
    return `${year}-${weekNumber.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const currentWeekId = getCurrentWeekId();
      const response = await progressTrackerApi.saveWeeklySymptoms(userId, currentWeekId, formData);

      if (response.success) {
        toast.success('Weekly symptoms saved successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to save symptoms. Please try again.');
      }
    } catch (error: any) {
      console.error('Error saving weekly symptoms:', error);
      toast.error(error.message || 'Failed to save symptoms');
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (field: keyof WeeklySymptomData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleLocation = (
    field: 'acneLocations' | 'hairLossLocations' | 'hirsutismLocations',
    location: string
  ) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(location)) {
        return { ...prev, [field]: current.filter((loc) => loc !== location) };
      } else {
        return { ...prev, [field]: [...current, location] };
      }
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity === 0) return 'text-gray-400';
    if (severity <= 3) return 'text-success';
    if (severity <= 6) return 'text-warning';
    return 'text-primary';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity === 0) return 'None';
    if (severity <= 3) return 'Mild';
    if (severity <= 6) return 'Moderate';
    if (severity <= 8) return 'Severe';
    return 'Very Severe';
  };

  // Render Step 1: Skin & Hair
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Activity className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800">Skin & Hair Symptoms</h3>
        <p className="text-muted mt-2">How have these symptoms been this week?</p>
      </div>

      {/* Acne Severity */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Acne Severity</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.acneSeverity}
            onChange={(e) => handleSliderChange('acneSeverity', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.acneSeverity)}`}>
              {formData.acneSeverity}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.acneSeverity)}</div>
          </div>
        </div>

        {/* Acne Locations */}
        {formData.acneSeverity > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted mb-2">Where are you experiencing acne?</p>
            <div className="grid grid-cols-2 gap-2">
              {['face', 'neck', 'chest', 'back'].map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation('acneLocations', location)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.acneLocations.includes(location)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {location.charAt(0).toUpperCase() + location.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hair Loss */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Hair Loss / Thinning</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.hairLoss}
            onChange={(e) => handleSliderChange('hairLoss', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.hairLoss)}`}>
              {formData.hairLoss}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.hairLoss)}</div>
          </div>
        </div>

        {/* Hair Loss Locations */}
        {formData.hairLoss > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted mb-2">Where are you experiencing hair loss?</p>
            <div className="grid grid-cols-3 gap-2">
              {['scalp', 'eyebrows', 'body'].map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation('hairLossLocations', location)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.hairLossLocations.includes(location)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {location.charAt(0).toUpperCase() + location.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hirsutism (Excess Hair) */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Excess Hair Growth (Hirsutism)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.hirsutism}
            onChange={(e) => handleSliderChange('hirsutism', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.hirsutism)}`}>
              {formData.hirsutism}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.hirsutism)}</div>
          </div>
        </div>

        {/* Hirsutism Locations */}
        {formData.hirsutism > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted mb-2">Where are you experiencing excess hair?</p>
            <div className="grid grid-cols-3 gap-2">
              {['face', 'chest', 'back', 'arms', 'legs'].map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => toggleLocation('hirsutismLocations', location)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.hirsutismLocations.includes(location)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {location.charAt(0).toUpperCase() + location.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render Step 2: Energy & Physical
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-4">
          <Zap className="text-warning" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800">Energy & Physical Wellbeing</h3>
        <p className="text-muted mt-2">Rate your energy and physical symptoms</p>
      </div>

      {/* Fatigue */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Fatigue / Tiredness</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.fatigue}
            onChange={(e) => handleSliderChange('fatigue', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.fatigue)}`}>
              {formData.fatigue}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.fatigue)}</div>
          </div>
        </div>
      </div>

      {/* Brain Fog */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Brain Fog / Difficulty Concentrating
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.brainFog}
            onChange={(e) => handleSliderChange('brainFog', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.brainFog)}`}>
              {formData.brainFog}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.brainFog)}</div>
          </div>
        </div>
      </div>

      {/* Headaches */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Headaches</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.headaches}
            onChange={(e) => handleSliderChange('headaches', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.headaches)}`}>
              {formData.headaches}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.headaches)}</div>
          </div>
        </div>
      </div>

      {/* Bloating */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Bloating / Abdominal Discomfort
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.bloating}
            onChange={(e) => handleSliderChange('bloating', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.bloating)}`}>
              {formData.bloating}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.bloating)}</div>
          </div>
        </div>
      </div>

      {/* Joint Pain */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Joint or Muscle Pain</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.jointPain}
            onChange={(e) => handleSliderChange('jointPain', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.jointPain)}`}>
              {formData.jointPain}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.jointPain)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Step 3: Mental Health
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
          <Brain className="text-success" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800">Mental Health & Mood</h3>
        <p className="text-muted mt-2">How have you been feeling emotionally?</p>
      </div>

      {/* Anxiety */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Anxiety / Nervousness</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.anxiety}
            onChange={(e) => handleSliderChange('anxiety', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-success"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.anxiety)}`}>
              {formData.anxiety}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.anxiety)}</div>
          </div>
        </div>
      </div>

      {/* Depression */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Depression / Low Mood</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.depression}
            onChange={(e) => handleSliderChange('depression', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-success"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.depression)}`}>
              {formData.depression}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.depression)}</div>
          </div>
        </div>
      </div>

      {/* Mood Swings */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">
          Mood Swings / Irritability
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="10"
            value={formData.moodSwings}
            onChange={(e) => handleSliderChange('moodSwings', parseInt(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-success"
          />
          <div className="text-right min-w-[80px]">
            <div className={`text-2xl font-bold ${getSeverityColor(formData.moodSwings)}`}>
              {formData.moodSwings}
            </div>
            <div className="text-xs text-muted">{getSeverityLabel(formData.moodSwings)}</div>
          </div>
        </div>
      </div>

      {/* Mental Health Support Notice */}
      {(formData.anxiety >= 7 || formData.depression >= 7) && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-gray-700">
            <strong>You're not alone.</strong> If you're experiencing severe anxiety or depression,
            please reach out to a healthcare provider or mental health professional. Your wellbeing
            matters.
          </div>
        </div>
      )}
    </div>
  );

  // Render Step 4: Review & Notes
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <CheckCircle className="text-primary" size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-gray-800">Review & Additional Notes</h3>
        <p className="text-muted mt-2">Review your symptoms and add any notes</p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Skin & Hair</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Acne:</span>
              <span className={`font-bold ${getSeverityColor(formData.acneSeverity)}`}>
                {formData.acneSeverity}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hair Loss:</span>
              <span className={`font-bold ${getSeverityColor(formData.hairLoss)}`}>
                {formData.hairLoss}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Hirsutism:</span>
              <span className={`font-bold ${getSeverityColor(formData.hirsutism)}`}>
                {formData.hirsutism}/10
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Energy & Physical</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Fatigue:</span>
              <span className={`font-bold ${getSeverityColor(formData.fatigue)}`}>
                {formData.fatigue}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Brain Fog:</span>
              <span className={`font-bold ${getSeverityColor(formData.brainFog)}`}>
                {formData.brainFog}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Headaches:</span>
              <span className={`font-bold ${getSeverityColor(formData.headaches)}`}>
                {formData.headaches}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Bloating:</span>
              <span className={`font-bold ${getSeverityColor(formData.bloating)}`}>
                {formData.bloating}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Joint Pain:</span>
              <span className={`font-bold ${getSeverityColor(formData.jointPain)}`}>
                {formData.jointPain}/10
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Mental Health</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Anxiety:</span>
              <span className={`font-bold ${getSeverityColor(formData.anxiety)}`}>
                {formData.anxiety}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Depression:</span>
              <span className={`font-bold ${getSeverityColor(formData.depression)}`}>
                {formData.depression}/10
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Mood Swings:</span>
              <span className={`font-bold ${getSeverityColor(formData.moodSwings)}`}>
                {formData.moodSwings}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          Additional Notes (Optional)
        </label>
        <textarea
          value={formData.additionalNotes}
          onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
          placeholder="Any additional observations, patterns, or notes about this week..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={4}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-primary flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-gray-700">
            <strong>Tracking helps!</strong> Regular symptom tracking helps identify patterns and
            triggers. Share this data with your healthcare provider for better PCOS management.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-800">Weekly Symptom Check-in</h2>
            <p className="text-sm text-muted mt-1">
              Week of {getCurrentWeekId()} • Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    step < currentStep
                      ? 'bg-success text-white'
                      : step === currentStep
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step < currentStep ? <CheckCircle size={20} /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      step < currentStep ? 'bg-success' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <div className="text-xs text-muted">
            {currentStep === 4 ? 'Ready to submit' : `${3 - currentStep + 1} steps remaining`}
          </div>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="btn-primary px-6 py-2"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Complete Check-in
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklySymptomForm;
