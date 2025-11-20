import { Alert } from 'antd';
import { Cpu, FileHeart, Heart, Leaf, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/common/Footer';
import Qoutes from '../components/common/Qoutes';
import { useAuthStore } from '../store/authStore';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="card">
    <div className="content">
      {icon}
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="para">{description}</p>
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="min-h-screen flex flex-col-reverse lg:flex-row justify-center md:justify-between items-center gap-8">
          <div className="flex flex-col items-center justify-center w-full lg:w-1/2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-bold text-primary mb-4 px-4">
              Welcome, {userProfile?.displayName || user?.displayName}! <br />
            </h1>
            <p className="text-base sm:text-lg text-muted text-center mb-6 max-w-2xl px-4">
              {t('home.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full px-4 sm:w-auto">
              <button
                onClick={() => navigate('/chat')}
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto"
              >
                {t('home.openChat')}
              </button>
              <button
                onClick={() => navigate('/meals')}
                className="btn-outline text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto"
              >
                {t('home.viewMeals')}
              </button>
            </div>
            <Qoutes />
          </div>
          <img
            src="/images/undraw_happy-women-day_8whn.svg"
            className="w-full max-w-[300px] sm:max-w-[400px] lg:max-w-[550px] lg:w-1/2"
          />
        </section>

        <section className="flex flex-col gap-6 sm:gap-8 min-h-screen items-center justify-center px-4 py-12 sm:py-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4 sm:mb-8 text-center px-4">
            Why women across India choose Sakhee?
          </h1>
          <div className="grid align-middle place-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-4 w-full max-w-6xl">
            <FeatureCard
              icon={<Cpu className="w-8 h-8" />}
              title={t('home.features.ai') || 'AI That Actually Understands PCOS'}
              description={
                t('home.features.aiDesc') ||
                'Get answers instantly—backed by medical research, personalized to your symptoms, available 24/7.'
              }
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title={t('home.features.personalized') || 'Personalized care'}
              description={
                t('home.features.personalizedDesc') || 'Tailored plans based on your profile.'
              }
            />
            <FeatureCard
              icon={<Leaf className="w-8 h-8" />}
              title={t('home.features.meals') || 'Meal plans'}
              description={t('home.features.mealsDesc') || 'Weekly meal plans with shopping lists.'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 justify-center gap-6 sm:gap-16 mt-4 sm:mt-8 w-full max-w-6xl px-4">
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title={t('home.features.tracking') || 'Progress tracking'}
              description={
                t('home.features.trackingDesc') || 'Track symptoms and improvements over time.'
              }
            />
            <FeatureCard
              icon={<FileHeart className="w-8 h-8" />}
              title="AI Powered lab insights"
              description="Upload lab reports for simple analysis and food suggestions."
            />
          </div>
        </section>
      </main>

      <Footer>
        <Alert
          message={<h3 className="text-[#700f0f] font-bold">{t('common.disclaimer')}</h3>}
          description={<p className="text-[#700f0f] font-medium">{t('common.disclaimerText')}</p>}
          type="warning"
          showIcon
          closable
          className="w-full max-w-7xl"
        />
      </Footer>
    </div>
  );
};

export default HomePage;
