import { Award, Heart, Linkedin, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import Navigation from './Navigation';

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ValueCard = ({ icon, title, description }: ValueCardProps) => (
  <div className="bg-white p-6 rounded-lg shadow-[0_0_1px_#ff8d8d,0_0_2px_#171a1f14] hover:shadow-lg transition-shadow">
    <div className="flex flex-col items-center text-center gap-4">
      <div className="text-primary">{icon}</div>
      <h3 className="font-bold text-xl">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  </div>
);

interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  description: string;
  link: string;
}

const TeamMember = ({ image, name, role, description, link }: TeamMemberProps) => (
  <div className="bg-white p-6 rounded-lg shadow-[0_0_1px_#ff8d8d,0_0_2px_#171a1f14]">
    <div className="flex flex-col gap-3">
      <div className="w-80 h-80 rounded-full mx-auto overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <h3 className="font-bold text-xl text-center">{name}</h3>
      <p className="text-primary font-semibold text-center">{role}</p>
      <p className="text-muted text-center">{description}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 font-semibold text-center"
      >
        <Linkedin size={16} className="inline-block ml-1" /> Connect on LinkedIn
      </a>
    </div>
  </div>
);

const AboutUsPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold text-primary mb-6">About AI Sakhee</h1>
          <p className="text-xl text-muted max-w-3xl mx-auto leading-relaxed">
            Empowering women across India to take control of their PCOS journey through personalized
            AI-powered health solutions that understand culture, lifestyle, and individual needs.
          </p>
        </section>

        {/* Mission Section */}
        <section className="mb-16 bg-gradient-to-r from-primary to-secondary rounded-xl p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-4xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-lg text-white leading-relaxed mb-4">
                PCOS affects millions of women in India, yet many struggle to find personalized,
                culturally-relevant guidance that fits their daily lives. We created AI Sakhee to
                bridge this gap.
              </p>
              <p className="text-lg text-white leading-relaxed">
                Our mission is to make managing PCOS easier, more accessible, and more effective
                through cutting-edge AI technology combined with deep understanding of Indian
                culture, cuisine, and lifestyle.
              </p>
            </div>
            <div className="flex-1">
              <img
                src="/images/undraw_happy-women-day_8whn.svg"
                alt="Mission"
                className="w-full max-w-md mx-auto"
              />
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-primary text-center mb-8">Our Story</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-muted leading-relaxed mb-4">
              AI Sakhee was born from a deeply personal place, a decade-long journey of living with
              PCOS, searching for answers, and feeling profoundly alone in the process.
            </p>
            <p className="text-lg text-muted leading-relaxed mb-4">
              For over 10 years, I navigated the challenges of PCOS,symptoms that started years
              before my formal diagnosis in 2021, countless doctor visits, confusing advice, and the
              overwhelming isolation that comes with managing a condition that touches every aspect
              of your life. Through trial, error, research, and persistence, I learned to manage and
              reverse most of my symptoms. But the loneliness of that journey never left me.
            </p>
            <p className="text-lg text-muted leading-relaxed">
              As a woman in STEM with a background in computer science and product management, I
              realized I could combine my personal experience with technology to create something
              that didn't exist when I needed it most—a companion for women navigating PCOS.
            </p>
            <br />
            <p className="text-lg text-muted leading-relaxed">
              AI Sakhee isn't just a health app. It's the friend I wished I had during my darkest
              moments. It's the culturally-aware guide that understands Indian cuisine and
              lifestyle. It's the 24/7 support system that never judges, always listens, and
              provides personalized guidance based on real medical research and lived experiences.
            </p>
            <p className="font-bold mt-4 text-primary text-lg">— Supriya Singh, Founder & CEO</p>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueCard
              icon={<Heart size={48} />}
              title="Empathy First"
              description="We understand that PCOS is more than a medical condition—it's a daily challenge that affects every aspect of life."
            />
            <ValueCard
              icon={<Target size={48} />}
              title="Personalization"
              description="Every woman's PCOS journey is unique. Our AI adapts to your specific needs, preferences, and goals."
            />
            <ValueCard
              icon={<Award size={48} />}
              title="Research-Backed Guidance"
              description="We stay current with the latest PCOS research to provide you with accurate, trustworthy information."
            />
            <ValueCard
              icon={<Users size={48} />}
              title="Community Support"
              description="You're not alone. We're building a supportive community of women who understand your journey."
            />
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16 bg-white rounded-xl p-12 shadow-lg">
          <h2 className="text-4xl font-bold text-primary text-center mb-12">
            What Makes Us Different
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-4">24/7</div>
              <h3 className="text-xl font-semibold mb-2">AI Health Companion</h3>
              <p className="text-muted">
                Get instant answers to your PCOS questions anytime, backed by medical research and
                real experiences.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-4">100%</div>
              <h3 className="text-xl font-semibold mb-2">Indian-Focused</h3>
              <p className="text-muted">
                Meal plans, recipes, and guidance tailored specifically for Indian cuisine, culture,
                and lifestyle.
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-4">35M+</div>
              <h3 className="text-xl font-semibold mb-2">PCOS Fighters</h3>
              <p className="text-muted">
                Help us build India's first community for millions managing PCOS.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section (Optional - customize with actual team info) */}
        <section>
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <TeamMember
              link="https://www.linkedin.com/in/supriya-singh97/"
              image="/images/supriya-headshot.jpeg"
              name="Supriya Singh"
              role="CEO, Founder"
              description="Product Manager with 4.5 years of experience. Bachelors in Computer Science Engineering and MSc in Management from SMU Singapore."
            />
            <TeamMember
              link="https://www.linkedin.com/in/utkarsh-gupta98/"
              image="/images/utkarsh-headshot.jpeg"
              name="Utkarsh Gupta"
              role="CTO, Co-Founder"
              description="Lead Software Engineer with 5 years of experience specializing in frontend and full-stack development."
            />
          </div>
        </section>

        {/* CTA Section */}
        {
          <section className="text-center bg-primary text-white rounded-xl p-12 mt-10">
            <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join a community of women who are taking control of their PCOS with AI Sakhee. Coming
              Soon!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/')}
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Join our community
              </button>
            </div>
          </section>
        }
      </main>
      <Footer />
    </>
  );
};

export default AboutUsPage;
