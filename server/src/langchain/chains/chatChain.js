// server/src/langchain/chains/chatChain.js
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { llmClient } from '../llmClient.js';
import { retriever } from '../retriever.js';
import { redditService } from '../../services/redditService.js';
import { serpService } from '../../services/serpService.js';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ChatChain');

class ChatChain {
  constructor() {
    this.memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
    });
  }

  get systemPrompt() {
    return `You are Sakhee, an empathetic, non-judgmental AI health companion specializing in PCOS/PCOD management for Indian women.

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

When you see "🔥 REAL REDDIT POSTS" in the context:
- **YOU MUST reference specific post titles provided**
- **YOU MUST include the direct Reddit links (🔗) in your response**
- **DO NOT give generic advice about "searching Reddit" or "communities exist"**
- **SUMMARIZE actual content from the Reddit posts shown**
- **Quote relevant experiences** (without usernames - they're already removed)
- **Cite which subreddit** each discussion is from (r/PCOS, r/PCOSIndia, etc.)
- **Make it conversational and relatable**, not robotic

LINK FORMAT: Include links like this in your response:
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

Remember: You're a companion, not a medical professional. Build trust through empathy, accuracy, and cultural sensitivity.`;
  }

  /**
   * Detect if query needs community insights
   */
  needsCommunityInsights(message) {
    const triggers = [
      // Direct Reddit mentions
      'reddit',
      'reddit thread',
      'subreddit',
      'on reddit',

      // Community experience queries
      'anyone else',
      'am i the only one',
      'others experience',
      'other women',
      'what do people',
      'what do others',

      // Validation seeking
      'is this normal',
      'is it common',
      'typical',
      'common',

      // Success stories
      'success stories',
      'has anyone',
      'anyone tried',

      // Community discussions
      'community',
      'forum',
      'discussion',
      'what are people saying',
    ];

    return triggers.some((trigger) => message.toLowerCase().includes(trigger));
  }

  /**
   * Detect if query needs nutritional data
   */
  needsNutritionData(message) {
    const triggers = [
      'calories',
      'nutrition',
      'protein',
      'carbs',
      'fat',
      'nutritional value',
      'macros',
      'how healthy is',
      'nutrients',
      'food comparison',
    ];

    return triggers.some((trigger) => message.toLowerCase().includes(trigger));
  }

  /**
   * Extract food items from message
   */
  extractFoodItems(message) {
    // Simple extraction - can be improved with NER
    const words = message.split(' ');
    const potentialFoods = [];

    // Look for common Indian foods
    const commonFoods = [
      'roti',
      'rice',
      'dal',
      'chapati',
      'idli',
      'dosa',
      'paneer',
      'chicken',
      'fish',
      'egg',
      'milk',
      'apple',
      'banana',
      'orange',
      'vegetables',
    ];

    words.forEach((word) => {
      const normalized = word.toLowerCase().replace(/[^\w]/g, '');
      if (commonFoods.includes(normalized)) {
        potentialFoods.push(normalized);
      }
    });

    return potentialFoods;
  }

  /**
   * Fetch relevant Reddit insights
   */
  async fetchRedditContext(message) {
    try {
      // Extract topic from message (improved)
      const topic = this.extractTopic(message);

      // Search with more results for better coverage
      const insights = await redditService.searchPosts(
        topic || message.substring(0, 100),
        10 // Increased from 5 to 10 for more content
      );

      if (insights.length === 0) {
        logger.warn('No Reddit insights found', { topic });
        return null;
      }

      logger.info(`Found ${insights.length} Reddit insights`, { topic });

      // Format with more detail
      return redditService.formatInsightsForChat(insights, 5); // Show top 5 instead of 3
    } catch (error) {
      logger.error('Failed to fetch Reddit context', { error: error.message });
      return null;
    }
  }

  /**
   * Fetch nutritional data
   */
  async fetchNutritionContext(message) {
    try {
      const foodItems = this.extractFoodItems(message);

      if (foodItems.length === 0) {
        return null;
      }

      // Fetch nutrition for first 2 food items
      const nutritionPromises = foodItems
        .slice(0, 2)
        .map((food) => serpService.searchNutrition(food));

      const nutritionData = await Promise.all(nutritionPromises);

      // Format for context
      let formatted = '🥗 Nutritional Information:\n\n';

      nutritionData.forEach((data) => {
        if (data.found) {
          formatted += `${data.foodItem} (per ${data.servingSize}):\n`;
          formatted += `  - Calories: ${data.calories || 'N/A'} kcal\n`;
          formatted += `  - Protein: ${data.protein || 'N/A'}g\n`;
          formatted += `  - Carbs: ${data.carbs || 'N/A'}g\n`;
          formatted += `  - Fat: ${data.fat || 'N/A'}g\n`;
          if (data.fiber) formatted += `  - Fiber: ${data.fiber}g\n`;
          formatted += `  Source: ${data.source}\n\n`;
        }
      });

      return formatted;
    } catch (error) {
      logger.error('Failed to fetch nutrition context', { error: error.message });
      return null;
    }
  }

  /**
   * Extract main topic from message
   */
  extractTopic(message) {
    const lowerMessage = message.toLowerCase();

    // Enhanced keyword extraction with more PCOS topics
    const keywords = [
      // Symptoms
      'weight loss',
      'weight gain',
      'irregular periods',
      'missing period',
      'acne',
      'hirsutism',
      'facial hair',
      'hair loss',
      'hair thinning',
      'mood swings',
      'depression',
      'anxiety',
      'fatigue',

      // Medical
      'insulin resistance',
      'metformin',
      'birth control',
      'spironolactone',
      'inositol',
      'spearmint tea',
      'supplements',

      // Lifestyle
      'diet',
      'exercise',
      'workout',
      'fasting',
      'keto',
      'low carb',
      'yoga',
      'stress management',

      // Fertility
      'fertility',
      'pregnancy',
      'trying to conceive',
      'ttc',
      'ovulation',
      'getting pregnant',
      'conceiving',

      // General
      'diagnosis',
      'doctor',
      'treatment',
      'symptoms',
    ];

    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return keyword;
      }
    }

    // If no keyword match, extract key nouns (simple approach)
    const words = message.split(' ');
    for (const word of words) {
      if (
        word.length > 5 &&
        !['which', 'about', 'reddit', 'threads'].includes(word.toLowerCase())
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
   * Process user message with enhanced RAG (Medical + Reddit + SERP)
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
      if (this.needsCommunityInsights(userMessage)) {
        logger.info('Fetching Reddit community insights');
        redditContext = await this.fetchRedditContext(userMessage);
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

      if (redditContext) {
        enhancedContext += '===== IMPORTANT: REAL REDDIT COMMUNITY INSIGHTS =====\n';
        enhancedContext += 'These are ACTUAL posts and discussions from Reddit communities.\n';
        enhancedContext += 'Your response MUST reference and summarize specific insights below.\n';
        enhancedContext += 'Do NOT give generic advice - use the actual content provided.\n\n';
        enhancedContext += redditContext + '\n\n';
        enhancedContext += '===== END REDDIT INSIGHTS =====\n\n';
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

      // Step 9: Compile sources
      const sources = [];

      if (medicalDocs && medicalDocs.length > 0) {
        sources.push({
          type: 'medical',
          count: medicalDocs.length,
          documents: medicalDocs.slice(0, 3).map((doc) => ({
            content: doc.pageContent.substring(0, 200),
            metadata: doc.metadata,
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
      logger.error('Chat processing failed', { error: error.message });
      throw error;
    }
  }
}

export const chatChain = new ChatChain();
export default chatChain;
