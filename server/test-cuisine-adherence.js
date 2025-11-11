// Test script to verify cuisine adherence fix
// Run with: node test-cuisine-adherence.js

import dotenv from 'dotenv';
import mealPlanChain from './src/langchain/chains/mealPlanChain.js';

dotenv.config();

console.log('🧪 Testing Cuisine Adherence Fix...\n');
console.log('============================================================');
console.log('📋 Test Case: Jharkhand/Sikkim/Manipur + Keto + Jain');
console.log('============================================================\n');

async function testCuisineAdherence() {
  try {
    // Meal plan chain is already initialized as a singleton

    // Test parameters - Jharkhand/Sikkim/Manipur + Keto + Jain
    const userPreferences = {
      dietType: 'jain',
      isKeto: true, // Enable keto mode
      regions: ['East India', 'North East India'], // Regions that include Jharkhand, Sikkim, Manipur
      cuisines: ['Jharkhandi', 'Sikkimese', 'Manipuri'], // Specific cuisines
      healthGoal: 'weight_loss',
      mealsPerDay: 3,
      restrictions: [],
      duration: 7, // 7-day meal plan
      budget: 'mid',
    };

    const calorieTarget = 1500;

    console.log('⏳ Generating meal plan...\n');
    const startTime = Date.now();

    // Generate meal plan (pass preferences directly - it already contains all parameters)
    const mealPlan = await mealPlanChain.generateMealPlan(userPreferences);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Meal plan generated in ${duration}s\n`);

    // Validate cuisine adherence
    console.log('============================================================');
    console.log('🔍 CUISINE VALIDATION');
    console.log('============================================================\n');

    const allowedCuisines = ['jharkhandi', 'sikkimese', 'manipuri'];
    const wrongCuisines = [];
    const genericMeals = [];
    const missingLabels = [];

    // Define generic meal names that should NOT appear
    const genericNames = [
      'ragi dosa',
      'ragi idli',
      'moong dal chilla',
      'palak paneer',
      'vegetable stir-fry',
      'paneer curry',
      'coconut flour dosa',
    ];

    mealPlan.days?.forEach((day, dayIdx) => {
      console.log(`Day ${day.dayNumber || dayIdx + 1}:`);

      day.meals?.forEach((meal) => {
        const mealName = meal.name?.toLowerCase() || '';
        console.log(`  ${meal.mealType}: ${meal.name}`);

        // Check for state label
        const hasStateLabel = allowedCuisines.some((cuisine) =>
          mealName.includes(cuisine.toLowerCase())
        );

        if (!hasStateLabel) {
          missingLabels.push({
            day: day.dayNumber || dayIdx + 1,
            meal: meal.name,
            type: meal.mealType,
          });
        }

        // Check for generic meals
        const isGeneric = genericNames.some((generic) => mealName.includes(generic));
        if (isGeneric) {
          genericMeals.push({
            day: day.dayNumber || dayIdx + 1,
            meal: meal.name,
            type: meal.mealType,
          });
        }

        // Check for wrong cuisine (South Indian dishes)
        const southIndianKeywords = ['idli', 'dosa', 'vada', 'uttapam', 'sambhar', 'rasam'];
        const hasSouthIndian = southIndianKeywords.some((keyword) => mealName.includes(keyword));

        if (hasSouthIndian && !hasStateLabel) {
          wrongCuisines.push({
            day: day.dayNumber || dayIdx + 1,
            meal: meal.name,
            type: meal.mealType,
            reason: 'South Indian dish without state label',
          });
        }
      });
      console.log('');
    });

    // Print validation results
    console.log('============================================================');
    console.log('📊 VALIDATION RESULTS');
    console.log('============================================================\n');

    if (wrongCuisines.length === 0 && genericMeals.length === 0 && missingLabels.length === 0) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('   - All meals use Jharkhand/Sikkim/Manipur templates');
      console.log('   - All meals have proper state labels');
      console.log('   - No generic South Indian dishes detected\n');
    } else {
      if (wrongCuisines.length > 0) {
        console.log(`❌ WRONG CUISINE DETECTED (${wrongCuisines.length} meals):`);
        wrongCuisines.forEach((item) => {
          console.log(`   - Day ${item.day} ${item.type}: ${item.meal} (${item.reason})`);
        });
        console.log('');
      }

      if (genericMeals.length > 0) {
        console.log(`❌ GENERIC MEALS DETECTED (${genericMeals.length} meals):`);
        genericMeals.forEach((item) => {
          console.log(`   - Day ${item.day} ${item.type}: ${item.meal}`);
        });
        console.log('   These should use regional templates instead!\n');
      }

      if (missingLabels.length > 0) {
        console.log(`⚠️  MISSING STATE LABELS (${missingLabels.length} meals):`);
        missingLabels.forEach((item) => {
          console.log(`   - Day ${item.day} ${item.type}: ${item.meal}`);
        });
        console.log('');
      }
    }

    // Expected correct meals
    console.log('============================================================');
    console.log('✅ EXPECTED CORRECT MEALS (examples):');
    console.log('============================================================\n');
    console.log('   - "Dhuska with Cauliflower Rice (Jharkhandi Keto Jain)"');
    console.log('   - "Pitha Variety Bowl (Jharkhandi Keto Jain)"');
    console.log('   - "Steamed Paneer Bamboo Curry (Sikkimese Keto Jain)"');
    console.log('   - "Eromba Tofu Bowl (Manipuri Keto Jain)"');
    console.log('   - "Ngari Tofu Curry (Manipuri Keto Jain)"\n');

    console.log('============================================================');
    console.log('❌ SHOULD NOT SEE:');
    console.log('============================================================\n');
    console.log('   - "Ragi Dosa with Coconut Chutney (Jharkhand)"');
    console.log('   - "Moong Dal Chilla"');
    console.log('   - "Palak Paneer"');
    console.log('   - Generic South Indian dishes\n');

    // Overall result
    const totalIssues = wrongCuisines.length + genericMeals.length;
    console.log('============================================================');
    console.log('🎯 FINAL VERDICT');
    console.log('============================================================\n');

    if (totalIssues === 0) {
      console.log('✅ CUISINE ADHERENCE FIX SUCCESSFUL!');
      console.log('   LLM is correctly using regional templates and adapting them to keto.\n');
      return true;
    } else {
      console.log('❌ CUISINE ADHERENCE STILL HAS ISSUES');
      console.log(`   Found ${totalIssues} meals with wrong/generic cuisines.\n`);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    return false;
  }
}

// Run the test
testCuisineAdherence()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
