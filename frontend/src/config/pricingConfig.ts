import type { PricingCardData } from '../types/subscription.type';

export const pricingData: PricingCardData[] = [
  {
    id: 'free',
    name: 'FREE',
    price: {
      monthly: 0,
      yearly: 0,
    },
    subtitle: {
      monthly: 'Start with Sakhee for free',
      yearly: 'Start with Sakhee for free',
    },
    tagline: 'Perfect for exploring',
    ctaText: 'START FREE',
    features: [
      {
        text: 'Unlimited AI chatbot',
        available: true,
      },
      {
        text: '1 meal plan generation (3/5/7 days, all cuisines & features)',
        available: true,
      },
      {
        text: '5 meal photo scans/month with basic nutritional guidance',
        available: false,
        comingSoon: true,
      },
      {
        text: 'Lab report AI analysis',
        available: true,
      },
      {
        text: 'Zomato ordering (no discount)',
        available: false,
        comingSoon: true,
      },
      {
        text: '2 languages (English, Hindi)',
        available: true,
      },
      {
        text: 'Coming soon: 6 regional languages (Telugu, Tamil, Marathi, Gujarati, Kannada, Bengali)',
        available: false,
        comingSoon: true,
      },
    ],
  },
  {
    id: 'pro',
    name: 'SAKHEE PRO',
    price: {
      monthly: 500,
      yearly: 5000,
    },
    subtitle: {
      monthly: '/month or ₹17/day',
      yearly: '/year or Save ₹1,000 (2 months free!)',
    },
    value: '₹600+ value for ₹500',
    tagline: 'Best for daily management',
    ctaText: 'UPGRADE NOW',
    isPopular: true,
    features: [
      {
        text: 'Everything in Free',
        available: true,
      },
      {
        text: '3 meal plans/week',
        available: true,
        isPremium: true,
      },
      {
        text: 'Unlimited photo scans',
        available: false,
        comingSoon: true,
        isPremium: true,
      },
      {
        text: '30-day AI insights',
        available: true,
      },
      {
        text: '1 FREE doctor review/month',
        available: false,
        comingSoon: true,
        isPremium: true,
      },
      {
        text: 'Extra reviews: ₹400 each',
        available: false,
        comingSoon: true,
      },
      {
        text: '10% food ordering discount',
        available: false,
        comingSoon: true,
        isPremium: true,
      },
      {
        text: 'Personalized supplements',
        available: false,
        comingSoon: true,
      },
    ],
  },
  {
    id: 'max',
    name: 'SAKHEE MAX',
    price: {
      monthly: 1000,
      yearly: 10000,
    },
    subtitle: {
      monthly: '/month or ₹33/day',
      yearly: '/year Save ₹2,000 (2 months free!)',
    },
    value: '₹1,120+ value for ₹1,000',
    tagline: 'Medical grade care',
    ctaText: 'COMING SOON',
    badge: 'COMING SOON',
    isDisabled: true,
    features: [
      {
        text: 'Everything in Pro',
        available: false,
        comingSoon: true,
      },
      {
        text: '3 meal plans/week',
        available: false,
        comingSoon: true,
        isPremium: true,
      },
      {
        text: 'Nutritionist reviewed and approved meal plans',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
      },
      {
        text: '1 FREE doctor review/month',
        available: false,
        comingSoon: true,
      },
      {
        text: 'Extra doctor reviews: ₹200 (50% off)',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
      },
      {
        text: '20% food ordering discount',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
      },
      {
        text: 'Early feature access',
        available: false,
        comingSoon: true,
      },
    ],
  },
];

// Helper functions
export const getPlanPrice = (planId: string, cycle: 'monthly' | 'yearly'): number => {
  const plan = pricingData.find((p) => p.id === planId);
  return plan ? plan.price[cycle] : 0;
};

export const getPlanName = (planId: string): string => {
  const plan = pricingData.find((p) => p.id === planId);
  return plan ? plan.name : '';
};
