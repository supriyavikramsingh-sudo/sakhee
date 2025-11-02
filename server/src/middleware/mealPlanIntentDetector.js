// server/src/middleware/mealPlanIntentDetector.js
import { Logger } from '../utils/logger.js';
import { checkForObfuscatedMealPlan, normalizeObfuscatedText } from '../utils/textNormalizer.js';

const logger = new Logger('MealPlanIntentDetector');

/**
 * Middleware to detect meal plan requests and redirect to meal plan generator
 * This prevents users from getting generic meal advice through chat
 */
export const mealPlanIntentDetector = (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return next();
    }

    const normalizedMessage = message.toLowerCase().trim();

    // STEP 1: Check for obfuscated meal plan keywords (e.g., m*al, m**l, m-e-a-l)
    const obfuscationCheck = checkForObfuscatedMealPlan(message);
    if (obfuscationCheck.isMealPlan) {
      logger.warn('Obfuscated meal plan keyword detected', {
        originalMessage: message.substring(0, 100),
        matchedKeyword: obfuscationCheck.matchedKeyword,
      });

      return res.json({
        success: true,
        data: {
          type: 'MEAL_PLAN_REDIRECT',
          message: "I'd love to help you with meal planning! 🍽️",
          redirectMessage:
            'For personalized meal plans tailored to your PCOS needs, dietary preferences, and lifestyle, please use our dedicated <strong>Meal Plan Generator</strong>. It creates complete 7-day plans with recipes, nutrition info, and grocery lists!',
          actionText: 'Go to Meal Plan Generator',
          actionUrl: '/meals',
          detectedIntent: 'obfuscated_keyword',
          helpText:
            "I'm here to answer questions about PCOS, symptoms, lifestyle tips, and general nutrition advice through chat. For complete meal plans, the Meal Plan Generator is your best option!",
        },
      });
    }

    // Helper: Normalize repeated characters (fooooood -> food)
    const normalizeRepeatedChars = (text) => {
      return text.replace(/(.)\1{2,}/g, '$1$1');
    };

    // Helper: Normalize leet speak and number substitutions
    const normalizeLeetSpeak = (text) => {
      return text
        .replace(/[0]/g, 'o')
        .replace(/[1]/g, 'i')
        .replace(/[3]/g, 'e')
        .replace(/[4]/g, 'a')
        .replace(/[5]/g, 's')
        .replace(/[7]/g, 't')
        .replace(/[8]/g, 'b');
    };

    // Helper: Fix common typos used to bypass detection
    const fixCommonTypos = (text) => {
      return text
        .replace(/\bweak\b/gi, 'week') // weak -> week
        .replace(/\bmeel\b/gi, 'meal') // meel -> meal
        .replace(/\bdiet\b/gi, 'diet') // di3t -> diet (after leet normalization)
        .replace(/\bfoood\b/gi, 'food'); // foood -> food (after repeated char normalization)
    };

    // Apply additional normalization
    const hyperNormalizedMessage = fixCommonTypos(
      normalizeLeetSpeak(normalizeRepeatedChars(deobfuscatedMessage))
    );

    // STEP 2: Normalize text to remove obfuscation for pattern matching
    const deobfuscatedMessage = normalizeObfuscatedText(message);

    // Comprehensive meal plan intent patterns
    const mealPlanPatterns = {
      // Explicit meal plan requests
      explicit: [
        /meal\s*plan/i,
        /diet\s*plan/i,
        /food\s*plan/i,
        /eating\s*plan/i,
        /nutrition\s*plan/i,
        /weekly\s*meal/i,
        /daily\s*meal/i,
        /7\s*day\s*meal/i,
        /create.*meal.*plan/i,
        /generate.*meal.*plan/i,
        /make.*meal.*plan/i,
        /need.*meal.*plan/i,
        /want.*meal.*plan/i,
      ],

      // Implicit meal plan requests
      implicit: [
        /what\s+should\s+i\s+eat/i,
        /what\s+can\s+i\s+eat/i,
        /suggest.*meals?/i,
        /recommend.*meals?/i,
        /meal.*ideas?/i,
        /meal.*suggestions?/i,
        /breakfast.*lunch.*dinner/i,
        /daily.*diet/i,
        /weekly.*diet/i,
        /diet.*chart/i,
        /food.*chart/i,
        /eating.*schedule/i,
        /meal.*schedule/i,
        /complete.*diet/i,
        /full.*diet/i,
        /meal.*routine/i,
        /eating.*routine/i,
      ],

      // Regional specific requests
      regional: [
        /(north|south|east|west)\s*indian.*meal/i,
        /regional.*meal/i,
        /local.*meal.*plan/i,
        /(punjabi|tamil|bengali|gujarati|marathi).*meal/i,
      ],

      // Duration-based requests
      duration: [
        /\d+\s*day.*meal/i,
        /\d+\s*week.*meal/i,
        /week.*meal.*plan/i,
        /month.*meal.*plan/i,
        /daily.*menu/i,
        /weekly.*menu/i,
      ],

      // PCOS-specific meal planning
      pcosSpecific: [
        /pcos.*meal/i,
        /pcos.*diet/i,
        /pcod.*meal/i,
        /pcod.*diet/i,
        /insulin.*resistant.*meal/i,
        /low.*gi.*meal.*plan/i,
        /low.*glycemic.*meal/i,
      ],

      // Time-based meal requests (morning/afternoon/night + food)
      timeBased: [
        /(morning|afternoon|evening|night).*food/i,
        /food.*(morning|afternoon|evening|night)/i,
        /(breakfast|lunch|dinner).*food/i,
        /food.*(breakfast|lunch|dinner)/i,
        /(morning|afternoon|night).*eat/i,
        /eat.*(morning|afternoon|night)/i,
      ],

      // "Want food" type requests with time indicators
      desireFood: [
        /want.*food.*(morning|afternoon|night|day|week)/i,
        /need.*food.*(morning|afternoon|night|day|week)/i,
        /desire.*food/i,
        /crave.*food/i,
        /looking\s+for.*food/i,
      ],

      // Multi-time meal requests (mentions 2+ meal times)
      multiTime: [
        /(morning|breakfast).*(?:and|&).*(afternoon|lunch|evening|dinner|night)/i,
        /(morning|breakfast).*(afternoon|lunch).*(evening|dinner|night)/i,
        /(lunch|afternoon).*(dinner|evening|night)/i,
      ],
    };

    // Check all pattern categories on BOTH normalized and deobfuscated text
    let detectedIntent = false;
    let detectedCategory = null;

    for (const [category, patterns] of Object.entries(mealPlanPatterns)) {
      // Test against all normalized versions
      const matchesPattern = patterns.some(
        (pattern) =>
          pattern.test(normalizedMessage) ||
          pattern.test(deobfuscatedMessage) ||
          pattern.test(hyperNormalizedMessage)
      );

      if (matchesPattern) {
        detectedIntent = true;
        detectedCategory = category;
        break;
      }
    }

    // Additional context-based detection (phrases that indicate meal planning need)
    const contextualIndicators = [
      // Mentions breakfast AND lunch/dinner
      normalizedMessage.includes('breakfast') &&
        (normalizedMessage.includes('lunch') || normalizedMessage.includes('dinner')),
      normalizedMessage.includes('menu') && normalizedMessage.length < 100,
      // Diet + follow/start (starting a diet plan)
      normalizedMessage.includes('diet') &&
        (normalizedMessage.includes('follow') || normalizedMessage.includes('start')),
      // Eating schedule
      normalizedMessage.includes('eating') && normalizedMessage.includes('schedule'),

      // Food + multiple time periods (morning, afternoon, night)
      (normalizedMessage.includes('food') || hyperNormalizedMessage.includes('food')) &&
        [
          normalizedMessage.includes('morning') || hyperNormalizedMessage.includes('morning'),
          normalizedMessage.includes('afternoon') || hyperNormalizedMessage.includes('afternoon'),
          normalizedMessage.includes('night') || hyperNormalizedMessage.includes('night'),
          normalizedMessage.includes('day') || hyperNormalizedMessage.includes('day'),
        ].filter(Boolean).length >= 2, // At least 2 time periods mentioned

      // Want/need + food + duration/time
      /want|need|desire/i.test(normalizedMessage) &&
        (normalizedMessage.includes('food') || hyperNormalizedMessage.includes('food')) &&
        (/week|day|morning|afternoon|night/i.test(normalizedMessage) ||
          /week|day|morning|afternoon|night/i.test(hyperNormalizedMessage)),
    ];

    if (contextualIndicators.some((indicator) => indicator)) {
      detectedIntent = true;
      detectedCategory = 'contextual';
    }

    // If meal plan intent detected, block and return redirect response
    if (detectedIntent) {
      logger.info('Meal plan intent detected - redirecting to meal plan generator', {
        message: message.substring(0, 100),
        category: detectedCategory,
      });

      return res.json({
        success: true,
        data: {
          type: 'MEAL_PLAN_REDIRECT',
          message: "I'd love to help you with meal planning! 🍽️",
          redirectMessage:
            'For personalized meal plans tailored to your PCOS needs, dietary preferences, and lifestyle, please use our dedicated <strong>Meal Plan Generator</strong>. It creates complete 7-day plans with recipes, nutrition info, and grocery lists!',
          actionText: 'Go to Meal Plan Generator',
          actionUrl: '/meals',
          detectedIntent: detectedCategory,
          helpText:
            "I'm here to answer questions about PCOS, symptoms, lifestyle tips, and general nutrition advice through chat. For complete meal plans, the Meal Plan Generator is your best option!",
        },
      });
    }

    // No meal plan intent detected, continue to normal chat processing
    next();
  } catch (error) {
    logger.error('Meal plan intent detection failed', {
      error: error.message,
      stack: error.stack,
    });
    // On error, allow normal processing to continue
    next();
  }
};

/**
 * Helper function to check if a message is a meal plan request
 * Can be used in other parts of the codebase
 */
export const isMealPlanRequest = (message) => {
  const detector = { body: { message } };
  let isMealPlan = false;

  mealPlanIntentDetector(
    detector,
    {
      json: () => {
        isMealPlan = true;
      },
    },
    () => {
      isMealPlan = false;
    }
  );

  return isMealPlan;
};
