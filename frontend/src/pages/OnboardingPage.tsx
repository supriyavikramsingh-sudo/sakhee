import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import OnboardingForm from '../components/onboarding/OnboardingForm';
import { CheckCircle } from 'lucide-react';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, userProfile, completeOnboarding } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);

  console.log('User Profile:', userProfile, user);

  // Redirect if already onboarded
  useEffect(() => {
    if (userProfile?.onboarded === true) {
      navigate('/', { replace: true });
    }
  }, [userProfile, navigate]);

  // Auto-populate email from Google Auth
  useEffect(() => {
    if (user?.email && !userData.email) {
      setUserData((prev) => ({
        ...prev,
        email: user.email,
      }));
    }
  }, [user]);

  const steps = [
    { title: t('onboarding.step1.title'), description: t('onboarding.step1.desc') },
    { title: t('onboarding.step2.title'), description: t('onboarding.step2.desc') },
    { title: t('onboarding.step3.title'), description: t('onboarding.step3.desc') },
    { title: t('onboarding.step4.title'), description: t('onboarding.step4.desc') },
    { title: t('onboarding.step5.title'), description: t('onboarding.step5.desc') },
  ];

  const handleStepComplete = async (stepData) => {
    try {
      setLoading(true);
      const newUserData = { ...userData, ...stepData };
      setUserData(newUserData);

      if (currentStep === steps.length - 1) {
        // Final step - complete onboarding
        const result = await completeOnboarding(newUserData);

        if (result.success) {
          // Success! Redirect to home
          navigate('/', { replace: true });
        } else {
          alert(
            `Failed to save your profile: ${result.error || 'Unknown error'}. Please try again.`
          );
        }
      } else {
        // Move to next step
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert(`An error occurred: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen main-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    idx < currentStep
                      ? 'bg-success text-white'
                      : idx === currentStep
                      ? 'bg-primary text-white'
                      : 'bg-surface text-textSecondary'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle size={20} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      idx < currentStep ? 'bg-success' : 'bg-surface'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-textPrimary mb-2">{steps[currentStep].title}</h2>
            <p className="text-textSecondary">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* Onboarding Form */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <OnboardingForm
            step={currentStep}
            onComplete={handleStepComplete}
            onBack={handleBack}
            loading={loading}
            initialData={userData}
          />
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-8 p-4 bg-warning/10 border-l-4 border-warning rounded">
          <p className="text-sm text-textSecondary">⚠️ {t('common.disclaimerText')}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
