import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { env } from '../../config/env.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('MealPlanChain');

class MealPlanChain {
  constructor() {
    // Create dedicated LLM for structured output with JSON mode enabled
    this.structuredLLM = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 8192,
      openAIApiKey: env.OPENAI_API_KEY,
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    });
  }

  async generateMealPlan(preferences) {
    try {
      logger.info('Generating meal plan with structured output', {
        duration: preferences.duration,
        region: preferences.region,
        dietType: preferences.dietType,
        budget: preferences.budget,
        mealsPerDay: preferences.mealsPerDay,
        restrictions: preferences.restrictions,
        cuisines: preferences.cuisines,
      });

      const duration = parseInt(preferences.duration) || 7;
      const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;

      // For reliability, cap at 3 days per request
      if (duration > 3) {
        return await this.generateInChunks(preferences);
      }

      return await this.generateWithStructuredOutput(preferences);
    } catch (error) {
      logger.error('Meal plan generation failed', { error: error.message, stack: error.stack });
      return this.getFallbackPlan(preferences);
    }
  }

  /**
   * Generate in chunks for longer durations
   */
  async generateInChunks(preferences) {
    logger.info('Generating in 3-day chunks for reliability');

    const duration = parseInt(preferences.duration) || 7;
    const allDays = [];
    const chunkSize = 3;

    for (let startDay = 1; startDay <= duration; startDay += chunkSize) {
      const endDay = Math.min(startDay + chunkSize - 1, duration);
      const chunkDuration = endDay - startDay + 1;

      try {
        const chunkPrefs = {
          ...preferences,
          duration: chunkDuration,
          startDay,
        };

        const chunk = await this.generateWithStructuredOutput(chunkPrefs);

        if (chunk && chunk.days) {
          // Renumber days
          chunk.days.forEach((day, idx) => {
            day.dayNumber = startDay + idx;
            allDays.push(day);
          });
        } else {
          // Use fallback for this chunk
          for (let i = startDay; i <= endDay; i++) {
            allDays.push(this.getFallbackDay(i, preferences));
          }
        }
      } catch (e) {
        logger.warn(`Chunk ${startDay}-${endDay} failed, using fallback`);
        for (let i = startDay; i <= endDay; i++) {
          allDays.push(this.getFallbackDay(i, preferences));
        }
      }
    }

    return { days: allDays };
  }

  /**
   * Generate with manual JSON construction (most reliable)
   */
  async generateWithStructuredOutput(preferences) {
    const duration = parseInt(preferences.duration) || 3;
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const restrictions = preferences.restrictions || [];
    const cuisines = preferences.cuisines || [];

    // Build restrictions text
    let restrictionsText = '';
    if (restrictions.length > 0) {
      restrictionsText = `\n\nDIETARY RESTRICTIONS (MUST AVOID):
${restrictions.map((r) => `- ${r}`).join('\n')}`;
    }

    // Build cuisines text
    let cuisinesText = '';
    if (cuisines.length > 0) {
      cuisinesText = `\n\nPREFERRED CUISINES:
${cuisines.map((c) => `- ${c}`).join('\n')}`;
    }

    // Simple, short prompt with explicit structure request
    const prompt = `Generate a ${duration}-day PCOS-friendly meal plan for ${
      preferences.region
    } region, ${preferences.dietType} diet, ₹${preferences.budget}/day budget.

Create ${mealsPerDay} meals per day.${restrictionsText}${cuisinesText}

CRITICAL: Your response must use this EXACT JSON structure with "days" as the root array key:

{
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Dish Name",
          "ingredients": ["item1 - 50g", "item2 - 30g"],
          "protein": 15,
          "carbs": 20,
          "fats": 5,
          "gi": "Low",
          "time": "15 mins",
          "tip": "Cooking tip"
        }
      ]
    }
  ]
}

Generate ${duration} days with ${mealsPerDay} meals each. Use "days" as the key, not "mealPlan" or "plan".${
      restrictions.length > 0
        ? `\n\nIMPORTANT: Avoid all ingredients in the restrictions list.`
        : ''
    }${cuisines.length > 0 ? `\n\nFocus on ${cuisines.join(', ')} cuisines when possible.` : ''}`;

    try {
      // Invoke with simple string prompt (ChatOpenAI handles the message wrapping)
      const response = await this.structuredLLM.invoke(prompt);

      const content = response.content || response.text || '';
      logger.info('Structured response received', { length: content.length });

      // Parse response
      const parsed = JSON.parse(content);

      // DEBUG: Log the actual structure
      logger.info('Parsed structure', {
        keys: Object.keys(parsed),
        hasDays: !!parsed.days,
        daysType: Array.isArray(parsed.days) ? 'array' : typeof parsed.days,
        daysLength: parsed.days?.length,
        firstDayKeys: parsed.days?.[0] ? Object.keys(parsed.days[0]) : 'none',
        sample: JSON.stringify(parsed).slice(0, 500),
      });

      // Validate structure
      if (this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.info('✅ Structured output validation passed');
        return parsed;
      }

      logger.warn('Structured output validation failed, trying cleanup');

      // Try to fix structure
      const fixed = this.fixStructure(parsed, duration, mealsPerDay);
      if (fixed) {
        return fixed;
      }

      throw new Error('Invalid structure after cleanup');
    } catch (error) {
      logger.error('Structured generation failed', { error: error.message });

      // Try fallback
      return this.getFallbackPlan({
        ...preferences,
        duration: duration,
      });
    }
  }

  /**
   * Validate parsed structure
   */
  validateStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed || typeof parsed !== 'object') {
        logger.debug('Validation failed: not an object');
        return false;
      }

      const days = parsed.days;
      if (!Array.isArray(days)) {
        logger.debug('Validation failed: days not an array', { daysType: typeof days });
        return false;
      }
      if (days.length === 0) {
        logger.debug('Validation failed: days array empty');
        return false;
      }

      // Check each day
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day.meals || !Array.isArray(day.meals)) {
          logger.debug(`Validation failed: day ${i} has no meals array`);
          return false;
        }
        if (day.meals.length === 0) {
          logger.debug(`Validation failed: day ${i} meals array empty`);
          return false;
        }

        // Check each meal
        for (let j = 0; j < day.meals.length; j++) {
          const meal = day.meals[j];
          const required = ['mealType', 'name', 'ingredients'];
          for (const field of required) {
            if (!(field in meal)) {
              logger.debug(`Validation failed: day ${i} meal ${j} missing ${field}`, {
                mealKeys: Object.keys(meal),
              });
              return false;
            }
          }
        }
      }

      logger.info('✅ Validation passed', { daysCount: days.length });
      return true;
    } catch (e) {
      logger.debug('Validation error', { error: e.message });
      return false;
    }
  }

  /**
   * Try to fix common structure issues
   */
  fixStructure(parsed, expectedDays, expectedMeals) {
    try {
      // If days is missing but there's a nested structure
      if (!parsed.days) {
        logger.debug('Attempting to fix structure - days missing');

        // Look for common alternative names: mealPlan, plan, data, etc.
        const alternativeKeys = ['mealPlan', 'plan', 'data', 'schedule', 'menu'];

        for (const key of alternativeKeys) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            logger.info(`Found alternative key: ${key}, restructuring`);

            // Check if items have "day" property instead of "dayNumber"
            parsed[key].forEach((item, idx) => {
              if (item.day && !item.dayNumber) {
                item.dayNumber = item.day;
                delete item.day;
              }
              if (!item.dayNumber) {
                item.dayNumber = idx + 1;
              }
            });

            const candidate = { days: parsed[key] };
            if (this.validateStructure(candidate, expectedDays, expectedMeals)) {
              logger.info('✅ Structure fixed successfully');
              return candidate;
            }
          }
        }

        // Look for any array in the object
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            logger.debug(`Trying key: ${key}`);
            const candidate = { days: parsed[key] };

            // Try to fix day numbers
            candidate.days.forEach((item, idx) => {
              if (item.day && !item.dayNumber) {
                item.dayNumber = item.day;
                delete item.day;
              }
              if (!item.dayNumber) {
                item.dayNumber = idx + 1;
              }
            });

            if (this.validateStructure(candidate, expectedDays, expectedMeals)) {
              logger.info(`✅ Structure fixed using key: ${key}`);
              return candidate;
            }
          }
        }

        logger.debug('Could not find valid array structure');
        return null;
      }

      // Ensure dayNumber exists
      parsed.days.forEach((day, idx) => {
        if (day.day && !day.dayNumber) {
          day.dayNumber = day.day;
          delete day.day;
        }
        if (!day.dayNumber) {
          day.dayNumber = idx + 1;
        }
      });

      // Fill missing meal fields with defaults
      parsed.days.forEach((day) => {
        day.meals.forEach((meal) => {
          if (!meal.gi) meal.gi = 'Low';
          if (!meal.time) meal.time = '20 mins';
          if (!meal.tip) meal.tip = 'Enjoy fresh';
          if (!meal.ingredients) meal.ingredients = [];
          if (typeof meal.protein !== 'number') meal.protein = 10;
          if (typeof meal.carbs !== 'number') meal.carbs = 20;
          if (typeof meal.fats !== 'number') meal.fats = 5;
        });
      });

      if (this.validateStructure(parsed, expectedDays, expectedMeals)) {
        logger.info('✅ Structure validated and fixed');
        return parsed;
      }

      return null;
    } catch (e) {
      logger.error('Fix structure failed', { error: e.message, stack: e.stack });
      return null;
    }
  }

  /**
   * Get fallback day
   */
  getFallbackDay(dayNumber, preferences) {
    const templates = this.getRegionalTemplates(preferences.region);
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const meals = [];

    const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    const selectedTypes =
      mealsPerDay === 2
        ? ['breakfast', 'dinner']
        : mealsPerDay === 4
        ? ['breakfast', 'lunch', 'snack', 'dinner']
        : ['breakfast', 'lunch', 'dinner'];

    selectedTypes.forEach((type, idx) => {
      const typeTemplates = templates[type] || templates.breakfast;
      const template = typeTemplates[(dayNumber + idx) % typeTemplates.length];

      meals.push({
        mealType: type.charAt(0).toUpperCase() + type.slice(1),
        ...template,
        gi: 'Low',
        time: '20 mins',
        tip: 'Fresh and healthy',
      });
    });

    return { dayNumber, meals };
  }

  /**
   * Get regional templates
   */
  getRegionalTemplates(region) {
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
            name: 'Dal Tadka',
            ingredients: ['70g dal', '50g rice'],
            protein: 16,
            carbs: 45,
            fats: 6,
          },
          {
            name: 'Rajma Curry',
            ingredients: ['100g rajma', '2 roti'],
            protein: 18,
            carbs: 40,
            fats: 5,
          },
          {
            name: 'Palak Paneer',
            ingredients: ['200g spinach', '100g paneer'],
            protein: 20,
            carbs: 30,
            fats: 15,
          },
        ],
        snack: [
          {
            name: 'Roasted Chana',
            ingredients: ['50g chana', 'spices'],
            protein: 9,
            carbs: 15,
            fats: 3,
          },
          {
            name: 'Fruit Bowl',
            ingredients: ['1 apple', '1 banana'],
            protein: 2,
            carbs: 25,
            fats: 0,
          },
          {
            name: 'Sprouts Salad',
            ingredients: ['100g sprouts', 'lemon'],
            protein: 8,
            carbs: 12,
            fats: 1,
          },
        ],
        dinner: [
          {
            name: 'Vegetable Khichdi',
            ingredients: ['50g rice', '50g dal', 'vegetables'],
            protein: 12,
            carbs: 35,
            fats: 4,
          },
          {
            name: 'Quinoa Pulao',
            ingredients: ['60g quinoa', 'vegetables'],
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
            ingredients: ['80g ragi', '20g urad dal'],
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
            ingredients: ['60g rice', 'sambar'],
            protein: 14,
            carbs: 45,
            fats: 5,
          },
          {
            name: 'Bisi Bele Bath',
            ingredients: ['50g millet', '30g dal'],
            protein: 12,
            carbs: 38,
            fats: 6,
          },
          {
            name: 'Avial',
            ingredients: ['vegetables', '50g rice'],
            protein: 10,
            carbs: 40,
            fats: 8,
          },
        ],
        snack: [
          {
            name: 'Sundal',
            ingredients: ['100g chickpeas', 'coconut'],
            protein: 10,
            carbs: 20,
            fats: 4,
          },
          {
            name: 'Murukku',
            ingredients: ['50g rice flour', 'spices'],
            protein: 5,
            carbs: 25,
            fats: 8,
          },
          { name: 'Banana', ingredients: ['1 banana'], protein: 1, carbs: 27, fats: 0 },
        ],
        dinner: [
          {
            name: 'Quinoa Pongal',
            ingredients: ['60g quinoa', '30g dal'],
            protein: 14,
            carbs: 32,
            fats: 6,
          },
          {
            name: 'Ragi Mudde',
            ingredients: ['80g ragi', 'greens'],
            protein: 9,
            carbs: 35,
            fats: 7,
          },
          {
            name: 'Vegetable Upma',
            ingredients: ['50g rava', 'vegetables'],
            protein: 8,
            carbs: 30,
            fats: 5,
          },
        ],
      },
      'east-india': {
        breakfast: [
          { name: 'Poha', ingredients: ['100g poha', 'peanuts'], protein: 8, carbs: 30, fats: 6 },
          {
            name: 'Dalia',
            ingredients: ['80g dalia', 'vegetables'],
            protein: 10,
            carbs: 35,
            fats: 4,
          },
          { name: 'Idli', ingredients: ['3 idlis', 'sambar'], protein: 12, carbs: 40, fats: 2 },
        ],
        lunch: [
          {
            name: 'Fish Curry',
            ingredients: ['150g fish', 'mustard oil'],
            protein: 25,
            carbs: 10,
            fats: 12,
          },
          {
            name: 'Dal Bhaat',
            ingredients: ['100g rice', '50g dal'],
            protein: 14,
            carbs: 50,
            fats: 5,
          },
          {
            name: 'Aloo Posto',
            ingredients: ['200g potato', 'poppy seeds'],
            protein: 6,
            carbs: 45,
            fats: 10,
          },
        ],
        snack: [
          {
            name: 'Muri',
            ingredients: ['50g puffed rice', 'peanuts'],
            protein: 5,
            carbs: 20,
            fats: 4,
          },
          { name: 'Coconut Water', ingredients: ['1 coconut'], protein: 1, carbs: 9, fats: 0 },
          {
            name: 'Roasted Peanuts',
            ingredients: ['50g peanuts'],
            protein: 13,
            carbs: 8,
            fats: 25,
          },
        ],
        dinner: [
          {
            name: 'Khichuri',
            ingredients: ['50g rice', '50g dal', 'vegetables'],
            protein: 12,
            carbs: 40,
            fats: 5,
          },
          {
            name: 'Vegetable Stew',
            ingredients: ['mixed vegetables', 'coconut milk'],
            protein: 8,
            carbs: 25,
            fats: 10,
          },
          {
            name: 'Roti Sabzi',
            ingredients: ['2 rotis', 'mixed vegetables'],
            protein: 10,
            carbs: 35,
            fats: 6,
          },
        ],
      },
      'west-india': {
        breakfast: [
          { name: 'Dhokla', ingredients: ['100g besan', 'rava'], protein: 15, carbs: 25, fats: 5 },
          { name: 'Poha', ingredients: ['100g poha', 'peanuts'], protein: 8, carbs: 30, fats: 6 },
          { name: 'Thepla', ingredients: ['3 theplas', 'curd'], protein: 12, carbs: 35, fats: 8 },
        ],
        lunch: [
          {
            name: 'Dal Dhokli',
            ingredients: ['50g dal', 'wheat dough'],
            protein: 14,
            carbs: 40,
            fats: 6,
          },
          {
            name: 'Undhiyu',
            ingredients: ['mixed vegetables', 'methi'],
            protein: 10,
            carbs: 35,
            fats: 12,
          },
          {
            name: 'Khichdi Kadhi',
            ingredients: ['50g rice', '50g dal', 'kadhi'],
            protein: 13,
            carbs: 38,
            fats: 8,
          },
        ],
        snack: [
          {
            name: 'Bhel Puri',
            ingredients: ['50g puffed rice', 'vegetables'],
            protein: 6,
            carbs: 25,
            fats: 5,
          },
          { name: 'Methi Thepla', ingredients: ['2 theplas'], protein: 8, carbs: 28, fats: 6 },
          {
            name: 'Cucumber Salad',
            ingredients: ['1 cucumber', 'lemon'],
            protein: 2,
            carbs: 8,
            fats: 0,
          },
        ],
        dinner: [
          {
            name: 'Bajra Roti',
            ingredients: ['2 bajra rotis', 'vegetables'],
            protein: 11,
            carbs: 40,
            fats: 7,
          },
          {
            name: 'Dal Tadka',
            ingredients: ['70g dal', '50g rice'],
            protein: 15,
            carbs: 42,
            fats: 6,
          },
          {
            name: 'Vegetable Pulao',
            ingredients: ['60g rice', 'vegetables'],
            protein: 9,
            carbs: 45,
            fats: 8,
          },
        ],
      },
    };

    return templates[region] || templates['north-india'];
  }

  /**
   * Full fallback plan
   */
  getFallbackPlan(preferences) {
    logger.info('Using complete fallback meal plan');
    const duration = parseInt(preferences.duration) || 7;
    const days = [];

    for (let i = 1; i <= duration; i++) {
      days.push(this.getFallbackDay(i, preferences));
    }

    return {
      days,
      fallback: true,
      message: 'Using pre-designed PCOS-friendly templates',
    };
  }
}

export const mealPlanChain = new MealPlanChain();
export default mealPlanChain;
