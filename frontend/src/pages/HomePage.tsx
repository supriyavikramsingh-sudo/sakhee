import { Alert } from 'antd';
import { Cpu, FileHeart, Heart, Leaf, Zap } from 'lucide-react';
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
          <div>
            <h1 className="text-4xl md:text-5xl text-center font-bold text-primary mb-4">
              Welcome back,
              {userProfile?.displayName || user?.displayName}! <br />
            </h1>
            <p className="text-lg text-muted text-center mb-6 max-w-2xl">{t('home.subtitle')}</p>

            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/chat')} className="btn-primary text-lg px-8 py-3">
                {t('home.openChat')}
              </button>
              <button
                onClick={() => navigate('/meals')}
                className="btn-secondary text-lg px-8 py-3"
              >
                {t('home.viewMeals')}
              </button>
            </div>
          </div>
          <img src="/images/undraw_confident_9v38.svg" className="max-w-[500px]" />
        </section>

        <section className="min-h-screen snap-start flex items-center px-4">
          <div className="bg-white/70 rounded-lg p-8 shadow-lg mx-auto max-w-3xl">
            <h3 className="font-bold text-xl mb-4">What you get</h3>
            <ul className="space-y-3 text-sm text-muted">
              <li>• AI-driven, medically-informed guidance tailored to your needs.</li>
              <li>• Personalized meal plans and nutrition suggestions.</li>
              <li>• Symptom and progress tracking with visual reports.</li>
              <li>• Secure upload and intelligent parsing of lab reports.</li>
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-8 min-h-screen snap-start items-center justify-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-8">Key features</h1>
          <div className="grid align-middle place-items-center md:grid-cols-3 gap-6 px-4 w-full max-w-6xl">
            <FeatureCard
              icon={<Cpu className="w-8 h-8" />}
              title={t('home.features.ai') || 'AI insights'}
              description={
                t('home.features.aiDesc') || 'Personalized suggestions powered by research.'
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

      <footer className="snap-end flex items-center justify-center mt-8 pb-4 w-full">
        <Alert
          message={t('common.disclaimer')}
          description={t('common.disclaimerText')}
          type="warning"
          showIcon
          closable
          className="mt-12 w-full max-w-7xl"
        />
      </footer>
    </div>
  );
};

export default HomePage;
