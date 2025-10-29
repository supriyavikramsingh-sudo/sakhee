import { Alert } from 'antd';
import { Utensils } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/common/PageHeader';
import Navbar from '../components/layout/Navbar';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import { useMealStore } from '../store';
import { useAuthStore } from '../store/authStore';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const { currentMealPlan } = useMealStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  return (
    <div className="min-h-screen main-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <PageHeader
          title={t('meals.generator.title')}
          description={t('meals.generator.subtitle')}
          icon={<Utensils size={30} className="text-primary" strokeWidth={3} />}
        />

        {showGenerator ? (
          <MealPlanGenerator
            userProfile={userProfile?.profileData}
            userId={user?.uid ?? ''}
            onGenerated={() => setShowGenerator(false)}
          />
        ) : currentMealPlan ? (
          <div>
            <MealPlanDisplay plan={currentMealPlan} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted mb-6">{t('meals.noPlans')}</p>
            <button onClick={() => setShowGenerator(true)} className="btn-primary">
              {t('meals.createFirst')}
            </button>
          </div>
        )}

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
