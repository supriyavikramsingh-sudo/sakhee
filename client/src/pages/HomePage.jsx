import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useUserProfileStore } from '../store'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import { Heart, Brain, Leaf, Zap } from 'lucide-react'

const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { onboarded } = useUserProfileStore()
  const { t } = useTranslation()

  useEffect(() => {
    // If not onboarded, redirect to onboarding
    if (!onboarded && !user) {
      navigate('/onboarding')
    }
  }, [onboarded, user, navigate])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            {t('home.title')}
          </h1>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
          
          {!user ? (
            <button
              onClick={() => navigate('/onboarding')}
              className="btn-primary text-lg px-8 py-3"
            >
              {t('home.getStarted')}
            </button>
          ) : (
            <div className="space-x-4">
              <button
                onClick={() => navigate('/chat')}
                className="btn-primary text-lg px-8 py-3"
              >
                {t('home.openChat')}
              </button>
              <button
                onClick={() => navigate('/meals')}
                className="btn-secondary text-lg px-8 py-3"
              >
                {t('home.viewMeals')}
              </button>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <FeatureCard
            icon={<Brain className="w-8 h-8" />}
            title={t('home.features.ai')}
            description={t('home.features.aiDesc')}
          />
          <FeatureCard
            icon={<Heart className="w-8 h-8" />}
            title={t('home.features.personalized')}
            description={t('home.features.personalizedDesc')}
          />
          <FeatureCard
            icon={<Leaf className="w-8 h-8" />}
            title={t('home.features.meals')}
            description={t('home.features.mealsDesc')}
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title={t('home.features.tracking')}
            description={t('home.features.trackingDesc')}
          />
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-warning bg-opacity-10 border-l-4 border-warning p-6 rounded">
          <h3 className="font-bold text-warning mb-2">⚠️ {t('common.disclaimer')}</h3>
          <p className="text-sm text-gray-700">
            {t('common.disclaimerText')}
          </p>
        </div>
      </div>
    </div>
  )
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="card-hover">
    <div className="text-primary mb-3">{icon}</div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted">{description}</p>
  </div>
)

export default HomePage