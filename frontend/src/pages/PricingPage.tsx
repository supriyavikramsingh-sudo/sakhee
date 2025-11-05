import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { PricingCard } from '../components/pricing/PricingCard';
import { pricingData } from '../config/pricingConfig';
import { useAuthStore } from '../store/authStore';
import subscriptionApi from '../services/subscriptionApi';
import type { UserSubscriptionState, SubscriptionData } from '../types/subscription.type';

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
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-peach-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Affordable PCOS management for every stage of your journey
          </p>
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
              className={`px-6 py-2 rounded-md font-medium transition ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Yearly
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

        {/* Bottom Info */}
        <div className="text-center text-gray-600 text-sm mb-8">
          <p>7-day money-back guarantee · Cancel anytime · Secure payment</p>
        </div>

        {/* Learn More Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/pricing-details')}
            className="px-8 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition"
          >
            Find out more about our plans
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
