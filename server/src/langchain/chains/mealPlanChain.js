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
          chunk.days.forEach((day, idx) => {
            day.dayNumber = startDay + idx;
            allDays.push(day);
          });
        } else {
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

  async generateWithStructuredOutput(preferences) {
    const duration = parseInt(preferences.duration) || 3;
    const mealsPerDay = parseInt(preferences.mealsPerDay) || 3;
    const restrictions = preferences.restrictions || [];
    const cuisines = preferences.cuisines || [];
    const healthContext = preferences.healthContext || {};
    const userOverrides = preferences.userOverrides || {};

    logger.info('Generating with full context', {
      restrictions: restrictions.length,
      cuisines: cuisines.length,
      hasSymptoms: !!healthContext.symptoms?.length,
      hasMedicalData: !!healthContext.medicalData,
      userOverrides,
    });

    // Build restrictions text
    let restrictionsText = '';
    if (restrictions.length > 0) {
      restrictionsText = `\n\nDIETARY RESTRICTIONS (MUST AVOID):\n${restrictions
        .map((r) => `- ${r}`)
        .join('\n')}`;
    }

    // Build cuisines text
    let cuisinesText = '';
    if (cuisines.length > 0) {
      cuisinesText = `\n\nPREFERRED CUISINES:\n${cuisines.map((c) => `- ${c}`).join('\n')}`;
    }

    // Build health context text from symptoms
    let symptomsText = '';
    if (healthContext.symptoms && healthContext.symptoms.length > 0) {
      const symptomMap = {
        'irregular-periods': 'hormone-balancing foods (flaxseeds, leafy greens, sesame seeds)',
        acne: 'anti-inflammatory foods (turmeric, berries, green tea, omega-3)',
        'weight-changes': 'metabolism-boosting foods (green tea, whole grains, protein-rich foods)',
        'hair-loss': 'iron and biotin-rich foods (spinach, nuts, eggs, lentils)',
        fatigue: 'energy-boosting foods (complex carbs, proteins, iron-rich vegetables)',
        'mood-swings': 'mood-stabilizing foods (omega-3, magnesium-rich foods, whole grains)',
      };

      const recommendations = healthContext.symptoms.map((s) => symptomMap[s]).filter(Boolean);

      if (recommendations.length > 0) {
        symptomsText = `\n\nHEALTH FOCUS (addressing PCOS symptoms):\nPriority ingredients: ${recommendations.join(
          ', '
        )}`;
      }
    }

    // Build goals text
    let goalsText = '';
    if (healthContext.goals && healthContext.goals.length > 0) {
      const goalMap = {
        'regularize-periods': 'Include cycle-regulating foods',
        'weight-management': 'Focus on portion control and low-calorie options',
        'skin-hair': 'Add biotin and antioxidant-rich foods',
        'balance-hormones': 'Include hormone-balancing seeds and greens',
        fertility: 'Focus on fertility-supporting nutrients',
        'mood-energy': 'Include mood-stabilizing and energizing foods',
      };

      const goalGuidance = healthContext.goals.map((g) => goalMap[g]).filter(Boolean);

      if (goalGuidance.length > 0) {
        goalsText = `\n\nUSER GOALS:\n${goalGuidance.join(', ')}`;
      }
    }

    // Build medical report insights
    let medicalText = '';
    if (healthContext.medicalData) {
      const { labValues } = healthContext.medicalData;

      if (labValues && Object.keys(labValues).length > 0) {
        medicalText =
          '\n\nMEDICAL REPORT INSIGHTS:\nConsider nutritional needs based on recent lab work.';

        if (labValues.insulin || labValues.glucose) {
          medicalText += '\n- Focus on low-GI foods to manage blood sugar';
        }
        if (labValues.testosterone) {
          medicalText += '\n- Include anti-androgenic foods (spearmint tea, flaxseeds)';
        }
        if (labValues.cholesterol || labValues.triglycerides) {
          medicalText += '\n- Heart-healthy fats and fiber-rich foods';
        }
      }
    }

    // Activity level adjustments
    let activityText = '';
    if (healthContext.activityLevel) {
      const activityMap = {
        sedentary: 'Moderate portions, focus on nutrient density over calories',
        light: 'Balanced macros with moderate carbs',
        moderate: 'Slightly higher protein for recovery, balanced carbs',
        very: 'Increased protein and complex carbs for sustained energy',
      };
      activityText = `\n\nACTIVITY LEVEL: ${healthContext.activityLevel}\n${
        activityMap[healthContext.activityLevel] || ''
      }`;
    }

    // Priority note if user overrode onboarding
    let priorityNote = '';
    if (userOverrides.region || userOverrides.dietType) {
      priorityNote = `\n\n⚠️ USER OVERRIDE: User specifically selected this ${
        userOverrides.region ? 'region' : ''
      }${userOverrides.region && userOverrides.dietType ? ' and ' : ''}${
        userOverrides.dietType ? 'diet type' : ''
      } for this plan. Prioritize these preferences.`;
    }

    // Build comprehensive prompt
    const prompt = `Generate a ${duration}-day PCOS-friendly meal plan using evidence-based nutrition guidelines.

CORE REQUIREMENTS:
- Region: ${preferences.region}
- Diet: ${preferences.dietType}
- Budget: ₹${preferences.budget}/day
- Meals per day: ${mealsPerDay}${restrictionsText}${cuisinesText}${symptomsText}${goalsText}${medicalText}${activityText}${priorityNote}

PCOS NUTRITION GUIDELINES (from knowledge base):
- Low Glycemic Index (GI < 55) for blood sugar management
- Anti-inflammatory spices: turmeric, cinnamon, ginger
- Hormone-balancing: flaxseeds, sesame seeds, leafy greens
- Adequate protein (15-20g per meal) for satiety
- Healthy fats: nuts, seeds, olive oil, avocado
- High fiber: vegetables, whole grains, legumes

CRITICAL: Your response must use this EXACT JSON structure:

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

Generate ${duration} days with ${mealsPerDay} meals each.${
      restrictions.length > 0
        ? '\n\n⚠️ CRITICAL: Strictly avoid all ingredients in the restrictions list.'
        : ''
    }${
      cuisines.length > 0 ? `\n\nPrefer ${cuisines.join(', ')} cuisine styles when possible.` : ''
    }${symptomsText ? '\n\n🎯 Prioritize ingredients that address the mentioned symptoms.' : ''}${
      goalsText ? '\n\n🎯 Align meal compositions with user goals.' : ''
    }`;

    try {
      const response = await this.structuredLLM.invoke(prompt);
      const content = response.content || response.text || '';
      logger.info('Structured response received', { length: content.length });

      const parsed = JSON.parse(content);

      logger.info('Parsed structure', {
        keys: Object.keys(parsed),
        hasDays: !!parsed.days,
        daysType: Array.isArray(parsed.days) ? 'array' : typeof parsed.days,
        daysLength: parsed.days?.length,
      });

      if (this.validateStructure(parsed, duration, mealsPerDay)) {
        logger.info('✅ Structured output validation passed');
        return parsed;
      }

      logger.warn('Structured output validation failed, trying cleanup');
      const fixed = this.fixStructure(parsed, duration, mealsPerDay);
      if (fixed) {
        return fixed;
      }

      throw new Error('Invalid structure after cleanup');
    } catch (error) {
      logger.error('Structured generation failed', { error: error.message });
      return this.getFallbackPlan({ ...preferences, duration });
    }
  }

  validateStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed || typeof parsed !== 'object') {
        logger.debug('Validation failed: not an object');
        return false;
      }

      const days = parsed.days;
      if (!Array.isArray(days)) {
        logger.debug('Validation failed: days not an array');
        return false;
      }
      if (days.length === 0) {
        logger.debug('Validation failed: days array empty');
        return false;
      }

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

        for (let j = 0; j < day.meals.length; j++) {
          const meal = day.meals[j];
          const required = ['mealType', 'name', 'ingredients'];
          for (const field of required) {
            if (!(field in meal)) {
              logger.debug(`Validation failed: day ${i} meal ${j} missing ${field}`);
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

  fixStructure(parsed, expectedDays, expectedMeals) {
    try {
      if (!parsed.days) {
        logger.debug('Attempting to fix structure - days missing');
        const alternativeKeys = ['mealPlan', 'plan', 'data', 'schedule', 'menu'];

        for (const key of alternativeKeys) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            logger.info(`Found alternative key: ${key}, restructuring`);
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

        return null;
      }

      parsed.days.forEach((day, idx) => {
        if (day.day && !day.dayNumber) {
          day.dayNumber = day.day;
          delete day.day;
        }
        if (!day.dayNumber) {
          day.dayNumber = idx + 1;
        }
      });

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
      logger.error('Fix structure failed', { error: e.message });
      return null;
    }
  }

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
        ],
        snack: [
          {
            name: 'Sundal',
            ingredients: ['100g chickpeas', 'coconut'],
            protein: 10,
            carbs: 20,
            fats: 4,
          },
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
        ],
        lunch: [
          {
            name: 'Dal Bhaat',
            ingredients: ['100g rice', '50g dal'],
            protein: 14,
            carbs: 50,
            fats: 5,
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
        ],
        dinner: [
          {
            name: 'Khichuri',
            ingredients: ['50g rice', '50g dal', 'vegetables'],
            protein: 12,
            carbs: 40,
            fats: 5,
          },
        ],
      },
      'west-india': {
        breakfast: [
          { name: 'Dhokla', ingredients: ['100g besan', 'rava'], protein: 15, carbs: 25, fats: 5 },
        ],
        lunch: [
          {
            name: 'Dal Dhokli',
            ingredients: ['50g dal', 'wheat dough'],
            protein: 14,
            carbs: 40,
            fats: 6,
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
        ],
        dinner: [
          {
            name: 'Bajra Roti',
            ingredients: ['2 bajra rotis', 'vegetables'],
            protein: 11,
            carbs: 40,
            fats: 7,
          },
        ],
      },
    };

    return templates[region] || templates['north-india'];
  }

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
