import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useUserProfileStore, useMealStore } from '../store';
import Navbar from '../components/layout/Navbar';
import MealPlanGenerator from '../components/meal/MealPlanGenerator';
import MealPlanDisplay from '../components/meal/MealPlanDisplay';
import { Plus } from 'lucide-react';

const MealPlanPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { profile } = useUserProfileStore();
  const { currentMealPlan } = useMealStore();
  const [showGenerator, setShowGenerator] = useState(!currentMealPlan);

  useEffect(() => {
    if (!user) {
      window.location.href = '/onboarding';
    }
  }, [user]);

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
            userProfile={profile}
            userId={user?.id}
            onGenerated={() => setShowGenerator(false)}
          />
        ) : currentMealPlan ? (
          <div>
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 mb-6 btn-secondary"
            >
              <Plus size={20} />
              {t('meals.generateNew')}
            </button>
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
