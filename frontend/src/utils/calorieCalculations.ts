/**
 * Utility functions for calculating BMR, TDEE, and daily calorie requirements
 * for personalized meal planning based on user metrics.
 */

/**
 * Convert age range string to midpoint number for BMR calculation
 * @param ageRange - Age range string (e.g., "18-24", "25-29", "56+")
 * @returns Midpoint age as a number
 */
export function getAgeFromRange(ageRange: string): number {
  const ageRangeMap: Record<string, number> = {
    '18-24': 21, // Midpoint: (18 + 24) / 2 = 21
    '25-29': 27, // Midpoint: (25 + 29) / 2 = 27
    '30-34': 32, // Midpoint: (30 + 34) / 2 = 32
    '35-39': 37, // Midpoint: (35 + 39) / 2 = 37
    '40-45': 42.5, // Midpoint: (40 + 45) / 2 = 42.5
    '56+': 60, // Default to 60 for 56+
  };

  return ageRangeMap[ageRange] || 30; // Default to 30 if unknown
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 * This is the most accurate formula for modern populations
 * 
 * For women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age_years) - 161
 * 
 * @param weight_kg - Current weight in kilograms
 * @param height_cm - Height in centimeters
 * @param age_years - Age in years (can use midpoint from age range)
 * @returns BMR in kcal/day
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age_years: number
): number {
  // Mifflin-St Jeor Equation for women
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age_years - 161;
  return Math.round(bmr);
}

/**
 * Activity level multipliers for TDEE calculation
 * Updated to use more conservative, realistic values (Nov 2025)
 */
export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, // Little or no exercise, desk job
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.465, // Moderate exercise 4-5 days/week (was 1.55 - overestimated)
  very: 1.55, // Hard exercise 6-7 days/week (was 1.725 - overestimated)
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Level Multiplier
 * 
 * @param bmr - Basal Metabolic Rate
 * @param activityLevel - Activity level string (sedentary, light, moderate, very)
 * @returns TDEE in kcal/day
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie requirement based on weight goal
 * 
 * - Maintain: TDEE (no adjustment)
 * - Lose Weight: TDEE - 500 kcal (safe weight loss ~0.5 kg/week)
 * - Gain Weight: TDEE + 500 kcal (safe weight gain ~0.5 kg/week)
 * 
 * @param tdee - Total Daily Energy Expenditure
 * @param weightGoal - Weight goal ('maintain', 'lose', 'gain')
 * @returns Daily calorie requirement in kcal
 */
export function calculateDailyCalories(tdee: number, weightGoal: string): number {
  switch (weightGoal) {
    case 'lose':
      return Math.round(tdee - 500);
    case 'gain':
      return Math.round(tdee + 500);
    case 'maintain':
    default:
      return tdee;
  }
}

/**
 * Calculate BMI (Body Mass Index)
 * BMI = weight_kg / (height_m)²
 * 
 * @param weight_kg - Weight in kilograms
 * @param height_cm - Height in centimeters
 * @returns BMI value rounded to 1 decimal place
 */
export function calculateBMI(weight_kg: number, height_cm: number): number {
  const height_m = height_cm / 100;
  const bmi = weight_kg / (height_m * height_m);
  return Math.round(bmi * 10) / 10; // Round to 1 decimal place
}

/**
 * Check if BMI is within healthy range (18.5 - 24.9)
 * 
 * @param bmi - BMI value
 * @returns Object with isHealthy boolean and message
 */
export function validateBMI(bmi: number): { isHealthy: boolean; message: string } {
  if (bmi < 18.5) {
    return {
      isHealthy: false,
      message: `Your target weight results in a BMI of ${bmi}, which is below the healthy range (18.5-24.9). Please enter a higher target weight.`,
    };
  } else if (bmi > 24.9) {
    return {
      isHealthy: false,
      message: `Your target weight results in a BMI of ${bmi}, which is above the healthy range (18.5-24.9). Please enter a lower target weight.`,
    };
  } else {
    return {
      isHealthy: true,
      message: `Target BMI of ${bmi} is within the healthy range.`,
    };
  }
}

/**
 * Complete calorie calculation pipeline
 * Takes user metrics and returns all calculated values
 * 
 * @param params - User metrics
 * @returns Object with all calculated values
 */
export function calculateUserMetrics(params: {
  ageRange: string;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  activityLevel: string;
  weightGoal: string;
}) {
  const {
    ageRange,
    height_cm,
    current_weight_kg,
    target_weight_kg,
    activityLevel,
    weightGoal,
  } = params;

  // Convert age range to midpoint
  const calculated_age = getAgeFromRange(ageRange);

  // Calculate BMR using current weight
  const bmr = calculateBMR(current_weight_kg, height_cm, calculated_age);

  // Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);

  // Calculate daily calorie requirement based on goal
  const daily_calorie_requirement = calculateDailyCalories(tdee, weightGoal);

  // Calculate current and target BMI
  const current_bmi = calculateBMI(current_weight_kg, height_cm);
  const target_bmi = calculateBMI(target_weight_kg, height_cm);

  return {
    calculated_age,
    bmr,
    tdee,
    daily_calorie_requirement,
    current_bmi,
    target_bmi,
    calculated_at: new Date().toISOString(),
  };
}
