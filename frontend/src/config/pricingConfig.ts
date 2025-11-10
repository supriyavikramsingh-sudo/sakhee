import type { PricingCardData } from '../types/subscription.type';

export const pricingData: PricingCardData[] = [
  {
    id: 'free',
    name: 'Free',
    price: {
      monthly: 0,
      yearly: 0,
    },
    subtitle: {
      monthly: 'Start with Sakhee for free',
      yearly: 'Start with Sakhee for free',
    },
    tagline: 'Perfect for exploring',
    planDescription:
      'Start your PCOS journey with zero commitment. Experience AI-powered guidance and personalized meal planning — completely free, forever.',
    ctaText: 'Start Free',
    features: [
      {
        text: 'Unlimited AI chatbot',
        available: true,
        description: '24/7 PCOS companion for instant support',
      },
      {
        text: '1 meal plan generation (3, 5, or 7 days)',
        available: true,
        description: 'One personalized meal plan to get started',
      },
      {
        text: 'Lab report AI analysis',
        available: true,
        description: 'Understand your hormones in simple language',
      },
      {
        text: '2 languages (English, Hindi)',
        available: true,
        description: 'Communicate in your preferred language',
      },
      {
        text: '5 meal photo scans/month',
        available: false,
        comingSoon: true,
        description: 'Snap and analyze your meals with AI',
      },
    ],
    valueProps: ['₹0 forever—no credit card needed', 'Perfect for exploring Sakhee'],
  },
  {
    id: 'pro',
    name: 'Sakhee Pro',
    price: {
      monthly: 500,
      yearly: 5000,
    },
    subtitle: {
      monthly: 'or ₹17/day',
      yearly: '(₹417/month—Get 2 months FREE!)',
    },
    tagline: 'Best for daily management',
    planDescription:
      'Your 24/7 AI PCOS companion with unlimited personalized meal plans. Get AI-powered insights from your progress tracking and lab report analysis.',
    ctaText: 'Upgrade Now',
    isPopular: true,
    features: [
      {
        text: 'Everything in Free',
        available: true,
        description: 'All free features included',
      },
      {
        text: '3 meal plans/week',
        available: true,
        isPremium: true,
        description: 'Up to 156 meal plans per year—never run out of ideas',
      },
      {
        text: '30-day AI insights',
        available: true,
        description: 'Spot patterns in your PCOS journey',
      },
      {
        text: '1 FREE doctor review/month',
        available: false,
        comingSoon: true,
        isPremium: true,
        description: '₹400+ value included monthly',
      },
      {
        text: '10% food ordering discount',
        available: false,
        comingSoon: true,
        isPremium: true,
        description: 'Save on every Zomato & Swiggy order',
      },
    ],
    valueProps: [
      'Just ₹17/day—less than a cup of chai',
      'Up to 156 meal plans per year vs. 1 in Free',
      'Save ₹1,000 with yearly plan—get 2 months free!',
    ],
  },
  {
    id: 'max',
    name: 'Sakhee Max',
    price: {
      monthly: 1000,
      yearly: 10000,
    },
    subtitle: {
      monthly: 'or ₹33/day',
      yearly: '(₹833/month—Get 2 months FREE!)',
    },
    tagline: 'Medical-grade care',
    planDescription:
      'Premium care with expert validation. Every meal plan reviewed by PCOS nutritionists, plus priority access to medical consultations and prescriptions.',
    ctaText: 'Coming Soon',
    badge: 'Coming Soon',
    badgeSubtext: 'Launching in 6 months',
    isDisabled: true,
    features: [
      {
        text: 'Everything in Pro',
        available: false,
        comingSoon: true,
        description: 'All Pro features included',
      },
      {
        text: 'Nutritionist-reviewed meal plans',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
        description: 'Medical-grade validation of every plan',
      },
      {
        text: '1 FREE doctor review/month',
        available: false,
        comingSoon: true,
        description: 'With prescription support',
      },
      {
        text: 'Extra doctor reviews: ₹200 (50% off)',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
        description: 'Half-price consultations (₹200 vs ₹400)',
      },
      {
        text: '20% food ordering discount',
        available: false,
        comingSoon: true,
        isDoublePremium: true,
        description: 'Double the savings on meal delivery',
      },
    ],
    valueProps: [
      '₹33/day for medical-grade PCOS care',
      'Professional validation and prescriptions',
      'Save ₹2,000 with yearly plan—get 2 months free!',
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
