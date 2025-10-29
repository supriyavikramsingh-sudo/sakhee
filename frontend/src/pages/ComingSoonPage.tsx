import { ArrowLeft, Calendar, Mail, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const ComingSoonPage = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex gap-4 items-center justify-center -ml-24">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary bg-opacity-10 rounded-full">
              <Sparkles className="text-primary" size={40} />
            </div>

            <h1 className="text-5xl font-bold text-primary">Sakhee Pro</h1>
          </div>

          <p className="text-2xl text-gray-600 mb-8">Coming Soon</p>

          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-gray-700 mb-6">
              We're working hard to bring you unlimited meal plans, advanced health tracking,
              personalized exercise recommendations, and exclusive PCOS management features.
            </p>

            <div className="bg-surface p-8 rounded-lg shadow-lg mb-8">
              <h2 className="text-xl font-bold text-primary mb-4">
                What to Expect with Sakhee Pro
              </h2>

              <ul className="text-left space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">✨</span>
                  <span>Unlimited meal plan generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">📊</span>
                  <span>Advanced progress tracking & analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">🏋️</span>
                  <span>Personalized exercise plans</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">🔔</span>
                  <span>Smart reminders for medications & habits</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">🩺</span>
                  <span>Priority support from health experts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary text-xl">👥</span>
                  <span>Exclusive community access</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <Calendar className="text-gray-500" size={24} />
              <p className="text-gray-600">
                Expected launch: <span className="font-bold text-primary">Q1 2026</span>
              </p>
            </div>

            <div className="bg-primary bg-opacity-10 p-6 rounded-lg mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Mail className="text-primary" size={24} />
                <h3 className="text-lg font-bold text-primary">Stay Updated</h3>
              </div>
              <p className="text-gray-700 text-sm">
                Want to be notified when Sakhee Pro launches? We'll send you an email with early
                access pricing and exclusive launch benefits.
              </p>
              {/* TODO: Add email signup form in future */}
            </div>

            <Link
              to="/meals"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition font-medium"
            >
              <ArrowLeft size={20} />
              Back to Meal Plans
            </Link>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-12">
          <p>
            Currently enjoying Sakhee? Continue using your free meal plan and explore other
            features!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
