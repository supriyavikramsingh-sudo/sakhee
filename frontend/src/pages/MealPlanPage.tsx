import { Alert } from 'antd';
import { Utensils } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/common/PageHeader';
import Navbar from '../components/layout/Navbar';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import MealPlanGeneratingCard from '../components/meal/MealPlanGeneratingCard';
import { useMealStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { useJobStore } from '../store/jobStore';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const { currentMealPlan, setMealPlan } = useMealStore();
  const { activeJobs, completedJobs, removeJob } = useJobStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  // Check if there's an active meal generation job
  const hasActiveMealGeneration = activeJobs.some(
    (job: any) => job.type === 'meal-generation'
  );

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
          
          // Clean up the job after loading
          removeJob(latestJob.id);
        }
      }
    };

    checkCompletedJobs();
  }, [completedJobs, setMealPlan, removeJob]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          title={t('meals.generator.title')}
          description={t('meals.generator.subtitle')}
          icon={<Utensils size={30} className="text-primary" strokeWidth={3} />}
        />

        {hasActiveMealGeneration ? (
          <MealPlanGeneratingCard />
        ) : showGenerator ? (
          <MealPlanGenerator
            userProfile={userProfile?.profileData}
            userId={user?.uid ?? ''}
            onGenerated={() => setShowGenerator(false)}
          />
        ) : currentMealPlan ? (
          <div>
            <MealPlanDisplay plan={currentMealPlan} />
          </div>
        ) : null}

        <Alert
          message="These meal plans are personalized suggestions based on PCOS management guidelines.
            Always consult a nutritionist for medical conditions or allergies."
          type="warning"
          showIcon
          closable
          className="mt-12"
        />
      </div>
    </div>
  );
};

export default MealPlanPage;
