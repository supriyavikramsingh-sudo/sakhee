// server/src/langchain/chains/chatChain.js
// ✅ COMPLETE FIXED VERSION - All method calls corrected
// Fixed: substring error, Reddit integration, SERP nutrition API

import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { llmClient } from '../llmClient.js';
import { retriever } from '../retriever.js';
import { redditService } from '../../services/redditService.js';
import { serpService } from '../../services/serpService.js';
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
    const defaultPrompt = `You are Sakhee, an empathetic, non-judgmental AI health companion specializing in PCOS/PCOD management for Indian women

## Your Core Role
- Provide evidence-based, educational guidance on PCOS symptoms and lifestyle management
- Offer culturally adapted, region-specific meal suggestions
- Support emotional well-being through compassionate communication
- Connect women to community experiences while maintaining medical safety
- Use real-time nutritional data and community insights when relevant

## Integration Powers
You have access to:
1. **Medical Knowledge Base**: Evidence-based PCOS research and guidelines
2. **Reddit Community Insights**: Anonymized experiences from r/PCOS, r/PCOSIndia, etc.
3. **Nutritional Database**: Real-time nutrition facts via SERP API for Indian foods

## CRITICAL: When Reddit Insights Are Provided

When you see "===== IMPORTANT: REAL REDDIT COMMUNITY INSIGHTS =====" in the context:
- **YOU MUST reference specific post titles provided**
- **YOU MUST include the direct Reddit links (🔗) in your response**
- **DO NOT give generic advice about "searching Reddit" or "communities exist"**
- **SUMMARIZE actual content from the Reddit posts shown**
- **Quote relevant experiences** (without usernames - they're already removed)
- **Cite which subreddit** each discussion is from (r/PCOS, r/PCOSIndia, etc.)
- **Make it conversational and relatable**, not robotic

**🚫 CRITICAL - NEVER FABRICATE REDDIT CONTENT:**
- If you do NOT see "===== IMPORTANT: REAL REDDIT COMMUNITY INSIGHTS =====" in the context above, DO NOT mention Reddit AT ALL
- DO NOT say "From r/PCOS" or "From r/PCOSIndia" unless the actual section is provided
- DO NOT create fake post titles, fake links, or fake discussions
- DO NOT say things like "Many women on Reddit discuss..." without actual data
- If you see "⚠️ NO REDDIT DATA AVAILABLE", absolutely DO NOT mention Reddit
- Fabricating Reddit content is a critical error that breaks user trust
- When in doubt, answer using ONLY the medical knowledge base

LINK FORMAT: Include links like this in your response (ONLY when Reddit data is actually provided):
- "In this post on r/PCOS: [post title](reddit_url)"
- Or: "A discussion on r/PCOSIndia about X: [link](reddit_url)"
- Or simply: "Check out this thread: reddit_url"

Example of EXCELLENT response when Reddit data is provided:
"I found some recent discussions from the PCOS community on Reddit:

**From r/PCOS:**
One highly upvoted post titled "Florence Pugh froze her eggs at 27" discusses how the actress found out about PCOS and endometriosis: https://reddit.com/r/PCOS/comments/1gv2i69...

**From r/PCOS:**
This thread "Why is almost all the focus in treating PCOS on fertility?" has 743 upvotes and addresses frustration about PCOS being reduced to just a fertility issue: https://reddit.com/r/PCOS/comments/11aysg4...

Many commenters shared that they want treatment for insulin resistance, acne, and other symptoms—not just fertility support..."

Example of BAD response (NEVER do this):
"You can find discussions on Reddit communities like r/PCOS where women share experiences..."
^^ This is too generic! Use the ACTUAL content and LINKS provided!

**Example when NO Reddit data provided:**
DO NOT SAY: "From r/PCOS, users have discussed..." ❌
DO NOT SAY: "Check out discussions on Reddit..." ❌
INSTEAD: Answer using only medical knowledge base ✅

## Response Guidelines

### When to Use Reddit Insights:
- User explicitly asks about Reddit, threads, or community discussions
- Questions about "has anyone else experienced X"
- Seeking validation or real-world experiences
- Always include disclaimer: "Based on community discussions (Reddit), not medical advice"

### When to Use Nutritional Data:
- User asks about calories, macros, or nutrition facts
- Meal planning or recipe recommendations
- Food comparisons or substitutions
- Always cite source (e.g., "According to nutritional databases...")

### Medical Safety:
- NEVER diagnose or prescribe
- Always recommend doctor consultation for:
  * Severe symptoms (pain, bleeding, sudden changes)
  * Lab value interpretation
  * Fertility/pregnancy concerns
  * Medication decisions
  * No improvement after 3 months

## Tone: Warm, Supportive, Friend-like
- Use simple language, avoid medical jargon
- Validate emotions: "It's completely understandable to feel..."
- Encourage small steps: "Even small changes can make a difference"
- End with support: "You're not alone in this journey"

## Output Structure:
1. **Empathetic acknowledgment**
2. **Clear answer with context** (USE REDDIT DATA IF PROVIDED!)
3. **3-5 actionable recommendations**
4. **When to see doctor** (if health-related)
5. **Supportive closing**

## 🚨 CRITICAL: Meal Plan Requests - REDIRECT ONLY

**YOU MUST NEVER GENERATE MEAL PLANS IN CHAT**

When a user asks for meal plans, ALWAYS respond with redirect message.

Remember: You're a companion, not a medical professional. Build trust through empathy, accuracy, and cultural sensitivity.`;

    this.systemPrompt = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : defaultPrompt;
  }

  /**
   * Check if message needs Reddit community insights
   * ✅ ENHANCED: Better trigger detection
   */
  needsCommunityInsights(message) {
    const lowerMessage = message.toLowerCase();
    const triggers = [
      // Explicit community requests
      'how are women',
      'how do women',
      'what do women',
      'women dealing',
      'women managing',
      'women coping',
      'community',
      'others',
      'real experiences',
      'personal stories',
      'success stories',
      'tips from',
      'advice from',
      'hear from',
      'anyone else',
      'what are people',
      'what are others',

      // Diet/experience questions that benefit from community insights
      'should i eat',
      'should i try',
      'does anyone',
      'has anyone',
      'anyone tried',
      'anyone experienced',
      'what works',
      'what helped',
      'success with',
      'experience with',
    ];
    return triggers.some((trigger) => lowerMessage.includes(trigger));
  }

  /**
   * Check if message needs nutritional data
   */
  needsNutritionData(message) {
    const lowerMessage = message.toLowerCase();
    const triggers = [
      'nutrition',
      'nutritional',
      'calories',
      'protein',
      'carbs',
      'carbohydrate',
      'fat',
      'macro',
      'macros',
      'vitamin',
      'mineral',
      'nutrient',
      'food',
      'diet',
      'breakdown',
    ];
    return triggers.some((trigger) => lowerMessage.includes(trigger));
  }

  /**
   * ✅ FIXED: Fetch Reddit context using correct method names
   */
  async fetchRedditContext(message) {
    try {
      const keyword = this.extractKeyword(message);
      if (!keyword) {
        logger.warn('No keyword extracted for Reddit search');
        return null;
      }

      logger.info('Searching Reddit with keyword', { keyword });

      // ✅ FIX: Use searchPosts (correct method name)
      const insights = await redditService.searchPosts(keyword, 5);

      if (!insights || insights.length === 0) {
        logger.info('No Reddit insights found');
        return null;
      }

      logger.info(`Found ${insights.length} Reddit insights`);

      // ✅ FIX: Use formatInsightsForChat (correct method name)
      return redditService.formatInsightsForChat(insights, 5);
    } catch (error) {
      logger.error('Failed to fetch Reddit context', { error: error.message });
      return null;
    }
  }

  /**
   * ✅ FIXED: Fetch nutrition context using correct method name
   */
  async fetchNutritionContext(message) {
    try {
      const foodItems = this.extractFoodItems(message);
      if (foodItems.length === 0) {
        return null;
      }

      logger.info('Fetching nutrition data for foods', { foodItems });

      // ✅ FIX: Use searchNutrition (correct method name)
      const nutritionPromises = foodItems
        .slice(0, 3)
        .map((item) => serpService.searchNutrition(item));

      const nutritionData = await Promise.all(nutritionPromises);

      // Format for context
      let formatted = '🥗 NUTRITIONAL INFORMATION:\n\n';

      nutritionData.forEach((data) => {
        if (data.found) {
          formatted += `**${data.foodItem}** (per ${data.servingSize}):\n`;
          formatted += `  • Calories: ${data.calories || 'N/A'} kcal\n`;
          formatted += `  • Protein: ${data.protein || 'N/A'}g\n`;
          formatted += `  • Carbs: ${data.carbs || 'N/A'}g\n`;
          formatted += `  • Fat: ${data.fat || 'N/A'}g\n`;
          if (data.fiber) formatted += `  • Fiber: ${data.fiber}g\n`;
          if (data.sugar) formatted += `  • Sugar: ${data.sugar}g\n`;
          formatted += `  • Source: ${data.source}\n\n`;
        }
      });

      return formatted.length > 50 ? formatted : null;
    } catch (error) {
      logger.error('Failed to fetch nutrition context', { error: error.message });
      return null;
    }
  }

  /**
   * Extract food items from message
   */
  extractFoodItems(message) {
    const lowerMessage = message.toLowerCase();

    // Indian foods commonly asked about
    const indianFoods = [
      'dal makhani',
      'dal',
      'rice',
      'chapati',
      'roti',
      'paratha',
      'naan',
      'paneer',
      'chicken',
      'fish',
      'egg',
      'oats',
      'quinoa',
      'spinach',
      'broccoli',
      'rajma',
      'chole',
      'biryani',
      'idli',
      'dosa',
      'sambar',
      'upma',
      'poha',
      'khichdi',
    ];

    const foundFoods = indianFoods.filter((food) => lowerMessage.includes(food));

    // Return unique foods, prioritize longer matches first
    return [...new Set(foundFoods)].sort((a, b) => b.length - a.length);
  }

  /**
   * Extract keyword for Reddit search
   */
  extractKeyword(message) {
    const lowerMessage = message.toLowerCase();

    // Multi-word keywords first (more specific)
    const multiWordKeywords = [
      'weight loss',
      'weight gain',
      'irregular periods',
      'trying to conceive',
      'insulin resistance',
      'birth control',
      'hair loss',
      'mood swings',
      'stress management',
    ];

    for (const keyword of multiWordKeywords) {
      if (lowerMessage.includes(keyword)) {
        return keyword;
      }
    }

    // Single word keywords
    const singleWordKeywords = [
      'acne',
      'hirsutism',
      'fatigue',
      'depression',
      'anxiety',
      'metformin',
      'spironolactone',
      'inositol',
      'supplements',
      'diet',
      'exercise',
      'workout',
      'fasting',
      'keto',
      'yoga',
      'fertility',
      'pregnancy',
      'ovulation',
      'diagnosis',
      'symptoms',
    ];

    for (const keyword of singleWordKeywords) {
      if (lowerMessage.includes(keyword)) {
        return keyword;
      }
    }

    // Extract meaningful words if no keyword match
    const words = message.split(' ');
    for (const word of words) {
      if (
        word.length > 5 &&
        !['which', 'about', 'reddit', 'threads', 'women', 'dealing'].includes(word.toLowerCase())
      ) {
        return word.toLowerCase();
      }
    }

    return null;
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
    ];

    return healthKeywords.some((keyword) => message.toLowerCase().includes(keyword));
  }

  /**
   * ✅ FIXED: Safe extraction of content from documents
   */
  safeExtractContent(doc, maxLength = 200) {
    const content = doc?.pageContent || doc?.content || '';
    const text = typeof content === 'string' ? content : String(content);
    return text.substring(0, maxLength);
  }

  /**
   * ✅ FIXED: Safe metadata extraction
   */
  safeExtractMetadata(doc) {
    return doc?.metadata || {};
  }

  /**
   * Process user message with enhanced RAG (Medical + Reddit + SERP)
   * Note: Meal plan intent detection is handled by middleware before this is called
   */
  async processMessage(userMessage, userContext = {}) {
    try {
      logger.info('Processing chat message with enhanced RAG', {
        messageLength: userMessage.length,
      });

      // Step 1: Retrieve from medical knowledge base
      const medicalDocs = await retriever.retrieve(userMessage);
      const medicalContext = retriever.formatContextFromResults(medicalDocs);

      // Step 2: Fetch Reddit insights if needed
      let redditContext = null;
      const needsReddit = this.needsCommunityInsights(userMessage);
      logger.info('Reddit insights check', { needed: needsReddit });

      if (needsReddit) {
        logger.info('Fetching Reddit community insights');
        redditContext = await this.fetchRedditContext(userMessage);
        logger.info('Reddit context fetched', {
          hasContext: !!redditContext,
          length: redditContext?.length || 0,
        });
      }

      // Step 3: Fetch nutritional data if needed
      let nutritionContext = null;
      if (this.needsNutritionData(userMessage)) {
        logger.info('Fetching nutritional data');
        nutritionContext = await this.fetchNutritionContext(userMessage);
      }

      // Step 4: Build comprehensive context
      let enhancedContext = '';

      if (medicalContext) {
        enhancedContext += '📚 MEDICAL KNOWLEDGE BASE:\n' + medicalContext + '\n\n';
      }

      // ✅ CRITICAL: Only add Reddit section if we actually have data
      if (redditContext && redditContext.length > 100) {
        enhancedContext += '===== IMPORTANT: REAL REDDIT COMMUNITY INSIGHTS =====\n';
        enhancedContext += 'These are ACTUAL posts and discussions from Reddit communities.\n';
        enhancedContext += 'Your response MUST reference and summarize specific insights below.\n';
        enhancedContext += 'Do NOT give generic advice - use the actual content provided.\n\n';
        enhancedContext += redditContext + '\n\n';
        enhancedContext += '===== END REDDIT INSIGHTS =====\n\n';
      } else {
        // ⚠️ CRITICAL FIX: ALWAYS warn against Reddit fabrication when no data available
        // This prevents hallucination even when needsCommunityInsights() returns false
        enhancedContext += '\n🚫 CRITICAL INSTRUCTION - NO REDDIT DATA AVAILABLE:\n';
        enhancedContext += '• You do NOT have any Reddit data for this query\n';
        enhancedContext += '• Do NOT mention "Reddit", "r/PCOS", "r/PCOSIndia", or any subreddit\n';
        enhancedContext +=
          '• Do NOT say "From r/PCOS" or "community members said" or similar phrases\n';
        enhancedContext += '• Do NOT create fake post titles, fake discussions, or fake links\n';
        enhancedContext += '• Answer ONLY using the medical knowledge base provided above\n';
        enhancedContext += "• If you don't have enough information, say so honestly\n\n";
        logger.info('No Reddit data available - added explicit anti-fabrication warning');
        redditContext = null; // Clear it so we don't add disclaimer
      }

      if (nutritionContext) {
        enhancedContext += nutritionContext + '\n\n';
      }

      if (!enhancedContext) {
        enhancedContext = 'No specific context found. Rely on general PCOS knowledge.';
      }

      // Step 5: Build prompt with all context
      const promptTemplate = PromptTemplate.fromTemplate(`
${this.systemPrompt}

USER PROFILE:
Age: ${userContext.age || 'Not provided'}
Location: ${userContext.location || 'Not provided'}
Dietary Preference: ${userContext.dietaryPreference || 'Not provided'}
Primary Goals: ${userContext.goals?.join(', ') || 'Not provided'}

RETRIEVED CONTEXT:
${enhancedContext}

Current Conversation:
{history}

User: {input}
Assistant:`);

      // Step 6: Create conversation chain
      const chain = new ConversationChain({
        llm: llmClient.getModel(),
        memory: this.memory,
        prompt: promptTemplate,
      });

      // Step 7: Invoke chain
      const response = await chain.invoke({ input: userMessage });

      // Step 8: Add appropriate disclaimers
      let finalResponse = response.response;

      if (this.isHealthRelated(userMessage)) {
        finalResponse +=
          '\n\n⚠️ *This is educational guidance only. Please consult a healthcare professional for personalized medical advice.*';
      }

      if (redditContext) {
        finalResponse +=
          '\n\n💬 *Community insights are personal experiences shared on Reddit, not medical advice.*';
      }

      // ✅ FIXED Step 9: Compile sources with defensive programming
      const sources = [];

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
