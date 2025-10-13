import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMealStore } from '../../store';
import { apiClient } from '../../services/apiClient';
import { Loader, AlertCircle, Info, Sparkles, FileText, Activity, Target } from 'lucide-react';

const MealPlanGenerator = ({ userProfile, userId, onGenerated, latestReport }) => {
  const { t } = useTranslation();
  const { setMealPlan } = useMealStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    region: '', // Optional - defaults to onboarding
    dietType: '', // Optional - defaults to onboarding
    budget: 200,
    mealsPerDay: 3, // Required
    duration: 7, // Required
  });

  const regions = [
    { value: '', label: 'Use my onboarding preference' },
    { value: 'north-india', label: 'North Indian' },
    { value: 'south-india', label: 'South Indian' },
    { value: 'east-india', label: 'East Indian' },
    { value: 'west-india', label: 'West Indian' },
  ];

  const dietTypes = [
    { value: '', label: 'Use my onboarding preference' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'non-vegetarian', label: 'Non-vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'jain', label: 'Jain' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value, 'input changed');
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'budget' || name === 'mealsPerDay' || name === 'duration'
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Extract profile data (handle nested structure)
      const profileData = userProfile?.profileData || userProfile || {};

      // Debug logging
      console.log('🔍 User Profile:', userProfile);
      console.log('🔍 Profile Data:', profileData);
      console.log('🔍 Latest Report:', latestReport);
      console.log('🔍 Form Data:', formData);

      // Use form selections as priority, fallback to onboarding data
      const finalDietType = formData.dietType || profileData.dietType || 'vegetarian';
      const finalRegion = formData.region || profileData.location || 'north-india';

      // Build restrictions from onboarding + diet type
      const restrictions = [
        ...(profileData.allergies || []),
        // Add diet-specific restrictions
        ...(finalDietType === 'jain' ? ['onion', 'garlic', 'root-vegetables'] : []),
        ...(finalDietType === 'vegan' ? ['dairy', 'eggs', 'honey'] : []),
      ];

      // Use cuisine from onboarding
      const cuisines = profileData.cuisine ? [profileData.cuisine] : [];

      console.log('📤 Sending restrictions:', restrictions);
      console.log('📤 Sending cuisines:', cuisines);

      // Build health context from onboarding + medical reports
      const healthContext = {
        symptoms: profileData.symptoms || [],
        activityLevel: profileData.activityLevel,
        age: profileData.age,
        goals: profileData.goals || [],
        // Add medical report data if available
        medicalData: latestReport
          ? {
              reportDate: latestReport.reportDate,
              labValues: latestReport.labValues,
              concerns: latestReport.concerns || [],
            }
          : null,
      };

      const response = await apiClient.generateMealPlan({
        region: finalRegion,
        dietType: finalDietType,
        budget: formData.budget,
        mealsPerDay: formData.mealsPerDay,
        duration: formData.duration,
        userId,
        restrictions,
        cuisines,
        healthContext,
        // Indicate if user overrode onboarding preferences
        userOverrides: {
          region: formData.region !== '',
          dietType: formData.dietType !== '',
        },
      });

      setMealPlan(response.data);
      onGenerated();
    } catch (err) {
      setError(err.message || 'Failed to generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  // Count personalization sources
  const personalizationSources = {
    onboarding: !!(
      userProfile?.allergies?.length ||
      userProfile?.symptoms?.length ||
      userProfile?.goals?.length
    ),
    medicalReport: !!latestReport,
    rag: true, // RAG is always available
    selections: formData.region !== '' || formData.dietType !== '' || formData.budget !== 200,
  };

  const activeSourcesCount = Object.values(personalizationSources).filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl">
      <div className="flex items-start gap-3 mb-6">
        <Sparkles className="text-primary flex-shrink-0 mt-1" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-primary">Create Your Personalized Meal Plan</h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered recommendations based on multiple data sources
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded flex items-start gap-3">
          <AlertCircle className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-danger">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Personalization Info Box */}
      <div className="mb-6 p-5 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border-l-4 border-primary">
        <div className="flex items-start gap-3 mb-3">
          <Info className="text-primary flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-gray-800 mb-2">
              🎯 Your meal plan will be customized using {activeSourcesCount} data source
              {activeSourcesCount > 1 ? 's' : ''}:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {/* Onboarding Data */}
          <div
            className={`p-3 rounded-lg ${
              personalizationSources.onboarding
                ? 'bg-white border-2 border-primary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity
                className={personalizationSources.onboarding ? 'text-primary' : 'text-gray-400'}
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  personalizationSources.onboarding ? 'text-primary' : 'text-gray-500'
                }`}
              >
                ONBOARDING PROFILE
              </span>
            </div>
            {personalizationSources.onboarding ? (
              <ul className="text-xs text-gray-700 space-y-1">
                {userProfile?.allergies?.length > 0 && (
                  <li>• Allergies: {userProfile.allergies.join(', ')}</li>
                )}
                {userProfile?.symptoms?.length > 0 && (
                  <li>• Symptoms: {userProfile.symptoms.slice(0, 2).join(', ')}</li>
                )}
                {userProfile?.goals?.length > 0 && (
                  <li>• Goals: {userProfile.goals.slice(0, 2).join(', ')}</li>
                )}
                {userProfile?.activityLevel && <li>• Activity: {userProfile.activityLevel}</li>}
                {userProfile?.cuisine && <li>• Cuisine: {userProfile.cuisine}</li>}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Complete onboarding to enable</p>
            )}
          </div>

          {/* Medical Reports */}
          <div
            className={`p-3 rounded-lg ${
              personalizationSources.medicalReport
                ? 'bg-white border-2 border-secondary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText
                className={
                  personalizationSources.medicalReport ? 'text-secondary' : 'text-gray-400'
                }
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  personalizationSources.medicalReport ? 'text-secondary' : 'text-gray-500'
                }`}
              >
                MEDICAL REPORTS
              </span>
            </div>
            {personalizationSources.medicalReport ? (
              <ul className="text-xs text-gray-700 space-y-1">
                <li>✓ Latest report analyzed</li>
                <li>• Lab values considered</li>
                <li>• Nutritional needs adjusted</li>
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Upload reports for more precision</p>
            )}
          </div>

          {/* RAG Knowledge Base */}
          <div className="p-3 rounded-lg bg-white border-2 border-info">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-info" size={16} />
              <span className="text-xs font-semibold text-info">PCOS KNOWLEDGE BASE</span>
            </div>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>✓ Evidence-based guidelines</li>
              <li>✓ Regional meal templates</li>
              <li>✓ PCOS-friendly ingredients</li>
            </ul>
          </div>

          {/* User Selections */}
          <div
            className={`p-3 rounded-lg ${
              personalizationSources.selections
                ? 'bg-white border-2 border-primary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles
                className={personalizationSources.selections ? 'text-primary' : 'text-gray-400'}
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  personalizationSources.selections ? 'text-primary' : 'text-gray-500'
                }`}
              >
                YOUR SELECTIONS
              </span>
            </div>
            {personalizationSources.selections ? (
              <ul className="text-xs text-gray-700 space-y-1">
                {formData.region && <li>• Custom region selected</li>}
                {formData.dietType && <li>• Custom diet type selected</li>}
                <li>• Budget & preferences applied</li>
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Override defaults below</p>
            )}
          </div>
        </div>

        <div className="mt-3 p-3 bg-white rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>💡 Pro Tip:</strong> Leave region and diet type as "Use my onboarding
            preference" unless you want to temporarily try different options. Your selections below
            take priority over onboarding data.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Region - Optional */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Region <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                  {r.value === '' && userProfile?.location ? ` (${userProfile.location})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Override your onboarding region if needed</p>
          </div>

          {/* Diet Type - Optional */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Diet Type <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <select
              name="dietType"
              value={formData.dietType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              {dietTypes.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                  {d.value === '' && userProfile?.dietType ? ` (${userProfile.dietType})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Override your onboarding diet type if needed
            </p>
          </div>

          {/* Meals Per Day - Required */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Meals Per Day <span className="text-danger">*</span>
            </label>
            <select
              name="mealsPerDay"
              value={formData.mealsPerDay}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              <option value={2}>2 Meals</option>
              <option value={3}>3 Meals</option>
              <option value={4}>4 Meals (with snack)</option>
            </select>
          </div>

          {/* Duration - Required */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration <span className="text-danger">*</span>
            </label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>7 Days (1 Week)</option>
            </select>
          </div>
        </div>

        {/* Daily Budget */}
        <div>
          <label className="block text-sm font-medium mb-2">Daily Budget: ₹{formData.budget}</label>
          <input
            type="range"
            name="budget"
            min="100"
            max="500"
            step="50"
            value={formData.budget}
            onChange={handleInputChange}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>₹100</span>
            <span>₹500</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading && <Loader className="animate-spin" size={20} />}
          {loading ? 'Generating Your Personalized Plan...' : 'Generate Meal Plan'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-surface rounded text-sm text-muted">
        💡 All meal plans are PCOS-friendly with low GI foods, anti-inflammatory ingredients, and
        hormone-balancing nutrients. Generation takes 20-30 seconds.
      </div>
    </div>
  );
};

export default MealPlanGenerator;
