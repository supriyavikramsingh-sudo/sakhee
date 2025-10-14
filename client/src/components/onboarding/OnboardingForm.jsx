import { useTranslation } from 'react-i18next';
import QuestionField from './QuestionField';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const OnboardingForm = ({ step, onComplete, onBack, loading, initialData = {} }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({});

  // ✅ Sync with initialData changes (for email auto-population)
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...initialData,
    }));
  }, [initialData]);

  const questions = {
    0: [
      // Personal Info
      {
        key: 'email',
        type: 'email',
        label: t('onboarding.email'),
        required: true,
        helpText: 'Pre-filled from your Google account. You can edit if needed.',
      },
      {
        key: 'age',
        type: 'select',
        label: t('onboarding.age'),
        required: true,
        options: [
          { value: '18-24', label: '18-24' },
          { value: '25-30', label: '25-30' },
          { value: '31-35', label: '31-35' },
          { value: '36-40', label: '36-40' },
          { value: '41-45', label: '41-45' },
        ],
      },
      {
        key: 'location',
        type: 'text',
        label: t('onboarding.location'),
        required: true,
        placeholder: 'City, State',
      },
    ],
    1: [
      // Health Info
      {
        key: 'diagnosisTime',
        type: 'select',
        label: t('onboarding.diagnosisTime'),
        required: true,
        options: [
          { value: '0-6', label: 'Within 6 months' },
          { value: '6-12', label: '6-12 months' },
          { value: '12+', label: 'Over a year ago' },
        ],
      },
      {
        key: 'symptoms',
        type: 'checkbox',
        label: t('onboarding.symptoms'),
        required: false,
        options: [
          { value: 'irregular-periods', label: 'Irregular periods' },
          { value: 'acne', label: 'Acne' },
          { value: 'weight-changes', label: 'Weight changes' },
          { value: 'hair-loss', label: 'Hair loss' },
          { value: 'fatigue', label: 'Fatigue' },
          { value: 'mood-swings', label: 'Mood swings' },
        ],
      },
    ],
    2: [
      // Diet & Lifestyle
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
      // Goals
      {
        key: 'goals',
        type: 'checkbox',
        label: t('onboarding.primaryGoals'),
        required: true,
        maxSelections: 2, // ✅ Limit to 2 goals
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
      // Preferences
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
        key: 'cuisine',
        type: 'select',
        label: t('onboarding.cuisine'),
        required: true,
        options: [
          { value: 'north-indian', label: 'North Indian' },
          { value: 'south-indian', label: 'South Indian' },
          { value: 'east-indian', label: 'East Indian' },
          { value: 'west-indian', label: 'West Indian' },
        ],
      },
    ],
  };

  const currentQuestions = questions[step] || [];

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
  };

  // ✅ Updated validation to handle checkbox arrays properly
  const isValid = currentQuestions
    .filter((q) => q.required)
    .every((q) => {
      const value = formData[q.key];
      // For checkbox fields, ensure at least one is selected
      if (q.type === 'checkbox' && q.required) {
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
