import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMealStore } from '../store';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';
import { Alert } from 'antd';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const { currentMealPlan } = useMealStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  return (
    <div className="min-h-screen main-bg">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🍽️ {t('meals.title')}</h1>
          <p className="text-muted">{t('meals.subtitle')}</p>
        </div>

        {showGenerator ? (
          <MealPlanGenerator
            userProfile={userProfile.profileData}
            userId={user?.uid}
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
