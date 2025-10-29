import { Alert } from 'antd';
import { Brain, Heart, Leaf, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { useAuthStore } from '../store/authStore';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="card-hover">
    <div className="text-primary mb-3">{icon}</div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted">{description}</p>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Welcome back, {userProfile?.displayName || user?.displayName}! 🌸
          </h1>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">{t('home.subtitle')}</p>

          <div className="space-x-4">
            <button onClick={() => navigate('/chat')} className="btn-primary text-lg px-8 py-3">
              {t('home.openChat')}
            </button>
            <button onClick={() => navigate('/meals')} className="btn-secondary text-lg px-8 py-3">
              {t('home.viewMeals')}
            </button>
          </div>
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/chat')}
              className="p-6 border-2 border-surface rounded-lg hover:border-primary hover:bg-surface transition text-left"
            >
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-bold mb-1">Ask Sakhee</h3>
              <p className="text-sm text-muted">Get instant answers about PCOS</p>
            </button>

            <button
              onClick={() => navigate('/progress')}
              className="p-6 border-2 border-surface rounded-lg hover:border-primary hover:bg-surface transition text-left"
            >
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold mb-1">Log Progress</h3>
              <p className="text-sm text-muted">Track your daily symptoms</p>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="p-6 border-2 border-surface rounded-lg hover:border-primary hover:bg-surface transition text-left"
            >
              <div className="text-3xl mb-2">📄</div>
              <h3 className="font-bold mb-1">Upload Report</h3>
              <p className="text-sm text-muted">Analyze your lab results</p>
            </button>
          </div>
        </div>

        <Alert
          message={t('common.disclaimer')}
          description={t('common.disclaimerText')}
          type="warning"
          showIcon
          closable
          className="mt-12"
        />
      </div>
    </div>
  );
};

export default HomePage;
