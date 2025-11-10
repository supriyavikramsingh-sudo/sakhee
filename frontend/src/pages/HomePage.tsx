import { Alert } from 'antd';
import { Cpu, FileHeart, Heart, Leaf, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/common/Footer';
import Qoutes from '../components/common/Qoutes';
import Navbar from '../components/layout/Navbar';
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
    <div className="h-screen snap-y snap-mandatory overflow-y-auto">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 pt-20">
        <section className="min-h-screen snap-start flex justify-between items-center px-4">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-4xl md:text-5xl text-center font-bold text-primary mb-4">
              Welcome, {userProfile?.displayName || user?.displayName}! <br />
            </h1>
            <p className="text-lg text-muted text-center mb-6 max-w-2xl">{t('home.subtitle')}</p>

            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/chat')} className="btn-primary text-lg px-8 py-3">
                {t('home.openChat')}
              </button>
              <button onClick={() => navigate('/meals')} className="btn-outline text-lg px-8 py-3">
                {t('home.viewMeals')}
              </button>
            </div>
            <Qoutes />
          </div>
          <img src="/images/undraw_confident_9v38.png" className="max-w-[550px]" />
        </section>

        <section className="flex flex-col gap-8 min-h-screen snap-start items-center justify-center pt-[80px] px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-8">
            Why women across India choose Sakhee?
          </h1>
          <div className="grid align-middle place-items-center md:grid-cols-3 gap-6 px-4 w-full max-w-6xl">
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
          <div className="flex justify-center gap-16 mt-8">
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
          message={t('common.disclaimer')}
          description={t('common.disclaimerText')}
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
