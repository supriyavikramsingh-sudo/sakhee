import type { SubscriptionPlan, BillingCycle, SubscriptionStatus, PaymentHistory } from './subscription.type';

interface ProviderDaum {
  providerId: string;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: any;
  photoURL: string;
}

interface StsTokenManager {
  refreshToken: string;
  accessToken: string;
  expirationTime: number;
}

export interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  isAnonymous: boolean;
  photoURL: string;
  providerData: ProviderDaum[];
  stsTokenManager: StsTokenManager;
  createdAt: string;
  lastLoginAt: string;
  apiKey: string;
  appName: string;
}

// Extended user profile with subscription data
export interface UserProfileData {
  // Existing onboarding fields
  email?: string;
  age?: string;
  location?: string;
  diagnosisTime?: string;
  symptoms?: string[];
  height_cm?: number;
  current_weight_kg?: number;
  dietType?: string;
  activityLevel?: string;
  allergies?: string[];
  goals?: string[];
  weight_goal?: string;
  target_weight_kg?: number;
  income?: string;
  language?: string;
  regions?: string[];
  cuisineStates?: string[];
  cuisines?: string[];
  daily_calorie_requirement?: number;
  
  // Subscription fields
  subscription_plan?: SubscriptionPlan;
  billing_cycle?: BillingCycle | null;
  subscription_status?: SubscriptionStatus;
  subscription_start_date?: Date | null;
  next_billing_date?: Date | null;
  subscription_end_date?: Date | null;
  meal_plans_generated_count?: number;
  meal_plans_generated_this_week?: number;
  last_meal_plan_reset_date?: Date | null;
  payment_history?: PaymentHistory[];
}
