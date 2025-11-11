// server/src/langchain/chains/chatChain.js
// ✅ ENHANCED VERSION - Integrates Lab Values from Medical Reports
// Adds Scenario 1, 2, 3 support with medical report data

import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { llmClient } from '../llmClient.js';
import { retriever } from '../retriever.js';
import { redditService } from '../../services/redditService.js';
import { serpService } from '../../services/serpService.js';
import { medicalReportService } from '../../services/medicalReportService.js';
import { Logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new Logger('ChatChain');

class ChatChain {
  constructor() {
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
    });

    // Load system prompt with comprehensive instructions
    const promptPath = path.join(__dirname, '../prompts/systemPrompt.md');
    const defaultPrompt = this.buildEnhancedSystemPrompt();

    this.systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : defaultPrompt;
  }

  /**
   * Content Safety Filter - Blocks NSFW, adult, and inappropriate content requests
   * @param {string} message - User message to check
   * @returns {Object} - { isBlocked: boolean, reason: string }
   */
  checkContentSafety(message) {
    const messageLower = message.toLowerCase();

    // NSFW/Adult content patterns
    const nsfwPatterns = [
      // Explicit sexual content
      /\b(porn|pornography|pornographic|xxx|nsfw|18\+)\b/i,
      /\b(sex video|sex tape|nude|nudes|naked)\b/i,
      /\b(erotic|sexual content|adult content)\b/i,

      // Explicit body parts (non-medical context)
      /\b(boobs|tits|ass|dick|cock|pussy|vagina|penis)\b(?!.*\b(health|medical|doctor|pain|infection|discharge|symptoms)\b)/i,

      // Dating/hookup apps with sexual intent
      /\b(tinder|bumble|dating app).*\b(sex|hookup|casual|one night)\b/i,
      /\b(hookup|one night stand|friends with benefits|fwb)\b/i,

      // Fetish/kink content
      /\b(fetish|kink|bdsm|bondage)\b/i,

      // Adult industry
      /\b(onlyfans|cam girl|stripper|escort|prostitut)\b/i,
    ];

    // Violence/harm patterns
    const violencePatterns = [
      /\b(kill myself|suicide|self harm|cut myself)\b/i,
      /\b(how to die|ways to die|end my life)\b/i,
      /\b(hurt someone|harm someone|kill someone)\b/i,
    ];

    // Illegal activity patterns
    const illegalPatterns = [
      /\b(buy drugs|sell drugs|drug dealer)\b/i,
      /\b(illegal|contraband|smuggle|trafficking)\b/i,
      /\b(hack|hacking|steal|theft)\b/i,
    ];

    // Check NSFW patterns
    for (const pattern of nsfwPatterns) {
      if (pattern.test(messageLower)) {
        logger.warn('🚫 NSFW content detected:', { message: message.substring(0, 100) });
        return {
          isBlocked: true,
          reason: 'nsfw',
          message:
            "I'm sorry, but I cannot provide NSFW or adult content. I'm here to help with PCOS health and wellness questions in a safe, educational environment. Please ask me about PCOS symptoms, lifestyle management, nutrition, or other health-related topics.",
        };
      }
    }

    // Check violence/harm patterns
    for (const pattern of violencePatterns) {
      if (pattern.test(messageLower)) {
        logger.warn('🚫 Self-harm/violence content detected:', {
          message: message.substring(0, 100),
        });
        return {
          isBlocked: true,
          reason: 'violence',
          message:
            "I'm concerned about your message. If you're experiencing thoughts of self-harm or suicide, please reach out to:\n\n🆘 **Suicide Prevention Helpline (India)**: 9152987821\n🆘 **AASRA**: 91-9820466726\n🆘 **Vandrevala Foundation**: 1860-2662-345\n\nYour life matters. Please talk to a mental health professional who can provide proper support.",
        };
      }
    }

    // Check illegal activity patterns
    for (const pattern of illegalPatterns) {
      if (pattern.test(messageLower)) {
        logger.warn('🚫 Illegal activity content detected:', {
          message: message.substring(0, 100),
        });
        return {
          isBlocked: true,
          reason: 'illegal',
          message:
            "I cannot provide assistance with illegal activities. I'm designed to help with PCOS health and wellness in a safe, legal, and ethical manner. Please ask me about PCOS symptoms, lifestyle management, or other health-related topics.",
        };
      }
    }

    // Content is safe
    return { isBlocked: false, reason: null, message: null };
  }

  /**
   * Meal Plan Request Detection - Backup filter to catch requests that bypass middleware
   * Uses aggressive normalization to catch obfuscated attempts
   * @param {string} message - User message to check
   * @returns {Object} - { isMealPlan: boolean, category: string }
   */
  detectMealPlanRequest(message) {
    const messageLower = message.toLowerCase();

    // Normalize repeated characters (fooooood -> food)
    const normalizeRepeatedChars = (text) => text.replace(/(.)\1{2,}/g, '$1$1');

    // Normalize leet speak and number substitutions
    const normalizeLeetSpeak = (text) =>
      text
        .replace(/[0]/g, 'o')
        .replace(/[1]/g, 'i')
        .replace(/[3]/g, 'e')
        .replace(/[4]/g, 'a')
        .replace(/[5]/g, 's')
        .replace(/[7]/g, 't')
        .replace(/[8]/g, 'b');

    // Fix common typos
    const fixCommonTypos = (text) =>
      text
        .replace(/\bweak\b/gi, 'week')
        .replace(/\bmeel\b/gi, 'meal')
        .replace(/\bfoood\b/gi, 'food');

    const normalized = fixCommonTypos(normalizeLeetSpeak(normalizeRepeatedChars(messageLower)));

    // Pattern categories
    const patterns = {
      explicit: [
        /meal\s*plan/i,
        /diet\s*plan/i,
        /food\s*plan/i,
        /eating\s*plan/i,
        /weekly\s*meal/i,
      ],
      multiTime: [
        /(morning|breakfast).*(afternoon|lunch).*(evening|dinner|night)/i,
        /(morning|breakfast).*(lunch|dinner|night)/i,
      ],
      foodWithDuration: [
        /food.*(week|day)/i,
        /(want|need|desire).*food.*(morning|afternoon|night)/i,
      ],
    };

    // Check all patterns
    for (const [category, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        if (pattern.test(normalized) || pattern.test(messageLower)) {
          return { isMealPlan: true, category };
        }
      }
    }

    // Contextual check: food + multiple time periods
    const containsFood = normalized.includes('food');
    const timePeriods = ['morning', 'afternoon', 'night', 'breakfast', 'lunch', 'dinner'].filter(
      (t) => normalized.includes(t)
    ).length;

    if (containsFood && timePeriods >= 2) {
      return { isMealPlan: true, category: 'contextual_multi_time' };
    }

    // Check: food + week/day duration
    if (containsFood && (normalized.includes('week') || /\d+\s*day/i.test(normalized))) {
      return { isMealPlan: true, category: 'contextual_duration' };
    }

    return { isMealPlan: false, category: null };
  }

  buildEnhancedSystemPrompt() {
    return `You are Sakhee, an empathetic, non-judgmental AI health companion specializing in PCOS/PCOD management for Indian women.

⚠️ CRITICAL RULE: When the RETRIEVED CONTEXT below contains instructions marked as "MANDATORY", "CRITICAL", or "YOU MUST", you MUST follow them exactly. Failure to follow these instructions results in an incomplete response.

## Your Core Role
- Provide evidence-based, educational guidance on PCOS symptoms and lifestyle management
- Analyze user's specific lab values to identify root causes of symptoms
- Offer culturally adapted, region-specific recommendations based on medical data
- Support emotional well-being through compassionate communication
- Connect women to community experiences while maintaining medical safety
- Use real-time nutritional data and community insights when relevant

## Integration Powers
You have access to:
1. **Medical Knowledge Base**: Evidence-based PCOS research and lab-specific dietary guidance
2. **User's Medical Report**: Actual lab values with severity classifications
3. **Reddit Community Insights**: Anonymized experiences from r/PCOS, r/PCOSIndia, etc.
4. **Nutritional Database**: Real-time nutrition facts via SERP API for Indian foods

## CRITICAL: Using User's Lab Values

When user's lab values are provided in context:
- **ALWAYS reference their specific values** when explaining symptoms
- **Connect symptoms to lab abnormalities** (e.g., "Your high insulin may be causing...")
- **Use RAG guidance** to provide evidence-based food recommendations for their specific labs
- **Be specific and personalized** - avoid generic advice
- **Prioritize metabolic markers** (glucose, insulin, HOMA-IR) as they drive most PCOS symptoms
- **Explain the WHY** - help user understand the physiology behind their symptoms

### Example Response Structure (Scenario 1: Symptom Query):
User: "Why am I experiencing hair loss and acne?"

Your response should:
1. **Check their lab values** for testosterone, insulin, DHEA-S
2. **Identify root causes**: "Looking at your lab results, your elevated insulin (15 µIU/mL) and high testosterone (65 ng/dL) are likely driving these symptoms. Here's why..."
3. **Explain physiology**: Brief, simple explanation of how these hormones cause symptoms
4. **RAG-based recommendations**: Use retrieved dietary guidance specific to their lab abnormalities
5. **Community validation**: If Reddit data available, share similar experiences
6. **Action plan**: 3-5 specific, actionable steps prioritized by impact

### Example Response Structure (Scenario 2: Lab Value Query):
User: "How can I improve my insulin levels?"

Your response should:
1. **Current status**: "Your fasting insulin is 18 µIU/mL, which falls in the 'elevated' range..."
2. **Target range**: "The optimal range is 2-7 µIU/mL, normal is up to 25 µIU/mL"
3. **RAG dietary guidance**: Specific foods from knowledge base for insulin management
4. **Regional adaptation**: Tailor recommendations to their location/cuisine preference
5. **Lifestyle factors**: Sleep, stress, exercise impact on insulin
6. **Timeline**: "With consistent dietary changes, you may see improvement in 4-8 weeks"

### Example Response Structure (Scenario 3: Community Insights):
User: "I feel so alone dealing with low iron and fatigue"

Your response should:
1. **Natural opening** (2-3 sentences): VARY your opening phrases! Examples:
   - "That's a really common concern among women with PCOS..."
   - "Low iron and fatigue often go hand in hand with PCOS..."
   - "Let me help you understand what might be happening..."
   - Avoid starting EVERY response with "I understand..." - be creative!

2. **Brief data validation** (1-2 sentences): "Your ferritin at 22 ng/mL is indeed low, which explains the fatigue you're experiencing."

3. **Actionable recommendations from RAG** (3-4 bullet points): Focus on evidence-based dietary advice from the knowledge base. Be specific and practical.

4. **Community validation** (1-2 sentences ONLY): "The PCOS community has shared valuable experiences with this, which I've linked below."

5. **Reddit Links Section** (ALWAYS at the END): List 5 clickable links with brief, descriptive titles. DO NOT explain or summarize the posts in detail - just provide the links.

### CRITICAL: Reddit Response Guidelines

**DO:**
- ✅ VARY your opening phrases - never start multiple responses the same way!
- ✅ Mention that the community shares similar experiences (1-2 sentences max)
- ✅ Focus your response on RAG-based advice and actionable recommendations
- ✅ List Reddit links at the END in a clean section
- ✅ Keep the entire response under 300 words
- ✅ For recipe/food/diet questions: Subtly suggest using the Meal Plan feature

**DON'T:**
- ❌ Start every response with "I understand..." - this is REPETITIVE and mechanical!
- ❌ Explain each Reddit post in detail
- ❌ Quote extensively from Reddit posts
- ❌ Write "In one post, a user mentioned..." or "Another member shared..."
- ❌ Summarize every post - let users read them directly

### MEAL PLAN FEATURE REDIRECT
When users ask about:
- Recipes, meal ideas, what to eat
- Diet plans, food suggestions
- PCOS-friendly meals

Include this at the end (before Reddit links):
"💡 **Want personalized meal plans?** Check out our Meal Plan feature for customized weekly plans tailored to your preferences, dietary restrictions, and health goals!"

### CRITICAL: Reddit Links Formatting
ALWAYS format the links section like this at the VERY END of your response:

---

📚 **Community Discussions You Might Find Helpful:**
- [Descriptive title 1](https://reddit.com/...)
- [Descriptive title 2](https://reddit.com/...)
- [Descriptive title 3](https://reddit.com/...)
- [Descriptive title 4](https://reddit.com/...)
- [Descriptive title 5](https://reddit.com/...)

💬 *These are personal experiences from the community, not medical advice.*

## CRITICAL: Nutrition Query Guidelines

When users ask about nutritional information for ANY food/dish:

### ALWAYS Provide PCOS-Friendly Analysis & Alternatives

1. **Nutrition Facts First**: Provide the macros (calories, protein, carbs, fats, GI if known)

2. **PCOS-Friendliness Assessment**: Evaluate the dish against PCOS dietary principles:
   - ✅ **PCOS-Friendly**: High protein (>15g/serving), low GI, moderate healthy fats, fiber-rich
   - ⚠️ **Needs Modification**: High carb, low protein, high refined carbs, fried/high saturated fat
   - ❌ **Not Recommended**: Very high GI, mostly refined carbs, minimal protein, trans fats

3. **MANDATORY: Ingredient Substitutions Section**

⚠️ **CRITICAL**: If you receive "🔄 PCOS-FRIENDLY INGREDIENT SUBSTITUTES (from RAG)" in the context:
- **ALWAYS reference and use those specific substitutes** instead of generic ones
- The RAG data contains evidence-based, regionally-appropriate substitutes
- Cite the specific substitute recommendations from the RAG knowledge base
- If no RAG data provided, use the fallback guidelines below

For ANY dish that isn't optimal for PCOS (high carb, low protein, high GI, fried, etc.), ALWAYS include:

**🔄 PCOS-Friendly Modifications:**

**To Reduce GI & Carbs:**
- Replace white rice → brown rice, quinoa, or cauliflower rice (50% mix)
  (Check RAG for regional alternatives like matta rice, foxtail millet, bajra)
- Replace wheat flour/maida → chickpea flour (besan), almond flour, or multigrain atta
  (Check RAG for regional flours like ragi, jowar, sattu)
- Replace refined sugar → stevia, erythritol, or dates (minimal)
- Replace oats/milk → Check RAG for PCOS-friendly alternatives and portion guidance
- Add 1-2 tbsp ground flaxseed or chia seeds to dough for fiber

**To Boost Protein:**
- Add 50g paneer, tofu, or Greek yogurt to the meal
- Include dal/lentils (1/2 cup) as a side
- Add 1 boiled egg or sprinkle roasted chickpeas on top
- Mix protein powder into batters/doughs (unflavored whey or pea protein)
- Check RAG for specific protein recommendations for the dish

**To Reduce Unhealthy Fats:**
- Bake or air-fry instead of deep-frying
- Use minimal ghee/oil (1-2 tsp max per serving)
- Replace saturated fats → use olive oil, avocado oil, or mustard oil
- Replace coconut milk/cream → Check RAG for lower-fat alternatives
- Skip the tempering/tadka or reduce oil by half

**Portion Control Tips:**
- Pair with fiber-rich sides (salad, roasted veggies, raita)
- Eat protein first, then carbs to slow glucose spike
- Limit portion to 1 serving (specify grams/size)
- Have it earlier in the day (breakfast/lunch) rather than dinner

**REMEMBER**: When RAG provides ingredient substitute data, PRIORITIZE those recommendations over generic advice!

4. **Example Enhanced Response Format:**

EXAMPLE 1: For high-carb traditional dishes
When user asks: "What are the nutritional breakdown of dal dhokli?"

Include in your response:
- Nutrition facts (calories, protein, carbs, fats, fibre, GI)
- PCOS Analysis (Friendly / Needs Modification / Not Recommended)
- Ingredient substitutions to reduce GI and boost protein
- Better alternatives (e.g., use chickpea flour instead of refined flour)
- Portion control tips
- Meal Plan feature mention

EXAMPLE 2: For fried/unhealthy foods
When user asks: "nutritional info on samosa"

Include in your response:
- Nutrition facts showing LOW protein, HIGH carbs/fats, HIGH GI
- PCOS Analysis: Not Recommended (explain why: deep-fried, refined flour, minimal protein)
- Healthier alternatives (baked versions, paneer tikka, chickpea cutlets)
- If they must eat it: modifications (bake/air-fry, whole wheat flour, protein-rich filling)
- Better snack options for PCOS
- Meal Plan feature mention

EXAMPLE 3: For already PCOS-friendly dishes
When user asks: "nutrition of grilled chicken salad"

Include in your response:
- Nutrition facts showing HIGH protein, LOW carbs, healthy fats
- PCOS Analysis: Excellent Choice (explain benefits)
- Optional enhancements (add nuts, seeds, Greek yogurt dressing for extra protein)
- Portion suggestions
- Similar PCOS-friendly meal ideas

## MANDATORY SECTIONS for ALL Nutrition Queries:
1. Nutrition Facts (macros)
2. PCOS Analysis (Friendly/Needs Modification/Not Recommended)
3. Modifications OR Alternatives (ALWAYS provide actionable substitutions)
4. Portion tips
5. Meal Plan feature mention

## REMEMBER: EVERY nutrition query should include PCOS-friendly modifications - no exceptions!

## CRITICAL: Nutrition Data Validation

⚠️ **ALWAYS validate nutrition data for reasonableness before presenting it!**

When you receive nutrition data from the database, CHECK if it makes sense:

### Red Flags for INACCURATE Data:

**Complex/Rich Dishes with Suspiciously Low Calories:**
- Desserts, puddings, cakes showing <150 cal/100g (likely missing cream, sugar, butter)
- Fried foods showing <200 cal/100g (likely missing oil/fat content)
- Creamy dishes showing <100 cal/100g (likely missing dairy fat)

**Common Examples of Problematic Foods:**
- **Banana pudding**: Should be 200-300 cal/100g (has bananas, cream, cookies, sugar)
  - If data shows <150 cal → DATA IS INCOMPLETE
- **Gulab jamun**: Should be 300-400 cal/piece (deep-fried, sugar syrup)
  - If data shows <200 cal → DATA IS INCOMPLETE
- **Biryani**: Should be 250-350 cal/cup (rice, meat/paneer, oil, ghee)
  - If data shows <150 cal → DATA IS INCOMPLETE

### When Data Seems INACCURATE:

**DO THIS:**
1. **Acknowledge the limitation**: "The database nutrition data seems incomplete for [dish] as it doesn't account for all ingredients..."
2. **Provide realistic estimate**: "A typical serving of [dish] would be approximately [realistic calories] calories because it contains [list key high-calorie ingredients]"
3. **Break down components**: 
   - Example for banana pudding: "Let's think about the components: 1 banana (~105 cal) + vanilla wafers (~140 cal) + custard/cream (~120 cal) + sugar (~50 cal) = ~415 calories for a typical serving"
4. **Explain what's likely missing**: "The data I found likely only accounts for [component], not the complete dish with [missing components]"
5. **Give practical portion guidance**: "A typical restaurant/homemade serving is about [amount], which would be approximately [realistic calories] calories"

**DON'T DO THIS:**
- ❌ Present obviously incorrect data without questioning it
- ❌ Say "105 calories" for banana pudding without mentioning this seems low
- ❌ Ignore the fact that the data doesn't account for cream, cookies, bananas, etc.

### Validation Checklist:

For **desserts/sweets** (puddings, cakes, mithai, ice cream):
- ✅ Expect: 200-500 cal/100g
- 🚨 If <150 cal/100g → VALIDATE: Does this account for sugar, cream, butter, ghee?

For **fried foods** (samosa, pakora, bhujia, chips):
- ✅ Expect: 300-500 cal/100g
- 🚨 If <200 cal/100g → VALIDATE: Does this account for deep-frying oil?

For **creamy curries** (korma, butter chicken, paneer makhani):
- ✅ Expect: 150-250 cal/100g
- 🚨 If <100 cal/100g → VALIDATE: Does this account for cream, butter, oil?

For **rice dishes** (biryani, pulao, fried rice):
- ✅ Expect: 150-200 cal/100g
- 🚨 If <100 cal/100g → VALIDATE: Does this account for oil, ghee, meat/paneer?

### Example of GOOD Response with Validation:

User: "What are the macros for banana pudding?"

❌ **BAD Response**: "Banana pudding has 105 calories per 100g with 2.8g protein..."

✅ **GOOD Response**: 
"I found some nutritional data, but it appears incomplete as it shows only 105 calories per 100g, which doesn't account for all the components of banana pudding.

Let me give you a more realistic breakdown:

**Typical Banana Pudding (1 cup/~200g serving):**
- **Calories**: ~300-350 cal
- **Protein**: ~6-8g
- **Carbs**: ~45-55g (mostly from bananas, cookies, sugar)
- **Fat**: ~10-15g (from cream/custard, butter in cookies)

**Why is it higher?** Banana pudding contains:
- Bananas (natural sugars, ~105 cal per medium banana)
- Vanilla wafers/cookies (refined carbs, butter, ~140 cal per serving)
- Custard or whipped cream (dairy fat, sugar, ~100-120 cal)
- Added sugar in the recipe (~50-100 cal)

**PCOS Analysis**: ⚠️ Needs Significant Modification
- High refined carbs from cookies
- High sugar content (spikes blood glucose)
- Low protein (won't keep you satisfied)
- Moderate fat (mostly saturated from cream)

[... then provide PCOS modifications as usual ...]"

## Lab Value Interpretation Guidelines

### Priority Order (address in this sequence):
1. **Metabolic** (glucose, insulin, HOMA-IR, HbA1c) - Root cause driver
2. **Hormonal** (testosterone, LH/FSH ratio, AMH) - Symptom manifestation
3. **Nutritional** (Vitamin D, B12, iron/ferritin) - Energy and wellbeing
4. **Lipid** (cholesterol, triglycerides) - Long-term health
5. **Inflammation** (CRP) - Overall disease activity
6. **Thyroid** (TSH, T3, T4) - Metabolic function

### Severity Language:
- **Optimal/Normal**: "Your [lab] is in the healthy range"
- **Elevated/Borderline**: "Your [lab] is slightly elevated, which may be contributing to..."
- **High/Critical**: "Your [lab] is significantly elevated and likely a key driver of your symptoms"
- **Low/Deficient**: "Your [lab] is below optimal, which can cause..."

## Medical Safety (ALWAYS INCLUDE):
- NEVER diagnose or prescribe
- Always recommend doctor consultation for:
  * Severe symptoms (pain, bleeding, sudden changes)
  * Lab value interpretation requiring medical decision
  * Fertility/pregnancy concerns
  * Medication decisions or adjustments
  * No improvement after 3 months of lifestyle changes
  * Values in "critical" range

## Disclaimer Rules:
- **DO NOT include disclaimers** in your response - they will be added automatically based on context
- Focus on providing clear, actionable guidance without legal/medical disclaimers

## Tone: Warm, Knowledgeable, Empowering
- Use simple language, avoid excessive medical jargon
- Validate emotions: "It's completely understandable to feel frustrated when..."
- Empower with knowledge: "Understanding your lab values helps you make informed choices"
- Encourage gradual progress: "Small, consistent changes add up over time"
- End with hope: "Many women have improved these values with dietary and lifestyle changes"

Remember: You're a knowledgeable companion who helps women understand their PCOS using their actual medical data, not just generic advice.`;
  }

  /**
   * NEW: Fetch user's medical report and extract lab values
   */
  async getUserLabValues(userId) {
    if (!userId) {
      logger.warn('No userId provided for lab value retrieval');
      return null;
    }

    try {
      logger.info('Fetching user medical report for lab values', { userId });

      const reportResult = await medicalReportService.getUserReport(userId);

      if (!reportResult.success || !reportResult.data) {
        logger.info('No medical report found for user', { userId });
        return null;
      }

      const labValues = reportResult.data.labValues;

      if (!labValues || Object.keys(labValues).length === 0) {
        logger.info('Medical report exists but no lab values found', { userId });
        return null;
      }

      logger.info('Lab values retrieved successfully', {
        userId,
        labCount: Object.keys(labValues).length,
      });

      return {
        labValues,
        uploadedAt: reportResult.data.uploadedAt,
        analysis: reportResult.data.analysis,
      };
    } catch (error) {
      logger.error('Failed to fetch user lab values', {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * NEW: Build lab-specific context for chat
   */
  buildLabContext(medicalData) {
    if (!medicalData || !medicalData.labValues) {
      return '';
    }

    const labValues = medicalData.labValues;
    let context = "\n📊 USER'S MEDICAL REPORT LAB VALUES:\n";
    context +=
      '(Use these specific values to personalize your response and explain symptom root causes)\n\n';

    // Categorize labs by priority
    const categorized = this.categorizeLabs(labValues);

    // Metabolic markers (highest priority)
    if (categorized.metabolic.length > 0) {
      context += '🔴 METABOLIC MARKERS (HIGH PRIORITY - Address First):\n';
      categorized.metabolic.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
        if (lab.severity !== 'normal' && lab.severity !== 'optimal') {
          context += `    ⚠️ This ${lab.severity} level may be contributing to insulin resistance and related symptoms\n`;
        }
      });
      context += '\n';
    }

    // Hormonal markers
    if (categorized.hormonal.length > 0) {
      context += '⚠️ HORMONAL MARKERS:\n';
      categorized.hormonal.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
        if (lab.severity !== 'normal' && lab.severity !== 'optimal') {
          context += `    ⚠️ This may be causing symptoms like acne, hair loss, irregular periods\n`;
        }
      });
      context += '\n';
    }

    // Nutritional status
    if (categorized.nutritional.length > 0) {
      context += '🥗 NUTRITIONAL STATUS:\n';
      categorized.nutritional.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
        if (lab.severity === 'deficient' || lab.severity === 'low') {
          context += `    ⚠️ Deficiency may cause fatigue, mood issues, weakened immunity\n`;
        }
      });
      context += '\n';
    }

    // Lipid profile
    if (categorized.lipid.length > 0) {
      context += '💊 LIPID PROFILE:\n';
      categorized.lipid.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
      });
      context += '\n';
    }

    // Inflammation
    if (categorized.inflammation.length > 0) {
      context += '🔥 INFLAMMATION MARKERS:\n';
      categorized.inflammation.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
      });
      context += '\n';
    }

    // Thyroid
    if (categorized.thyroid.length > 0) {
      context += '🦋 THYROID MARKERS:\n';
      categorized.thyroid.forEach((lab) => {
        context += `  - ${this.formatLabName(lab.name)}: ${lab.value} ${
          lab.unit || ''
        } [${lab.severity.toUpperCase()}]\n`;
      });
      context += '\n';
    }

    context += '**CRITICAL INSTRUCTIONS:**\n';
    context += '1. Reference these SPECIFIC lab values when answering symptom-related questions\n';
    context += "2. Explain HOW these values contribute to user's symptoms (the physiology)\n";
    context +=
      '3. Use RAG-retrieved dietary guidance to recommend foods for their specific abnormalities\n';
    context += '4. Be specific and personalized - avoid generic PCOS advice\n';
    context += '5. Focus on actionable guidance - disclaimers will be added automatically\n\n';

    return context;
  }

  /**
   * Categorize labs by system/priority
   */
  categorizeLabs(labValues) {
    const categories = {
      metabolic: [],
      hormonal: [],
      nutritional: [],
      lipid: [],
      inflammation: [],
      thyroid: [],
      other: [],
    };

    const metabolicLabs = ['glucose_fasting', 'insulin_fasting', 'homa_ir', 'hba1c'];
    const hormonalLabs = [
      'testosterone_total',
      'testosterone_free',
      'dheas',
      'lh',
      'fsh',
      'lh_fsh_ratio',
      'amh',
      'prolactin',
      'estradiol',
      'progesterone',
    ];
    const nutritionalLabs = [
      'vitamin_d',
      'vitamin_b12',
      'iron',
      'ferritin',
      'tibc',
      'transferrin_saturation',
    ];
    const lipidLabs = [
      'cholesterol_total',
      'triglycerides',
      'hdl_cholesterol',
      'ldl_cholesterol',
      'vldl_cholesterol',
    ];
    const inflammationLabs = ['crp'];
    const thyroidLabs = ['tsh', 't3_free', 't4_free'];

    Object.entries(labValues).forEach(([name, data]) => {
      const labInfo = { name, ...data };

      if (metabolicLabs.includes(name)) {
        categories.metabolic.push(labInfo);
      } else if (hormonalLabs.includes(name)) {
        categories.hormonal.push(labInfo);
      } else if (nutritionalLabs.includes(name)) {
        categories.nutritional.push(labInfo);
      } else if (lipidLabs.includes(name)) {
        categories.lipid.push(labInfo);
      } else if (inflammationLabs.includes(name)) {
        categories.inflammation.push(labInfo);
      } else if (thyroidLabs.includes(name)) {
        categories.thyroid.push(labInfo);
      } else {
        categories.other.push(labInfo);
      }
    });

    return categories;
  }

  /**
   * Format lab name for display
   */
  formatLabName(name) {
    const nameMap = {
      glucose_fasting: 'Fasting Glucose',
      insulin_fasting: 'Fasting Insulin',
      homa_ir: 'HOMA-IR',
      hba1c: 'HbA1c',
      cholesterol_total: 'Total Cholesterol',
      triglycerides: 'Triglycerides',
      hdl_cholesterol: 'HDL Cholesterol',
      ldl_cholesterol: 'LDL Cholesterol',
      vldl_cholesterol: 'VLDL Cholesterol',
      testosterone_total: 'Total Testosterone',
      testosterone_free: 'Free Testosterone',
      dheas: 'DHEA-S',
      lh: 'LH',
      fsh: 'FSH',
      lh_fsh_ratio: 'LH:FSH Ratio',
      amh: 'AMH',
      prolactin: 'Prolactin',
      estradiol: 'Estradiol',
      progesterone: 'Progesterone',
      tsh: 'TSH',
      t3_free: 'Free T3',
      t4_free: 'Free T4',
      vitamin_d: 'Vitamin D',
      vitamin_b12: 'Vitamin B12',
      iron: 'Serum Iron',
      ferritin: 'Ferritin',
      tibc: 'TIBC',
      transferrin_saturation: 'Transferrin Saturation',
      crp: 'CRP',
    };

    return nameMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * NEW: Build lab-specific RAG query for dietary guidance
   */
  buildLabGuidanceQuery(labValues, userMessage) {
    if (!labValues || Object.keys(labValues).length === 0) {
      return null;
    }

    const queryParts = [];
    const abnormalLabs = [];

    // Identify abnormal values
    Object.entries(labValues).forEach(([labName, labData]) => {
      if (!labData || !labData.severity) return;

      const severity = labData.severity.toLowerCase();

      // Focus on non-optimal values
      if (severity !== 'normal' && severity !== 'optimal' && severity !== 'unknown') {
        abnormalLabs.push({
          name: labName,
          severity,
          value: labData.value,
        });
      }
    });

    // Build targeted query based on abnormal labs
    if (abnormalLabs.length > 0) {
      // Prioritize metabolic markers
      const metabolicAbnormal = abnormalLabs.filter((lab) =>
        ['glucose_fasting', 'insulin_fasting', 'homa_ir', 'hba1c'].includes(lab.name)
      );

      if (metabolicAbnormal.length > 0) {
        queryParts.push('insulin resistance glucose management');
      }

      // Add specific lab terms
      abnormalLabs.slice(0, 3).forEach((lab) => {
        const termMap = {
          glucose_fasting: 'fasting glucose',
          insulin_fasting: 'insulin',
          homa_ir: 'insulin resistance',
          testosterone_total: 'testosterone',
          vitamin_d: 'vitamin D',
          ferritin: 'iron ferritin',
        };

        const term = termMap[lab.name];
        if (term) queryParts.push(term);
      });
    }

    // Add query context from user message
    const symptomKeywords = [
      'acne',
      'hair loss',
      'weight',
      'fatigue',
      'period',
      'cycle',
      'fertility',
      'mood',
      'energy',
    ];

    symptomKeywords.forEach((keyword) => {
      if (userMessage.toLowerCase().includes(keyword)) {
        queryParts.push(keyword);
      }
    });

    if (queryParts.length === 0) {
      return 'PCOS dietary management';
    }

    return queryParts.join(' ') + ' diet food recommendations';
  }

  /**
   * Check if message needs community insights and extract ALL relevant keywords
   */
  needsCommunityInsights(message) {
    const lowerMessage = message.toLowerCase();

    // Enhanced trigger phrases that indicate user wants community experiences
    const triggers = [
      'reddit',
      'community',
      'other women',
      'women like me',
      ' experiences',
      ' stories',
      ' anyone',
      'women',
      'anyone else',
      'has anyone',
      'do other',
      'feel alone',
      'just me',
      'struggling',
      'dealing with',
      'experiences',
      'stories',
      'success stories',
      'have successfully',
      'successfully treated',
      'worked for',
      'anyone tried',
      'real experiences',
      'personal experiences',
      'any women',
      'are there any',
      'like me',
      'similar experiences',
      'find experiences',
      'looking for experiences',
      'want to hear from',
      'share your story',
      'share your experience',
      'any advice from',
      'tips from',
      'suggestions from',
      'recommendations from',
    ];

    // Check if message contains community insight triggers
    const hasTrigger = triggers.some((trigger) => lowerMessage.includes(trigger));
    if (!hasTrigger) return null;

    logger.info('🔍 Community insights needed, extracting ALL relevant keywords', { message });

    // Comprehensive PCOS-related keyword map with priorities
    const pcosKeywordCategories = {
      // Core PCOS terms (highest priority)
      core: [
        'pcos',
        'pcod',
        'polycystic',
        'ovarian',
        'syndrome',
        'disorder',
        'metabolic',
        'insulin resistance',
      ],

      // Geographic/cultural
      geographic: [
        'india',
        'indian',
        'desi',
        'ayurveda',
        'ayurvedic',
        'home remedies',
        'natural remedies',
        'traditional medicine',
        'holistic',
        'dietary habits',
      ],

      // Symptoms (high priority)
      symptoms: [
        'acne',
        'pimples',
        'skin',
        'breakouts',
        'hair loss',
        'thinning',
        'shedding',
        'hirsutism',
        'facial hair',
        'hair fall',
        'facial hair growth',
        'weight',
        'obesity',
        'overweight',
        'weight loss',
        'weight gain',
        'body fat',
        'irregular',
        'periods',
        'cycles',
        'amenorrhea',
        'spotting',
        'menstruation',
        'no periods',
        'cycle length',
        'fatigue',
        'tired',
        'exhausted',
        'energy',
        'lethargy',
        'mood',
        'depression',
        'anxiety',
        'emotional',
        'irritability',
        'mood swings',
        'brain fog',
        'concentration',
        'memory',
        'focus',
        'sleep',
        'insomnia',
        'restless',
        'sleep quality',
        'sleep apnea',
        'cramps',
        'pain',
        'pelvic pain',
        'abdominal pain',
        'bloating',
        'inflammation',
        'swelling',
        'water retention',
        'cravings',
        'hunger',
        'appetite',
        'sugar cravings',
      ],

      // Treatments/interventions
      treatments: [
        'metformin',
        'birth control',
        'spironolactone',
        'clomid',
        'letrozole',
        'inositol',
        'spearmint',
        'berberine',
        'cinnamon',
        'supplements',
        'vitamins',
        'herbs',
        'natural',
        'holistic',
        'home remedies',
        'minoxidil',
        'accutane',
        'isotretinoin',
        'tretinoin',
        'benzoyl peroxide',
        'antibiotics',
        'ozempic',
        'sglt2 inhibitors',
        'glp-1 agonists',
        'glp1',
        'insulin sensitizers',
        'lifestyle changes',
        'diet changes',
        'exercise routine',
        'keto',
        'low carb',
        'intermittent fasting',
        'yoga',
        'meditation',
        'stress management',
        'winlevi',
        'clomiphene',
        'spironolactone',
        'flutamide',
        'finasteride',
        'dutasteride',
        'laser hair removal',
        'electrolysis',
        'IUD',
        'intrauterine device',
        'N-acetylcysteine',
        'NAC',
        'orlistat',
        'Yasmin',
        'Diane-35',
        'Cyproterone acetate',
        'retinoids',
        'adapalene',
        'tazarotene',
        'clindamycin',
        'chemical peels',
        'microdermabrasion',
        'follical forte',
        'ovoplus',
        'fertility drugs',
        'ovarian drilling',
      ],

      // Lifestyle
      lifestyle: [
        'diet',
        'keto',
        'low carb',
        'fasting',
        'intermittent fasting',
        'exercise',
        'workout',
        'gym',
        'yoga',
        'cardio',
        'weights',
        'sleep',
        'stress',
        'meditation',
        'strength training',
        'lifestyle changes',
        'healthy habits',
        'wellness',
        'pilates',
        'walking',
        'running',
        'gluten free',
        'dairy free',
        'whole30',
        'paleo',
        'omad',
        'plant based',
        'vegan',
        'mindfulness',
        'self care',
        'mental health',
        'relaxation',
        'breathing exercises',
        'hydration',
        'water intake',
      ],

      // Fertility
      fertility: [
        'pregnancy',
        'pregnant',
        'conceive',
        'conception',
        'ttc',
        'trying to conceive',
        'fertility',
        'ovulation',
        'ovulate',
        'miscarriage',
        'ivf',
        'iui',
        'baby',
        'infertility',
      ],

      // Social/Relationship impacts
      social: [
        'relationship',
        'relationships',
        'partner',
        'husband',
        'boyfriend',
        'dating',
        'romance',
        'intimacy',
        'sex',
        'sexual',
        'libido',
        'marriage',
        'married',
        'spouse',
        'love life',
        'body image',
        'self esteem',
        'confidence',
        'insecure',
        'insecurity',
        'embarrassed',
        'shame',
        'social life',
        'friends',
        'family',
        'work life',
        'career',
        'job',
        'workplace',
        'colleagues',
        'discrimination',
        'stigma',
        'judgment',
        'support',
        'understanding',
        'acceptance',
      ],

      // Medical markers
      medical: [
        'insulin',
        'resistance',
        'glucose',
        'diabetes',
        'testosterone',
        'hormones',
        'estrogen',
        'progesterone',
        'thyroid',
        'tsh',
        'cortisol',
        'lipid',
        'cholesterol',
        'triglycerides',
        'vitamin d',
        'b12',
        'iron',
        'ferritin',
        'inflammation',
        'crp',
        'hba1c',
        'homair',
        'lh',
        'fsh',
        'amh',
        'dheas',
        'prolactin',
        'cortisol',
        'liver function',
        'kidney function',
        'metabolism',
        'testosterone levels',
        'LFT',
        'KFT',
        'blood sugar',
        'fasting insulin',
      ],
    };

    // Extract keywords from ALL categories
    const foundKeywords = [];

    Object.entries(pcosKeywordCategories).forEach(([category, keywords]) => {
      keywords.forEach((keyword) => {
        if (lowerMessage.includes(keyword)) {
          foundKeywords.push({
            keyword,
            category,
            // Assign priority scores
            priority:
              category === 'core'
                ? 100
                : category === 'symptoms'
                ? 80
                : category === 'social'
                ? 75
                : category === 'geographic'
                ? 70
                : category === 'treatments'
                ? 60
                : category === 'medical'
                ? 50
                : category === 'fertility'
                ? 40
                : 30,
          });
        }
      });
    });

    // Also extract multi-word phrases for compound queries
    // These phrases should be searched as exact matches for better relevance
    const multiWordPhrases = [
      'pcos mood swings',
      'mood swings',
      'hair loss',
      'facial hair',
      'weight loss',
      'weight gain',
      'birth control',
      'insulin resistance',
      'irregular periods',
      'brain fog',
      'sugar cravings',
      'sleep quality',
      'pelvic pain',
      'abdominal pain',
      'natural methods',
      'natural remedies',
      'ayurvedic treatment',
      'successfully treated',
      'trying to conceive',
      'fertility treatment',
      'hormonal imbalance',
      'cycle length',
      'sleep apnea',
      'relationship issues',
      'relationship problems',
      'relationship challenges',
      'body image',
      'self esteem',
      'love life',
      'sex life',
      'libido issues',
      'libido problems',
      'low libido',
      'sex drive',
      'sexual desire',
    ];

    multiWordPhrases.forEach((phrase) => {
      if (lowerMessage.includes(phrase)) {
        foundKeywords.push({
          keyword: phrase,
          category: 'phrase',
          priority: 90, // High priority for exact phrases
        });
      }
    });

    // Enhanced fallback keyword extraction for words not in our predefined list
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'up',
      'about',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'among',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'reddit',
      'threads',
      'community',
      'which',
      'women',
      'dealing',
      'there',
      'methods',
      'like',
      'using',
      'tried',
      'any',
      'some',
      'all',
      'who',
      'what',
      'when',
      'where',
      'why',
      'how',
      'general', // Too generic, dilutes search results
      'help',
      'tips',
      'advice',
      'questions',
      'anyone',
      'someone',
      'people',
      'folks',
      'deal',
      'deals',
      'dealt',
    ]);

    // Extract additional meaningful words
    const words = message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    words.forEach((word) => {
      // Only add if not already in foundKeywords
      if (!foundKeywords.some((k) => k.keyword === word)) {
        foundKeywords.push({
          keyword: word,
          category: 'extracted',
          priority: word.length > 6 ? 25 : 15, // Longer words get slight boost
        });
      }
    });

    if (foundKeywords.length === 0) {
      // Final fallback to generic PCOS term
      logger.info('ℹ️ No specific keywords found, using default "PCOS"');
      return ['pcos'];
    }

    // Sort by priority (highest first) and deduplicate
    const sortedKeywords = foundKeywords
      .sort((a, b) => b.priority - a.priority)
      .map((k) => k.keyword)
      .filter((keyword, index, self) => self.indexOf(keyword) === index); // Remove duplicates

    // Return top 5-7 keywords for best relevance matching
    const topKeywords = sortedKeywords.slice(0, 7);

    logger.info(`✅ Extracted ${topKeywords.length} keywords for Reddit search:`, topKeywords);

    return topKeywords;
  }

  /**
   * Fetch Reddit context with enhanced multi-keyword relevance matching
   */
  async fetchRedditContext(userMessage) {
    try {
      // Content safety check for Reddit queries
      const safetyCheck = this.checkContentSafety(userMessage);
      if (safetyCheck.isBlocked) {
        logger.warn('🚫 Reddit query blocked by content safety filter', {
          reason: safetyCheck.reason,
        });
        return null; // Don't fetch Reddit content for unsafe queries
      }

      const keywords = this.needsCommunityInsights(userMessage);
      if (!keywords || keywords.length === 0) return null;

      logger.info('🔍 Fetching Reddit posts with keywords:', { keywords });

      // Build a context-aware search query that preserves semantic relationships
      // Strategy: Extract meaningful phrases from original message, not just individual keywords
      let searchQuery;
      let contextFilters = [];

      // === DETECT QUERY INTENT (moved outside to be accessible in scoring) ===
      const messageLower = userMessage.toLowerCase();

      // Detect if this is a partner/supporter query (asking how partners deal with PCOS issues)
      const isPartnerQuery =
        /\b(partner|partners|husband|spouse|boyfriend|supporter|family|loved ones?|caregiver).*\b(deal|dealing|cope|coping|handle|handling|support|help|advice)\b/i.test(
          messageLower
        ) ||
        /\bhow (do|can|should).*\b(partner|partners|husband|spouse|boyfriend|supporter)\b/i.test(
          messageLower
        );

      if (Array.isArray(keywords)) {
        const topKeywords = keywords.slice(0, 7);

        // === STEP 1: Extract context-preserving phrases from ORIGINAL message ===

        // Detect key semantic patterns that should stay together
        const semanticPatterns = [
          // Partner context (when query is ABOUT partners/supporters dealing with PCOS)
          {
            pattern: /\bhow.*\b(partner|partners|husband|boyfriend|spouse|supporter|family)\b/i,
            value: '"partner advice"',
            filter: 'partner-query',
          },
          {
            pattern:
              /\b(partner|partners|husband|boyfriend|spouse).*\b(deal|dealing|cope|coping|handle|handling|support|supporting)\b/i,
            value: '"partner support PCOS"',
            filter: 'partner-query',
          },
          {
            pattern: /\b(husband|boyfriend|partner).*\bwife|girlfriend|partner\b.*\bpcos\b/i,
            value: '"partner perspective PCOS"',
            filter: 'partner-query',
          },
          {
            pattern: /\bsupport.*\bwomen.*\bpcos\b/i,
            value: '"supporting women PCOS"',
            filter: 'partner-query',
          },

          // Gender context (ONLY when NOT a partner query)
          {
            pattern: /women with pcos/i,
            value: '"women with PCOS"',
            filter: 'women',
            skipIf: 'partner-query',
          },
          {
            pattern: /women (who have|having|suffering from) pcos/i,
            value: '"women PCOS"',
            filter: 'women',
            skipIf: 'partner-query',
          },

          // Symptom context (preserve relationships)
          {
            pattern: /low libido (issues|problems|in women)/i,
            value: '"low libido"',
            filter: 'symptom',
          },
          { pattern: /libido (issues|problems)/i, value: '"libido issues"', filter: 'symptom' },
          {
            pattern: /(body image|self esteem|confidence) (issues|problems)/i,
            value: '"$1 issues"',
            filter: 'symptom',
          },
          {
            pattern: /relationship (issues|problems|challenges)/i,
            value: '"relationship issues"',
            filter: 'symptom',
          },
          {
            pattern: /hair loss|facial hair|acne|weight (gain|loss)/i,
            value: '"$&"',
            filter: 'symptom',
          },
        ];

        const extractedPhrases = [];
        let hasPartnerContext = false;

        semanticPatterns.forEach(({ pattern, value, filter, skipIf }) => {
          const match = messageLower.match(pattern);
          if (match) {
            // Skip patterns that should be ignored for partner queries
            if (skipIf === 'partner-query' && isPartnerQuery) {
              return;
            }

            if (filter === 'partner-query') {
              hasPartnerContext = true;
              logger.info('🔍 Detected partner/supporter query - including partner perspectives');
            }

            if (value) {
              const phrase = value.replace(/\$&/g, match[0]).replace(/\$1/g, match[1]);
              extractedPhrases.push(phrase);
              contextFilters.push(filter);
            }
          }
        });

        // === STEP 2: Separate multi-word phrases from single keywords ===
        const phrases = topKeywords.filter((k) => k.includes(' '));
        const singleWords = topKeywords.filter((k) => !k.includes(' '));
        const nonPcosKeywords = singleWords.filter((w) => w.toLowerCase() !== 'pcos');

        // === STEP 3: Combine extracted phrases with keyword phrases ===
        const allPhrases = [...new Set([...extractedPhrases, ...phrases])]; // Deduplicate
        const quotedPhrases = allPhrases.map((p) => (p.includes('"') ? p : `"${p}"`)).join(' ');

        // === STEP 4: Build query with context preservation ===
        const pcosIncluded = topKeywords.some((k) => k.toLowerCase() === 'pcos');
        const pcosPrefix = pcosIncluded ? '' : 'PCOS ';

        // Special handling for partner queries - prioritize partner keywords
        let importantKeywords;
        if (isPartnerQuery) {
          // For partner queries, prioritize partner-related keywords
          const partnerKeywords = nonPcosKeywords.filter((k) =>
            /partner|husband|boyfriend|spouse|support|advice|help|deal|cope/i.test(k)
          );
          const symptomKeywords = nonPcosKeywords.filter((k) => !partnerKeywords.includes(k));

          // Combine: partner keywords first, then symptoms
          importantKeywords = [...partnerKeywords.slice(0, 2), ...symptomKeywords.slice(0, 1)]
            .filter(Boolean)
            .join(' ');

          // Add explicit partner terms if not already in keywords
          if (!importantKeywords.includes('partner') && !importantKeywords.includes('husband')) {
            importantKeywords = `partner ${importantKeywords}`.trim();
          }
        } else {
          // For non-partner queries, use top 2 most important keywords
          importantKeywords = nonPcosKeywords.slice(0, 2).join(' ');
        }

        if (quotedPhrases && importantKeywords) {
          // Best case: context phrases + keywords
          searchQuery = `${pcosPrefix}${quotedPhrases} ${importantKeywords}`;
        } else if (quotedPhrases) {
          // Only context phrases
          searchQuery = `${pcosPrefix}${quotedPhrases}`;
        } else if (importantKeywords) {
          // Only keywords
          searchQuery = `${pcosPrefix}${importantKeywords}`;
        } else {
          // Fallback
          searchQuery = 'PCOS women';
        }

        // Log query building details
        logger.info('🔍 Context-aware query built:', {
          extractedPhrases: extractedPhrases.length > 0 ? extractedPhrases : 'none',
          keywordPhrases: phrases.length > 0 ? phrases : 'none',
          contextFilters: contextFilters.length > 0 ? contextFilters : 'none',
          hasPartnerContext: hasPartnerContext,
          finalQuery: searchQuery,
        });
      } else {
        searchQuery = keywords;
        contextFilters = [];
      }

      logger.info('🔍 Reddit search query built:', { searchQuery });

      // Single optimized search with combined keywords
      const searchResults = await redditService.searchPosts(searchQuery, 20);

      if (!searchResults || searchResults.length === 0) {
        logger.info('No Reddit insights found for query:', searchQuery);
        return null;
      }

      // FILTER: Remove posts older than 3 years (too outdated for health advice)
      const now = new Date();
      const threeYearsAgo = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);

      const recentPosts = searchResults.filter((post) => {
        if (!post.createdAt) return true; // Keep posts without date (edge case)
        const postDate = new Date(post.createdAt);
        return postDate >= threeYearsAgo;
      });

      if (recentPosts.length === 0) {
        logger.warn('All posts are older than 3 years, using original results');
      } else {
        logger.info(
          `Filtered to ${recentPosts.length} posts from last 3 years (removed ${
            searchResults.length - recentPosts.length
          } old posts)`
        );
      }

      const postsToScore = recentPosts.length > 0 ? recentPosts : searchResults;

      // Calculate comprehensive score: relevance + recency + engagement
      const scoredResults = postsToScore.map((post) => {
        const titleLower = post.title.toLowerCase();
        const contentLower = (post.content || '').toLowerCase();
        const postText = `${titleLower} ${contentLower}`;

        // === RELEVANCE SCORING (0-100 points) ===
        let relevanceScore = 0;
        let matchedKeywords = [];

        // Score based on keyword matches
        keywords.forEach((keyword, index) => {
          const keywordLower = keyword.toLowerCase();

          // Title matches (highest value)
          if (titleLower.includes(keywordLower)) {
            const baseScore = 20;
            const positionBonus = Math.max(0, 10 - index); // Earlier keywords worth more
            relevanceScore += baseScore + positionBonus;
            matchedKeywords.push(keyword);
          }

          // Content matches (medium value)
          if (contentLower.includes(keywordLower)) {
            const baseScore = 8;
            const positionBonus = Math.max(0, 5 - index);
            relevanceScore += baseScore + positionBonus;
            if (!matchedKeywords.includes(keyword)) {
              matchedKeywords.push(keyword);
            }
          }
        });

        // Bonus for matching multiple keywords (compound relevance)
        if (matchedKeywords.length >= 3) {
          relevanceScore += matchedKeywords.length * 15; // Strong bonus for multi-keyword match
        } else if (matchedKeywords.length === 2) {
          relevanceScore += 10;
        }

        // Bonus for PCOS-specific subreddits
        const pcosSubreddits = ['pcos', 'pcosindia', 'pcos_folks', 'pcosweightloss'];
        if (pcosSubreddits.includes(post.subreddit.toLowerCase())) {
          relevanceScore += 15;
        }

        // === PARTNER PERSPECTIVE BOOST (for partner queries) ===
        if (isPartnerQuery) {
          // Detect if post is from partner/supporter perspective (not first-person woman)
          const partnerIndicators = [
            /\b(my wife|my girlfriend|my partner|my fianc[eé]e).*\bpcos\b/i,
            /\b(husband|boyfriend|partner|spouse) here\b/i,
            /\b(supporting|help|helping|advice for).*\b(wife|girlfriend|partner|her)\b/i,
            /\bhow.*\b(help|support).*\b(wife|girlfriend|partner|her)\b.*\bpcos\b/i,
            /\bpartner (has|have|dealing with|experiencing) pcos\b/i,
            /\b(she has|her pcos|wife's pcos|girlfriend's pcos)\b/i,
          ];

          const isPartnerPerspective = partnerIndicators.some((pattern) => pattern.test(postText));

          if (isPartnerPerspective) {
            relevanceScore += 80; // HUGE boost for partner perspective posts
            logger.info('✅ Partner perspective detected, boosting score:', {
              title: post.title,
              boost: 80,
            });
          }

          // Detect first-person woman (should be deprioritized for partner queries)
          const womenFirstPersonIndicators = [
            /\b(i have|i am|i'm|i've been|my pcos)\b/i,
            /\b(dealing with|struggling with|experiencing).*\bmy\b/i,
            /\bdoes anyone else (have|experience)\b/i,
          ];

          const isWomenFirstPerson = womenFirstPersonIndicators.some((pattern) =>
            pattern.test(postText)
          );

          if (isWomenFirstPerson && !isPartnerPerspective) {
            relevanceScore -= 40; // Penalize women's first-person for partner queries
            logger.info('⚠️ Women first-person detected in partner query, reducing score:', {
              title: post.title,
              penalty: -40,
            });
          }
        }

        // === ENGAGEMENT SCORING (0-50 points) ===
        let engagementScore = 0;

        // Upvotes scoring (0-25 points) - logarithmic scale
        // 10 upvotes = 5pts, 100 upvotes = 10pts, 500 upvotes = 15pts, 1000+ upvotes = 20pts
        const upvoteScore = Math.min(25, Math.log10(post.upvotes + 1) * 8);
        engagementScore += upvoteScore;

        // Comments scoring (0-15 points) - shows active discussion
        // 5 comments = 5pts, 20 comments = 10pts, 50+ comments = 15pts
        const commentScore = Math.min(15, Math.log10(post.numComments + 1) * 6);
        engagementScore += commentScore;

        // Upvote ratio bonus (0-10 points) - quality filter
        // >90% ratio = 10pts, >80% = 7pts, >70% = 5pts
        const ratioBonus =
          post.upvoteRatio >= 0.9
            ? 10
            : post.upvoteRatio >= 0.8
            ? 7
            : post.upvoteRatio >= 0.7
            ? 5
            : 0;
        engagementScore += ratioBonus;

        // === RECENCY SCORING (0-100 points - increased range) ===
        let recencyScore = 0;

        // Calculate post age in days
        const postDate = post.createdAt ? new Date(post.createdAt) : null;
        const now = new Date();
        const ageInDays = postDate ? (now - postDate) / (1000 * 60 * 60 * 24) : 9999;

        // AGGRESSIVE recency scoring - heavily favor recent posts
        // <7 days = 100pts, <30 days = 85pts, <90 days = 70pts, <180 days = 50pts, <365 days = 30pts
        if (ageInDays <= 7) {
          recencyScore = 100; // Brand new - maximum priority
        } else if (ageInDays <= 30) {
          recencyScore = 85; // Very recent - high priority
        } else if (ageInDays <= 90) {
          recencyScore = 70; // Recent - good priority
        } else if (ageInDays <= 180) {
          recencyScore = 50; // 3-6 months - moderate priority
        } else if (ageInDays <= 365) {
          recencyScore = 30; // 6-12 months - some priority
        } else if (ageInDays <= 730) {
          recencyScore = 15; // 1-2 years - low priority
        } else if (ageInDays <= 1095) {
          recencyScore = 5; // 2-3 years - minimal priority
        } else {
          recencyScore = 0; // 3+ years - no priority (too outdated)
        }

        // === CALCULATE FINAL COMPOSITE SCORE ===
        // UPDATED Weighted formula: Relevance (45%) + Engagement (25%) + Recency (30%)
        // Recency now has much more impact to prioritize fresh content
        const finalScore = relevanceScore * 0.45 + engagementScore * 0.25 + recencyScore * 0.3;

        return {
          ...post,
          relevanceScore,
          engagementScore,
          recencyScore,
          finalScore,
          matchedKeywords,
          matchCount: matchedKeywords.length,
          ageInDays: Math.round(ageInDays),
        };
      });

      // === GENDER CONTEXT FILTERING ===
      // Filter out posts with opposite gender context ONLY when query is from woman's perspective
      // NOT when query is asking about partner/supporter perspective
      // (isPartnerQuery already defined at top of function)

      // Detect if query is FROM woman's perspective (first-person or about women experiencing)
      const isWomenFirstPerson =
        /\b(i have|i am|i'm|my pcos|dealing with|experiencing|struggling with)\b/i.test(
          messageLower
        ) ||
        /\b(women|woman) (with|who have|having|experiencing|suffering from) pcos\b/i.test(
          messageLower
        );

      let filteredResults = scoredResults;

      // Only apply gender filtering if:
      // 1. Query is from woman's first-person perspective
      // 2. Query is NOT asking about partner/supporter perspective
      if (isWomenFirstPerson && !isPartnerQuery) {
        logger.info('🔍 Applying gender context filter (women-focused query)');

        // Exclude posts that are clearly about male perspective or partner trying for baby
        const excludePatterns = [
          /\b(my husband|my boyfriend|my partner|my spouse) (has|is experiencing|suffers from)\b/i,
          /\b(husband|boyfriend|partner|spouse|male) (with pcos|has pcos|experiencing pcos)\b/i,
          /\bmen (with|who have|experiencing) pcos\b/i,
          /\b(trying|want|trying to get|hoping to get) (pregnant|baby|conceive)\b.*\b(husband|partner|male)\b/i,
          /\b(husband|partner).*\blow libido\b/i,
          /\bhis (libido|sex drive|testosterone)\b/i,
          /\bmy (husband|partner|boyfriend).*\b(low libido|sex drive)\b/i,
        ];

        filteredResults = scoredResults.filter((post) => {
          const postText = `${post.title} ${post.content || ''}`.toLowerCase();

          // Check if post matches any exclude patterns
          const hasExcludePattern = excludePatterns.some((pattern) => pattern.test(postText));

          if (hasExcludePattern) {
            logger.info('⚠️ Filtered out post with opposite gender context:', {
              title: post.title,
              reason: 'partner/male perspective detected',
            });
            return false;
          }

          return true;
        });

        if (filteredResults.length < scoredResults.length) {
          logger.info(
            `✅ Gender context filter removed ${
              scoredResults.length - filteredResults.length
            } posts with opposite gender perspective`
          );
        }
      } else if (isPartnerQuery) {
        logger.info('🔍 Partner query detected - NOT applying gender filter');
      }

      // Sort by final composite score (highest first)
      const sortedResults = filteredResults.sort((a, b) => b.finalScore - a.finalScore).slice(0, 5); // Top 5 most relevant

      // Build enhanced context with formatting for LLM
      let context = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      context += '🔥 TOP 5 MOST RELEVANT & RECENT REDDIT COMMUNITY POSTS\n';
      context += `📊 Query Keywords: ${keywords.slice(0, 5).join(', ')}\n`;
      context += '📈 Ranked by: Relevance (45%) + Recency (30%) + Engagement (25%)\n';
      context += '⏰ Prioritizing posts from the last 12 months\n';
      context += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      sortedResults.forEach((post, index) => {
        // Format age display
        const ageDisplay =
          post.ageInDays < 1
            ? 'today'
            : post.ageInDays === 1
            ? '1 day ago'
            : post.ageInDays < 30
            ? `${post.ageInDays} days ago`
            : post.ageInDays < 365
            ? `${Math.round(post.ageInDays / 30)} months ago`
            : `${Math.round(post.ageInDays / 365)} years ago`;

        // SIMPLIFIED FORMAT - Only essentials for LLM
        context += `POST ${index + 1}:\n`;
        context += `Title: "${post.title}"\n`;
        context += `URL: ${post.url}\n`;
        context += `Community: r/${post.subreddit} | Posted ${ageDisplay} | ${post.upvotes} upvotes | ${post.numComments} comments\n`;
        context += `� TITLE: "${post.title}"\n`;
        context += `🔗 DIRECT LINK: ${post.url}\n`;
        context += `\n`;
      });

      context += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      context += '🚨 CRITICAL INSTRUCTIONS FOR YOUR RESPONSE:\n\n';
      context += '⚠️ KEEP IT CONCISE - Maximum 300 words total!\n\n';
      context += '� IMPORTANT: All URLs MUST use markdown link format: [Link Text](URL)\n';
      context += '   This ensures links are clickable in the chat interface!\n\n';
      context += '�📝 RESPONSE STRUCTURE (Follow this EXACTLY):\n\n';
      context += '1️⃣ WARM OPENING (2-3 sentences):\n';
      context += "   - Acknowledge the user's question naturally and warmly\n";
      context += '   - VARY your opening - avoid starting every response with "I understand..."\n';
      context +=
        '   - Examples: "Great question!", "That\'s a common concern...", "Absolutely, let me help with that...", "I\'d be happy to share some insights..."\n';
      context += '   - Keep it conversational and authentic\n\n';

      context += '2️⃣ BRIEF COMMUNITY INSIGHT (1-2 sentences ONLY):\n';
      context += '   - Mention that the community has discussed this topic\n';
      context += '   - DO NOT explain posts in detail - just acknowledge them\n';
      context +=
        '   - Example: "The PCOS community has shared valuable experiences with this, which I\'ve linked below."\n\n';

      context += '3️⃣ ACTIONABLE RECOMMENDATIONS (3-5 bullet points from RAG):\n';
      context += '   - Focus on evidence-based advice from your knowledge base\n';
      context += '   - Be specific and practical\n';
      context += '   - This should be the MAIN content of your response\n\n';

      context += '3.5️⃣ MEAL PLAN REDIRECT (If question is about recipes/food/diet):\n';
      context += '   - After giving recommendations, subtly suggest the meal plan feature\n';
      context +=
        '   - Example: "For personalized meal plans tailored to your preferences and health goals, check out our Meal Plan feature!"\n';
      context += '   - Keep it natural and helpful, not pushy\n\n';

      context += '4️⃣ REDDIT LINKS SECTION (At the very END):\n';
      context += '   - MANDATORY: Use markdown link format [text](url)\n';
      context += '   - Start with a horizontal line: ---\n';
      context +=
        '   - Then add this header: 📚 **Community Discussions You Might Find Helpful:**\n';
      context += '   - List each post using the URLs provided above\n';
      context += '   - Example format:\n';
      context += '   ---\n';
      context += '   📚 **Community Discussions You Might Find Helpful:**\n';

      // Add the actual posts as examples in the instruction
      sortedResults.forEach((post, index) => {
        const shortTitle =
          post.title.length > 60 ? post.title.substring(0, 60) + '...' : post.title;
        context += `   - [${shortTitle}](${post.url})\n`;
      });
      context += '\n';

      context += '❌ AVOID:\n';
      context += '   - DO NOT explain each Reddit post\n';
      context += '   - DO NOT quote extensively from posts\n';
      context += '   - DO NOT write "In one post..." or "Another user mentioned..."\n';
      context += '   - DO NOT summarize post content - just provide links\n';
      context += '   - DO NOT use plain URLs like https://reddit.com/... (NOT clickable!)\n\n';

      context += '✅ YOUR FOCUS:\n';
      context += '   - Keep response warm, natural, and conversational (NOT mechanical)\n';
      context += '   - Prioritize RAG-based recommendations over Reddit content\n';
      context += '   - Let users discover Reddit insights themselves via links\n';
      context += '   - ALWAYS use markdown format for links: [text](url)\n';
      context += '   - Be concise, helpful, and empathetic\n\n';

      context += '🔗 LINK FORMAT REMINDER:\n';
      context += '   ✅ CORRECT: [Post about PCOS acne treatment](https://reddit.com/r/PCOS/...)\n';
      context += '   ❌ WRONG: https://reddit.com/r/PCOS/...\n';
      context += '   ❌ WRONG: Post about PCOS acne treatment (https://reddit.com/...)\n\n';

      logger.info(`✅ Found ${sortedResults.length} highly relevant Reddit posts`, {
        keywords: keywords.slice(0, 5),
        topScores: sortedResults.map((r) => ({
          title: r.title.substring(0, 50) + '...',
          finalScore: r.finalScore.toFixed(1),
          relevance: r.relevanceScore.toFixed(0),
          engagement: r.engagementScore.toFixed(0),
          recency: r.recencyScore.toFixed(0),
          age: r.ageInDays + ' days',
        })),
      });

      return context;
    } catch (error) {
      logger.error('Reddit fetch failed', { error: error.message });
      return null;
    }
  }

  /**
   * Check if message needs nutrition data
   */
  needsNutritionData(message) {
    const nutritionKeywords = [
      'calories',
      'calorie',
      'nutrition',
      'nutritional',
      'protein',
      'carbs',
      'carb',
      'carbohydrate',
      'fat',
      'fats',
      'macro',
      'macros',
      'nutrients',
      'nutrient',
      'vitamin',
      'mineral',
      'breakdown', // "macro breakdown", "nutritional breakdown"
      'info', // "nutrition info"
      'information', // "nutritional information"
      'content', // "nutrition content"
      'value', // "nutritional value"
      'data', // "nutrition data"
      'facts', // "nutrition facts"
    ];

    const messageLower = message.toLowerCase();

    // Check for nutrition keywords
    const hasNutritionKeyword = nutritionKeywords.some((keyword) => messageLower.includes(keyword));

    // Also trigger if asking about eating a specific food (likely wants nutrition info)
    // e.g., "Should I eat ragi mudde with PCOS?" or "Can I eat samosa?"
    const foodQuestionPattern =
      /(should|can|is it (ok|okay|safe|good)|what about) (i |we )?(eat|have|consume)/i;
    const isFoodQuestion = foodQuestionPattern.test(message);

    if (hasNutritionKeyword || isFoodQuestion) {
      logger.info('Nutrition data needed', {
        hasNutritionKeyword,
        isFoodQuestion,
        query: message,
      });
      return true;
    }

    return false;
  }

  /**
   * Check if message needs ingredient substitutes (food/recipe/meal queries)
   */
  needsIngredientSubstitutes(message) {
    const messageLower = message.toLowerCase();

    // Recipe/cooking/meal keywords
    const recipeKeywords = [
      'recipe',
      'recipes',
      'cook',
      'cooking',
      'prepare',
      'make',
      'meal',
      'dish',
      'food',
      'eat',
      'eating',
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ];

    // Specific food items that commonly need substitutes
    const foodItems = [
      'rice',
      'bread',
      'pasta',
      'noodles',
      'chowmein',
      'biryani',
      'roti',
      'paratha',
      'idli',
      'dosa',
      'poha',
      'upma',
      'samosa',
      'pakora',
      'dal',
      'curry',
      'sabzi',
      'khichdi',
      'pulao',
      'cookie',
      'cookies',
      'biscuit',
      'biscuits',
      'cake',
      'pastry',
      'dessert',
      'pudding',
      'chocolate',
      'chips',
      'fries',
      'pizza',
      'burger',
      'sandwich',
      'wafer',
      'mithai',
      'sweet',
      'ladoo',
      'barfi',
      'halwa',
      'jalebi',
      'gulab jamun',
    ];

    const hasRecipeKeyword = recipeKeywords.some((keyword) => messageLower.includes(keyword));
    const hasFoodItem = foodItems.some((item) => messageLower.includes(item));

    if (hasRecipeKeyword || hasFoodItem) {
      logger.info('Ingredient substitutes needed', {
        hasRecipeKeyword,
        hasFoodItem,
        query: message,
      });
      return true;
    }

    return false;
  }

  /**
   * Build query to retrieve ingredient substitutes from RAG
   */
  buildIngredientSubstituteQuery(userMessage) {
    const query = userMessage.toLowerCase();

    // PCOS-friendly foods that DON'T need main ingredient substitution
    const pcosFriendlyFoods = [
      'quinoa',
      'brown rice',
      'oats',
      'salad',
      'vegetables',
      'grilled',
      'baked',
      'steamed',
      'boiled',
    ];

    // Check if the main food item is already PCOS-friendly
    const isPcosFriendly = pcosFriendlyFoods.some((friendly) => query.includes(friendly));

    // Common problematic ingredients for PCOS with their specific substitutes
    const ingredientKeywords = [
      'rice',
      'white rice',
      'polished rice',
      'maida',
      'refined flour',
      'all purpose flour',
      'wheat flour',
      'bread',
      'white bread',
      'sugar',
      'refined sugar',
      'oil',
      'cooking oil',
      'vegetable oil',
      'potato',
      'potatoes',
      'pasta',
      'noodles',
      'oats',
      'overnight oats',
      'milk',
      'dairy',
      'cow milk',
      'coconut milk',
      'cream',
      'cookie',
      'cookies',
      'biscuit',
      'biscuits',
      'wafer',
      'pudding',
      'dessert',
      'fried',
      'deep fried',
      'chocolate',
      'choco',
      'chip',
    ];

    // Extract food item from query (remove words like "nutritional", "info", "share", etc.)
    const cleanQuery = query
      .replace(
        /\b(nutritional|nutrition|info|information|share|give|tell|about|on|of|for|the)\b/gi,
        ''
      )
      .trim();

    // Build targeted search query
    let searchQuery = '';

    if (isPcosFriendly) {
      // For PCOS-friendly foods (like quinoa salad), focus on potential add-ons/toppings that might be problematic
      console.log(
        `[buildIngredientSubstituteQuery] Food is PCOS-friendly, searching for healthier add-on alternatives`
      );
      searchQuery = `PCOS friendly substitute for salad dressing mayonnaise cheese cream croutons toppings sauces alternative replacement`;
    } else {
      // For non-PCOS-friendly foods, find mentioned problematic ingredients
      const mentionedIngredients = ingredientKeywords.filter((ingredient) =>
        query.includes(ingredient)
      );

      if (mentionedIngredients.length > 0) {
        // For specific ingredients, search for their substitutes directly
        console.log(
          `[buildIngredientSubstituteQuery] Found problematic ingredients: ${mentionedIngredients.join(
            ', '
          )}`
        );
        searchQuery = `PCOS friendly substitute for ${mentionedIngredients.join(
          ' '
        )} alternative replacement healthy option`;
      } else {
        // Extract main food item and search for substitutes
        const foodItem = cleanQuery.split(' ').slice(0, 3).join(' '); // Take first 3 words as food item
        console.log(`[buildIngredientSubstituteQuery] Searching for substitutes for: ${foodItem}`);
        searchQuery = `PCOS friendly ingredient substitute for ${foodItem} alternative replacement healthy modification`;
      }
    }

    // Add PCOS-specific keywords
    searchQuery += ' low GI high protein fiber insulin resistance';

    logger.info('🔍 Built ingredient substitute query', {
      original: userMessage,
      cleanQuery,
      isPcosFriendly,
      searchQuery,
    });

    return searchQuery;
  }

  /**
   * Fetch nutrition context
   */
  async fetchNutritionContext(userMessage) {
    try {
      const data = await serpService.searchNutrition(userMessage);

      if (!data) return null;

      // Add validation flags for suspicious/incomplete data
      const validationWarnings = this.validateNutritionData(data, userMessage);

      let context = `🥗 NUTRITIONAL DATA:\n${JSON.stringify(data, null, 2)}\n`;

      // Add CRITICAL instructions for using exact values
      context += `\n🚨 CRITICAL NUTRITION FORMATTING INSTRUCTIONS:\n`;
      context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      context += `⚠️ YOU MUST USE EXACT VALUES IN GRAMS FROM THE DATA ABOVE!\n\n`;
      context += `✅ REQUIRED FORMAT (Use exact numbers from JSON above):\n`;
      context += `   • Serving Size: [value from servingSize]\n`;
      context += `   • Calories: [value from calories] cal\n`;
      context += `   • Protein: [value from protein]g\n`;
      context += `   • Carbohydrates: [value from carbs]g\n`;
      context += `   • Fat: [value from fat]g\n`;
      context += `   • Fiber: [value from fiber]g (if available)\n\n`;
      context += `❌ DO NOT:\n`;
      context += `   ✗ Convert to percentages (e.g., "60% of calories")\n`;
      context += `   ✗ Use approximations (e.g., "Approximately X%")\n`;
      context += `   ✗ Say "around", "roughly", "about" for macro values\n`;
      context += `   ✗ Calculate percentages unless specifically asked\n\n`;
      context += `✅ CORRECT EXAMPLES:\n`;
      context += `   ✓ "Carbohydrates: 35g"\n`;
      context += `   ✓ "Protein: 3g"\n`;
      context += `   ✓ "Fat: 9g"\n\n`;
      context += `❌ INCORRECT EXAMPLES:\n`;
      context += `   ✗ "Carbohydrates: Approximately 60% of the calories"\n`;
      context += `   ✗ "Fat: Around 35% of the calories"\n`;
      context += `   ✗ "Protein: Roughly 5% of total calories"\n`;
      context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      context += `⚠️ REMINDER: Your response MUST include:\n`;
      context += `1. Exact nutrition values in grams (from JSON above)\n`;
      context += `2. PCOS-friendly ingredient substitutes (if provided below)\n`;
      context += `3. Google nutrition disclaimer with source links (shown below)\n\n`;

      if (validationWarnings.length > 0) {
        context += `\n⚠️ DATA QUALITY WARNINGS:\n`;
        validationWarnings.forEach((warning) => {
          context += `- ${warning}\n`;
        });
        context += `\n🔍 IMPORTANT: This data may be incomplete. Validate and provide realistic estimates based on typical recipe components.\n`;
      }

      // Add formatted Google nutrition links for LLM to include in response
      context += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      context += `📊 GOOGLE NUTRITION SOURCES:\n`;
      context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const nutritionLinks = [];

      // Add primary source URL if available
      if (data.sourceUrl) {
        nutritionLinks.push({
          title: data.source || 'Nutrition Facts',
          url: data.sourceUrl,
        });
        context += `🔗 PRIMARY SOURCE: ${data.sourceUrl}\n`;
        context += `   Title: "${data.source || 'Nutrition Facts'}"\n\n`;
      }

      // Add organic results if available
      if (data.organicResults && Array.isArray(data.organicResults)) {
        context += `🔗 ADDITIONAL SOURCES:\n`;
        data.organicResults.slice(0, 3).forEach((result, index) => {
          if (result.link) {
            nutritionLinks.push({
              title: result.title,
              url: result.link,
            });
            context += `   ${index + 1}. URL: ${result.link}\n`;
            context += `      Title: "${result.title}"\n`;
            if (result.snippet) {
              const shortSnippet =
                result.snippet.length > 100
                  ? result.snippet.substring(0, 100) + '...'
                  : result.snippet;
              context += `      Preview: ${shortSnippet}\n`;
            }
            context += `\n`;
          }
        });
      }

      // Add instructions for including links in response
      if (nutritionLinks.length > 0) {
        context += `\n🚨 MANDATORY REQUIREMENT - GOOGLE NUTRITION DISCLAIMER:\n\n`;
        context += `⛔️ YOU MUST INCLUDE THIS EXACT TEXT AT THE END OF YOUR RESPONSE:\n\n`;
        context += `---\n\n`;
        context += `📊 **Nutrition Data Sources:**\n`;

        nutritionLinks.forEach((link) => {
          const shortTitle =
            link.title.length > 60 ? link.title.substring(0, 60) + '...' : link.title;
          context += `- [${shortTitle}](${link.url})\n`;
        });

        context += `\n💬 **Nutritional information from Google's knowledge base.**\n\n`;
        context += `⛔️ THIS DISCLAIMER IS MANDATORY - DO NOT OMIT IT!\n\n`;
        context += `⚠️ FORMATTING RULE: Do NOT use bold (**) for ingredient names in the response body. Only use bold for section headers and disclaimers.\n\n`;

        context += `🔗 LINK FORMAT REMINDER:\n`;
        context += `   ✅ CORRECT: [Nutrition Facts for ${data.foodItem || 'food'}](${
          nutritionLinks[0]?.url || 'URL'
        })\n`;
        context += `   ❌ WRONG: ${nutritionLinks[0]?.url || 'URL'}\n`;
        context += `   ❌ WRONG: Nutrition Facts (${nutritionLinks[0]?.url || 'URL'})\n\n`;

        context += `⚠️ Place these links AFTER your PCOS modifications section and BEFORE any Reddit links!\n\n`;
      } else {
        context += `\n⚠️ No direct source URLs available from Google.\n`;
        context += `💡 You may mention that nutrition data is from Google's knowledge base without specific links.\n\n`;
      }

      return context;
    } catch (error) {
      logger.error('Nutrition fetch failed', { error: error.message });
      return null;
    }
  }

  /**
   * Validate nutrition data for reasonableness
   * Returns array of warning messages if data seems suspicious
   */
  validateNutritionData(data, userMessage) {
    const warnings = [];

    if (!data.found || !data.calories) {
      return warnings; // No data to validate
    }

    const foodItem = data.foodItem?.toLowerCase() || userMessage.toLowerCase();
    const calories = data.calories;
    const protein = data.protein || 0;

    // Define food categories with expected calorie ranges per 100g
    const foodCategories = {
      desserts: {
        keywords: [
          'pudding',
          'cake',
          'pie',
          'ice cream',
          'custard',
          'mousse',
          'tiramisu',
          'cheesecake',
          'brownie',
          'cookie',
          'gulab jamun',
          'rasgulla',
          'jalebi',
          'barfi',
          'halwa',
          'kheer',
          'payasam',
        ],
        minCalories: 200,
        reason: 'typically contains sugar, cream, butter, or ghee',
      },
      fried: {
        keywords: [
          'fried',
          'fry',
          'samosa',
          'pakora',
          'bhajia',
          'vada',
          'bonda',
          'cutlet',
          'fritter',
          'chips',
          'fries',
          'tempura',
        ],
        minCalories: 250,
        reason: 'deep-fried foods absorb significant oil',
      },
      creamy: {
        keywords: [
          'cream',
          'creamy',
          'korma',
          'makhani',
          'butter chicken',
          'paneer butter',
          'malai',
          'alfredo',
          'carbonara',
        ],
        minCalories: 150,
        reason: 'contains cream, butter, or coconut milk',
      },
      rice: {
        keywords: ['biryani', 'pulao', 'fried rice', 'risotto'],
        minCalories: 140,
        reason: 'contains rice, oil/ghee, and protein sources',
      },
    };

    // Check if food matches any category and violates calorie expectations
    for (const [category, config] of Object.entries(foodCategories)) {
      const matches = config.keywords.some((keyword) => foodItem.includes(keyword));

      if (matches && calories < config.minCalories) {
        warnings.push(
          `${category.toUpperCase()} ALERT: ${calories} cal/100g seems too low for "${
            data.foodItem
          }". Expected ${config.minCalories}+ cal because it ${config.reason}.`
        );
      }
    }

    // Check for unrealistically low protein in dishes that should have protein
    const proteinFoods = ['chicken', 'paneer', 'fish', 'egg', 'dal', 'lentil', 'tofu', 'meat'];
    const shouldHaveProtein = proteinFoods.some((item) => foodItem.includes(item));

    if (shouldHaveProtein && protein < 5) {
      warnings.push(
        `PROTEIN ALERT: ${protein}g protein seems too low for a dish containing ${proteinFoods.find(
          (item) => foodItem.includes(item)
        )}. Expected 10-20g protein per 100g.`
      );
    }

    // Check for missing macros (incomplete data)
    if (data.found && !data.protein && !data.carbs && !data.fat) {
      warnings.push(
        `INCOMPLETE DATA: Only calories provided, missing protein, carbs, and fat breakdown. Data likely incomplete.`
      );
    }

    // Check for duplicate macro values (API parsing error)
    if (data.carbohydrates && data.fat && data.protein) {
      const carbsValue = parseFloat(String(data.carbohydrates).replace(/[^\d.]/g, ''));
      const fatValue = parseFloat(String(data.fat).replace(/[^\d.]/g, ''));
      const proteinValue = parseFloat(String(data.protein).replace(/[^\d.]/g, ''));

      if (
        !isNaN(carbsValue) &&
        !isNaN(fatValue) &&
        !isNaN(proteinValue) &&
        carbsValue === fatValue &&
        fatValue === proteinValue &&
        carbsValue > 0
      ) {
        warnings.push(
          `DUPLICATE VALUES: All macros show ${carbsValue}g (carbs, fat, protein) - likely API parsing error. Data unreliable.`
        );
      }
    }

    return warnings;
  }

  /**
   * Check if message is health-related
   */
  isHealthRelated(message) {
    const healthKeywords = [
      'symptom',
      'pain',
      'period',
      'cycle',
      'bleeding',
      'weight',
      'diet',
      'exercise',
      'medication',
      'doctor',
      'test',
      'diagnosis',
      'treatment',
      'health',
      'lab',
      'value',
      'insulin',
      'glucose',
      'testosterone',
      'vitamin',
    ];

    return healthKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }

  /**
   * Safe extraction of content from documents
   */
  safeExtractContent(doc, maxLength = 200) {
    const content = doc?.pageContent || doc?.content || '';
    const text = typeof content === 'string' ? content : String(content);
    return text.substring(0, maxLength);
  }

  /**
   * Safe metadata extraction
   */
  safeExtractMetadata(doc) {
    return doc?.metadata || {};
  }

  /**
   * Intelligent disclaimer routing based on message type and context
   * Returns an array of appropriate disclaimers to append
   */
  getAppropriateDisclaimers(response, userMessage, medicalData, redditContext) {
    const disclaimers = [];

    // Helper to check if text already contains a disclaimer (checks for variations)
    const contains = (needle) => {
      try {
        const responseLower = response.toLowerCase();
        // Check for the exact phrase
        if (responseLower.includes(needle.toLowerCase())) {
          return true;
        }
        // Also check for common disclaimer variations
        const disclaimerPatterns = [
          /⚠️.*educational.*guidance/i,
          /⚠️.*consult.*healthcare/i,
          /⚠️.*medical.*advice/i,
          /this is educational/i,
          /please consult.*healthcare/i,
          /please consult.*doctor/i,
        ];
        return disclaimerPatterns.some((pattern) => pattern.test(response));
      } catch (e) {
        return false;
      }
    };

    // Helper to check if response actually references lab values
    const usesLabData = (text) => {
      const labIndicators = [
        'your lab',
        'your result',
        'your value',
        'your insulin',
        'your glucose',
        'your testosterone',
        'your vitamin',
        'your ferritin',
        'your tsh',
        'your cholesterol',
        'your triglyceride',
        'your dhea',
        'your amh',
        'your lh',
        'your fsh',
        'looking at your',
        'based on your lab',
        'your test shows',
        'your levels',
        'your report',
        'µIU/mL',
        'ng/dL',
        'ng/mL',
        'nmol/L',
        'mg/dL',
        'mIU/L',
        'elevated',
        'deficient',
        'optimal',
        'abnormal',
        'high range',
        'low range',
      ];

      const textLower = text.toLowerCase();
      return labIndicators.some((indicator) => textLower.includes(indicator));
    };

    // Define disclaimer text
    const LAB_DISCLAIMER =
      '⚠️ *This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.*';

    const GENERAL_DISCLAIMER =
      '⚠️ *This is educational guidance only. Please consult a healthcare professional for personalized medical advice.*';

    const REDDIT_DISCLAIMER =
      '💬 **Community insights are personal experiences shared on Reddit, not medical advice.**';

    const SUPPLEMENT_DISCLAIMER =
      '⚕️ *This is educational guidance only. Please consult your healthcare provider before starting any supplements. Your doctor will determine appropriate dosing based on your lab values, current medications, and individual needs.*';

    // ========== INTELLIGENT ROUTING LOGIC ==========

    // Priority 1: Lab-specific disclaimer
    // Show ONLY if:
    // - User has medical data (lab values exist)
    // - Response actually references their specific lab values
    // - Lab disclaimer not already present
    if (
      medicalData &&
      usesLabData(response) &&
      !contains('this is educational guidance based on your lab values')
    ) {
      disclaimers.push(LAB_DISCLAIMER);
      logger.info('Adding lab-specific disclaimer', {
        reason: 'Response references user lab values',
      });
    }
    // Priority 2: General health disclaimer
    // Show ONLY if:
    // - Lab disclaimer was NOT added (avoid duplication)
    // - Message is health-related OR response contains health advice
    // - General disclaimer not already present
    else if (this.isHealthRelated(userMessage) && !contains('this is educational guidance')) {
      disclaimers.push(GENERAL_DISCLAIMER);
      logger.info('Adding general health disclaimer', {
        reason: 'Health-related query without lab value usage',
      });
    }

    // Priority 3: Reddit disclaimer
    // Show if:
    // - Reddit context was included in the response
    // - Reddit disclaimer not already present
    // This can be shown ALONGSIDE lab/general disclaimer
    if (redditContext && !contains('community insights are personal experiences')) {
      disclaimers.push(REDDIT_DISCLAIMER);
      logger.info('Adding Reddit disclaimer', {
        reason: 'Community insights included in response',
      });
    }

    // Priority 4: Supplement disclaimer
    // Show if:
    // - User asked about supplements OR response mentions supplements
    // - Supplement disclaimer not already present
    // This can be shown ALONGSIDE other disclaimers
    const mentionsSupplements = (text) => {
      const supplementIndicators = [
        'supplement',
        'vitamin',
        'mineral',
        'inositol',
        'berberine',
        'omega-3',
        'ashwagandha',
        'curcumin',
        'magnesium',
        'zinc',
        'coq10',
        'chromium',
        'spearmint',
        'probiotics',
      ];
      const textLower = text.toLowerCase();
      return supplementIndicators.some((indicator) => textLower.includes(indicator));
    };

    if (
      (this.isDirectSupplementQuery(userMessage) || mentionsSupplements(response)) &&
      !contains('consult your healthcare provider before starting any supplements')
    ) {
      disclaimers.push(SUPPLEMENT_DISCLAIMER);
      logger.info('Adding supplement disclaimer', {
        reason: 'Response includes supplement recommendations',
      });
    }

    // Log final disclaimer decision
    logger.info('Disclaimer routing complete', {
      disclaimersAdded: disclaimers.length,
      types: disclaimers.map((d) => {
        if (d.includes('lab values')) return 'lab';
        if (d.includes('Community insights')) return 'reddit';
        if (d.includes('supplements')) return 'supplement';
        return 'general';
      }),
    });

    return disclaimers;
  }

  /**
   * Check if user message is a symptom query (not explicitly asking about supplements)
   * @param {string} message - User message
   * @returns {boolean} - True if symptom query
   */
  isSymptomQuery(message) {
    const messageLower = message.toLowerCase();
    const symptomKeywords = [
      'irregular period',
      'irregular periods',
      'missed period',
      'acne',
      'pimples',
      'hair loss',
      'hair fall',
      'thinning hair',
      'hirsutism',
      'facial hair',
      'unwanted hair',
      'weight gain',
      'obesity',
      "can't lose weight",
      'insulin resistance',
      'high insulin',
      'high blood sugar',
      'prediabetes',
      'diabetes',
      'fatigue',
      'tired',
      'low energy',
      'exhausted',
      'mood swings',
      'anxiety',
      'depression',
      'mood issues',
      'infertility',
      'trying to conceive',
      "can't get pregnant",
      'pcos symptoms',
      'pcod symptoms',
      'androgen',
      'testosterone',
      'hormonal imbalance',
      'hormone issues',
      'inflammation',
      'cravings',
      'sleep issues',
      'insomnia',
    ];

    return symptomKeywords.some((keyword) => messageLower.includes(keyword));
  }

  /**
   * Check if user is directly asking about supplements
   * @param {string} message - User message
   * @returns {boolean} - True if direct supplement query
   */
  isDirectSupplementQuery(message) {
    const messageLower = message.toLowerCase();
    const supplementKeywords = [
      'supplement',
      'supplements',
      'vitamin',
      'vitamins',
      'mineral',
      'minerals',
      'herb',
      'herbs',
      'should i take',
      'can i take',
      'inositol',
      'berberine',
      'omega',
      'omega-3',
      'fish oil',
      'what supplements',
      'which supplements',
      'natural remedies',
      'ashwagandha',
      'ayurvedic',
      'shatavari',
      'tulsi',
      'amla',
      'fenugreek',
      'spearmint',
      'curcumin',
      'turmeric',
      'coq10',
      'chromium',
      'magnesium',
      'zinc',
      'vitamin d',
      'vitamin b',
      'probiotics',
      'nac',
      'n-acetyl cysteine',
      'licorice root',
      'evening primrose',
      'l-carnitine',
      'cinnamon supplement',
      'triphala',
      'guduchi',
    ];

    return supplementKeywords.some((keyword) => messageLower.includes(keyword));
  }

  /**
   * Check if user is responding affirmatively to supplement offer
   * @param {string} message - User message
   * @returns {boolean} - True if affirmative response
   */
  isAffirmativeResponse(message) {
    const messageLower = message.toLowerCase().trim();
    const affirmativeKeywords = [
      'yes',
      'yeah',
      'yea',
      'yep',
      'yup',
      'sure',
      'okay',
      'ok',
      'k',
      'please',
      'tell me',
      'show me',
      'interested',
      'would like',
      "i'd like",
      'go ahead',
      'sounds good',
      'that would be great',
      'that would help',
    ];

    return affirmativeKeywords.some((keyword) => messageLower.includes(keyword));
  }

  /**
   * Check if user is declining supplement offer
   * @param {string} message - User message
   * @returns {boolean} - True if declining
   */
  isDecliningResponse(message) {
    const messageLower = message.toLowerCase().trim();
    const decliningKeywords = [
      'no',
      'nope',
      'no thanks',
      'no thank you',
      'not now',
      'not interested',
      'maybe later',
      'skip',
      'pass',
    ];

    return decliningKeywords.some((keyword) => messageLower.includes(keyword));
  }

  /**
   * Build supplement query based on user symptoms
   * @param {string|string[]} userInput - User message or extracted symptoms
   * @returns {string} - Supplement query for RAG
   */
  buildSupplementQuery(userInput) {
    const symptoms = typeof userInput === 'string' ? userInput : userInput.join(' ');
    return `PCOS supplements for ${symptoms} evidence-based benefits side effects interactions`;
  }

  /**
   * Extract symptoms from user message
   * @param {string} message - User message
   * @returns {string[]} - Extracted symptoms
   */
  extractSymptoms(message) {
    const messageLower = message.toLowerCase();
    const symptoms = [];

    const symptomMap = {
      'irregular period': ['irregular period', 'irregular periods', 'missed period'],
      acne: ['acne', 'pimples'],
      'hair loss': ['hair loss', 'hair fall', 'thinning hair'],
      hirsutism: ['hirsutism', 'facial hair', 'unwanted hair'],
      'weight management': ['weight gain', 'obesity', "can't lose weight"],
      'insulin resistance': [
        'insulin resistance',
        'high insulin',
        'high blood sugar',
        'prediabetes',
      ],
      fatigue: ['fatigue', 'tired', 'low energy', 'exhausted'],
      'mood issues': ['mood swings', 'anxiety', 'depression', 'mood issues'],
      fertility: ['infertility', 'trying to conceive', "can't get pregnant"],
      inflammation: ['inflammation'],
      'hormonal imbalance': ['androgen', 'testosterone', 'hormonal imbalance', 'hormone issues'],
    };

    for (const [symptom, keywords] of Object.entries(symptomMap)) {
      if (keywords.some((keyword) => messageLower.includes(keyword))) {
        symptoms.push(symptom);
      }
    }

    return symptoms.length > 0 ? symptoms : ['general PCOS symptoms'];
  }

  /**
   * Process user message with enhanced RAG + Lab Values
   */
  async processMessage(userMessage, userContext = {}) {
    try {
      logger.info('Processing chat message with enhanced RAG + lab values', {
        messageLength: userMessage.length,
        userId: userContext.userId,
      });

      // Step 0: Content Safety Check - Block NSFW/inappropriate content
      const safetyCheck = this.checkContentSafety(userMessage);
      if (safetyCheck.isBlocked) {
        logger.warn('🚫 Message blocked by content safety filter', {
          reason: safetyCheck.reason,
          userId: userContext.userId,
        });
        return {
          message: { response: safetyCheck.message },
          sources: [],
          contextUsed: {
            blocked: true,
            reason: safetyCheck.reason,
          },
        };
      }

      // Step 0.5: BACKUP Meal Plan Detection - Catch any meal plan requests that bypassed middleware
      const mealPlanCheck = this.detectMealPlanRequest(userMessage);
      if (mealPlanCheck.isMealPlan) {
        logger.warn('🍽️ Meal plan request detected in chatChain (backup filter)', {
          category: mealPlanCheck.category,
          userId: userContext.userId,
          message: userMessage.substring(0, 100),
        });
        return {
          message: {
            response:
              "I'd love to help you with meal planning! 🍽️\n\nFor personalized meal plans tailored to your PCOS needs, dietary preferences, and lifestyle, please use our dedicated **Meal Plan Generator**. It creates complete 7-day plans with recipes, nutrition info, and grocery lists!\n\nI'm here to answer questions about PCOS, symptoms, lifestyle tips, and general nutrition advice through chat. For complete meal plans, the Meal Plan Generator is your best option!",
          },
          sources: [],
          contextUsed: {
            redirected: true,
            reason: 'meal_plan_request',
            category: mealPlanCheck.category,
          },
        };
      }

      // Step 1: Fetch user's lab values from medical report
      let medicalData = null;
      let labContext = '';

      if (userContext.userId) {
        medicalData = await this.getUserLabValues(userContext.userId);

        if (medicalData) {
          labContext = this.buildLabContext(medicalData);
          logger.info('Lab context built for personalized response', {
            labCount: Object.keys(medicalData.labValues).length,
          });
        }
      }

      // Step 2: Retrieve from medical knowledge base
      // Enhance nutrition queries to better match meal templates
      let retrievalQuery = userMessage;

      // If asking about nutrition/info for a specific dish, broaden the search
      const nutritionQueryPattern =
        /(nutrition|nutritional|macros?|calories?|protein|carbs|fats?)\s+(info|information|data|on|for|of)\s+(.+)/i;
      const dishMatch = userMessage.match(nutritionQueryPattern);

      if (dishMatch) {
        const dishName = dishMatch[3];
        // Expand query to include meal-related terms for better RAG matching
        retrievalQuery = `${dishName} nutrition macros protein carbs fats calories meal recipe ingredients`;
        logger.info('Enhanced nutrition query for RAG retrieval', {
          original: userMessage,
          enhanced: retrievalQuery,
        });
      }

      const medicalDocs = await retriever.retrieve(retrievalQuery, { topK: 10 });
      const medicalContext = retriever.formatContextFromResults(medicalDocs);

      if (medicalDocs && medicalDocs.length > 0) {
        logger.info('RAG documents retrieved', {
          count: medicalDocs.length,
          query: retrievalQuery,
        });
      } else {
        logger.warn('No RAG documents retrieved for query', { query: retrievalQuery });
      }

      // Step 3: Retrieve lab-specific dietary guidance from RAG
      let labGuidanceDocs = [];
      let labGuidanceContext = '';

      if (medicalData && medicalData.labValues) {
        const labQuery = this.buildLabGuidanceQuery(medicalData.labValues, userMessage);

        if (labQuery) {
          logger.info('Retrieving lab-specific dietary guidance', { query: labQuery });

          labGuidanceDocs = await retriever.retrieve(labQuery, { topK: 10 });
          labGuidanceContext = retriever.formatContextFromResults(labGuidanceDocs);

          logger.info('Lab-specific guidance retrieved', {
            docsRetrieved: labGuidanceDocs.length,
          });
        }
      }

      // Step 4: Fetch Reddit insights if needed
      let redditContext = null;
      const needsReddit = this.needsCommunityInsights(userMessage);

      if (needsReddit) {
        logger.info('Fetching Reddit community insights');
        redditContext = await this.fetchRedditContext(userMessage);
      }

      // Step 5: Fetch nutritional data if needed
      let nutritionContext = null;
      if (this.needsNutritionData(userMessage)) {
        logger.info('Fetching nutritional data');
        nutritionContext = await this.fetchNutritionContext(userMessage);
      }

      // Step 5.5: Retrieve ingredient substitutes for nutrition AND food/recipe queries
      let ingredientSubstituteContext = '';
      if (this.needsNutritionData(userMessage) || this.needsIngredientSubstitutes(userMessage)) {
        logger.info('🔍 Retrieving PCOS-friendly ingredient substitutes');

        // Extract food items mentioned and search for substitutes
        const ingredientQuery = this.buildIngredientSubstituteQuery(userMessage);
        logger.info('📝 Ingredient substitute query:', { query: ingredientQuery });

        const substituteDocs = await retriever.retrieve(ingredientQuery, { topK: 5 });

        if (substituteDocs && substituteDocs.length > 0) {
          ingredientSubstituteContext = '🔄 PCOS-FRIENDLY INGREDIENT SUBSTITUTES (from RAG):\n';
          ingredientSubstituteContext +=
            '(Reference these when recommending healthy modifications)\n\n';
          ingredientSubstituteContext +=
            retriever.formatContextFromResults(substituteDocs) + '\n\n';

          logger.info('✅ Ingredient substitutes retrieved', {
            docsRetrieved: substituteDocs.length,
            query: ingredientQuery,
            contextPreview: ingredientSubstituteContext.substring(0, 300),
          });
        } else {
          logger.warn('⚠️ No ingredient substitutes found in RAG', {
            query: ingredientQuery,
            hint: 'Run: npm run ingest:medical to load ingredient substitutes data',
          });
        }
      }

      // Step 5.6: Handle supplement queries (opt-in pattern)
      let supplementContext = '';
      let supplementOfferAdded = false;

      // Check if user is directly asking about supplements
      if (this.isDirectSupplementQuery(userMessage)) {
        logger.info('💊 Direct supplement query detected');

        const supplementQuery = this.buildSupplementQuery(userMessage);
        logger.info('📝 Supplement query:', { query: supplementQuery });

        const supplementDocs = await retriever.retrieve(supplementQuery, { topK: 8 });

        if (supplementDocs && supplementDocs.length > 0) {
          supplementContext = '💊 PCOS SUPPLEMENT INFORMATION (from Knowledge Base):\n';
          supplementContext +=
            '(Provide detailed information with medical disclaimers - NO DOSING)\n\n';
          supplementContext += retriever.formatContextFromResults(supplementDocs) + '\n\n';

          supplementContext += '\n🚨 CRITICAL SUPPLEMENT RESPONSE RULES:\n';
          supplementContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          supplementContext += '⛔️ NEVER provide specific dosage information\n';
          supplementContext += '⛔️ ALWAYS include medical disclaimer at the end\n';
          supplementContext += '⛔️ Frame side effects matter-of-factly, not alarmist\n';
          supplementContext += '⛔️ Prioritize supplements with strong clinical evidence\n';
          supplementContext += "⛔️ Match supplements to user's specific symptoms\n";
          supplementContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

          logger.info('✅ Supplement information retrieved', {
            docsRetrieved: supplementDocs.length,
            query: supplementQuery,
          });
        } else {
          logger.warn('⚠️ No supplement information found in RAG', {
            query: supplementQuery,
            hint: 'Check if pcos_supplements.txt is loaded',
          });
        }
      }
      // Check if user is asking about symptoms (offer supplements at end)
      else if (this.isSymptomQuery(userMessage)) {
        logger.info('🩺 Symptom query detected - will offer supplement recommendations');
        const symptoms = this.extractSymptoms(userMessage);
        const symptomList = symptoms.join(', ');

        // Add instruction to offer supplements at the end
        supplementOfferAdded = true;
        supplementContext = '\n\n💊 SUPPLEMENT OFFER INSTRUCTION:\n';
        supplementContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        supplementContext += '⚠️ MANDATORY: Add this exact text at the END of your response:\n\n';
        supplementContext +=
          '"💊 Would you like me to suggest some evidence-based supplements that may help with ' +
          symptomList +
          '? I can provide information about supplements specifically for these symptoms, including how they work, potential side effects, and important interactions to discuss with your doctor."\n';
        supplementContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
      }

      // Step 6: Build comprehensive context
      let enhancedContext = '';

      // Prioritize lab values at the top
      if (labContext) {
        enhancedContext += labContext;
      }

      // Add lab-specific dietary guidance from RAG
      if (labGuidanceContext) {
        enhancedContext += '📚 LAB-SPECIFIC DIETARY GUIDANCE FROM KNOWLEDGE BASE:\n';
        enhancedContext +=
          "(Use these evidence-based recommendations for user's specific lab abnormalities)\n\n";
        enhancedContext += labGuidanceContext + '\n\n';
      }

      // Add general medical context
      if (medicalContext) {
        enhancedContext += '📖 GENERAL PCOS KNOWLEDGE BASE:\n';
        enhancedContext += medicalContext + '\n\n';
      }

      // Add Reddit insights
      if (redditContext) {
        enhancedContext += '===== IMPORTANT: REAL REDDIT COMMUNITY INSIGHTS =====\n';
        enhancedContext += 'These are ACTUAL posts and discussions from Reddit communities.\n';
        enhancedContext += 'Your response MUST reference and summarize specific insights below.\n';
        enhancedContext += 'Do NOT give generic advice - use the actual content provided.\n\n';
        enhancedContext += redditContext + '\n\n';
        enhancedContext += '===== END REDDIT INSIGHTS =====\n\n';
      }

      // Add nutrition data
      if (nutritionContext) {
        enhancedContext += nutritionContext + '\n\n';
      }

      // Add supplement information/offer
      if (supplementContext) {
        logger.info('➕ Adding supplement context to prompt', {
          isDirectQuery: this.isDirectSupplementQuery(userMessage),
          isOfferOnly: supplementOfferAdded,
        });

        enhancedContext += supplementContext + '\n\n';
      }

      // Add ingredient substitutes from RAG
      if (ingredientSubstituteContext) {
        logger.info('➕ Adding ingredient substitute context to prompt', {
          contextLength: ingredientSubstituteContext.length,
        });

        enhancedContext += '\n\n';
        enhancedContext += '═══════════════════════════════════════════════════════════\n';
        enhancedContext += '🚨 MANDATORY: PCOS-FRIENDLY INGREDIENT SUBSTITUTES 🚨\n';
        enhancedContext += '═══════════════════════════════════════════════════════════\n\n';
        enhancedContext +=
          '⛔️ YOU MUST INCLUDE A SECTION TITLED "PCOS-Friendly Modifications" IN YOUR RESPONSE!\n\n';
        enhancedContext += '🎯 RULES:\n';
        enhancedContext +=
          '1. Use ONLY the substitutes from the data below (DO NOT make up alternatives)\n';
        enhancedContext +=
          '2. Provide INGREDIENT-LEVEL substitutes (NOT whole meal alternatives)\n';
        enhancedContext += '3. Use this EXACT format for EACH substitute:\n';
        enhancedContext +=
          '   "Instead of [ingredient], use [substitute] because [PCOS benefit]"\n\n';
        enhancedContext += '✅ CORRECT FORMAT:\n';
        enhancedContext += '   Instead of refined flour (maida), use almond flour because it has\n';
        enhancedContext += "   lower carbs and won't spike blood sugar.\n\n";
        enhancedContext += '   Instead of white sugar, use stevia or erythritol because they are\n';
        enhancedContext += "   zero-calorie sweeteners that don't affect insulin.\n\n";
        enhancedContext += '   Instead of milk chocolate chips, use dark chocolate (85%+ cacao)\n';
        enhancedContext += '   because it has less sugar and beneficial antioxidants.\n\n';
        enhancedContext += '❌ UNACCEPTABLE (TOO GENERIC):\n';
        enhancedContext += '   ✗ "Make healthier cookie choices"\n';
        enhancedContext += '   ✗ "Opt for low-GI snacks"\n';
        enhancedContext += '   ✗ "Eat fruit instead"\n\n';
        enhancedContext += '📋 SUBSTITUTE DATA (USE THESE IN YOUR RESPONSE):\n';
        enhancedContext += '─────────────────────────────────────────────────────────\n';
        enhancedContext += ingredientSubstituteContext;
        enhancedContext += '─────────────────────────────────────────────────────────\n\n';
        enhancedContext += '⚠️ FAILURE TO INCLUDE SPECIFIC SUBSTITUTES = INCOMPLETE RESPONSE!\n';
        enhancedContext += '═══════════════════════════════════════════════════════════\n\n';
      }

      if (!enhancedContext) {
        enhancedContext = 'No specific context found. Rely on general PCOS knowledge.';
      }

      // Step 7: Build complete prompt manually (avoid LangChain template issues with curly braces)
      const userProfileSection = `USER PROFILE:
Age: ${userContext.age || 'Not provided'}
Location: ${userContext.location || 'Not provided'}
Dietary Preference: ${userContext.dietaryPreference || 'Not provided'}
Primary Goals: ${userContext.goals?.join(', ') || 'Not provided'}`;

      const fullContext =
        this.systemPrompt +
        '\n\n' +
        userProfileSection +
        '\n\nRETRIEVED CONTEXT:\n' +
        enhancedContext;

      // Step 8: Get chat history from memory
      const memoryVariables = await this.memory.loadMemoryVariables({});
      const history = memoryVariables.history || '';

      // Step 9: Build final prompt with history
      const finalPrompt =
        fullContext +
        '\n\nCurrent Conversation:\n' +
        history +
        '\n\nUser: ' +
        userMessage +
        '\nAssistant:';

      // Step 10: Call LLM directly (bypass PromptTemplate to avoid curly brace issues)
      const llm = llmClient.getModel();
      const response = await llm.invoke(finalPrompt);

      // Step 11: Save to memory
      await this.memory.saveContext(
        { input: userMessage },
        { output: response.content || response }
      );

      // Step 12: Add appropriate disclaimers using intelligent routing
      let finalResponse = response.content || response;

      // Add disclaimers based on context
      const disclaimers = this.getAppropriateDisclaimers(
        finalResponse,
        userMessage,
        medicalData,
        redditContext
      );

      // Append disclaimers if not already present
      if (disclaimers.length > 0) {
        finalResponse += '\n\n' + disclaimers.join('\n\n');
      }

      // Step 11: Compile sources
      const sources = [];

      if (medicalData) {
        sources.push({
          type: 'medical_report',
          labCount: Object.keys(medicalData.labValues).length,
          uploadedAt: medicalData.uploadedAt,
        });
      }

      if (labGuidanceDocs && labGuidanceDocs.length > 0) {
        sources.push({
          type: 'lab_guidance',
          count: labGuidanceDocs.length,
          documents: labGuidanceDocs.slice(0, 3).map((doc) => ({
            content: this.safeExtractContent(doc, 200),
            metadata: this.safeExtractMetadata(doc),
          })),
        });
      }

      if (medicalDocs && Array.isArray(medicalDocs) && medicalDocs.length > 0) {
        sources.push({
          type: 'medical',
          count: medicalDocs.length,
          documents: medicalDocs.slice(0, 3).map((doc) => ({
            content: this.safeExtractContent(doc, 200),
            metadata: this.safeExtractMetadata(doc),
          })),
        });
      }

      if (redditContext) {
        sources.push({
          type: 'reddit',
          disclaimer: 'Anonymized community insights',
        });
      }

      if (supplementContext) {
        sources.push({
          type: 'supplements',
          disclaimer: 'Educational supplement information - consult healthcare provider for dosing',
        });
      }

      if (nutritionContext) {
        // Parse the nutrition data to extract actual links
        try {
          // Extract just the JSON part (stops at the first newline after the closing brace)
          const nutritionDataMatch = nutritionContext.match(
            /🥗 NUTRITIONAL DATA:\n(\{[\s\S]*?\n\})/
          );
          if (nutritionDataMatch) {
            const nutritionData = JSON.parse(nutritionDataMatch[1]);

            // Build sources array with actual URLs
            const nutritionSources = [];

            // Add primary source if available
            if (nutritionData.sourceUrl) {
              nutritionSources.push({
                title: nutritionData.source || 'Nutrition Facts',
                url: nutritionData.sourceUrl,
                snippet: `Serving: ${nutritionData.servingSize || '100g'}, Calories: ${
                  nutritionData.calories || 'N/A'
                }, Protein: ${nutritionData.protein || 'N/A'}g`,
              });
            }

            // Add organic results if available
            if (nutritionData.organicResults && Array.isArray(nutritionData.organicResults)) {
              nutritionData.organicResults.forEach((result) => {
                if (result.link) {
                  nutritionSources.push({
                    title: result.title,
                    url: result.link,
                    snippet: result.snippet,
                  });
                }
              });
            }

            if (nutritionSources.length > 0) {
              sources.push({
                type: 'nutrition',
                provider: 'Google (SERP API)',
                links: nutritionSources,
              });
            } else {
              sources.push({
                type: 'nutrition',
                provider: 'Google (SERP API)',
                message: 'Nutrition data found but no external links available',
              });
            }
          }
        } catch (parseError) {
          logger.error('Failed to parse nutrition data for sources', { error: parseError.message });
          sources.push({
            type: 'nutrition',
            provider: 'Google (SERP API)',
          });
        }
      }

      return {
        message: { response: finalResponse },
        sources,
        contextUsed: {
          labValues: !!medicalData,
          labGuidance: labGuidanceDocs.length > 0,
          medical: !!medicalContext,
          reddit: !!redditContext,
          nutrition: !!nutritionContext,
          supplements: !!supplementContext,
        },
      };
    } catch (error) {
      logger.error('Chat processing failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}

export const chatChain = new ChatChain();
export default chatChain;
