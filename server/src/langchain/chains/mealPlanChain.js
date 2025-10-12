import { PromptTemplate } from '@langchain/core/prompts';
import { llmClient } from '../llmClient.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('MealPlanChain');

class MealPlanChain {
  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan', preferences);

      // Simplified prompt with stricter JSON format
      const prompt = PromptTemplate.fromTemplate(`
You are a nutritionist creating a PCOS-friendly Indian meal plan.

Requirements:
- Region: ${preferences.region}
- Diet: ${preferences.dietType}
- Budget: ₹${preferences.budget} per day
- Duration: ${preferences.duration} days
- Meals per day: ${preferences.mealsPerDay}

Create a simple, VALID JSON response. Use ONLY double quotes for values.

Example format (follow EXACTLY):
{{
  days: [
    {{
      dayNumber: 1,
      meals: [
        {{
          mealType: "Breakfast",
          name: "Besan Chilla",
          ingredients: ["100g besan", "1 onion", "spices"],
          protein: 15,
          carbs: 20,
          fats: 5,
          gi: "Low",
          time: "15 mins",
          tip: "Add vegetables"
      }}
      ]
      }}
  ]
      }}

CRITICAL RULES:
1. Use ONLY double quotes (") for values.
2. No single quotes (')
3. No missing commas
4. No trailing commas
5. No extra text outside JSON
6. Keep it simple - just ${preferences.duration} days

Generate now:
`);

      // LLMChain is deprecated — format the prompt and call the LLM client directly.
      const formattedPrompt = await prompt.format({
        duration: preferences.duration || 7,
        region: preferences.region,
        dietType: preferences.dietType,
        budget: preferences.budget,
        mealsPerDay: preferences.mealsPerDay || 3,
      });

      const raw = await llmClient.invoke(formattedPrompt);
      const resultText =
        typeof raw === 'string' ? raw : raw?.text ?? raw?.output_text ?? JSON.stringify(raw);

      logger.info('Raw LLM response received', { length: resultText.length });
      logger.info('Raw LLM response received', { text: resultText });
      // // Try to parse with multiple strategies
      // const parsed = this.parseRobustly(result.text)
      // console.log('Parsed Meal Plan:', parsed)
      // console.log('Raw LLM Response:', result.text)
      // if (!parsed || !parsed.days || parsed.days.length === 0) {
      //   logger.error('Parsing failed, returning fallback')
      //   return this.getFallbackPlan(preferences)
      // }

      // logger.info('Meal plan parsed successfully', { days: parsed.days.length });
      return resultText;
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message });
      return this.getFallbackPlan(preferences);
    }
  }

  /**
   * Parse with multiple strategies
   */
  parseRobustly(text) {
    // Strategy 1: Try direct JSON parse
    try {
      const cleaned = this.cleanJSON(text);
      const parsed = JSON.parse(cleaned);
      if (parsed.days) {
        logger.info('✅ Strategy 1: Direct parse succeeded');
        return parsed;
      }
    } catch (e) {
      logger.warn('Strategy 1 failed:', e.message);
    }

    // Strategy 2: Extract from markdown
    try {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        const cleaned = this.cleanJSON(jsonMatch[1]);
        const parsed = JSON.parse(cleaned);
        if (parsed.days) {
          logger.info('✅ Strategy 2: Markdown extraction succeeded');
          return parsed;
        }
      }
    } catch (e) {
      logger.warn('Strategy 2 failed:', e.message);
    }

    // Strategy 3: Find JSON-like structure
    try {
      const jsonMatch = text.match(/\{[\s\S]*"days"[\s\S]*\}/g);
      if (jsonMatch && jsonMatch.length > 0) {
        const cleaned = this.cleanJSON(jsonMatch[0]);
        const parsed = JSON.parse(cleaned);
        if (parsed.days) {
          logger.info('✅ Strategy 3: Pattern matching succeeded');
          return parsed;
        }
      }
    } catch (e) {
      logger.warn('Strategy 3 failed:', e.message);
    }

    // Strategy 4: Use fallback
    logger.error('All parsing strategies failed');
    return null;
  }

  /**
   * Clean JSON string
   */
  cleanJSON(text) {
    let cleaned = text.trim();

    // Remove markdown formatting
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    // Fix common issues
    cleaned = cleaned.replace(/'/g, '"'); // Replace single quotes
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    cleaned = cleaned.replace(/"\s*:\s*₹/g, '": "₹'); // Fix currency
    cleaned = cleaned.replace(/₹(\d+)/g, '₹$1"'); // Close currency quotes

    // Remove invalid characters
    cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');

    return cleaned;
  }

  /**
   * Fallback meal plan when parsing fails
   */
  getFallbackPlan(preferences) {
    logger.info('Using fallback meal plan');

    const { region, dietType, mealsPerDay = 3, duration = 7 } = preferences;

    // Simple templates by region
    const templates = {
      'north-india': {
        breakfast: [
          {
            name: 'Besan Chilla',
            ingredients: ['100g besan', '1 onion', '1 tomato'],
            protein: 15,
            carbs: 20,
            fats: 5,
          },
          {
            name: 'Moong Dal Chilla',
            ingredients: ['100g moong dal', 'vegetables'],
            protein: 18,
            carbs: 22,
            fats: 4,
          },
          {
            name: 'Oats Upma',
            ingredients: ['50g oats', 'vegetables'],
            protein: 10,
            carbs: 30,
            fats: 5,
          },
        ],
        lunch: [
          {
            name: 'Dal Tadka with Brown Rice',
            ingredients: ['70g dal', '50g brown rice'],
            protein: 16,
            carbs: 45,
            fats: 6,
          },
          {
            name: 'Rajma Curry with Roti',
            ingredients: ['100g rajma', '2 roti'],
            protein: 18,
            carbs: 40,
            fats: 5,
          },
          {
            name: 'Palak Paneer with Roti',
            ingredients: ['200g spinach', '100g paneer'],
            protein: 20,
            carbs: 30,
            fats: 15,
          },
        ],
        dinner: [
          {
            name: 'Vegetable Khichdi',
            ingredients: ['50g rice', '50g moong dal', 'vegetables'],
            protein: 12,
            carbs: 35,
            fats: 4,
          },
          {
            name: 'Quinoa Pulao',
            ingredients: ['60g quinoa', 'mixed vegetables'],
            protein: 12,
            carbs: 30,
            fats: 5,
          },
          {
            name: 'Moong Dal Soup',
            ingredients: ['100g moong dal', 'vegetables'],
            protein: 16,
            carbs: 25,
            fats: 3,
          },
        ],
      },
      'south-india': {
        breakfast: [
          {
            name: 'Ragi Dosa',
            ingredients: ['80g ragi flour', '20g urad dal'],
            protein: 10,
            carbs: 28,
            fats: 4,
          },
          {
            name: 'Oats Idli',
            ingredients: ['60g oats', '50ml curd'],
            protein: 12,
            carbs: 30,
            fats: 5,
          },
          { name: 'Pesarattu', ingredients: ['100g moong dal'], protein: 15, carbs: 25, fats: 3 },
        ],
        lunch: [
          {
            name: 'Sambar Rice',
            ingredients: ['60g brown rice', 'sambar vegetables'],
            protein: 14,
            carbs: 45,
            fats: 5,
          },
          {
            name: 'Bisi Bele Bath',
            ingredients: ['50g millet', '30g dal', 'vegetables'],
            protein: 12,
            carbs: 38,
            fats: 6,
          },
          {
            name: 'Avial with Brown Rice',
            ingredients: ['mixed vegetables', '50g rice'],
            protein: 10,
            carbs: 40,
            fats: 8,
          },
        ],
        dinner: [
          {
            name: 'Quinoa Pongal',
            ingredients: ['60g quinoa', '30g moong dal'],
            protein: 14,
            carbs: 32,
            fats: 6,
          },
          {
            name: 'Ragi Mudde with Greens',
            ingredients: ['80g ragi', 'leafy greens'],
            protein: 9,
            carbs: 35,
            fats: 7,
          },
          {
            name: 'Vegetable Upma',
            ingredients: ['50g rava', '100g vegetables'],
            protein: 8,
            carbs: 30,
            fats: 5,
          },
        ],
      },
    };

    const regionTemplates = templates[region] || templates['north-india'];

    // Generate days
    const days = [];
    for (let i = 0; i < Math.min(duration, 7); i++) {
      const dayMeals = [];

      if (mealsPerDay >= 3) {
        // Breakfast
        const breakfast = regionTemplates.breakfast[i % regionTemplates.breakfast.length];
        dayMeals.push({
          mealType: 'Breakfast',
          ...breakfast,
          gi: 'Low',
          time: '15-20 mins',
          tip: 'Start your day with protein-rich breakfast',
        });

        // Lunch
        const lunch = regionTemplates.lunch[i % regionTemplates.lunch.length];
        dayMeals.push({
          mealType: 'Lunch',
          ...lunch,
          gi: 'Low',
          time: '30-40 mins',
          tip: 'Add vegetables for fiber',
        });

        // Dinner
        const dinner = regionTemplates.dinner[i % regionTemplates.dinner.length];
        dayMeals.push({
          mealType: 'Dinner',
          ...dinner,
          gi: 'Low',
          time: '25-30 mins',
          tip: 'Keep dinner light',
        });
      }

      days.push({
        dayNumber: i + 1,
        meals: dayMeals,
      });
    }

    return {
      days,
      fallback: true,
      message: 'Using pre-designed PCOS-friendly meal templates',
    };
  }
}

export const mealPlanChain = new MealPlanChain();
export default mealPlanChain;
