import { Alert, Steps } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import OnboardingForm from '../components/onboarding/OnboardingForm';
import { useAuthStore } from '../store/authStore';
import type { OnboardingData } from '../types/onboarding.type';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, userProfile, completeOnboarding } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState<OnboardingData>({} as OnboardingData);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Progress Bar */}
        <Steps current={currentStep} size="small" items={steps} className="my-6" />

        {/* Onboarding Form */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <OnboardingForm
            userData={userData}
            setUserData={setUserData}
            step={currentStep}
            onComplete={handleStepComplete}
            onBack={handleBack}
            loading={loading}
          />
        </div>

        {/* Disclaimer Alert */}
        {currentStep === 0 && (
          <Alert type="warning" className="mt-6" showIcon message={t('common.disclaimerText')} />
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
