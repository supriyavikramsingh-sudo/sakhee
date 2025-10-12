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
      // Try to parse with multiple strategies
      const parsed = this.parseRobustly(resultText);
      if (!parsed || !parsed.days || parsed.days.length === 0) {
        logger.error('Parsing failed, returning fallback');
        return this.getFallbackPlan(preferences);
      }

      logger.info('Meal plan parsed successfully', { days: parsed.days.length });
      return parsed;
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message });
      return this.getFallbackPlan(preferences);
    }
  }

  /**
   * Parse with multiple strategies
   */
  parseRobustly(text) {
    // Normalize smart quotes first (some LLM outputs contain curly quotes)
    const normalizeQuotes = (s) =>
      s
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // single smart
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // double smart

    const tryParse = (candidate) => {
      try {
        const cleaned = this.cleanJSON(candidate);
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.days) {
          return parsed;
        }
      } catch (e) {
        // intentionally ignore parse errors here
      }
      return null;
    };

    const normalized = normalizeQuotes(text || '');

    // Strategy 1: Try direct JSON parse of the cleaned (normalized) text
    const s1 = tryParse(normalized);
    if (s1) {
      logger.info('✅ Strategy 1: Direct parse succeeded');
      return s1;
    }

    // Strategy 2: Extract from markdown code fences
    const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      const s2 = tryParse(fenceMatch[1]);
      if (s2) {
        logger.info('✅ Strategy 2: Markdown extraction succeeded');
        return s2;
      }
    }

    // Strategy 3: Find JSON-like structure containing "days"
    const jsonMatches = normalized.match(/\{[\s\S]*"days"[\s\S]*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      const s3 = tryParse(jsonMatches[0]);
      if (s3) {
        logger.info('✅ Strategy 3: Pattern matching succeeded');
        return s3;
      }
    }

    // Strategy 4: Attempt to repair JS-like objects (unquoted keys, smart quotes, currency)
    try {
      let attempt = normalized;

      // Extract the outermost braces if present to reduce noise
      const first = attempt.indexOf('{');
      const last = attempt.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        attempt = attempt.slice(first, last + 1);
      }

      // Quote unquoted keys (only after { or , or [ )
      attempt = attempt.replace(/([\{\[,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":');

      const s4 = tryParse(attempt);
      if (s4) {
        logger.info('✅ Strategy 4: Key-quoting repair succeeded');
        return s4;
      }
    } catch (e) {
      logger.warn('Strategy 4 failed:', e.message);
    }

    logger.error('All parsing strategies failed');
    return null;
  }

  /**
   * Clean JSON string
   */
  cleanJSON(text) {
    let cleaned = (text || '').trim();

    // Normalize whitespace
    cleaned = cleaned.replace(/\u00A0/g, ' ');

    // Normalize smart quotes
    cleaned = cleaned
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // single smart
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"'); // double smart

    // Remove markdown fences (keep inner content)
    cleaned = cleaned.replace(/```(?:json)?\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    // Quote unquoted keys: convert { key: to { "key":
    cleaned = cleaned.replace(/([\{\[,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":');

    // Replace single-quoted strings with double quotes (simple heuristic)
    cleaned = cleaned.replace(/'([^']*)'/g, function (m, p) {
      return '"' + p.replace(/\"/g, '\\"') + '"';
    });

    // Replace remaining single quotes with double quotes
    cleaned = cleaned.replace(/'/g, '"');

    // Handle currency (e.g., : ₹500 -> : "₹500")
    cleaned = cleaned.replace(/:\s*₹\s*([0-9]+(?:\.[0-9]+)?)/g, ': "₹$1"');

    // Remove trailing commas before } or ]
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

    // Strip non-printable/control characters except tab/newline/carriage return
    cleaned = cleaned.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

    return cleaned.trim();
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
