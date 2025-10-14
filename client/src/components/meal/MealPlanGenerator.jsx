// client/src/components/meal/MealPlanGenerator.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMealStore } from '../../store';
import { apiClient } from '../../services/apiClient';
import { Loader, AlertCircle, Info, Sparkles, FileText, Activity, Target } from 'lucide-react';
// ========== NEW IMPORT FOR RAG DISPLAY ==========
import RAGMetadataDisplay from './RAGMetadataDisplay';
// ================================================

const MealPlanGenerator = ({ userProfile, userId, onGenerated, latestReport }) => {
  const { t } = useTranslation();
  const { setMealPlan } = useMealStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ========== NEW STATE FOR RAG METADATA ==========
  const [ragMetadata, setRagMetadata] = useState(null);
  const [personalizationSources, setPersonalizationSources] = useState(null);
  // ================================================

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

    // ========== RESET RAG METADATA ON NEW GENERATION ==========
    setRagMetadata(null);
    setPersonalizationSources(null);
    // ==========================================================

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

      // ========== CAPTURE RAG METADATA FROM RESPONSE ==========
      if (response.data.ragMetadata) {
        console.log('✅ RAG Metadata received:', response.data.ragMetadata);
        setRagMetadata(response.data.ragMetadata);
      } else {
        console.warn('⚠️ No RAG metadata in response');
      }

      if (response.data.personalizationSources) {
        console.log('✅ Personalization sources:', response.data.personalizationSources);
        setPersonalizationSources(response.data.personalizationSources);
      }
      // ========================================================

      setMealPlan(response.data);
      onGenerated();
    } catch (err) {
      setError(err.message || 'Failed to generate meal plan');
    } finally {
      setLoading(false);
    }
  };

  // Count personalization sources for display
  const displayPersonalizationSources = personalizationSources || {
    onboarding: !!(
      userProfile?.allergies?.length ||
      userProfile?.symptoms?.length ||
      userProfile?.goals?.length
    ),
    medicalReport: !!latestReport,
    userOverrides: !!(formData.region || formData.dietType),
    rag: false,
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-primary mb-4">✨ Generate Your Meal Plan</h2>
      <p className="text-muted mb-6">
        Create a personalized, PCOS-friendly meal plan based on your preferences and health goals.
      </p>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-danger flex-shrink-0" size={20} />
            <p className="text-sm text-danger">{error}</p>
          </div>
        </div>
      )}

      {/* How is this personalized? */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-info" size={20} />
          <h3 className="text-sm font-bold text-gray-800">How is this personalized for you?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Onboarding Profile */}
          <div
            className={`p-3 rounded-lg ${
              displayPersonalizationSources.onboarding
                ? 'bg-white border-2 border-primary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles
                className={
                  displayPersonalizationSources.onboarding ? 'text-primary' : 'text-gray-400'
                }
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  displayPersonalizationSources.onboarding ? 'text-primary' : 'text-gray-500'
                }`}
              >
                ONBOARDING PROFILE
              </span>
            </div>
            {displayPersonalizationSources.onboarding ? (
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
              displayPersonalizationSources.medicalReport
                ? 'bg-white border-2 border-secondary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText
                className={
                  displayPersonalizationSources.medicalReport ? 'text-secondary' : 'text-gray-400'
                }
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  displayPersonalizationSources.medicalReport ? 'text-secondary' : 'text-gray-500'
                }`}
              >
                MEDICAL REPORTS
              </span>
            </div>
            {displayPersonalizationSources.medicalReport ? (
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
        </div>

        <div className="mt-3 p-3 bg-white rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>💡 Pro Tip:</strong> Leave region and diet type as "Use my onboarding
            preference" unless you want to temporarily try different options. Your selections below
            take priority over onboarding data.
          </p>
        </div>
      </div>

      {/* ========== NEW: RAG METADATA DISPLAY SECTION ========== */}
      {ragMetadata && personalizationSources && (
        <RAGMetadataDisplay
          ragMetadata={ragMetadata}
          personalizationSources={personalizationSources}
        />
      )}
      {/* ======================================================= */}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Region - Optional */}
          <div>
            <label className="block text-sm font-medium mb-2">Region (Optional)</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                  {!region.value && userProfile?.location ? ` (${userProfile.location})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Override your onboarding region if needed</p>
          </div>

          {/* Diet Type - Optional */}
          <div>
            <label className="block text-sm font-medium mb-2">Diet Type (Optional)</label>
            <select
              name="dietType"
              value={formData.dietType}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:border-primary"
            >
              {dietTypes.map((diet) => (
                <option key={diet.value} value={diet.value}>
                  {diet.label}
                  {!diet.value && userProfile?.dietType ? ` (${userProfile.dietType})` : ''}
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
