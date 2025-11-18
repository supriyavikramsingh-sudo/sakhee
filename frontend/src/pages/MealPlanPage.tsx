import { Alert } from 'antd';
import { Utensils } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/common/PageHeader';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import MealPlanGeneratingCard from '../components/meal/MealPlanGeneratingCard';
import MealPlanHistoryPanel from '../components/meal/MealPlanHistoryPanel';
import MealPlanDeletionModal from '../components/meal/MealPlanDeletionModal';
import { useMealStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { useJobStore } from '../store/jobStore';
import apiClient from '../services/apiClient';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const { currentMealPlan, setMealPlan } = useMealStore();
  const { activeJobs, completedJobs, removeJob } = useJobStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  // NEW: Meal plan history state
  const [mealPlanHistory, setMealPlanHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if there's an active meal generation job
  const hasActiveMealGeneration = activeJobs.some((job: any) => job.type === 'meal-generation');

  // NEW: Load meal plan history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;

      try {
        setIsLoadingHistory(true);
        setError(null);
        const response: any = await apiClient.getMealPlanHistory(user.uid);

        if (response.success && response.data) {
          setMealPlanHistory(response.data);

          // If we have history but no current meal plan, load the most recent one
          if (response.data.length > 0 && !currentMealPlan) {
            const mostRecentPlan = response.data[0];
            await loadPlanById(mostRecentPlan.planId);
          }
        }
      } catch (error: any) {
        console.error('Failed to load meal plan history:', error);
        setError('Failed to load meal plan history. Please refresh the page.');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user?.uid]);

  // NEW: Function to load a specific plan by ID
  const loadPlanById = async (planId: string) => {
    if (!user?.uid) return;

    try {
      setIsLoadingPlan(true);
      setError(null);
      const response: any = await apiClient.loadFullMealPlan(user.uid, planId);

      if (response.success && response.data) {
        setMealPlan(response.data);
        setActivePlanId(planId);
        setShowGenerator(false);
      } else {
        throw new Error('Failed to load meal plan data');
      }
    } catch (error: any) {
      console.error('Failed to load meal plan:', error);
      setError(error.message || 'Failed to load meal plan. Please try again.');

      // If loading fails, try to load the most recent plan as fallback
      if (mealPlanHistory.length > 0 && planId !== mealPlanHistory[0].planId) {
        console.log('Attempting to load most recent plan as fallback...');
        await loadPlanById(mealPlanHistory[0].planId);
      }
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // NEW: Handle plan selection from history
  const handleSelectPlan = async (planId: string) => {
    if (planId === activePlanId) return; // Already active
    await loadPlanById(planId);
  };

  // NEW: Handle plan deletion from modal
  const handleDeletePlan = async (planId: string) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    try {
      await apiClient.deleteMealPlanFromHistory(user.uid, planId);

      // Update local history
      setMealPlanHistory((prev) => prev.filter((p) => p.planId !== planId));

      // Clear error on successful deletion
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete meal plan:', error);
      throw new Error(error.message || 'Failed to delete meal plan. Please try again.');
    }
  };

  // NEW: Handle successful deletion - redirect to generator
  const handleDeleteSuccess = () => {
    setShowDeletionModal(false);
    // Clear current meal plan and show generator
    setMealPlan(null);
    setActivePlanId(null);
    setShowGenerator(true);
  };

  // NEW: Handle "Generate New Plan" button click
  const handleGenerateNewPlan = async () => {
    if (!user?.uid) return;

    // Check if user already has 5 plans
    if (mealPlanHistory.length >= 5) {
      setShowDeletionModal(true);
    } else {
      // Navigate to generator
      setShowGenerator(true);
      setMealPlan(null);
    }
  };

  // Check for completed meal generation jobs and load the result
  useEffect(() => {
    const checkCompletedJobs = async () => {
      const mealGenJobs = completedJobs.filter(
        (job: any) => job.type === 'meal-generation' && job.status === 'completed' && job.result
      );

      if (mealGenJobs.length > 0) {
        const latestJob = mealGenJobs[0];

        // Set the meal plan from the job result
        if (latestJob.result.plan) {
          console.log('✅ Loading meal plan from completed job:', latestJob.id);
          setMealPlan(latestJob.result);
          setShowGenerator(false);

          // NEW: Refresh history after new plan generation
          if (user?.uid) {
            const response: any = await apiClient.getMealPlanHistory(user.uid);
            if (response.success && response.data) {
              setMealPlanHistory(response.data);
              // Set the most recent plan as active
              if (response.data.length > 0 && latestJob.result.historyPlanId) {
                setActivePlanId(latestJob.result.historyPlanId);
              }
            }
          }

          // Clean up the job after loading
          removeJob(latestJob.id);
        }
      }
    };

    checkCompletedJobs();
  }, [completedJobs, setMealPlan, removeJob, user?.uid]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <PageHeader
        title={t('meals.generator.title')}
        description={t('meals.generator.subtitle')}
        icon={<Utensils size={30} className="text-primary" strokeWidth={3} />}
      />

      {/* Error Display */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Main Content with History Panel */}
      {hasActiveMealGeneration ? (
        <MealPlanGeneratingCard />
      ) : showGenerator ? (
        <MealPlanGenerator
          userProfile={userProfile?.profileData}
          userId={user?.uid ?? ''}
          onGenerated={() => setShowGenerator(false)}
        />
      ) : currentMealPlan ? (
        <div className="flex gap-6">
          {/* NEW: History Panel */}
          <MealPlanHistoryPanel
            plans={mealPlanHistory}
            activePlanId={activePlanId}
            onSelectPlan={handleSelectPlan}
            isLoading={isLoadingHistory}
          />

          {/* Main Meal Display Area */}
          <div className="flex-1">
            {isLoadingPlan ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4" />
                <p className="text-muted">Loading meal plan...</p>
              </div>
            ) : (
              <MealPlanDisplay plan={currentMealPlan} onGenerateNewPlan={handleGenerateNewPlan} />
            )}
          </div>
        </div>
      ) : null}

      {/* NEW: Deletion Modal */}
      <MealPlanDeletionModal
        isOpen={showDeletionModal}
        onClose={() => setShowDeletionModal(false)}
        plans={mealPlanHistory}
        onDeletePlan={handleDeletePlan}
        onDeleteSuccess={handleDeleteSuccess}
      />

      <Alert
        message="These meal plans are personalized suggestions based on PCOS management guidelines.
            Always consult a nutritionist for medical conditions or allergies."
        type="warning"
        showIcon
        closable
        className="mt-12"
      />
    </div>
  );
};

export default MealPlanPage;
