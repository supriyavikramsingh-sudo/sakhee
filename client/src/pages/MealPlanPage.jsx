import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMealStore } from '../store';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuthStore();
  const { currentMealPlan } = useMealStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  return (
    <div className="min-h-screen bg-background">
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

        {/* Medical Note */}
        <div className="mt-12 p-6 bg-info bg-opacity-10 rounded-lg border-l-4 border-info">
          <p className="text-sm text-gray-700">
            💡 These meal plans are personalized suggestions based on PCOS management guidelines.
            Always consult a nutritionist for medical conditions or allergies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MealPlanPage;
