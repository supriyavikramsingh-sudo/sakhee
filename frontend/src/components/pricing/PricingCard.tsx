import { Check } from 'lucide-react';
import type { FC } from 'react';
import type { PricingCardData, UserSubscriptionState } from '../../types/subscription.type';

interface PricingCardProps {
  plan: PricingCardData;
  billingCycle: 'monthly' | 'yearly';
  userState?: UserSubscriptionState;
  onCTAClick: () => void;
}

export const PricingCard: FC<PricingCardProps> = ({ plan, billingCycle, userState, onCTAClick }) => {
  const isCurrentPlan = userState?.currentPlan === plan.id;
  const isCanceled = userState?.isCanceled && isCurrentPlan;
  
  const getCTAButton = () => {
    if (!userState?.isAuthenticated) {
      // Not logged in - show standard CTA
      return (
        <button
          onClick={onCTAClick}
          disabled={plan.isDisabled}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
            plan.id === 'free'
              ? 'border-2 border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50'
              : plan.isDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primaryDark'
          }`}
        >
          {plan.ctaText}
        </button>
      );
    }

    // User is logged in
    if (isCurrentPlan) {
      return (
        <div>
          <div className="mb-3 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-center font-medium">
            You are on this plan
          </div>
          {plan.id === 'pro' && isCanceled && userState.endDate && (
            <p className="text-sm text-red-600 text-center">
              Ends on {new Date(userState.endDate).toLocaleDateString()}
            </p>
          )}
          <button
            disabled
            className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
          >
            CURRENT PLAN
          </button>
        </div>
      );
    }

    if (plan.id === 'free' && userState.currentPlan === 'pro') {
      // Pro user can switch to free
      return (
        <button
          onClick={onCTAClick}
          className="w-full py-3 px-6 rounded-lg font-semibold border-2 border-gray-400 text-gray-700 hover:bg-gray-100 transition"
        >
          Switch to Free
        </button>
      );
    }

    if (plan.id === 'pro' && userState.currentPlan === 'free') {
      // Free user can upgrade to pro
      return (
        <button
          onClick={onCTAClick}
          className="w-full py-3 px-6 rounded-lg font-semibold bg-primary text-white hover:bg-primaryDark transition"
        >
          UPGRADE TO PRO
        </button>
      );
    }

    // MAX plan - always disabled
    return (
      <button
        disabled
        className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-300 text-gray-500 cursor-not-allowed"
      >
        {plan.ctaText}
      </button>
    );
  };

  const getFeatureIcon = (feature: any) => {
    if (feature.comingSoon) {
      return <span className="w-5 h-5 text-gray-300">○</span>;
    }
    return <Check className="w-5 h-5 text-green-500" />;
  };

  const getPremiumStars = (feature: any) => {
    if (feature.isDoublePremium) return ' ⭐⭐';
    if (feature.isPremium) return ' ⭐';
    return '';
  };

  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg p-6 flex flex-col ${
        plan.isPopular ? 'ring-2 ring-primary' : ''
      } ${plan.isDisabled ? 'opacity-60' : ''}`}
    >
      {/* Badge */}
      {plan.isPopular && !plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
          MOST POPULAR
        </div>
      )}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
        
        <div className="mb-2">
          <span className="text-4xl font-bold text-primary">
            ₹{billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm">{plan.subtitle[billingCycle]}</p>
        
        {plan.value && (
          <div className="mt-2 inline-block bg-pink-100 text-primary px-3 py-1 rounded-full text-xs font-medium">
            {plan.value}
          </div>
        )}
      </div>

      {/* Tagline */}
      <p className="text-center text-gray-500 text-sm mb-6">{plan.tagline}</p>

      {/* Features */}
      <div className="flex-1 mb-6">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li
              key={index}
              className={`flex items-start gap-3 ${
                feature.comingSoon ? 'text-gray-400' : 'text-gray-700'
              }`}
            >
              <span className="mt-0.5">{getFeatureIcon(feature)}</span>
              <span className="text-sm">
                {feature.text}
                {getPremiumStars(feature)}
                {feature.comingSoon && <span className="ml-1 text-xs">(Coming Soon)</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      {getCTAButton()}
    </div>
  );
};
