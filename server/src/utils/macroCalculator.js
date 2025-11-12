// server/src/utils/macroCalculator.js

/**
 * PART 1: Dynamic Macro Calculation Backend Functions
 *
 * Calculate user-specific macro targets based on:
 * - Daily calorie requirement
 * - Diet type (keto vs PCOS-optimized)
 * - Number of meals per day
 *
 * Macro Distribution:
 * - Keto: 7% carbs, 30% protein, 63% fat
 * - PCOS-Optimized: 35% carbs, 35% protein, 30% fat
 */

import { Logger } from './logger.js';

const logger = new Logger('MacroCalculator');

/**
 * Calculate daily macro targets based on calories and diet type
 *
 * @param {number} dailyCalories - User's daily calorie requirement
 * @param {boolean} isKeto - Whether user is on keto diet
 * @returns {Object} Daily macro targets in grams and percentages
 */
export function calculateDailyMacros(dailyCalories, isKeto = false) {
  // Validate input
  if (!dailyCalories || dailyCalories <= 0) {
    logger.warn('Invalid daily calories provided, using default 2000', { dailyCalories });
    dailyCalories = 2000;
  }

  let macroDistribution;
  let dietType;

  if (isKeto) {
    // Keto macro distribution: 7% carbs, 30% protein, 63% fat
    dietType = 'Keto';
    macroDistribution = {
      carbsPercent: 7,
      proteinPercent: 30,
      fatPercent: 63,
    };
  } else {
    // PCOS-Optimized macro distribution: 35% carbs, 35% protein, 30% fat
    dietType = 'PCOS-Optimized';
    macroDistribution = {
      carbsPercent: 35,
      proteinPercent: 35,
      fatPercent: 30,
    };
  }

  // Calculate calories per macro
  const carbsCalories = Math.round(dailyCalories * (macroDistribution.carbsPercent / 100));
  const proteinCalories = Math.round(dailyCalories * (macroDistribution.proteinPercent / 100));
  const fatCalories = Math.round(dailyCalories * (macroDistribution.fatPercent / 100));

  // Convert to grams
  // Carbs: 4 calories per gram
  // Protein: 4 calories per gram
  // Fat: 9 calories per gram
  const carbsGrams = Math.round(carbsCalories / 4);
  const proteinGrams = Math.round(proteinCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);

  const result = {
    dietType,
    dailyCalories,
    macros: {
      carbs: {
        grams: carbsGrams,
        calories: carbsCalories,
        percentage: macroDistribution.carbsPercent,
      },
      protein: {
        grams: proteinGrams,
        calories: proteinCalories,
        percentage: macroDistribution.proteinPercent,
      },
      fat: {
        grams: fatGrams,
        calories: fatCalories,
        percentage: macroDistribution.fatPercent,
      },
    },
  };

  logger.info(`Calculated daily macros for ${dietType} diet`, {
    dailyCalories,
    carbsGrams,
    proteinGrams,
    fatGrams,
  });

  return result;
}

/**
 * Calculate per-meal macro targets by dividing daily targets by number of meals
 *
 * @param {number} dailyCalories - User's daily calorie requirement
 * @param {number} mealsPerDay - Number of meals per day (2, 3, or 4)
 * @param {boolean} isKeto - Whether user is on keto diet
 * @returns {Object} Per-meal macro targets in grams
 */
export function calculatePerMealMacros(dailyCalories, mealsPerDay = 3, isKeto = false) {
  // Validate meals per day
  if (![2, 3, 4].includes(mealsPerDay)) {
    logger.warn('Invalid mealsPerDay, using default 3', { mealsPerDay });
    mealsPerDay = 3;
  }

  // Get daily macros
  const dailyMacros = calculateDailyMacros(dailyCalories, isKeto);

  // Calculate per-meal targets (simple division)
  const perMeal = {
    dietType: dailyMacros.dietType,
    dailyCalories,
    mealsPerDay,
    caloriesPerMeal: Math.round(dailyCalories / mealsPerDay),
    macros: {
      carbs: {
        grams: Math.round(dailyMacros.macros.carbs.grams / mealsPerDay),
        percentage: dailyMacros.macros.carbs.percentage,
      },
      protein: {
        grams: Math.round(dailyMacros.macros.protein.grams / mealsPerDay),
        percentage: dailyMacros.macros.protein.percentage,
      },
      fat: {
        grams: Math.round(dailyMacros.macros.fat.grams / mealsPerDay),
        percentage: dailyMacros.macros.fat.percentage,
      },
    },
    // Calculate tolerance ranges (±3%)
    tolerance: {
      carbs: {
        min: Math.round((dailyMacros.macros.carbs.grams / mealsPerDay) * 0.97),
        max: Math.round((dailyMacros.macros.carbs.grams / mealsPerDay) * 1.03),
      },
      protein: {
        min: Math.round((dailyMacros.macros.protein.grams / mealsPerDay) * 0.97),
        max: Math.round((dailyMacros.macros.protein.grams / mealsPerDay) * 1.03),
      },
      fat: {
        min: Math.round((dailyMacros.macros.fat.grams / mealsPerDay) * 0.97),
        max: Math.round((dailyMacros.macros.fat.grams / mealsPerDay) * 1.03),
      },
    },
  };

  logger.info(`Calculated per-meal macros for ${perMeal.dietType} diet`, {
    mealsPerDay,
    caloriesPerMeal: perMeal.caloriesPerMeal,
    carbsPerMeal: perMeal.macros.carbs.grams,
    proteinPerMeal: perMeal.macros.protein.grams,
    fatPerMeal: perMeal.macros.fat.grams,
  });

  return perMeal;
}

/**
 * Generate macro summary text for LLM prompt
 *
 * @param {number} dailyCalories - User's daily calorie requirement
 * @param {number} mealsPerDay - Number of meals per day
 * @param {boolean} isKeto - Whether user is on keto diet
 * @returns {string} Formatted text for LLM prompt
 */
export function generateMacroSummaryForPrompt(dailyCalories, mealsPerDay = 3, isKeto = false) {
  const dailyMacros = calculateDailyMacros(dailyCalories, isKeto);
  const perMealMacros = calculatePerMealMacros(dailyCalories, mealsPerDay, isKeto);

  let summary = `\n📊 USER-SPECIFIC MACRO TARGETS (CALCULATED FROM DAILY CALORIES):\n\n`;

  summary += `Daily Calorie Target: ${dailyCalories} kcal\n`;
  summary += `Diet Type: ${dailyMacros.dietType}\n`;
  summary += `Meals Per Day: ${mealsPerDay}\n\n`;

  summary += `📋 DAILY MACRO TARGETS:\n`;
  summary += `  • Carbohydrates: ${dailyMacros.macros.carbs.grams}g (${dailyMacros.macros.carbs.percentage}% of calories)\n`;
  summary += `  • Protein: ${dailyMacros.macros.protein.grams}g (${dailyMacros.macros.protein.percentage}% of calories)\n`;
  summary += `  • Fat: ${dailyMacros.macros.fat.grams}g (${dailyMacros.macros.fat.percentage}% of calories)\n\n`;

  summary += `🍽️ PER-MEAL MACRO TARGETS (divide daily by ${mealsPerDay} meals):\n`;
  summary += `  • Calories: ~${perMealMacros.caloriesPerMeal} kcal per meal\n`;
  summary += `  • Carbohydrates: ~${perMealMacros.macros.carbs.grams}g per meal (range: ${perMealMacros.tolerance.carbs.min}-${perMealMacros.tolerance.carbs.max}g)\n`;
  summary += `  • Protein: ~${perMealMacros.macros.protein.grams}g per meal (range: ${perMealMacros.tolerance.protein.min}-${perMealMacros.tolerance.protein.max}g)\n`;
  summary += `  • Fat: ~${perMealMacros.macros.fat.grams}g per meal (range: ${perMealMacros.tolerance.fat.min}-${perMealMacros.tolerance.fat.max}g)\n\n`;

  if (isKeto) {
    summary += `🔥 KETO-SPECIFIC NOTES:\n`;
    summary += `  • NET CARBS: Maximum ${perMealMacros.macros.carbs.grams}g per meal (total carbs minus fiber)\n`;
    summary += `  • ABSOLUTE CARB LIMIT: This is dynamically calculated for YOUR calorie level\n`;
    summary += `  • NOT a fixed 50g limit - it's personalized to ${dailyCalories} kcal/day\n`;
    summary += `  • Fat is HIGHEST macro (${dailyMacros.macros.fat.percentage}%) - add ghee, nuts, oils liberally\n`;
    summary += `  • Protein is MODERATE (${dailyMacros.macros.protein.percentage}%) - don't overdo it\n\n`;
  } else {
    summary += `🩺 PCOS-OPTIMIZED NOTES:\n`;
    summary += `  • BALANCED macros for insulin sensitivity\n`;
    summary += `  • Carbs are ${dailyMacros.macros.carbs.percentage}% - include complex carbs (whole grains, legumes)\n`;
    summary += `  • Protein is ${dailyMacros.macros.protein.percentage}% - lean proteins + plant-based\n`;
    summary += `  • Fat is ${dailyMacros.macros.fat.percentage}% - healthy fats in moderate amounts\n`;
    summary += `  • Prioritize low GI carbohydrates and high fiber content\n\n`;
  }

  summary += `⚠️ TOLERANCE: Each meal's macros must be within ±3% of targets shown above\n`;
  summary += `⚠️ IF OUTSIDE RANGE: Adjust ingredient quantities until within tolerance\n\n`;

  return summary;
}

/**
 * Validate if meal macros are within acceptable tolerance
 *
 * @param {Object} mealMacros - Actual meal macros {carbs, protein, fat} in grams
 * @param {number} dailyCalories - User's daily calorie requirement
 * @param {number} mealsPerDay - Number of meals per day
 * @param {boolean} isKeto - Whether user is on keto diet
 * @returns {Object} Validation result with status and details
 */
export function validateMealMacros(mealMacros, dailyCalories, mealsPerDay, isKeto = false) {
  const targets = calculatePerMealMacros(dailyCalories, mealsPerDay, isKeto);

  const validation = {
    isValid: true,
    errors: [],
    details: {
      carbs: {
        actual: mealMacros.carbs,
        target: targets.macros.carbs.grams,
        min: targets.tolerance.carbs.min,
        max: targets.tolerance.carbs.max,
        withinRange: false,
        percentageOff: 0,
      },
      protein: {
        actual: mealMacros.protein,
        target: targets.macros.protein.grams,
        min: targets.tolerance.protein.min,
        max: targets.tolerance.protein.max,
        withinRange: false,
        percentageOff: 0,
      },
      fat: {
        actual: mealMacros.fat,
        target: targets.macros.fat.grams,
        min: targets.tolerance.fat.min,
        max: targets.tolerance.fat.max,
        withinRange: false,
        percentageOff: 0,
      },
    },
  };

  // Check carbs
  if (
    mealMacros.carbs >= targets.tolerance.carbs.min &&
    mealMacros.carbs <= targets.tolerance.carbs.max
  ) {
    validation.details.carbs.withinRange = true;
  } else {
    validation.isValid = false;
    validation.details.carbs.percentageOff = Math.round(
      ((mealMacros.carbs - targets.macros.carbs.grams) / targets.macros.carbs.grams) * 100
    );
    validation.errors.push(
      `Carbs ${mealMacros.carbs}g outside range ${targets.tolerance.carbs.min}-${
        targets.tolerance.carbs.max
      }g (${validation.details.carbs.percentageOff > 0 ? '+' : ''}${
        validation.details.carbs.percentageOff
      }% off target)`
    );
  }

  // Check protein
  if (
    mealMacros.protein >= targets.tolerance.protein.min &&
    mealMacros.protein <= targets.tolerance.protein.max
  ) {
    validation.details.protein.withinRange = true;
  } else {
    validation.isValid = false;
    validation.details.protein.percentageOff = Math.round(
      ((mealMacros.protein - targets.macros.protein.grams) / targets.macros.protein.grams) * 100
    );
    validation.errors.push(
      `Protein ${mealMacros.protein}g outside range ${targets.tolerance.protein.min}-${
        targets.tolerance.protein.max
      }g (${validation.details.protein.percentageOff > 0 ? '+' : ''}${
        validation.details.protein.percentageOff
      }% off target)`
    );
  }

  // Check fat
  if (mealMacros.fat >= targets.tolerance.fat.min && mealMacros.fat <= targets.tolerance.fat.max) {
    validation.details.fat.withinRange = true;
  } else {
    validation.isValid = false;
    validation.details.fat.percentageOff = Math.round(
      ((mealMacros.fat - targets.macros.fat.grams) / targets.macros.fat.grams) * 100
    );
    validation.errors.push(
      `Fat ${mealMacros.fat}g outside range ${targets.tolerance.fat.min}-${
        targets.tolerance.fat.max
      }g (${validation.details.fat.percentageOff > 0 ? '+' : ''}${
        validation.details.fat.percentageOff
      }% off target)`
    );
  }

  return validation;
}

/**
 * Calculate total daily macros from all meals
 *
 * @param {Array} meals - Array of meal objects with macros {carbs, protein, fat}
 * @returns {Object} Total macros and calories
 */
export function calculateDailyTotals(meals) {
  const totals = {
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
  };

  meals.forEach((meal) => {
    if (meal.macros) {
      totals.carbs += meal.macros.carbs || 0;
      totals.protein += meal.macros.protein || 0;
      totals.fat += meal.macros.fat || 0;
    }
  });

  // Calculate total calories from macros
  totals.calories = totals.carbs * 4 + totals.protein * 4 + totals.fat * 9;

  return totals;
}

/**
 * Validate if daily totals match daily targets
 *
 * @param {Array} meals - Array of meal objects with macros
 * @param {number} dailyCalories - User's daily calorie requirement
 * @param {boolean} isKeto - Whether user is on keto diet
 * @returns {Object} Validation result
 */
export function validateDailyTotals(meals, dailyCalories, isKeto = false) {
  const targets = calculateDailyMacros(dailyCalories, isKeto);
  const totals = calculateDailyTotals(meals);

  // Allow ±2g carbs, ±5g protein/fat tolerance for daily totals
  const validation = {
    isValid: true,
    errors: [],
    totals,
    targets: {
      carbs: targets.macros.carbs.grams,
      protein: targets.macros.protein.grams,
      fat: targets.macros.fat.grams,
      calories: dailyCalories,
    },
  };

  if (Math.abs(totals.carbs - targets.macros.carbs.grams) > 2) {
    validation.isValid = false;
    validation.errors.push(
      `Daily carbs ${totals.carbs}g off target ${targets.macros.carbs.grams}g by more than ±2g`
    );
  }

  if (Math.abs(totals.protein - targets.macros.protein.grams) > 5) {
    validation.isValid = false;
    validation.errors.push(
      `Daily protein ${totals.protein}g off target ${targets.macros.protein.grams}g by more than ±5g`
    );
  }

  if (Math.abs(totals.fat - targets.macros.fat.grams) > 5) {
    validation.isValid = false;
    validation.errors.push(
      `Daily fat ${totals.fat}g off target ${targets.macros.fat.grams}g by more than ±5g`
    );
  }

  return validation;
}

// Example usage documentation
/**
 * EXAMPLE USAGE:
 *
 * // Calculate daily macros for 1607 kcal/day keto user
 * const dailyMacros = calculateDailyMacros(1607, true);
 * // Result: { carbs: 28g, protein: 120g, fat: 112g }
 *
 * // Calculate per-meal macros for 3 meals/day
 * const perMealMacros = calculatePerMealMacros(1607, 3, true);
 * // Result: { carbs: ~9g, protein: ~40g, fat: ~37g per meal }
 *
 * // Generate LLM prompt section
 * const promptText = generateMacroSummaryForPrompt(1607, 3, true);
 *
 * // Validate a meal
 * const mealMacros = { carbs: 10, protein: 38, fat: 35 };
 * const validation = validateMealMacros(mealMacros, 1607, 3, true);
 * console.log(validation.isValid); // true if within ±3%
 */
