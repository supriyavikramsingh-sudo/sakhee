/**
 * Daily Tracking Form Component
 * Multi-step form for logging daily health metrics
 * Step 1: Physical Metrics (Weight, Waist, Activity)
 * Step 2: Energy & Sleep (Hours, Quality, Energy Level)
 * Step 3: Mood & Cravings (Mood, Stress, Sugar Cravings, Appetite)
 * Step 4: Ovulation Tracking (Optional - Cervical Mucus, BBT, Symptoms)
 */

import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Activity,
  Moon,
  Heart,
  Droplet,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import progressTrackerApi from '../../services/progressTrackerApi';
import EditWarningBanner from './EditWarningBanner';
import CalorieRecalculationPrompt from './CalorieRecalculationPrompt';
import type { EditWarning } from './EditWarningBanner';
import { useAuthStore } from '../../store/authStore';
import { useInvalidateCalendarCache } from '../../hooks/useDailyTrackingCalendarOptimized';
import {
  calculateSmartDefaults,
  getConfidenceMessage,
  getConfidenceColor,
  type SmartDefaults,
} from '../../utils/smartDefaults';

interface DailyTrackingData {
  // Physical Metrics
  weight: number | null;
  waistCircumference: number | null;

  // NEW: Exercise tracking (Phase 2)
  exercisedToday: boolean | null;

  // DEPRECATED: Keep for backward compatibility during transition
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;

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

type FormMode = 'create' | 'edit' | 'view';

interface DailyTrackingFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  mode?: FormMode; // Default 'create'
  initialData?: DailyTrackingData; // For edit/view modes
  entryId?: string; // For edit mode
}

const DailyTrackingForm = ({
  userId,
  onClose,
  onSuccess,
  initialDate,
  mode = 'create',
  initialData,
  entryId,
}: DailyTrackingFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const isReadOnly = mode === 'view';
  const isEditMode = mode === 'edit';

  // User goals state (Phase 5)
  const [userGoals, setUserGoals] = useState<string[]>([]);
  const [weightRequired, setWeightRequired] = useState(true); // Default to required
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  // Get auth store for user profile (Phase 5)
  const { user } = useAuthStore();

  // Get cache invalidation function (Phase 5 - Performance Optimization)
  const invalidateCalendarCache = useInvalidateCalendarCache();

  // Warning banner state for edit mode
  const [showWarning, setShowWarning] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<EditWarning>({
    weightChanged: false,
    exerciseChanged: false,
  });

  // Calorie recalculation prompt state (Phase 5 - Task 9)
  const [showCaloriePrompt, setShowCaloriePrompt] = useState(false);
  const [caloriePromptData, setCaloriePromptData] = useState<{
    oldWeight: number;
    newWeight: number;
    newWeeklyAverage: number;
    currentTDEE: number;
    newTDEE: number;
  } | null>(null);
  const [skipRecalculation, setSkipRecalculation] = useState(false);

  // Smart defaults state (Task 4)
  const [smartDefaults, setSmartDefaults] = useState<SmartDefaults | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [weightSource, setWeightSource] = useState<'recent' | 'onboarding' | 'none'>('none'); // Track where weight came from

  // Fetch user goals on mount (Phase 5)
  useEffect(() => {
    const fetchUserGoals = async () => {
      if (!user?.uid) {
        setGoalsLoaded(true);
        return;
      }

      try {
        // Get goals from user auth store if available
        // User object from Firebase Auth includes profile data
        const userProfile = user as any;
        const goals = userProfile?.profileData?.goals || [];

        setUserGoals(goals);

        // Weight is only required if user has weight management goal
        const hasWeightGoal = goals.includes('weight-management');
        setWeightRequired(hasWeightGoal);
        setGoalsLoaded(true);
      } catch (error) {
        console.error('Failed to load user goals:', error);
        // Default to required if fetch fails (safer)
        setWeightRequired(true);
        setGoalsLoaded(true);
      }
    };

    fetchUserGoals();
  }, [user]);

  // Fetch and apply smart defaults for backfill scenarios (Task 4)
  useEffect(() => {
    const fetchSmartDefaults = async () => {
      // Only apply smart defaults for new entries (create mode), not edits
      if (mode !== 'create' || defaultsApplied) return;

      // Check if this is a backfill scenario (date is not today)
      const today = new Date().toISOString().split('T')[0];
      const isBackfill = selectedDate !== today;

      if (!isBackfill) return;

      setIsLoadingDefaults(true);

      try {
        // Calculate date range: 14 days before the selected date
        const targetDate = new Date(selectedDate);
        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() - 1); // Day before target
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 13); // 14 days total

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch recent entries
        const response = await progressTrackerApi.getDailyTrackingRange(
          userId,
          startDateStr,
          endDateStr
        );

        if (response.success && response.data && response.data.length > 0) {
          // Calculate smart defaults from recent entries
          const defaults = calculateSmartDefaults(response.data);
          setSmartDefaults(defaults);

          // If no weight in recent data, try to get onboarding weight from user profile
          let finalWeight = defaults.weight;
          let source: 'recent' | 'onboarding' | 'none' = defaults.weight ? 'recent' : 'none';

          if (!defaults.weight && user) {
            const userProfile = user as any;
            const onboardingWeight =
              userProfile?.profileData?.current_weight_kg || userProfile?.currentWeight || null;

            if (onboardingWeight) {
              finalWeight = onboardingWeight;
              source = 'onboarding';
            }
          }

          // Apply defaults to form if confidence is not 'none' OR if we have onboarding weight
          if (defaults.confidence !== 'none' || source === 'onboarding') {
            setFormData((prev) => ({
              ...prev,
              weight: finalWeight ?? prev.weight,
              sleepHours: defaults.sleepHours ?? prev.sleepHours,
              energyLevel: defaults.energyLevel ?? prev.energyLevel,
              stressLevel: defaults.stressLevel ?? prev.stressLevel,
              exercisedToday: defaults.exercisedToday ?? prev.exercisedToday,
            }));

            setWeightSource(source);
            setDefaultsApplied(true);

            // Show toast notification
            if (defaults.confidence !== 'none') {
              const message = getConfidenceMessage(defaults.confidence, defaults.sampleSize);
              toast.info(`✨ ${message}`, { autoClose: 5000 });
            } else if (source === 'onboarding') {
              toast.info(`📊 Weight pre-filled from your onboarding data`, { autoClose: 5000 });
            }
          }
        } else {
          // No recent data
          setSmartDefaults({
            confidence: 'none',
            sampleSize: 0,
          });

          // Even with no recent data, try to prefill weight from onboarding
          if (user) {
            const userProfile = user as any;
            const onboardingWeight =
              userProfile?.profileData?.current_weight_kg || userProfile?.currentWeight || null;

            if (onboardingWeight) {
              setFormData((prev) => ({
                ...prev,
                weight: onboardingWeight,
              }));
              setWeightSource('onboarding');
              setDefaultsApplied(true);
              toast.info(`📊 Weight pre-filled from your onboarding data`, { autoClose: 5000 });
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch smart defaults:', error);
        // Fail silently - user can still fill manually
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    fetchSmartDefaults();
  }, [userId, selectedDate, mode, defaultsApplied]);

  const [formData, setFormData] = useState<DailyTrackingData>(
    initialData || {
      weight: null,
      waistCircumference: null,
      exercisedToday: null, // NEW: Exercise tracking
      activityLevel: null, // DEPRECATED: Keep for backward compatibility
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
    }
  );

  // Validation for each step
  const isStep1Valid = () => {
    // Weight is conditionally required based on user goals (Phase 5)
    const weightValid = weightRequired ? formData.weight !== null : true;
    // Exercise question is always required
    const exerciseValid = formData.exercisedToday !== null;

    return weightValid && exerciseValid;
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

    // In edit mode, check for weight changes that would trigger calorie recalculation
    if (
      isEditMode &&
      initialData &&
      formData.weight !== initialData.weight &&
      formData.weight !== null
    ) {
      // Get user data for TDEE calculation
      const userProfile = user as any;
      const currentTDEE = userProfile?.tdee || userProfile?.profileData?.tdee || 2000;

      // Simple TDEE calculation estimate
      const weightDiff = (formData.weight || 0) - (initialData.weight || 0);
      const tdeeChange = Math.round(weightDiff * 22); // ~22 cal/kg for women
      const newTDEE = currentTDEE + tdeeChange;

      // Only show prompt if change is significant (±0.5kg or ±10 calories)
      if (Math.abs(weightDiff) >= 0.5 || Math.abs(tdeeChange) >= 10) {
        // Show calorie recalculation prompt
        setCaloriePromptData({
          oldWeight: initialData.weight || 0,
          newWeight: formData.weight,
          newWeeklyAverage: formData.weight, // Will be recalculated on backend
          currentTDEE: currentTDEE,
          newTDEE: newTDEE,
        });
        setShowCaloriePrompt(true);
        return; // Stop submission until user decides
      }
    }

    // Check for other destructive changes (exercise)
    if (isEditMode && initialData) {
      const weightChanged = formData.weight !== initialData.weight;
      const exerciseChanged = formData.exercisedToday !== initialData.exercisedToday;

      if ((weightChanged || exerciseChanged) && !showCaloriePrompt) {
        // Show warning banner for exercise changes
        setPendingWarnings({ weightChanged, exerciseChanged });
        setShowWarning(true);
        return; // Don't proceed until user confirms
      }
    }

    // Proceed with save/update
    await performSave();
  };

  const performSave = async () => {
    setLoading(true);
    try {
      let response;

      if (isEditMode && entryId) {
        // Edit existing entry
        // Pass skipRecalculation flag in the trackingData object
        response = await progressTrackerApi.updateDailyTracking(userId, entryId, {
          ...formData,
          skipRecalculation,
        });
        toast.success('Daily tracking updated successfully! 🎉');
      } else {
        // Create new entry
        response = await progressTrackerApi.saveDailyTracking(userId, selectedDate, formData);
        toast.success('Daily tracking logged successfully! 🎉');
      }

      if (response.success) {
        // Invalidate calendar cache to trigger automatic refetch (Phase 5)
        await invalidateCalendarCache(userId);

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
      setShowWarning(false);
      setShowCaloriePrompt(false);
    }
  };

  const handleWarningConfirm = () => {
    // User confirmed, proceed with save
    performSave();
  };

  const handleWarningCancel = () => {
    // User cancelled, close warning
    setShowWarning(false);
    setPendingWarnings({ weightChanged: false, exerciseChanged: false });
  };

  // Calorie recalculation prompt handlers
  const handleRecalculateCalories = () => {
    // User chose to recalculate - proceed with save (backend will recalculate)
    setSkipRecalculation(false);
    setShowCaloriePrompt(false);
    performSave();
  };

  const handleSkipCalorieRecalculation = () => {
    // User chose to skip recalculation - save with flag
    setSkipRecalculation(true);
    setShowCaloriePrompt(false);
    performSave();
  };

  const handleCancelCaloriePrompt = () => {
    // User cancelled - close prompt and don't save
    setShowCaloriePrompt(false);
    setCaloriePromptData(null);
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
          onChange={(e) => {
            const selected = new Date(e.target.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            // Only allow dates within last 7 days (for backfill) or today
            if (selected >= sevenDaysAgo && selected <= today) {
              setSelectedDate(e.target.value);
            } else if (selected < sevenDaysAgo) {
              toast.error('You can only log entries for the last 7 days');
            } else {
              toast.error('You cannot log entries for future dates');
            }
          }}
          min={(() => {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return sevenDaysAgo.toISOString().split('T')[0];
          })()}
          max={new Date().toISOString().split('T')[0]}
          disabled={isEditMode || isReadOnly}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {(isEditMode || isReadOnly) && (
          <p className="text-xs text-muted mt-1">Date cannot be changed when editing</p>
        )}
        {!isEditMode && !isReadOnly && (
          <p className="text-xs text-muted mt-1">
            📅 You can log entries for today or up to 7 days back
          </p>
        )}
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Weight (kg){' '}
          {weightRequired ? (
            <span className="text-danger">*</span>
          ) : (
            <span className="text-muted text-xs">(Optional)</span>
          )}
        </label>
        <input
          type="number"
          step="0.1"
          min="35"
          max="300"
          value={formData.weight || ''}
          onChange={(e) => {
            const newWeight = parseFloat(e.target.value) || null;
            setFormData({ ...formData, weight: newWeight });
            // Clear weight source when manually edited
            if (newWeight !== null) {
              setWeightSource('none');
            }
          }}
          placeholder="Enter your weight (min 35 kg)"
          disabled={isReadOnly}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {!weightRequired && (
          <p className="text-xs text-muted mt-1">
            💡 Weight tracking is optional since you don't have weight management as a goal
          </p>
        )}
        {weightSource === 'onboarding' && formData.weight && (
          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <span>📊</span>
            <span>This is your weight from onboarding. Update if it has changed.</span>
          </p>
        )}
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
          disabled={isReadOnly}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Exercise Question (NEW - Phase 2) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Did you exercise today? <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => !isReadOnly && setFormData({ ...formData, exercisedToday: true })}
            disabled={isReadOnly}
            className={`p-6 border-2 rounded-xl text-center transition-all duration-300 ${
              formData.exercisedToday === true
                ? 'border-primary bg-primary text-white shadow-lg scale-105'
                : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="text-4xl mb-2">💪</div>
            <div className="font-bold text-lg">Yes</div>
            <div
              className={`text-xs mt-1 ${
                formData.exercisedToday === true ? 'text-white/80' : 'text-muted'
              }`}
            >
              I exercised today
            </div>
          </button>

          <button
            type="button"
            onClick={() => !isReadOnly && setFormData({ ...formData, exercisedToday: false })}
            disabled={isReadOnly}
            className={`p-6 border-2 rounded-xl text-center transition-all duration-300 ${
              formData.exercisedToday === false
                ? 'border-primary bg-primary text-white shadow-lg scale-105'
                : 'border-gray-200 hover:border-primary/50 hover:bg-secondary/30'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="text-4xl mb-2">🛋️</div>
            <div className="font-bold text-lg">No</div>
            <div
              className={`text-xs mt-1 ${
                formData.exercisedToday === false ? 'text-white/80' : 'text-muted'
              }`}
            >
              Rest day
            </div>
          </button>
        </div>
        <p className="text-xs text-muted mt-3 px-1">
          💡 Exercise includes: gym, yoga, running, cycling, sports, brisk walking (30+ min), or any
          moderate physical activity
        </p>
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
            <h2 className="text-2xl font-serif font-bold text-gray-800">
              {mode === 'view' ? 'View Entry' : mode === 'edit' ? 'Edit Entry' : 'Daily Tracking'}
            </h2>
            <p className="text-sm text-muted mt-1">
              {mode === 'view' ? 'Read-only view' : `Step ${currentStep} of 4`}
            </p>
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

        {/* Smart Defaults Indicator (Task 4) */}
        {smartDefaults &&
          smartDefaults.confidence !== 'none' &&
          defaultsApplied &&
          mode === 'create' && (
            <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl flex items-start gap-3">
              <Sparkles className="text-purple-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${getConfidenceColor(
                    smartDefaults.confidence
                  )}`}
                >
                  Smart Defaults Applied
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {getConfidenceMessage(smartDefaults.confidence, smartDefaults.sampleSize)}. Feel
                  free to adjust any values before saving.
                </p>
              </div>
            </div>
          )}

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
            disabled={isReadOnly}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            {currentStep === 1 ? (isReadOnly ? 'Close' : 'Cancel') : 'Back'}
          </button>

          {isReadOnly ? (
            <button
              onClick={onClose}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              Close
            </button>
          ) : currentStep < 4 ? (
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
                  {isEditMode ? 'Update' : 'Complete'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Edit Warning Banner (Phase 4) */}
      {showWarning && (
        <EditWarningBanner
          warnings={pendingWarnings}
          onConfirm={handleWarningConfirm}
          onCancel={handleWarningCancel}
          loading={loading}
        />
      )}

      {/* Calorie Recalculation Prompt */}
      {showCaloriePrompt && caloriePromptData && (
        <CalorieRecalculationPrompt
          isOpen={showCaloriePrompt}
          onClose={handleCancelCaloriePrompt}
          oldWeight={caloriePromptData.oldWeight}
          newWeight={caloriePromptData.newWeight}
          newWeeklyAverage={caloriePromptData.newWeeklyAverage}
          currentTDEE={caloriePromptData.currentTDEE}
          newTDEE={caloriePromptData.newTDEE}
          onRecalculate={handleRecalculateCalories}
          onSkip={handleSkipCalorieRecalculation}
        />
      )}
    </div>
  );
};

export default DailyTrackingForm;
