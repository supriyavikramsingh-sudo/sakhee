// Subscription Types for Sakhee Pricing System

export type SubscriptionPlan = 'free' | 'pro' | 'max';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

export interface PaymentHistory {
  date: Date;
  amount: number;
  plan: string;
  billing_cycle: string;
  status: 'success' | 'failed';
}

export interface SubscriptionData {
  subscription_plan: SubscriptionPlan;
  billing_cycle: BillingCycle | null;
  subscription_status: SubscriptionStatus;
  subscription_start_date: Date | null;
  next_billing_date: Date | null;
  subscription_end_date: Date | null; // Set when canceled, date when Pro expires
  
  // Usage tracking
  meal_plans_generated_count: number; // Total lifetime count
  meal_plans_generated_this_week: number; // Resets every Monday
  last_meal_plan_reset_date: Date | null; // Last Monday reset
  
  // Optional: Payment history
  payment_history?: PaymentHistory[];
}

export interface PricingCardData {
  id: SubscriptionPlan;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  subtitle: {
    monthly: string;
    yearly: string;
  };
  tagline: string;
  value?: string;
  badge?: string;
  features: PricingFeature[];
  ctaText: string;
  isPopular?: boolean;
  isDisabled?: boolean;
}

export interface PricingFeature {
  text: string;
  available: boolean;
  comingSoon?: boolean;
  isPremium?: boolean; // Shows ⭐
  isDoublePremium?: boolean; // Shows ⭐⭐
}

export interface UserSubscriptionState {
  currentPlan: SubscriptionPlan;
  isAuthenticated: boolean;
  isCanceled: boolean;
  endDate: Date | null;
}

export interface MealPlanUsage {
  totalCount: number;
  weeklyCount: number;
  lastResetDate: Date | null;
  limitBasedOnPlan: number;
  daysUntilMondayReset: number;
  canGenerateMealPlan: boolean;
}

// API Response Types
export interface SubscriptionResponse {
  success: boolean;
  data: SubscriptionData;
}

export interface UsageResponse {
  success: boolean;
  data: MealPlanUsage;
}

export interface UpgradeRequest {
  userId: string;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
}

export interface CancelRequest {
  userId: string;
}

export interface ReactivateRequest {
  userId: string;
}
