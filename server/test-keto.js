// Test script for Keto meal plan generation
import fetch from 'node-fetch';

const testKetoMealPlan = async () => {
  console.log('🧪 Testing Keto Meal Plan Generation...\n');

  const testCases = [
    {
      name: 'Vegetarian + Keto',
      payload: {
        regions: ['south-indian'],
        cuisines: ['Tamil Nadu'],
        dietType: 'vegetarian',
        isKeto: true,
        budget: 300,
        mealsPerDay: 3,
        duration: 1,
        userId: 'test_veg_keto',
        restrictions: [],
        healthContext: {
          symptoms: ['insulin-resistance'],
          activityLevel: 'moderate',
          age: 28,
          goals: ['weight-loss'],
        },
      },
    },
    {
      name: 'Vegan + Keto',
      payload: {
        regions: ['south-indian'],
        cuisines: ['Tamil Nadu'],
        dietType: 'vegan',
        isKeto: true,
        budget: 300,
        mealsPerDay: 3,
        duration: 1,
        userId: 'test_vegan_keto',
        restrictions: [],
        healthContext: {
          symptoms: ['insulin-resistance'],
          activityLevel: 'moderate',
          age: 28,
          goals: ['weight-loss'],
        },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Test Case: ${testCase.name}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      console.log('⏳ Sending request...');
      const startTime = Date.now();

      const response = await fetch('http://localhost:3000/api/meals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.payload),
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Response received in ${duration}s\n`);

      const data = await response.json();

      if (!data.success) {
        console.error('❌ ERROR:', data.error);
        continue;
      }

      console.log('✅ SUCCESS! Meal plan generated:\n');
      console.log(`📊 Metadata:`);
      console.log(`   - Plan ID: ${data.data.planId}`);
      console.log(`   - Diet Type: ${data.data.dietType}`);
      console.log(`   - Is Keto: ${data.data.isKeto ? '⚡ YES' : 'NO'}`);
      console.log(`   - Cuisines: ${data.data.cuisines.join(', ')}`);
      console.log(`   - Budget: ₹${data.data.budget}/day`);

      if (data.data.ragMetadata) {
        console.log(`\n📚 RAG Retrieval:`);
        console.log(`   - Meal Templates: ${data.data.ragMetadata.mealTemplates || 0}`);
        console.log(
          `   - Ingredient Substitutes: ${data.data.ragMetadata.ingredientSubstitutes || 0}`
        );
        console.log(`   - Retrieval Quality: ${data.data.ragMetadata.retrievalQuality || 'N/A'}`);
      }

      // Check meals
      const plan = data.data.plan;
      if (plan && plan.days && plan.days.length > 0) {
        console.log(`\n🍽️  Meals Generated:`);

        plan.days.forEach((day, dayIdx) => {
          console.log(`\n   Day ${dayIdx + 1}:`);
          if (day.meals && day.meals.length > 0) {
            day.meals.forEach((meal) => {
              console.log(`      - ${meal.mealType}: ${meal.name}`);

              // Check for keto compliance
              if (testCase.payload.isKeto) {
                const hasGrains = meal.ingredients?.some(
                  (ing) =>
                    ing.item.toLowerCase().includes('rice') ||
                    ing.item.toLowerCase().includes('roti') ||
                    ing.item.toLowerCase().includes('wheat') ||
                    ing.item.toLowerCase().includes('bread')
                );

                if (hasGrains) {
                  console.log(`        ⚠️  WARNING: Contains grains (not keto-compliant!)`);
                } else {
                  console.log(`        ✅ No grains detected (keto-compliant)`);
                }

                // Check for cauliflower rice or almond flour (keto substitutes)
                const hasKetoSub = meal.ingredients?.some(
                  (ing) =>
                    ing.item.toLowerCase().includes('cauliflower') ||
                    ing.item.toLowerCase().includes('almond flour') ||
                    ing.item.toLowerCase().includes('coconut flour')
                );

                if (hasKetoSub) {
                  console.log(`        ⚡ Contains keto substitutes`);
                }
              }

              // Check for vegan compliance
              if (testCase.payload.dietType === 'vegan') {
                const hasAnimalProducts = meal.ingredients?.some(
                  (ing) =>
                    ing.item.toLowerCase().includes('paneer') ||
                    ing.item.toLowerCase().includes('milk') ||
                    ing.item.toLowerCase().includes('ghee') ||
                    ing.item.toLowerCase().includes('egg') ||
                    ing.item.toLowerCase().includes('fish') ||
                    ing.item.toLowerCase().includes('chicken')
                );

                if (hasAnimalProducts) {
                  console.log(`        ⚠️  WARNING: Contains animal products (not vegan!)`);
                } else {
                  console.log(`        ✅ No animal products (vegan-compliant)`);
                }
              }

              // Show macros for keto verification
              if (testCase.payload.isKeto) {
                const totalMacros = meal.protein + meal.carbs + meal.fats;
                const fatPercent = ((meal.fats * 9) / meal.calories) * 100;
                const proteinPercent = ((meal.protein * 4) / meal.calories) * 100;
                const carbPercent = ((meal.carbs * 4) / meal.calories) * 100;

                console.log(
                  `        📊 Macros: Fat ${fatPercent.toFixed(
                    0
                  )}% | Protein ${proteinPercent.toFixed(0)}% | Carbs ${carbPercent.toFixed(0)}%`
                );

                if (carbPercent > 10) {
                  console.log(`        ⚠️  Carbs might be high for keto (target: <5-10%)`);
                }
              }
            });
          }
        });
      }

      console.log(`\n✅ Test case "${testCase.name}" completed successfully!\n`);
    } catch (error) {
      console.error(`\n❌ Test case "${testCase.name}" failed:`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 All tests completed!');
  console.log(`${'='.repeat(60)}\n`);
};

// Run tests
testKetoMealPlan().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
