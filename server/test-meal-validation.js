// Test script for meal plan validation
// Run with: node test-meal-validation.js

// Mock meal plan data for testing
const mockMealPlan = {
  days: [
    {
      dayNumber: 1,
      meals: [
        // Test Case 1: Inappropriate breakfast (should fail)
        {
          name: 'Paneer Curry with Rice',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Paneer', quantity: 150, unit: 'g' },
            { item: 'Rice', quantity: 200, unit: 'g' },
          ],
          calories: 650,
        },
        // Test Case 2: Inflated lunch calories (should fail)
        {
          name: 'Dal Tadka',
          mealType: 'lunch',
          ingredients: [
            { item: 'Dal', quantity: 200, unit: 'g', calories: 600 }, // Inflated!
          ],
          calories: 600,
        },
        // Test Case 3: Good dinner (should pass)
        {
          name: 'Mixed Vegetable Curry with Quinoa',
          mealType: 'dinner',
          ingredients: [
            { item: 'Mixed Vegetables', quantity: 150, unit: 'g', calories: 120 },
            { item: 'Quinoa', quantity: 200, unit: 'g', calories: 220 },
            { item: 'Cucumber Raita', quantity: 100, unit: 'g', calories: 80 },
            { item: 'Almonds', quantity: 25, unit: 'g', calories: 100 },
          ],
          calories: 520,
        },
      ],
    },
    {
      dayNumber: 2,
      meals: [
        // Test Case 4: Good breakfast (should pass)
        {
          name: 'Vegetable Oats Upma',
          mealType: 'breakfast',
          ingredients: [
            { item: 'Oats', quantity: 60, unit: 'g', calories: 220 },
            { item: 'Mixed Vegetables', quantity: 100, unit: 'g', calories: 80 },
            { item: 'Coconut Chutney', quantity: 30, unit: 'g', calories: 50 },
          ],
          calories: 350,
        },
        // Test Case 5: Heavy snack (should fail)
        {
          name: 'Mixed Vegetable Curry',
          mealType: 'snack',
          ingredients: [
            { item: 'Mixed Vegetables', quantity: 200, unit: 'g' },
            { item: 'Rice', quantity: 150, unit: 'g' },
            { item: 'Dal', quantity: 100, unit: 'g' },
            { item: 'Raita', quantity: 100, unit: 'g' },
          ],
          calories: 450,
        },
        // Test Case 6: Incomplete lunch (should fail)
        {
          name: 'Roti',
          mealType: 'lunch',
          ingredients: [{ item: 'Whole Wheat Roti', quantity: 2, unit: 'pieces', calories: 140 }],
          calories: 140,
        },
      ],
    },
  ],
};

// Copy validation functions from mealPlanChain.js
function getMealStructure(mealsPerDay) {
  const structures = {
    2: 'Breakfast + Dinner (2 large meals)',
    3: 'Breakfast + Lunch + Dinner',
    4: 'Breakfast + Lunch + Snack + Dinner',
  };
  return structures[mealsPerDay] || structures[3];
}

function getBreakfastCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: dailyCalories * 0.4, // 40% for 2 meals
    3: dailyCalories * 0.3, // 30% for 3 meals
    4: dailyCalories * 0.25, // 25% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.3);
}

function getLunchCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: 0, // No lunch in 2-meal plan
    3: dailyCalories * 0.4, // 40% for 3 meals
    4: dailyCalories * 0.35, // 35% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.35);
}

function getDinnerCalories(dailyCalories, mealsPerDay) {
  const distribution = {
    2: dailyCalories * 0.6, // 60% for 2 meals
    3: dailyCalories * 0.3, // 30% for 3 meals
    4: dailyCalories * 0.25, // 25% for 4 meals
  };
  return Math.round(distribution[mealsPerDay] || dailyCalories * 0.35);
}

function getSnackCalories(dailyCalories, mealsPerDay) {
  const snackCalories = {
    2: 0, // No snack in 2-meal plan
    3: 0, // No snack in 3-meal plan
    4: dailyCalories * 0.15, // 15% for 1 snack in 4-meal plan
  };
  return Math.round(snackCalories[mealsPerDay] || 0);
}

function validateBreakfast(breakfast) {
  const issues = [];
  const inappropriateKeywords = [
    'curry',
    'gravy',
    'masala',
    'biryani',
    'pulao',
    'rice',
    'chole',
    'rajma',
    'kadhi',
  ];

  const mealName = breakfast.name?.toLowerCase() || '';
  inappropriateKeywords.forEach((keyword) => {
    if (mealName.includes(keyword)) {
      issues.push(`Inappropriate breakfast item detected: "${keyword}" found in meal name`);
    }
  });

  const components = breakfast.components || breakfast.ingredients || [];
  if (components.length < 2) {
    issues.push('Breakfast should have at least 2 components (main + accompaniment/beverage)');
  }

  components.forEach((component) => {
    if (component.calories > 400) {
      issues.push(
        `Component "${component.item || component.name}" has unusually high calories (${
          component.calories
        }). Consider splitting or adding variety.`
      );
    }
  });

  return issues;
}

function validateMeal(meal, mealType) {
  const issues = [];

  const components = meal.components || meal.ingredients || [];
  if (components.length < 2) {
    issues.push(`${mealType} should have at least 2 components for balanced nutrition`);
  }

  components.forEach((component) => {
    if (component.calories > 500) {
      issues.push(
        `Component "${component.item || component.name}" has unusually high calories (${
          component.calories
        }). Consider adding accompaniments instead of inflating.`
      );
    }
  });

  return issues;
}

function validateSnack(snack) {
  const issues = [];

  if (snack.calories > 300) {
    issues.push(`Snack calories (${snack.calories}) too high. Snacks should be 100-250 kcal.`);
  }

  const components = snack.components || snack.ingredients || [];
  if (components.length > 3) {
    issues.push('Snack too complex. Keep snacks simple with 1-2 components.');
  }

  return issues;
}

function validateMealPlan(mealPlan, dailyCalories, mealsPerDay) {
  const issues = [];

  mealPlan.days.forEach((day, dayIndex) => {
    let dayTotalCalories = 0;

    day.meals?.forEach((meal, mealIndex) => {
      const mealType = meal.mealType?.toLowerCase();
      let mealIssues = [];

      if (mealType === 'breakfast') {
        mealIssues = validateBreakfast(meal);
      } else if (mealType === 'snack') {
        mealIssues = validateSnack(meal);
      } else if (mealType === 'lunch' || mealType === 'dinner') {
        mealIssues = validateMeal(meal, mealType);
      }

      if (mealIssues.length > 0) {
        issues.push({
          day: dayIndex + 1,
          meal: `${mealType}_${mealIndex + 1}`,
          mealName: meal.name,
          issues: mealIssues,
        });
      }

      dayTotalCalories += meal.calories || 0;
    });

    // Validate daily calorie total (±3% tolerance)
    const minAcceptableCalories = Math.round(dailyCalories * 0.97);
    const maxAcceptableCalories = Math.round(dailyCalories * 1.03);

    if (dayTotalCalories < minAcceptableCalories || dayTotalCalories > maxAcceptableCalories) {
      issues.push({
        day: dayIndex + 1,
        meal: 'daily_total',
        issues: [
          `Daily calories (${dayTotalCalories}) outside strict ±3% range (${minAcceptableCalories} - ${maxAcceptableCalories} kcal)`,
        ],
      });
    }
  });

  return {
    isValid: issues.length === 0,
    issues: issues,
  };
}

// Run the test
console.log('🧪 Testing Meal Plan Validation...\n');

const result = validateMealPlan(mockMealPlan, 2000, 3);

console.log('Validation Result:', result.isValid ? '✅ PASSED' : '❌ FAILED');
console.log(`\nIssues Found: ${result.issues.length}\n`);

if (result.issues.length > 0) {
  console.log('📋 Detailed Issues:\n');
  result.issues.forEach((issue, idx) => {
    console.log(
      `${idx + 1}. Day ${issue.day} - ${issue.meal}${issue.mealName ? ` (${issue.mealName})` : ''}`
    );
    issue.issues.forEach((i) => {
      console.log(`   - ${i}`);
    });
    console.log();
  });
}

// Expected results
console.log('✅ Expected Failures:');
console.log('  1. Day 1 Breakfast: Paneer Curry with Rice - Contains "curry" and "rice"');
console.log('  2. Day 1 Lunch: Dal Tadka - Only 1 component, inflated calories (600)');
console.log(
  '  3. Day 2 Snack: Mixed Vegetable Curry - Too heavy (450 kcal), too many components (4)'
);
console.log('  4. Day 2 Lunch: Roti - Only 1 component, too few calories');
console.log('  5. Day 1 Total: ~1770 kcal (below acceptable range)');
console.log('  6. Day 2 Total: ~940 kcal (far below acceptable range)');

console.log('\n✅ Expected Passes:');
console.log(
  '  1. Day 1 Dinner: Mixed Vegetable Curry with Quinoa - 4 components, realistic calories'
);
console.log('  2. Day 2 Breakfast: Vegetable Oats Upma - 3 components, appropriate breakfast');

console.log('\n📊 Test Summary:');
console.log(`  Total Issues: ${result.issues.length}`);
console.log(`  Expected Issues: 6`);
console.log(`  Status: ${result.issues.length === 6 ? '✅ CORRECT' : '❌ INCORRECT'}`);
