import { Award, Heart, Linkedin, SparkleIcon, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from './Footer';
import Navigation from './Navigation';

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const ValueCard = ({ icon, title, description, delay = 0 }: ValueCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -10, transition: { duration: 0.2 } }}
    className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
  >
    <div className="flex flex-col items-center text-center gap-4">
      <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="text-primary">
        {icon}
      </motion.div>
      <h3 className="font-bold text-xl">{title}</h3>
      <p className="text-muted">{description}</p>
    </div>
  </motion.div>
);

interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  description: string;
  link: string;
  delay?: number;
}

const TeamMember = ({ image, name, role, description, link, delay = 0 }: TeamMemberProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -10 }}
    className="bg-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow"
  >
    <div className="flex flex-col gap-3">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="w-48 h-48 md:w-80 md:h-80 rounded-full mx-auto overflow-hidden ring-4 ring-secondary"
      >
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </motion.div>
      <h3 className="font-bold text-xl text-center">{name}</h3>
      <p className="text-primary font-semibold text-center">{role}</p>
      <p className="text-muted text-center">{description}</p>
      <motion.a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.05 }}
        className="text-blue-500 font-semibold text-center flex items-center justify-center gap-2"
      >
        <Linkedin size={16} /> Connect on LinkedIn
      </motion.a>
    </div>
  </motion.div>
);

const AboutUsPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl"
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -60, 30, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute top-60 right-10 w-96 h-96 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl"
            animate={{
              x: [0, -40, 50, 0],
              y: [0, 50, -40, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
          <motion.div
            className="absolute bottom-40 left-1/3 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-xl"
            animate={{
              x: [0, 30, -50, 0],
              y: [0, -40, 60, 0],
              scale: [1, 1.1, 0.9, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 4,
            }}
          />
        </div>

        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-block mb-4 px-4 py-2 bg-secondary rounded-full"
            >
              <span className="text-sm font-semibold text-primary flex items-center gap-1">
                <SparkleIcon /> Our Story
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-primary mb-6"
            >
              About AI Sakhee
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted max-w-3xl mx-auto leading-relaxed"
            >
              Empowering women across India to take control of their PCOS journey through
              personalized AI-powered health solutions that understand culture, lifestyle, and
              individual needs.
            </motion.p>
          </section>

          {/* Mission Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 bg-gradient-to-r from-primary to-accent rounded-2xl p-6 md:p-12 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-1"
              >
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
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
                className="flex-1"
              >
                <img
                  src="/images/undraw_happy-women-day_8whn.svg"
                  alt="Mission"
                  className="w-full max-w-md mx-auto drop-shadow-xl"
                />
              </motion.div>
            </div>
          </motion.section>

          {/* Our Story Section */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-primary text-center mb-8"
            >
              Our Story
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl"
            >
              <p className="text-lg text-muted leading-relaxed mb-4">
                AI Sakhee was born from a deeply personal place, a decade-long journey of living
                with PCOS, searching for answers, and feeling profoundly alone in the process.
              </p>
              <p className="text-lg text-muted leading-relaxed mb-4">
                For over 10 years, I navigated the challenges of PCOS, symptoms that started years
                before my formal diagnosis in 2021, countless doctor visits, confusing advice, and
                the overwhelming isolation that comes with managing a condition that touches every
                aspect of your life. Through trial, error, research, and persistence, I learned to
                manage and reverse most of my symptoms. But the loneliness of that journey never
                left me.
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
            </motion.div>
          </motion.section>

          {/* Core Values Section */}
          <section className="mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-primary text-center mb-12"
            >
              Our Core Values
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ValueCard
                icon={<Heart size={48} />}
                title="Empathy First"
                description="We understand that PCOS is more than a medical condition—it's a daily challenge that affects every aspect of life."
                delay={0}
              />
              <ValueCard
                icon={<Target size={48} />}
                title="Personalization"
                description="Every woman's PCOS journey is unique. Our AI adapts to your specific needs, preferences, and goals."
                delay={0.1}
              />
              <ValueCard
                icon={<Award size={48} />}
                title="Research-Backed Guidance"
                description="We stay current with the latest PCOS research to provide you with accurate, trustworthy information."
                delay={0.2}
              />
              <ValueCard
                icon={<Users size={48} />}
                title="Community Support"
                description="You're not alone. We're building a supportive community of women who understand your journey."
                delay={0.3}
              />
            </div>
          </section>

          {/* What Makes Us Different */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 bg-white rounded-2xl p-6 md:p-12 shadow-2xl"
          >
            <h2 className="text-4xl font-bold text-primary text-center mb-12">
              What Makes Us Different
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -10 }}
                className="text-center p-6 rounded-xl hover:bg-secondary/30 transition-colors"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-5xl font-bold text-primary mb-4"
                >
                  24/7
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">AI Health Companion</h3>
                <p className="text-muted">
                  Get instant answers to your PCOS questions anytime, backed by medical research and
                  real experiences.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -10 }}
                className="text-center p-6 rounded-xl hover:bg-secondary/30 transition-colors"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-5xl font-bold text-primary mb-4"
                >
                  100%
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Indian-Focused</h3>
                <p className="text-muted">
                  Meal plans, recipes, and guidance tailored specifically for Indian cuisine,
                  culture, and lifestyle.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -10 }}
                className="text-center p-6 rounded-xl hover:bg-secondary/30 transition-colors"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-5xl font-bold text-primary mb-4"
                >
                  35M+
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">PCOS Fighters</h3>
                <p className="text-muted">
                  Help us build India's first community for millions managing PCOS.
                </p>
              </motion.div>
            </div>
          </motion.section>

          {/* Team Section (Optional - customize with actual team info) */}
          <section>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-primary text-center mb-12"
            >
              Meet Our Team
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              <TeamMember
                link="https://www.linkedin.com/in/supriya-singh97/"
                image="/images/supriya-headshot.jpeg"
                name="Supriya Singh"
                role="CEO, Founder (Product & AI)"
                description="Product Manager with 4.5 years of experience. Bachelors in Computer Science Engineering and MSc in Management from SMU Singapore. Ex-Avalara, Adani Digital Labs"
                delay={0}
              />
              <TeamMember
                link="https://www.linkedin.com/in/utkarsh-gupta98/"
                image="/images/utkarsh-headshot.jpeg"
                name="Utkarsh Gupta"
                role="Co-Founder (Engineering)"
                description="Lead Software Engineer with 5 years of experience specializing in full-stack development."
                delay={0.1}
              />
              <TeamMember
                link="https://www.linkedin.com/in/rashiatry/"
                image="/images/rashi-headshot.png"
                name="Rashi Atry"
                role="Co-Founder (Marketing & GTM)"
                description="Product Manager with 13 years of experience in building user-centric products. Ex-TatvaCare, Dream11, Naukri.com."
                delay={0.2}
              />
            </div>
          </section>

          {/* Team Section (Optional - customize with actual team info) */}
          <section>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold text-primary text-center my-12"
            >
              Meet Our Mentor
            </motion.h2>
            <div className="grid md:grid-cols-1 gap-8">
              <TeamMember
                link="https://www.linkedin.com/in/revathi/"
                image="/images/rev-headshot.jpeg"
                name="Revathi Raghunath"
                role="Mentor"
                description="Experienced Mentor and AI Strategy & Transformation Leader | Co-founder- Garage Labs (AceAI.Club, PMx Global, World of Women in AI) | Ex-CMO Randstad."
                delay={0.3}
              />
            </div>
          </section>

          {/* CTA Section */}
          {
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center bg-gradient-to-r from-primary to-accent text-white rounded-2xl p-12 mt-10 shadow-2xl"
            >
              <h2 className="text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                Join a community of women who are taking control of their PCOS with AI Sakhee.
                Coming Soon!
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <motion.button
                  onClick={() => navigate('/')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Join our community
                </motion.button>
                <motion.a
                  href="https://www.linkedin.com/company/ai-sakhee/"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg"
                >
                  <Linkedin size={20} />
                  Follow Us on LinkedIn
                </motion.a>
              </div>
            </motion.section>
          }
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AboutUsPage;
