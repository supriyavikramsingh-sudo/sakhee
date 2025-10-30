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

  buildEnhancedSystemPrompt() {
    return `You are Sakhee, an empathetic, non-judgmental AI health companion specializing in PCOS/PCOD management for Indian women.

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
- **Every health-related response** must end with: "⚠️ *This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.*"
- **Reddit insights** must include: "💬 *Community insights are personal experiences shared on Reddit, not medical advice.*"
- **Lab interpretation** must include: "📊 *Lab value interpretation is educational. Always discuss results with your doctor.*"

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
    context += '5. Always include disclaimer about consulting healthcare provider\n\n';

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
    const multiWordPhrases = [
      'hair loss',
      'facial hair',
      'weight loss',
      'weight gain',
      'birth control',
      'insulin resistance',
      'irregular periods',
      'natural methods',
      'natural remedies',
      'ayurvedic treatment',
      'successfully treated',
      'trying to conceive',
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
      const keywords = this.needsCommunityInsights(userMessage);
      if (!keywords || keywords.length === 0) return null;

      logger.info('🔍 Fetching Reddit posts with keywords:', { keywords });

      // Build a comprehensive search query combining top keywords
      // Format: "keyword1 keyword2 keyword3" for better Reddit search matching
      const searchQuery = Array.isArray(keywords)
        ? keywords.slice(0, 5).join(' ') // Use top 5 keywords
        : keywords;

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

      // Sort by final composite score (highest first)
      const sortedResults = scoredResults.sort((a, b) => b.finalScore - a.finalScore).slice(0, 5); // Top 5 most relevant

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
      'nutrition',
      'protein',
      'carbs',
      'fat',
      'macros',
      'nutrients',
      'vitamin',
      'mineral',
    ];

    return nutritionKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }

  /**
   * Fetch nutrition context
   */
  async fetchNutritionContext(userMessage) {
    try {
      const data = await serpService.searchNutrition(userMessage);

      if (!data) return null;

      return `🥗 NUTRITIONAL DATA:\n${JSON.stringify(data, null, 2)}\n`;
    } catch (error) {
      logger.error('Nutrition fetch failed', { error: error.message });
      return null;
    }
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
   * Process user message with enhanced RAG + Lab Values
   */
  async processMessage(userMessage, userContext = {}) {
    try {
      logger.info('Processing chat message with enhanced RAG + lab values', {
        messageLength: userMessage.length,
        userId: userContext.userId,
      });

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
      const medicalDocs = await retriever.retrieve(userMessage);
      const medicalContext = retriever.formatContextFromResults(medicalDocs);

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

      // Step 12: Add appropriate disclaimers (only if not already present)
      let finalResponse = response.content || response;

      // Helper to safely check for an existing substring (case-insensitive)
      const contains = (needle) => {
        try {
          return finalResponse.toLowerCase().includes(needle.toLowerCase());
        } catch (e) {
          return false;
        }
      };

      const generalDisclaimer =
        '⚠️ *This is educational guidance based on your lab values. Please consult your healthcare provider for personalized medical advice and treatment decisions.*';
      const labDisclaimer =
        '📊 *Lab value interpretation is educational. Always discuss results with your doctor.*';
      const redditDisclaimer =
        '💬 *Community insights are personal experiences shared on Reddit, not medical advice.*';

      if (this.isHealthRelated(userMessage) || medicalData) {
        // Only append if similar guidance isn't already present in the model output
        if (!contains('this is educational guidance based on your lab values')) {
          finalResponse += '\n\n' + generalDisclaimer;
        }
      }

      if (medicalData) {
        if (!contains('lab value interpretation is educational')) {
          finalResponse += '\n\n' + labDisclaimer;
        }
      }

      if (redditContext) {
        if (!contains('community insights are personal experiences')) {
          finalResponse += '\n\n' + redditDisclaimer;
        }
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

      if (nutritionContext) {
        sources.push({
          type: 'nutrition',
          provider: 'SERP API',
        });
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
