import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useUserProfileStore } from '../store'
import Navbar from '../components/layout/Navbar'
import OnboardingForm from '../components/onboarding/OnboardingForm'
import { CheckCircle } from 'lucide-react'

const OnboardingPage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [userData, setUserData] = useState({})
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const { setProfile, setOnboarded } = useUserProfileStore()

  const steps = [
    { title: t('onboarding.step1.title'), description: t('onboarding.step1.desc') },
    { title: t('onboarding.step2.title'), description: t('onboarding.step2.desc') },
    { title: t('onboarding.step3.title'), description: t('onboarding.step3.desc') },
    { title: t('onboarding.step4.title'), description: t('onboarding.step4.desc') },
    { title: t('onboarding.step5.title'), description: t('onboarding.step5.desc') }
  ]

  const handleStepComplete = async (stepData) => {
    try {
      setLoading(true)
      const newUserData = { ...userData, ...stepData }
      setUserData(newUserData)

      if (currentStep === steps.length - 1) {
        // Complete onboarding
        const userId = 'user_' + Date.now()
        
        setUser({
          id: userId,
          email: newUserData.email,
          ...newUserData
        })
        setProfile(newUserData)
        setOnboarded(true)

        // Redirect to chat
        navigate('/chat')
      } else {
        // Move to next step
        setCurrentStep(currentStep + 1)
      }
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-background">
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
                      : 'bg-surface text-muted'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle size={20} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      idx < currentStep ? 'bg-success' : 'bg-surface'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-muted">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <OnboardingForm
            step={currentStep}
            onComplete={handleStepComplete}
            onBack={handleBack}
            loading={loading}
          />
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-8 bg-warning bg-opacity-10 border-l-4 border-warning p-4 rounded">
          <p className="text-sm text-gray-700">
            ⚠️ {t('common.disclaimerText')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage