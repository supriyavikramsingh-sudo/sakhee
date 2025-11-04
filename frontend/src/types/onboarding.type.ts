export type OnboardingQuestionnaire = {
  [step: number]: Question[];
};

export interface Question {
  key: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Option[];
  maxSelections?: number;
  helperText?: string;
  disabled?: boolean;
  value?: any;
  // For number input
  maxDecimals?: number;
  min?: number;
  max?: number;
  // For conditional rendering
  showIf?: (formData: OnboardingData) => boolean;
  defaultValue?: any;
  error?: string;
}

export interface Option {
  value: string;
  label: string;
}

export type OnboardingData = {
  // Step 0
  email: string;
  age: string;
  location: string;

  // Step 1
  diagnosisTime: string;
  symptoms: string[]; // multiselect

  // Step 2
  dietType: string;
  allergies?: string[]; // checkbox but optional
  activityLevel: string;
  height_cm?: number; // NEW: Height in centimeters
  current_weight_kg?: number; // NEW: Current weight in kilograms

  // Step 3
  goals: string[];
  income: string;
  weight_goal?: 'maintain' | 'lose' | 'gain'; // NEW: Weight goal (conditional on "weight-management" goal)
  target_weight_kg?: number; // NEW: Target weight in kg (conditional on lose/gain)

  // Step 4
  language: string;
  regions: string[]; // multiselect
  cuisineStates: string[]; // multiselect (disabled until regions selected)
};

// Extended user profile type with calculated metrics
export interface UserProfile {
  // Existing fields
  email: string;
  onboarded: boolean;
  profileData: OnboardingData;
  onboardedAt?: Date;
  updatedAt?: Date;

  // NEW: Calculated metrics
  calculated_age?: number; // Midpoint of age range
  bmr?: number; // Basal Metabolic Rate
  tdee?: number; // Total Daily Energy Expenditure
  daily_calorie_requirement?: number; // Personalized calorie target
  current_bmi?: number; // Current BMI
  target_bmi?: number; // Target BMI
  calculated_at?: Date; // Timestamp of calculation
}
