import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { regionalCuisineConfig } from '../../config/regionalCuisineConfig';
import type { OnboardingData, OnboardingQuestionnaire } from '../../types/onboarding.type';
import { calculateBMI, validateBMI } from '../../utils/calorieCalculations';
import QuestionField from './QuestionField';

interface OnboardingFormProps {
  step: number;
  onComplete: (data: Record<string, any>) => void;
  onBack: () => void;
  loading: boolean;
  userData: OnboardingData;
  setUserData: React.Dispatch<React.SetStateAction<OnboardingData>>;
}

const OnboardingForm = ({
  step,
  onComplete,
  onBack,
  loading,
  userData,
  setUserData,
}: OnboardingFormProps) => {
  const { t } = useTranslation();
  const [availableStates, setAvailableStates] = useState<
    {
      id: string;
      label: string;
      cuisine: string;
    }[]
  >([]);
  const [targetWeightError, setTargetWeightError] = useState<string>('');

  // Update available states when regions change
  useEffect(() => {
    if (step === 4 && userData && userData.regions && userData.regions.length > 0) {
      const states = regionalCuisineConfig.getStatesForRegions(userData.regions);
      setAvailableStates(states);

      // Remove any selected states that are no longer available
      if (userData.cuisineStates && userData.cuisineStates.length > 0) {
        const availableStateIds = states.map((s) => s.id);
        const filteredStates = userData.cuisineStates.filter((id) =>
          availableStateIds.includes(id)
        );
        if (filteredStates.length !== userData.cuisineStates.length) {
          setUserData((prev) => ({
            ...prev,
            cuisineStates: filteredStates,
          }));
        }
      }
    } else {
      setAvailableStates([]);
    }
  }, [userData?.regions, step]);
  console.log(userData);
  const questions: OnboardingQuestionnaire = {
    0: [
      {
        id: 'email',
        type: 'email',
        value: userData?.email || '',
        label: t('onboarding.email'),
        required: true,
        placeholder: 'your.email@example.com',
      },
      {
        id: 'age',
        type: 'select',
        value: userData?.age || undefined,
        placeholder: 'Please select your option',
        label: t('onboarding.age'),
        required: true,
        options: [
          { value: '18-24', label: '18-24 years' },
          { value: '25-29', label: '25-29 years' },
          { value: '30-34', label: '30-34 years' },
          { value: '35-39', label: '35-39 years' },
          { value: '40-45', label: '40-45 years' },
        ],
      },
      {
        id: 'location',
        type: 'text',
        value: userData?.location || '',
        label: t('onboarding.location'),
        required: true,
        placeholder: 'e.g., Mumbai, Maharashtra',
      },
    ],
    1: [
      {
        id: 'diagnosisTime',
        type: 'select',
        value: userData?.diagnosisTime || '',
        label: t('onboarding.diagnosisTime'),
        placeholder: 'Please select your option',
        required: true,
        options: [
          { value: 'not-diagnosed', label: 'Not yet diagnosed' },
          { value: 'recent', label: 'Recently (< 1 year)' },
          { value: '1-3-years', label: '1-3 years ago' },
          { value: '3-5-years', label: '3-5 years ago' },
          { value: '5-plus', label: '5+ years ago' },
        ],
      },
      {
        id: 'symptoms',
        type: 'multiselect',
        value: userData?.symptoms || [],
        label: t('onboarding.symptoms'),
        placeholder: 'Please select your options',
        required: true,
        options: [
          { value: 'irregular-periods', label: 'Irregular periods' },
          { value: 'weight-gain', label: 'Weight gain' },
          { value: 'acne', label: 'Acne/skin issues' },
          { value: 'hair-loss', label: 'Hair loss' },
          { value: 'hirsutism', label: 'Excessive hair growth' },
          { value: 'fatigue', label: 'Fatigue' },
          { value: 'mood-swings', label: 'Mood swings' },
        ],
      },
    ],
    2: [
      {
        id: 'height_cm',
        type: 'number',
        value: userData?.height_cm || '',
        label: 'Height (cm)',
        required: true,
        placeholder: 'Enter height in cm (e.g., 165.5)',
        maxDecimals: 1,
        min: 100,
        max: 250,
        helperText: 'Enter your height in centimeters',
      },
      {
        id: 'current_weight_kg',
        value: userData?.current_weight_kg || '',
        type: 'number',
        label: 'Current Weight (kg)',
        required: true,
        placeholder: 'Enter weight in kg (e.g., 56.5)',
        maxDecimals: 1,
        min: 30,
        max: 200,
        helperText: 'Enter your current weight in kilograms',
      },
      {
        id: 'dietType',
        type: 'select',
        value: userData?.dietType || '',
        placeholder: 'Please select your option',
        label: t('onboarding.dietType'),
        required: true,
        options: [
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'non-vegetarian', label: 'Non-vegetarian' },
          { value: 'vegan', label: 'Vegan' },
          { value: 'jain', label: 'Jain' },
        ],
      },
      {
        id: 'allergies',
        value: userData?.allergies || [],
        placeholder: 'Please select your options',
        type: 'multiselect',
        label: t('onboarding.allergies'),
        required: false,
        options: [
          { value: 'dairy', label: 'Dairy' },
          { value: 'gluten', label: 'Gluten' },
          { value: 'nuts', label: 'Nuts' },
          { value: 'eggs', label: 'Eggs' },
        ],
      },
      {
        id: 'activityLevel',
        value: userData?.activityLevel || '',
        type: 'select',
        label: t('onboarding.activityLevel'),
        placeholder: 'Please select your option',
        required: true,
        options: [
          { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
          { value: 'light', label: 'Lightly active (1-3 days/week)' },
          { value: 'moderate', label: 'Moderately active (4-5 days/week)' },
          { value: 'very', label: 'Very active (6-7 days/week)' },
        ],
        helperText: 'Select based on your typical weekly exercise routine',
      },
    ],
    3: [
      {
        id: 'goals',
        type: 'multiselect',
        value: userData?.goals || [],
        placeholder: 'Please select your options',
        label: t('onboarding.primaryGoals'),
        required: true,
        maxSelections: 2,
        options: [
          { value: 'regularize-periods', label: 'Regularize periods' },
          { value: 'weight-management', label: 'Weight management' },
          { value: 'skin-hair', label: 'Improve skin/hair' },
          { value: 'balance-hormones', label: 'Balance hormones' },
          { value: 'fertility', label: 'Boost fertility' },
          { value: 'mood-energy', label: 'Improve mood & energy' },
        ],
      },
      {
        id: 'income',
        type: 'select',
        placeholder: 'Please select your option',
        value: userData?.income || '',
        label: t('onboarding.income'),
        required: true,
        options: [
          { value: '0-25k', label: '₹0 - ₹25,000' },
          { value: '25-50k', label: '₹25,000 - ₹50,000' },
          { value: '50-100k', label: '₹50,000 - ₹1L' },
          { value: '100-300k', label: '₹1L - ₹3L' },
          { value: '300k+', label: '> ₹3L' },
        ],
      },
    ],
    4: [
      // Preferences with Region -> State hierarchy
      {
        id: 'language',
        type: 'select',
        placeholder: 'Please select your option',
        value: userData?.language || '',
        label: t('onboarding.language'),
        required: true,
        options: [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'हिंदी' }
        ],
      },
      {
        id: 'regions',
        type: 'multiselect',
        placeholder: 'Please select your options',
        value: userData?.regions || [],
        label: 'Preferred Regions',
        required: true,
        options: regionalCuisineConfig.regions.map((region) => ({
          value: region.id,
          label: region.label,
        })),
        helperText: 'Select one or more regions for cuisine preferences',
      },
      {
        id: 'cuisineStates',
        value: userData?.cuisineStates || [],
        type: 'multiselect',
        placeholder: 'Please select your options',
        label: 'Preferred Cuisines/States',
        required: true,
        options: availableStates.map((state) => ({
          value: state.id,
          label: state.label,
        })),
        helperText: 'Select cuisines based on your preferred regions',
        disabled: !userData?.regions || userData.regions.length === 0,
      },
    ],
  };

  // Build current questions with conditional logic
  const currentQuestions = questions[step] || [];

  // Add conditional weight goal fields for Step 3
  const questionsWithConditional = [...currentQuestions];

  if (step === 3) {
    // Show weight goal field if "weight-management" is selected
    const hasWeightGoal = userData?.goals?.includes('weight-management');

    if (hasWeightGoal) {
      questionsWithConditional.push({
        id: 'weight_goal',
        type: 'radio',
        label: 'Weight Goal',
        required: true,
        value: userData?.weight_goal || '',
        options: [
          { value: 'maintain', label: 'Maintain Weight' },
          { value: 'lose', label: 'Lose Weight' },
          { value: 'gain', label: 'Gain Weight' },
        ],
        helperText: 'Select your weight management goal',
      });

      // Show target weight field if lose or gain is selected
      const needsTargetWeight =
        userData?.weight_goal === 'lose' || userData?.weight_goal === 'gain';

      if (needsTargetWeight) {
        questionsWithConditional.push({
          id: 'target_weight_kg',
          type: 'number',
          label: 'Target Weight (kg)',
          value: userData?.target_weight_kg || '',
          required: true,
          placeholder: 'Enter target weight in kg',
          maxDecimals: 1,
          min: userData?.weight_goal === 'gain' ? userData?.current_weight_kg : 30,
          max: userData?.weight_goal === 'lose' ? userData?.current_weight_kg : 200,
          helperText: 'Enter your target weight (must result in healthy BMI)',
          error: targetWeightError,
        });
      }
    }
  }

  const handleFieldChange = (key: string, value: any) => {
    setUserData((prev: OnboardingData) => {
      const newData: OnboardingData = {
        ...prev,
        [key]: value,
      };

      // Reset cuisineStates when regions change
      if (key === 'regions') {
        newData.cuisineStates = [];
      }

      // Reset weight_goal when goals change and weight-management is deselected
      if (key === 'goals' && !value?.includes('weight-management')) {
        delete newData.weight_goal;
        delete newData.target_weight_kg;
        setTargetWeightError('');
      }

      // Reset target_weight_kg when weight_goal changes to maintain
      if (key === 'weight_goal' && value === 'maintain') {
        delete newData.target_weight_kg;
        setTargetWeightError('');
      }

      // Validate target weight BMI
      if (key === 'target_weight_kg' && newData.height_cm) {
        const bmi = calculateBMI(value, newData.height_cm);
        const validation = validateBMI(bmi);

        if (!validation.isHealthy) {
          setTargetWeightError(validation.message);
        } else {
          setTargetWeightError('');
        }
      }

      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // For step 4, convert cuisineStates to cuisines array before submitting
    if (step === 4) {
      const cuisines = regionalCuisineConfig.getCuisinesFromStates(userData?.cuisineStates || []);
      const finalData = {
        ...userData,
        cuisines, // Array of cuisine names like ['Gujarati', 'Uttar Pradesh']
        // Keep cuisineStates for reference
      };
      onComplete(finalData);
    } else {
      onComplete(userData);
    }
  };

  // Validation
  const isValid =
    questionsWithConditional
      .filter((q) => q.required)
      .every((q) => {
        const value = userData?.[q.id];
        if (q.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        }

        if (q.type === 'multiselect' && q.required) {
          return Array.isArray(value) && value.length > 0;
        }

        if (q.type === 'number' && q.required) {
          return value !== undefined && value !== null && !isNaN(value);
        }

        return value !== undefined && value !== null && value !== '';
      }) && !targetWeightError; // Block submission if target weight has BMI error

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-y-4">
        {questionsWithConditional.map((question) => (
          <QuestionField
            key={question.id}
            {...question}
            onChange={(value) => handleFieldChange(question.id, value)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-8 border-t">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0 || loading}
          className="flex items-center gap-2 px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white disabled:opacity-50 transition"
        >
          <ChevronLeft size={20} />
          {t('common.back')}
        </button>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="flex items-center gap-2 ml-auto px-6 py-2 btn-primary disabled:opacity-50"
        >
          {loading ? 'Loading...' : step === 4 ? t('common.complete') : t('common.next')}
          {!loading && <ChevronRight size={20} />}
        </button>
      </div>
    </form>
  );
};

export default OnboardingForm;
