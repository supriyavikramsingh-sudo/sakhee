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
    };

    // Check all pattern categories on BOTH normalized and deobfuscated text
    let detectedIntent = false;
    let detectedCategory = null;

    for (const [category, patterns] of Object.entries(mealPlanPatterns)) {
      // Test against both original normalized message and deobfuscated version
      const matchesPattern = patterns.some(
        (pattern) => pattern.test(normalizedMessage) || pattern.test(deobfuscatedMessage)
      );

      if (matchesPattern) {
        detectedIntent = true;
        detectedCategory = category;
        break;
      }
    }

    // Additional context-based detection (phrases that indicate meal planning need)
    const contextualIndicators = [
      normalizedMessage.includes('breakfast') &&
        (normalizedMessage.includes('lunch') || normalizedMessage.includes('dinner')),
      normalizedMessage.includes('menu') && normalizedMessage.length < 100,
      normalizedMessage.includes('diet') &&
        (normalizedMessage.includes('follow') || normalizedMessage.includes('start')),
      normalizedMessage.includes('eating') && normalizedMessage.includes('schedule'),
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
