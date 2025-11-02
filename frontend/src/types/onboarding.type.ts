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

  // Step 3
  goals: string[];
  income: string;

  // Step 4
  language: string;
  regions: string[]; // multiselect
  cuisineStates: string[]; // multiselect (disabled until regions selected)
};
