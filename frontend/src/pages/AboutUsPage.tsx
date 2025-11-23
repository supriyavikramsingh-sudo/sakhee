import { Award, Heart, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Footer from '../components/common/Footer';

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
  name: string;
  role: string;
  description: string;
}

const TeamMember = ({ name, role, description }: TeamMemberProps) => (
  <div className="bg-white p-6 rounded-lg shadow-[0_0_1px_#ff8d8d,0_0_2px_#171a1f14]">
    <div className="flex flex-col gap-3">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto" />
      <h3 className="font-bold text-xl text-center">{name}</h3>
      <p className="text-primary font-semibold text-center">{role}</p>
      <p className="text-muted text-center">{description}</p>
    </div>
  </div>
);

const AboutUsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <>
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
        <section className="mb-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-4xl font-bold text-primary mb-4">Our Mission</h2>
              <p className="text-lg text-muted leading-relaxed mb-4">
                PCOS affects millions of women in India, yet many struggle to find personalized,
                culturally-relevant guidance that fits their daily lives. We created AI Sakhee to
                bridge this gap.
              </p>
              <p className="text-lg text-muted leading-relaxed">
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
              AI Sakhee was born from a simple observation: women with PCOS needed more than generic
              health advice. They needed a companion that understood their unique challenges—from
              managing symptoms while juggling work and family, to finding PCOS-friendly Indian
              recipes that the whole family would enjoy.
            </p>
            <p className="text-lg text-muted leading-relaxed mb-4">
              We built AI Sakhee on the foundation of medical research, real experiences from
              thousands of women, and advanced AI technology. Every feature—from personalized meal
              plans to symptom tracking—is designed to make your PCOS journey more manageable and
              less overwhelming.
            </p>
            <p className="text-lg text-muted leading-relaxed">
              Today, thousands of women across India trust AI Sakhee as their daily health
              companion, and we're just getting started.
            </p>
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
              title="Evidence-Based"
              description="All our recommendations are grounded in medical research and validated by healthcare professionals."
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
              <div className="text-5xl font-bold text-primary mb-4">1000s</div>
              <h3 className="text-xl font-semibold mb-2">Women Empowered</h3>
              <p className="text-muted">
                Join thousands of women who are successfully managing their PCOS with AI Sakhee.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section (Optional - customize with actual team info) */}
        <section>
          <h2 className="text-4xl font-bold text-primary text-center mb-12">Meet Our Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TeamMember
              name="Healthcare Experts"
              role="Medical Advisory Board"
              description="Gynecologists and nutritionists who ensure our guidance is medically sound and safe."
            />
            <TeamMember
              name="AI Engineers"
              role="Technology Team"
              description="Building cutting-edge AI that understands PCOS and provides personalized recommendations."
            />
            <TeamMember
              name="PCOS Warriors"
              role="Community Support"
              description="Women with PCOS who share their experiences to make our platform more helpful and relatable."
            />
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="text-center bg-primary text-white rounded-xl p-12">
            <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of women who are taking control of their PCOS with AI Sakhee. Start
              your free trial today!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start for Free
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                View Pricing
              </button>
            </div>
          </section>
        )}
      </main>
      {isAuthenticated && <Footer />}
    </>
  );
};

export default AboutUsPage;
