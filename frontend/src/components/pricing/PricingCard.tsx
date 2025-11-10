import { Check } from 'lucide-react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PricingCardData, UserSubscriptionState } from '../../types/subscription.type';

interface PricingCardProps {
  plan: PricingCardData;
  billingCycle: 'monthly' | 'yearly';
  userState?: UserSubscriptionState;
  onCTAClick: () => void;
}

export const PricingCard: FC<PricingCardProps> = ({
  plan,
  billingCycle,
  userState,
  onCTAClick,
}) => {
  const navigate = useNavigate();
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
            Current Plan
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
      return <span className="w-5 h-5 text-gray-300 flex-shrink-0">○</span>;
    }
    return <Check className="w-5 h-5 text-green-500 flex-shrink-0" />;
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
          Most Popular
        </div>
      )}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gray-400 text-white px-4 py-1 rounded-full text-sm font-semibold">
            {plan.badge}
          </div>
          {plan.badgeSubtext && (
            <div className="text-xs text-gray-500 text-center mt-1">{plan.badgeSubtext}</div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 mt-2">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>

        <div className="mb-2">
          <span className="text-4xl font-bold text-primary">
            ₹
            {billingCycle === 'monthly'
              ? `${plan.price.monthly}/month`
              : `${plan.price.yearly}/year`}
          </span>
        </div>

        <p className="text-gray-600 text-sm">{plan.subtitle[billingCycle]}</p>
      </div>

      {/* Tagline */}
      <p className="text-center text-gray-500 text-sm mb-4">{plan.tagline}</p>

      {/* Plan Description */}
      {plan.planDescription && (
        <p className="text-center text-gray-600 text-sm mb-6 px-2 leading-relaxed">
          {plan.planDescription}
        </p>
      )}

      {/* Features */}
      <div className="flex-1 mb-4">
        <ul className="space-y-4">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="mt-0.5">{getFeatureIcon(feature)}</span>
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    feature.comingSoon ? 'text-gray-400 opacity-60' : 'text-gray-700'
                  }`}
                >
                  {feature.text}
                  {getPremiumStars(feature)}
                  {feature.comingSoon && <span className="ml-1 text-xs">(Coming Soon)</span>}
                </div>
                {feature.description && (
                  <div
                    className={`text-xs mt-1 leading-relaxed ${
                      feature.comingSoon ? 'text-gray-400 opacity-60' : 'text-gray-500'
                    }`}
                  >
                    {feature.description}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* See all features link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/pricing-details')}
            className="text-sm text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            See all features <span>→</span>
          </button>
        </div>
      </div>

      {/* Value Props */}
      {plan.valueProps && plan.valueProps.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <ul className="space-y-2">
            {plan.valueProps.map((prop, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{prop}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Button */}
      {getCTAButton()}
    </div>
  );
};
