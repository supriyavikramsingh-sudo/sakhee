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
1. **Validation with data**: "Your ferritin at 22 ng/mL is indeed low, and this explains your fatigue"
2. **Community connection**: Share specific Reddit posts about low iron struggles in PCOS
3. **Shared experiences**: "Many women with PCOS face this - it's not just you"
4. **Action + support**: Combine iron-rich food recommendations with emotional support

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
   * Check if message needs community insights
   */
  needsCommunityInsights(message) {
    const lowerMessage = message.toLowerCase();

    // Enhanced trigger phrases that indicate user wants community experiences
    const triggers = [
      'reddit',
      'community',
      'other women',
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
    ];

    // Check if message contains community insight triggers
    const hasTrigger = triggers.some(trigger => lowerMessage.includes(trigger));
    if (!hasTrigger) return null;

    logger.info('🔍 Community insights needed, extracting keyword', { message });

    // Enhanced keyword extraction for PCOS context
    const pcosKeywords = [
      'pcos', 'polycystic', 'ovarian', 'syndrome', 'insulin', 'resistance',
      'metformin', 'periods', 'irregular', 'cycles', 'ovulation', 'fertility',
      'hirsutism', 'acne', 'weight', 'gain', 'loss', 'hair', 'thinning',
      'mood', 'depression', 'anxiety', 'fatigue', 'cravings', 'bloating',
      'hormones', 'testosterone', 'estrogen', 'progesterone', 'cortisol',
      'diet', 'exercise', 'supplements', 'inositol', 'spearmint', 'cinnamon',
      'pimples', 'skin', 'pregnancy', 'ayurveda', 'natural'
    ];

    // First, try to find PCOS-specific keywords
    for (const keyword of pcosKeywords) {
      if (lowerMessage.includes(keyword)) {
        logger.info(`✅ Reddit keyword extracted: "${keyword}"`);
        return keyword;
      }
    }

    // Enhanced fallback keyword extraction
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
      'his', 'her', 'its', 'our', 'their', 'reddit', 'threads', 'community',
      'which', 'women', 'dealing', 'there', 'india', 'indian', 'methods', 'treated'
    ]);

    // Extract and score keywords
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    const keywordScores = {};
    
    words.forEach(word => {
      let score = 1;
      
      // Boost longer, more specific words
      if (word.length > 6) {
        score += 1;
      }
      
      // Boost medical/health terms
      if (/^(symptom|treatment|medication|doctor|specialist|diagnosis)/.test(word)) {
        score += 2;
      }
      
      keywordScores[word] = (keywordScores[word] || 0) + score;
    });

    // Get top keyword based on scores
    const sortedKeywords = Object.entries(keywordScores)
      .sort(([,a], [,b]) => b - a);

    if (sortedKeywords.length > 0) {
      const topKeyword = sortedKeywords[0][0];
      logger.info(`✅ Reddit keyword extracted (scored): "${topKeyword}"`);
      return topKeyword;
    }

    // Final fallback to generic PCOS term
    logger.info('ℹ️ No specific keyword found, using default "PCOS"');
    return 'pcos';
  }

  /**
   * Fetch Reddit context
   */
  async fetchRedditContext(userMessage) {
    try {
      const keywords = this.needsCommunityInsights(userMessage);
      if (!keywords || keywords.length === 0) return null;

      // Try multiple search strategies with the extracted keywords
      let allInsights = [];
      
      // Strategy 1: Search with primary keyword (highest scored)
      const primaryKeyword = Array.isArray(keywords) ? keywords[0] : keywords;
      const primaryResults = await redditService.searchPosts(primaryKeyword);
      if (primaryResults && primaryResults.length > 0) {
        allInsights.push(...primaryResults);
      }

      // Strategy 2: If we have multiple keywords and need more results, try secondary keywords
      if (Array.isArray(keywords) && keywords.length > 1 && allInsights.length < 5) {
        for (let i = 1; i < Math.min(keywords.length, 3); i++) {
          const secondaryResults = await redditService.searchPosts(keywords[i]);
          if (secondaryResults && secondaryResults.length > 0) {
            // Add results that aren't already included (avoid duplicates by URL)
            const existingUrls = new Set(allInsights.map(post => post.url));
            const newResults = secondaryResults.filter(post => !existingUrls.has(post.url));
            allInsights.push(...newResults);
            
            if (allInsights.length >= 5) break;
          }
        }
      }

      // Strategy 3: If still need more results, try combined keyword search
      if (Array.isArray(keywords) && keywords.length > 1 && allInsights.length < 3) {
        const combinedKeyword = keywords.slice(0, 2).join(' ');
        const combinedResults = await redditService.searchPosts(combinedKeyword);
        if (combinedResults && combinedResults.length > 0) {
          const existingUrls = new Set(allInsights.map(post => post.url));
          const newResults = combinedResults.filter(post => !existingUrls.has(post.url));
          allInsights.push(...newResults);
        }
      }

      if (!allInsights || allInsights.length === 0) {
        logger.info('No Reddit insights found for keywords:', keywords);
        return null;
      }

      // Sort by relevance score (if available) and upvotes, then take top 5
      const sortedInsights = allInsights
        .sort((a, b) => {
          // Primary sort by relevance score if available
          if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
            if (a.relevanceScore !== b.relevanceScore) {
              return b.relevanceScore - a.relevanceScore;
            }
          }
          // Secondary sort by upvotes
          return (b.score || 0) - (a.score || 0);
        })
        .slice(0, 5);

      let context = '🔥 REAL REDDIT COMMUNITY INSIGHTS:\n\n';
      sortedInsights.forEach((post, index) => {
        context += `**Post ${index + 1}** (r/${post.subreddit}, ${post.score} upvotes):\n`;
        context += `Title: "${post.title}"\n`;
        context += `Content: ${post.content.substring(0, 300)}...\n`;
        context += `Link: ${post.url}\n\n`;
      });

      logger.info(`Found ${sortedInsights.length} Reddit insights using keywords:`, keywords);
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
