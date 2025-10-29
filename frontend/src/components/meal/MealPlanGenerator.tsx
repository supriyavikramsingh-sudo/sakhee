import {
  AlertCircle,
  CheckSquare,
  Crown,
  FileText,
  Info,
  Loader,
  Sparkles,
  Square,
  Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { regionalCuisineConfig } from '../../config/regionalCuisineConfig';
import { apiClient } from '../../services/apiClient';
import firestoreService from '../../services/firestoreService';
import { useMealStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import RAGMetadataDisplay from './RAGMetadataDisplay';

const MealPlanGenerator = ({ userProfile, userId, onGenerated, isRegenerating = false }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setMealPlan } = useMealStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usage tracking state
  const [canGenerate, setCanGenerate] = useState(true);
  const [usageInfo, setUsageInfo] = useState(null);
  const [isTestAccount, setIsTestAccount] = useState(false);

  // RAG metadata state
  const [ragMetadata, setRagMetadata] = useState(null);
  const [personalizationSources, setPersonalizationSources] = useState(null);

  // Medical report state
  const [userReport, setUserReport] = useState(null);

  // Available states based on selected regions
  const [availableStates, setAvailableStates] = useState([]);

  // Form data with new region/cuisine structure
  const [formData, setFormData] = useState({
    regions: [], // Multi-select regions
    cuisineStates: [], // Multi-select states/cuisines
    dietType: '', // Optional - defaults to onboarding
    budget: 200,
    mealsPerDay: 3, // Required
    duration: 7, // Required
  });

  // Update available states when regions change
  useEffect(() => {
    if (formData.regions && formData.regions.length > 0) {
      const states = regionalCuisineConfig.getStatesForRegions(formData.regions);
      setAvailableStates(states);

      // Filter out states that are no longer available
      const availableStateIds = states.map((s) => s.id);
      setFormData((prev) => ({
        ...prev,
        cuisineStates: prev.cuisineStates.filter((id) => availableStateIds.includes(id)),
      }));
    } else {
      setAvailableStates([]);
      setFormData((prev) => ({
        ...prev,
        cuisineStates: [],
      }));
    }
  }, [formData.regions]);

  // Check meal plan limits on mount
  useEffect(() => {
    const checkLimits = async () => {
      console.log('🔍 Checking meal plan limits for user:', !user?.email, !userId);
      if (!user?.email || !userId) return;

      // Check if test account
      const testAccount = firestoreService.isTestAccount(user.email);
      setIsTestAccount(testAccount);

      if (testAccount) {
        console.log('✅ Test account detected - bypassing limits');
        setCanGenerate(true);
        return;
      }

      // Check usage limits for regular users
      const result = await firestoreService.checkMealPlanLimit(userId);
      console.log('📊 Meal plan usage check result:', result);
      if (result.success) {
        setCanGenerate(result.canGenerate);
        setUsageInfo({
          planCount: result.planCount,
          isPro: result.isPro,
        });

        console.log('📊 Meal plan usage:', {
          canGenerate: result.canGenerate,
          planCount: result.planCount,
          isPro: result.isPro,
        });
      }
    };

    checkLimits();
  }, [user?.email, userId]);

  // Fetch user's medical report on mount
  useEffect(() => {
    const fetchMedicalReport = async () => {
      if (!userId) return;

      try {
        const reportResponse = await apiClient.getUserReport(userId);
        if (reportResponse.success && reportResponse.data) {
          setUserReport(reportResponse.data);
          console.log('✅ Medical report loaded for personalization display:', {
            hasLabValues: !!reportResponse.data.labValues,
            labCount: reportResponse.data.labValues
              ? Object.keys(reportResponse.data.labValues).length
              : 0,
          });
        }
      } catch (error) {
        console.log('ℹ️ No medical report available (optional)');
      }
    };

    fetchMedicalReport();
  }, [userId]);

  const dietTypes = [
    { value: '', label: 'Use my onboarding preference' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'non-vegetarian', label: 'Non-vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'jain', label: 'Jain' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'budget' || name === 'mealsPerDay' || name === 'duration'
          ? parseInt(value)
          : value,
    }));
  };

  // Handle region multi-select
  const handleRegionToggle = (regionId) => {
    setFormData((prev) => {
      const currentRegions = prev.regions || [];
      if (currentRegions.includes(regionId)) {
        return {
          ...prev,
          regions: currentRegions.filter((id) => id !== regionId),
        };
      } else {
        return {
          ...prev,
          regions: [...currentRegions, regionId],
        };
      }
    });
  };

  // Handle cuisine/state multi-select
  const handleStateToggle = (stateId) => {
    setFormData((prev) => {
      const currentStates = prev.cuisineStates || [];
      if (currentStates.includes(stateId)) {
        return {
          ...prev,
          cuisineStates: currentStates.filter((id) => id !== stateId),
        };
      } else {
        return {
          ...prev,
          cuisineStates: [...currentStates, stateId],
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Block submission if user can't generate and is not a test account
    if (!canGenerate && !isTestAccount) {
      navigate('/coming-soon');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileData = userProfile?.profileData || userProfile || {};

      // Fetch latest medical report
      let latestReport = null;
      try {
        const reportResponse = await apiClient.getUserReport(userId);
        if (reportResponse.success && reportResponse.data) {
          latestReport = reportResponse.data;
          console.log('✅ Medical report fetched successfully:', {
            hasLabValues: !!latestReport.labValues,
            labCount: latestReport.labValues ? Object.keys(latestReport.labValues).length : 0,
          });
        }
      } catch (reportError) {
        console.warn('⚠️ No medical report found or error fetching report:', reportError.message);
      }

      // Reset RAG metadata on new generation
      setRagMetadata(null);
      setPersonalizationSources(null);

      // Determine final regions and cuisines
      let finalRegions = [];
      let finalCuisines = [];

      // If user selected override regions/states
      if (
        formData.regions &&
        formData.regions.length > 0 &&
        formData.cuisineStates &&
        formData.cuisineStates.length > 0
      ) {
        finalRegions = formData.regions;
        finalCuisines = regionalCuisineConfig.getCuisinesFromStates(formData.cuisineStates);
      } else {
        // Fallback to onboarding data
        if (profileData.cuisineStates && profileData.cuisineStates.length > 0) {
          finalCuisines = regionalCuisineConfig.getCuisinesFromStates(profileData.cuisineStates);
          finalRegions = regionalCuisineConfig.getRegionsFromStates(profileData.cuisineStates);
        } else if (profileData.cuisines && profileData.cuisines.length > 0) {
          finalCuisines = profileData.cuisines;
        } else if (profileData.cuisine) {
          // Legacy single cuisine support
          finalCuisines = [profileData.cuisine];
        } else {
          // Ultimate fallback
          finalCuisines = ['North Indian'];
          finalRegions = ['north-indian'];
        }
      }

      console.log('🔍 Final cuisines and regions:', { finalCuisines, finalRegions });

      // Use form selections as priority, fallback to onboarding data
      const finalDietType = formData.dietType || profileData.dietType || 'vegetarian';

      // Build restrictions from onboarding + diet type
      const restrictions = [
        ...(profileData.allergies || []),
        ...(finalDietType === 'jain' ? ['onion', 'garlic', 'root-vegetables'] : []),
        ...(finalDietType === 'vegan' ? ['dairy', 'eggs', 'honey'] : []),
      ];

      console.log('📤 Sending to backend:', {
        regions: finalRegions,
        cuisines: finalCuisines,
        restrictions,
      });

      // Build health context from onboarding + medical reports
      const healthContext = {
        symptoms: profileData.symptoms || [],
        activityLevel: profileData.activityLevel,
        age: profileData.age,
        goals: profileData.goals || [],
        medicalData: latestReport
          ? {
              reportDate: latestReport.reportDate,
              labValues: latestReport.labValues,
              concerns: latestReport.concerns || [],
            }
          : null,
      };

      const response = await apiClient.generateMealPlan({
        regions: finalRegions,
        cuisines: finalCuisines,
        dietType: finalDietType,
        budget: formData.budget,
        mealsPerDay: formData.mealsPerDay,
        duration: formData.duration,
        userId,
        restrictions,
        healthContext,
        userOverrides: {
          regions: formData.regions.length > 0 ? formData.regions : null,
          cuisineStates: formData.cuisineStates.length > 0 ? formData.cuisineStates : null,
          dietType: formData.dietType || null,
        },
      });

      // Capture RAG metadata from response
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

      setMealPlan(response.data);

      if (!isTestAccount) {
        await firestoreService.incrementMealPlanUsage(userId);
        setCanGenerate(false);
        setUsageInfo((prev) => ({ ...prev, planCount: (prev?.planCount || 0) + 1 }));
      }

      onGenerated();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to generate meal plan. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Count personalization sources for display
  const profileData = userProfile?.profileData || userProfile || {};

  const displayPersonalizationSources = personalizationSources || {
    onboarding: !!(
      profileData?.allergies?.length ||
      profileData?.symptoms?.length ||
      profileData?.goals?.length
    ),
    medicalReport: !!userReport,
    userOverrides: !!(formData.regions.length || formData.dietType),
    rag: false,
  };

  if (!canGenerate && !isRegenerating && !isTestAccount) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mb-4">
          <Crown className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-3">Upgrade to Sakhee Pro</h2>
        <p className="text-gray-600 mb-6">
          You've used your free meal plan! Upgrade to Sakhee Pro for unlimited meal plans.
        </p>
        <div className="bg-surface p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-700">
            <strong>Your usage:</strong> {usageInfo?.planCount || 1} / 1 free meal plan used
          </p>
        </div>
        <button
          onClick={() => navigate('/coming-soon')}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition flex items-center gap-2 justify-center mx-auto"
        >
          <Crown size={20} />
          Upgrade Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {isTestAccount && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            🧪 <strong>Test Account Mode:</strong> Usage limits bypassed
          </p>
        </div>
      )}
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

      {/* Personalization Sources Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <Info className="text-info" size={20} />
          <h3 className="text-sm font-bold text-gray-800">How is this personalized for you?</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Onboarding Profile */}
          <div
            key={`onboarding-${displayPersonalizationSources.onboarding}`}
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
                {profileData?.allergies?.length > 0 && (
                  <li>• Allergies: {profileData.allergies.join(', ')}</li>
                )}
                {profileData?.symptoms?.length > 0 && (
                  <li>• Symptoms: {profileData.symptoms.slice(0, 2).join(', ')}</li>
                )}
                {profileData?.goals?.length > 0 && (
                  <li>• Goals: {profileData.goals.slice(0, 2).join(', ')}</li>
                )}
                {profileData?.activityLevel && <li>• Activity: {profileData.activityLevel}</li>}
                {profileData?.cuisines && (
                  <li>• Cuisines: {profileData.cuisines.slice(0, 2).join(', ')}</li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Complete onboarding to enable</p>
            )}
          </div>

          {/* Medical Reports */}
          <div
            key={`medical-${!!userReport}`}
            className={`p-3 rounded-lg ${
              displayPersonalizationSources.medicalReport
                ? 'bg-white border-2 border-primary'
                : 'bg-gray-100 border-2 border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText
                className={
                  displayPersonalizationSources.medicalReport ? 'text-primary' : 'text-gray-400'
                }
                size={16}
              />
              <span
                className={`text-xs font-semibold ${
                  displayPersonalizationSources.medicalReport ? 'text-primary' : 'text-gray-500'
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
            <strong>💡 Pro Tip:</strong> Customize regions and cuisines below to try different
            options. Your selections take priority over onboarding data.
          </p>
        </div>
      </div>

      {/* RAG Metadata Display */}
      {ragMetadata && personalizationSources && (
        <RAGMetadataDisplay
          ragMetadata={ragMetadata}
          personalizationSources={personalizationSources}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Region Selection - Multi-select */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Preferred Regions <span className="text-xs text-muted">(Optional - Multi-select)</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {regionalCuisineConfig.regions.map((region) => {
              const isSelected = formData.regions.includes(region.id);
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleRegionToggle(region.id)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-surface hover:border-primary'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="text-primary" size={18} />
                  ) : (
                    <Square className="text-muted" size={18} />
                  )}
                  <span className="text-sm">{region.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.regions.length === 0
              ? `Will use your onboarding preference${
                  profileData.cuisines ? `: ${profileData.cuisines.slice(0, 2).join(', ')}` : ''
                }`
              : `${formData.regions.length} region${
                  formData.regions.length > 1 ? 's' : ''
                } selected`}
          </p>
        </div>

        {/* Cuisine/State Selection - Multi-select */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Preferred Cuisines/States{' '}
            <span className="text-xs text-muted">(Optional - Multi-select)</span>
          </label>
          {formData.regions.length === 0 ? (
            <div className="w-full px-4 py-3 border border-surface rounded-lg bg-gray-50 text-gray-500 text-sm">
              Please select regions first to see available cuisines
            </div>
          ) : availableStates.length === 0 ? (
            <div className="w-full px-4 py-3 border border-surface rounded-lg bg-gray-50 text-gray-500 text-sm">
              No cuisines available for selected regions
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-2 border border-surface rounded-lg">
              {availableStates.map((state) => {
                const isSelected = formData.cuisineStates.includes(state.id);
                return (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => handleStateToggle(state.id)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition text-sm ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-surface hover:border-primary'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="text-primary" size={16} />
                    ) : (
                      <Square className="text-muted" size={16} />
                    )}
                    <span>{state.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formData.cuisineStates.length === 0
              ? `Will use your onboarding cuisines${
                  profileData.cuisines ? `: ${profileData.cuisines.join(', ')}` : ''
                }`
              : `${formData.cuisineStates.length} cuisine${
                  formData.cuisineStates.length > 1 ? 's' : ''
                } selected`}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
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
                  {!diet.value && profileData?.dietType ? ` (${profileData.dietType})` : ''}
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
          disabled={loading || (!canGenerate && !isTestAccount)}
          className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading && <Loader className="animate-spin" size={20} />}
          {loading
            ? 'Generating Your Personalized Plan...'
            : !canGenerate && !isTestAccount
            ? 'Upgrade to Pro to Generate Meal Plans'
            : 'Generate Meal Plan'}
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
