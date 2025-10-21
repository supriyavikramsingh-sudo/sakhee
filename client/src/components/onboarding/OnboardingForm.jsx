// client/src/components/onboarding/OnboardingForm.jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QuestionField from './QuestionField';
import { regionalCuisineConfig } from '../../config/regionalCuisineConfig';

const OnboardingForm = ({ step, onComplete, onBack, loading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({});
  const [availableStates, setAvailableStates] = useState([]);

  // Update available states when regions change
  useEffect(() => {
    if (step === 4 && formData.regions && formData.regions.length > 0) {
      const states = regionalCuisineConfig.getStatesForRegions(formData.regions);
      setAvailableStates(states);

      // Remove any selected states that are no longer available
      if (formData.cuisineStates && formData.cuisineStates.length > 0) {
        const availableStateIds = states.map((s) => s.id);
        const filteredStates = formData.cuisineStates.filter((id) =>
          availableStateIds.includes(id)
        );
        if (filteredStates.length !== formData.cuisineStates.length) {
          setFormData((prev) => ({
            ...prev,
            cuisineStates: filteredStates,
          }));
        }
      }
    } else {
      setAvailableStates([]);
    }
  }, [formData.regions, step]);

  const questions = {
    0: [
      {
        key: 'email',
        type: 'email',
        label: t('onboarding.email'),
        required: true,
        placeholder: 'your.email@example.com',
      },
      {
        key: 'age',
        type: 'select',
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
        key: 'location',
        type: 'text',
        label: t('onboarding.location'),
        required: true,
        placeholder: 'e.g., Mumbai, Maharashtra',
      },
    ],
    1: [
      {
        key: 'diagnosisTime',
        type: 'select',
        label: t('onboarding.diagnosisTime'),
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
        key: 'symptoms',
        type: 'checkbox',
        label: t('onboarding.symptoms'),
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
        key: 'dietType',
        type: 'select',
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
        key: 'allergies',
        type: 'checkbox',
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
        key: 'activityLevel',
        type: 'select',
        label: t('onboarding.activityLevel'),
        required: true,
        options: [
          { value: 'sedentary', label: 'Sedentary' },
          { value: 'light', label: 'Lightly active' },
          { value: 'moderate', label: 'Moderately active' },
          { value: 'very', label: 'Very active' },
        ],
      },
    ],
    3: [
      {
        key: 'goals',
        type: 'checkbox',
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
        key: 'income',
        type: 'select',
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
        key: 'language',
        type: 'select',
        label: t('onboarding.language'),
        required: true,
        options: [
          { value: 'en', label: 'English' },
          { value: 'hi', label: 'हिंदी' },
          { value: 'ta', label: 'தமிழ்' },
          { value: 'te', label: 'తెలుగు' },
        ],
      },
      {
        key: 'regions',
        type: 'multiselect',
        label: 'Preferred Regions',
        required: true,
        options: regionalCuisineConfig.regions.map((region) => ({
          value: region.id,
          label: region.label,
        })),
        helperText: 'Select one or more regions for cuisine preferences',
      },
      {
        key: 'cuisineStates',
        type: 'multiselect',
        label: 'Preferred Cuisines/States',
        required: true,
        options: availableStates.map((state) => ({
          value: state.id,
          label: state.label,
        })),
        helperText: 'Select cuisines based on your preferred regions',
        disabled: !formData.regions || formData.regions.length === 0,
      },
    ],
  };

  const currentQuestions = questions[step] || [];

  const handleFieldChange = (key, value) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [key]: value,
      };

      // Reset cuisineStates when regions change
      if (key === 'regions') {
        newData.cuisineStates = [];
      }

      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // For step 4, convert cuisineStates to cuisines array before submitting
    if (step === 4) {
      const cuisines = regionalCuisineConfig.getCuisinesFromStates(formData.cuisineStates || []);
      const finalData = {
        ...formData,
        cuisines, // Array of cuisine names like ['Gujarati', 'Uttar Pradesh']
        // Keep cuisineStates for reference
      };
      onComplete(finalData);
    } else {
      onComplete(formData);
    }
  };

  // Validation
  const isValid = currentQuestions
    .filter((q) => q.required)
    .every((q) => {
      const value = formData[q.key];
      // For checkbox fields, ensure at least one is selected
      if (q.type === 'checkbox' && q.required) {
        return Array.isArray(value) && value.length > 0;
      }
      // For multiselect fields
      if (q.type === 'multiselect' && q.required) {
        return Array.isArray(value) && value.length > 0;
      }
      return value;
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {currentQuestions.map((question) => (
        <QuestionField
          key={question.key}
          {...question}
          value={formData[question.key]}
          onChange={(value) => handleFieldChange(question.key, value)}
        />
      ))}

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
