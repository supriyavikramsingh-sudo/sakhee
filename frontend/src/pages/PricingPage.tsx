import { IndianRupeeIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Navbar from '../components/layout/Navbar';
import { PricingCard } from '../components/pricing/PricingCard';
import { pricingData } from '../config/pricingConfig';
import subscriptionApi from '../services/subscriptionApi';
import { useAuthStore } from '../store/authStore';
import type { SubscriptionData, UserSubscriptionState } from '../types/subscription.type';

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [userState, setUserState] = useState<UserSubscriptionState | undefined>(undefined);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);

  // Load user subscription if authenticated
  useEffect(() => {
    const loadSubscription = async () => {
      if (!isAuthenticated || !user?.uid) {
        setUserState(undefined);
        return;
      }

      setIsLoadingSubscription(true);
      try {
        const response: any = await subscriptionApi.getSubscription(user.uid);
        if (response.success) {
          const data: SubscriptionData = response.data;
          setUserState({
            currentPlan: data.subscription_plan,
            isAuthenticated: true,
            isCanceled: data.subscription_status === 'canceled',
            endDate: data.subscription_end_date,
          });
        }
      } catch (error) {
        console.error('Failed to load subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    loadSubscription();
  }, [isAuthenticated, user]);

  const handleCTAClick = (planId: string) => {
    if (!isAuthenticated) {
      // Redirect to login/signup
      navigate('/login', { state: { from: '/pricing', planId } });
      return;
    }

    if (planId === 'free' && userState?.currentPlan === 'pro') {
      // Switch to free - go to settings
      navigate('/settings/subscription');
      return;
    }

    if (planId === 'pro' && userState?.currentPlan === 'free') {
      // Upgrade to pro - go to settings subscription section
      navigate('/settings/subscription');
      return;
    }

    // For current plan or disabled plans, do nothing
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <PageHeader
          title={'Choose Your Sakhee Plan'}
          description={
            ' Affordable PCOS care for every woman in India. Start free, upgrade as you grow. No long-term commitments, cancel anytime.'
          }
          icon={<IndianRupeeIcon size={30} className="text-primary" strokeWidth={3} />}
        />
        <div className="bg-white py-6 rounded-b-lg">
          <div className="text-center mb-12">
            {/* Trust Badges */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
                <p className="text-sm text-gray-700">
                  No payment required
                  <br />
                  for Free plan
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-100 rounded-full">
                  <span className="text-primary text-xl">₹</span>
                </div>
                <p className="text-sm text-gray-700">
                  Pro plan: Just ₹17/day—
                  <br />
                  less than a cup of chai
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                  <span className="text-blue-600 text-xl">🔒</span>
                </div>
                <p className="text-sm text-gray-700">
                  Your data stays with you,
                  <br />
                  always
                </p>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-col items-center mb-12">
            <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition ${
                  billingCycle === 'monthly'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-md font-medium transition relative ${
                  billingCycle === 'yearly'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                  Save ₹1,000+
                </span>
              </button>
            </div>

            {billingCycle === 'yearly' && (
              <div className="mt-3 inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                💰 Save 2 months with annual billing!
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
            {pricingData.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                userState={isLoadingSubscription ? undefined : userState}
                onCTAClick={() => handleCTAClick(plan.id)}
              />
            ))}
          </div>

          {/* Learn More Button */}
          <div className="text-center mb-16">
            <button
              onClick={() => navigate('/pricing-details')}
              className="px-8 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition"
            >
              Find out more about our plans
            </button>
          </div>

          {/* Trust Signals Footer */}
          <div className="max-w-5xl mx-auto">
            {/* Terms and Privacy */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600 leading-relaxed">
                By creating an account you agree to our{' '}
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
                <br />
                Your health data is encrypted, HIPAA-compliant, and never shared without consent.
              </p>
            </div>

            {/* Statistics */}
            <div className="grid md:grid-cols-3 gap-6 bg-white rounded-lg p-8">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔒</span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Secure payments</h3>
                <p className="text-sm text-gray-600">All transactions encrypted and protected</p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🛡️</span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">HIPAA-compliant storage</h3>
                <p className="text-sm text-gray-600">Medical-grade data security standards</p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💬</span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">24/7 AI support</h3>
                <p className="text-sm text-gray-600">Your PCOS companion, always available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
