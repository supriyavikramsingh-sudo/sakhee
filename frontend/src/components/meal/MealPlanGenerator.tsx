import { Alert, Slider } from 'antd';
import { AlertCircle, Crown, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { regionalCuisineConfig } from '../../config/regionalCuisineConfig';
import { apiClient } from '../../services/apiClient';
import firestoreService from '../../services/firestoreService';
import { useMealStore } from '../../store';
import { useAuthStore } from '../../store/authStore';
import SelectInput from '../common/SelectInput';
import MealInfoTipSection from './MealInfoTipSection';
import RAGMetadataDisplay from './RAGMetadataDisplay';

interface MealPlanGeneratorProps {
  userProfile: any;
  userId: string;
  onGenerated: () => void;
  isRegenerating?: boolean;
}

const MealPlanGenerator = ({
  userProfile,
  userId,
  onGenerated,
  isRegenerating = false,
}: MealPlanGeneratorProps) => {
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
  const [availableStates, setAvailableStates] = useState<
    {
      id: string;
      label: string;
      cuisine: string;
    }[]
  >([]);

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
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-danger bg-opacity-10 border-l-4 border-danger rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-danger flex-shrink-0" size={20} />
            <p className="text-sm text-danger">{error}</p>
          </div>
        </div>
      )}

      <Alert
        showIcon
        className="mb-6"
        message="How is this personalized for you?"
        description={
          <MealInfoTipSection
            displayPersonalizationSources={displayPersonalizationSources}
            profileData={profileData}
            userReport={userReport}
          />
        }
      />

      {/* RAG Metadata Display */}
      {ragMetadata && personalizationSources && (
        <RAGMetadataDisplay
          ragMetadata={ragMetadata}
          personalizationSources={personalizationSources}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <SelectInput
              label={'Preferred Regions (Optional - Multi-select)'}
              defaultValue={formData.regions}
              options={regionalCuisineConfig.regions.map((regions) => {
                return { value: regions.id, label: regions.label };
              })}
              handleInputChange={(value) => {
                setFormData((prev) => ({ ...prev, regions: value }));
              }}
              mode="multiple"
            />
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
          <div>
            <SelectInput
              disable={formData.regions.length === 0}
              label={'Preferred Cuisines/States (Optional - Multi-select)'}
              options={availableStates.map((state) => {
                return { value: state.id, label: state.label };
              })}
              handleInputChange={(value) => {
                setFormData((prev) => ({ ...prev, cuisineStates: value }));
              }}
              mode="multiple"
            />
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
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Diet Type - Optional */}
          <div>
            <SelectInput
              label={'Diet Type (Optional)'}
              options={dietTypes.map((diet) => {
                return { value: diet.value, label: diet.label };
              })}
              handleInputChange={(val) => setFormData((prev) => ({ ...prev, dietType: val }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Override your onboarding diet type if needed
            </p>
          </div>

          {/* Meals Per Day - Required */}
          <div>
            <SelectInput
              required
              label={'Meals Per Day'}
              options={[
                { value: '2', label: '2 Meals' },
                { value: '3', label: '3 Meals' },
                { value: '4', label: '4 Meals (with snack)' },
              ]}
              defaultValue={'3'}
              handleInputChange={(val) => setFormData((prev) => ({ ...prev, mealsPerDay: val }))}
            />
          </div>

          <div>
            <SelectInput
              required
              label={'Duration'}
              defaultValue={3}
              options={[
                { value: '3', label: '3 Days' },
                { value: '5', label: '5 Days' },
                { value: '7', label: '7 Days (1 Week)' },
              ]}
              handleInputChange={(val) => setFormData((prev) => ({ ...prev, duration: val }))}
            />
          </div>
        </div>
        {/* Daily Budget */}
        <div>
          <label className="block text-sm font-medium mb-2">Daily Budget: ₹{formData.budget}</label>
          <Slider
            min={100}
            max={500}
            step={50}
            value={formData.budget}
            onChange={(val) => setFormData((prev) => ({ ...prev, budget: val }))}
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
          className="w-full btn-primary !py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader className="animate-spin" size={20} />}
          {loading
            ? 'Generating Your Personalized Plan...'
            : !canGenerate && !isTestAccount
            ? 'Upgrade to Pro to Generate Meal Plans'
            : 'Generate Meal Plan'}
        </button>
      </form>

      <Alert
        className="mt-6"
        message="💡 All meal plans are PCOS-friendly with low GI foods, anti-inflammatory ingredients, and
        hormone-balancing nutrients. Generation takes 20-30 seconds."
      />
    </div>
  );
};

export default MealPlanGenerator;
