export interface PlanData {
  planId: string;
  plan: Plan;
  regions: string[];
  cuisines: string[];
  dietType: string;
  isKeto?: boolean; // NEW: Keto diet modifier flag
  budget: number;
  ragMetadata: RagMetadata;
  personalizationSources: PersonalizationSources;
}

export interface Plan {
  days: Day[];
}

export interface Day {
  dayNumber: number;
  totalCalories: number;
  meals: Meal[];
}

export interface Meal {
  name: string;
  mealType: string;
  ingredients: Ingredient[];
  recipe: string;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  calories: number;
  gi: string;
  time: string;
  tip: string;
}

export interface Ingredient {
  item: string;
  quantity: number;
  unit: string;
}

export interface RagMetadata {
  mealTemplates: number;
  nutritionGuidelines: number;
  symptomGuidance: number;
  labGuidance: number;
  ingredientSubstitutes: number;
  symptomRecommendations: boolean;
  retrievalQuality: string;
  cuisinesUsed: string[];
  multiCuisine: boolean;
}

export interface PersonalizationSources {
  onboarding: boolean;
  medicalReport: boolean;
  userOverrides: boolean;
  rag: boolean;
  ragQuality: string;
  ragSources: RagSources;
}

export interface RagSources {
  mealTemplates: number;
  nutritionGuidelines: number;
  labGuidance: number;
  symptomRecommendations: boolean;
}

export interface UserProfileData {
  target_weight_kg: number;
  email: string;
  income: string;
  dietType: string;
  regions: string[];
  goals: string[];
  activityLevel: string;
  current_weight_kg: number;
  height_cm: number;
  diagnosisTime: string;
  age: string;
  language: string;
  location: string;
  symptoms: string[];
  cuisines: string[];
  cuisineStates: string[];
  weight_goal: string;
}
