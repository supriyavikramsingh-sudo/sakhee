import {
  Cpu,
  FileHeart,
  FlaskConicalIcon,
  Heart,
  Leaf,
  MessageCircle,
  TrendingUpIcon,
  Utensils,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/common/Footer';
import Logo from '/images/logo.svg';

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  index?: number;
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

const Cards = ({ index, title, description }: FeatureCardProps) => (
  <div className="px-6 py-4 shadow-[0_0_1px_#ff8d8d,0_0_2px_#171a1f14] shadow-xs rounded-lg">
    <p className="text-primary text-[48px] lora-600">{index}.</p>
    <h3 className="font-semibold text-2xl mb-[10px]">{title}</h3>
    <p className="text-muted">{description}</p>
  </div>
);

const Section2Cards = ({ icon, title, description }: FeatureCardProps) => (
  <div className="px-6 py-4 shadow-[0_0_1px_#ff8d8d,0_0_2px_#171a1f14] gap-4 flex-1 bg-white shadow-xs flex flex-col items-center rounded-lg">
    <p className="text-primary text-[48px] lora-600">{icon}</p>
    <h3 className="font-semibold text-2xl text-center">{title}</h3>
    <p className="text-muted text-center">{description}</p>
  </div>
);

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="h-screen snap-y snap-mandatory overflow-y-auto">
      <header className="bg-white mx-auto sticky top-0 flex items-center justify-between p-4 z-10 shadow-xl">
        <img src={Logo} className="h-12" alt="Sakhee" />
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="btn-outline">
            Sign in
          </button>
          <a href="#section2" className="btn-primary">
            Learn More
          </a>
        </div>
      </header>

      <main className="mx-auto px-4">
        <section className="min-h-screen snap-start flex items-center pt-[80px] px-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Your PCOS journey, supported every step of the way
            </h1>
            <p className="text-lg text-muted mb-6 max-w-2xl">
              Join thousands of women across India managing PCOS with personalized meal plans,
              AI-powered guidance, and tools that understand your body, culture, and lifestyle.
            </p>

            <div className="flex gap-4">
              <button onClick={() => navigate('/login')} className="btn-primary px-6 py-3">
                Start for Free
              </button>
              <button onClick={() => navigate('/login')} className="btn-outline px-6 py-3">
                Already a member? Sign in
              </button>
            </div>
          </div>
          <img src="/images/login-avatar.svg" />
        </section>

        <section id="section2" className="min-h-screen snap-start flex items-center pt-[80px] px-4">
          <div className="bg-[#FAFAFAFF] p-12 rounded-xl flex flex-col gap-11">
            <div className="flex flex-col items-center justify-center gap-[30px]">
              <h3 className="font-bold text-center text-[40px]">Discover Our Powerful Features</h3>
              <p className="text-center text-lg max-w-[650px]">
                Harness the power of AI to gain deeper insights into your health, personalize your
                wellness journey, and achieve your goals with confidence.
              </p>
            </div>
            <div className="flex gap-[30px]">
              <Section2Cards
                icon={<MessageCircle size={48} />}
                title={'AI Chat Assistant'}
                description={
                  'AI health companion trained on medical research + real PCOS experiences'
                }
              />
              <Section2Cards
                icon={<Utensils size={48} />}
                title={'Personalized Meal Plans'}
                description={'Personalized Indian meal plans that fit your taste, diet, and budget'}
              />
              <Section2Cards
                icon={<TrendingUpIcon size={48} />}
                title={'Progress Tracking'}
                description={'Smart symptom tracking with visual progress reports'}
              />
              <Section2Cards
                icon={<FlaskConicalIcon size={48} />}
                title={'Lab Report Analysis'}
                description={
                  'Lab report analysis in simple language to help you understand your PCOS better'
                }
              />
            </div>
          </div>
        </section>

        <section className="min-h-screen snap-start flex items-center pt-[80px] px-4">
          <div className="flex flex-col gap-11">
            <div className="flex flex-col items-center justify-center gap-[30px]">
              <h3 className="font-bold text-center text-[40px]">
                Your Path to Better Health, Simplified
              </h3>
              <p className="text-center text-lg max-w-[600px]">
                Getting started with AISakhee is easy. Follow these simple steps to unlock a world
                of personalized wellness insights.
              </p>
            </div>
            <div className="flex gap-[30px]">
              <Cards
                title={'Sign Up for Free'}
                description={
                  'Create your free account in minutes to begin your personalized health journey.'
                }
                index={1}
              />
              <Cards
                title={'Personalize Your Profile'}
                description={
                  'Tell us about your unique health goals, dietary preferences, and any specific needs.'
                }
                index={2}
              />
              <Cards
                title={'Explore & Thrive'}
                description={
                  'Access AI chat, generate meal plans, track progress, and analyze reports effortlessly.'
                }
                index={3}
              />
            </div>
          </div>
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

      <section className="flex flex-col gap-8 text-white items-center justify-center px-4 mt-10">
        <div className="bg-primary flex flex-col items-center gap-2 justify-center py-12 max-w-7xl w-full rounded-xl">
          <h2 className="text-center text-[36px]">Ready to Transform Your Health?</h2>
          <p className="text-center text-lg">
            Join thousands of women who are taking charge of their well-being with AI Sakhee. Get
            started today with a free trial!
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-outline text-lg rounded-lg w-fit mt-2"
          >
            Start Your Free Trial
          </button>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default LandingPage;
