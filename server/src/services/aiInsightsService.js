/**
 * AI Insights Service
 * Generates intelligent, personalized insights from monthly report data using OpenAI GPT-4o-mini
 */

import OpenAI from 'openai';
import { env } from '../config/env.js';
import { db } from '../config/firebase.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Model configuration
const AI_MODEL = 'gpt-4o-mini'; // Cost-effective, fast, and capable
const MAX_TOKENS = 1500; // Sufficient for comprehensive insights
const TEMPERATURE = 0.7; // Balanced between creativity and consistency
const CACHE_DURATION_HOURS = 24; // Cache insights for 24 hours

/**
 * Get cached AI insights from Firestore
 * @param {string} userId - User ID
 * @param {string} monthId - Month ID (YYYY-MM)
 * @returns {Promise<Object|null>} Cached insights or null
 */
async function getCachedInsights(userId, monthId) {
  try {
    const cacheRef = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('aiInsightsCache')
      .collection('insights')
      .doc(monthId);

    const cacheDoc = await cacheRef.get();

    if (!cacheDoc.exists) {
      return null;
    }

    const cached = cacheDoc.data();
    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    const cacheExpiry = CACHE_DURATION_HOURS * 60 * 60 * 1000; // Convert to milliseconds

    // Check if cache is still valid
    if (cacheAge > cacheExpiry) {
      console.log(`Cache expired for ${userId}/${monthId}, age: ${cacheAge}ms`);
      return null;
    }

    console.log(`Cache hit for ${userId}/${monthId}, age: ${cacheAge}ms`);
    return cached.insights;
  } catch (error) {
    console.error('Error getting cached insights:', error);
    return null; // On error, proceed to generate new insights
  }
}

/**
 * Save AI insights to Firestore cache
 * @param {string} userId - User ID
 * @param {string} monthId - Month ID (YYYY-MM)
 * @param {Object} insights - AI insights to cache
 * @returns {Promise<void>}
 */
async function cacheInsights(userId, monthId, insights) {
  try {
    const cacheRef = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('aiInsightsCache')
      .collection('insights')
      .doc(monthId);

    await cacheRef.set({
      insights,
      cachedAt: new Date().toISOString(),
      monthId,
      expiresAt: new Date(Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000).toISOString(),
    });

    console.log(`Cached insights for ${userId}/${monthId}`);
  } catch (error) {
    console.error('Error caching insights:', error);
    // Don't throw - caching failure shouldn't break the response
  }
}

/**
 * Clear cached insights for a specific month
 * @param {string} userId - User ID
 * @param {string} monthId - Month ID (YYYY-MM)
 * @returns {Promise<void>}
 */
export async function clearCachedInsights(userId, monthId) {
  try {
    const cacheRef = db
      .collection('users')
      .doc(userId)
      .collection('progressTracking')
      .doc('aiInsightsCache')
      .collection('insights')
      .doc(monthId);

    await cacheRef.delete();
    console.log(`Cleared cache for ${userId}/${monthId}`);
  } catch (error) {
    console.error('Error clearing cached insights:', error);
    throw error;
  }
}

/**
 * Generate AI-powered insights from monthly report data (with caching)
 * @param {string} userId - User ID
 * @param {Object} monthlyReport - The monthly report data
 * @param {Object} options - Optional configuration
 * @param {Array<Object>} options.previousMonths - Previous months' data for trend analysis
 * @param {Object} options.userProfile - User profile information (age, goals, etc.)
 * @param {boolean} options.forceRegenerate - Skip cache and force new generation
 * @returns {Promise<Object>} AI-generated insights
 */
export async function generateMonthlyInsights(userId, monthlyReport, options = {}) {
  try {
    const { previousMonths = [], userProfile = {}, forceRegenerate = false } = options;

    // Validate input
    if (!monthlyReport || !monthlyReport.monthId) {
      throw new Error('Invalid monthly report data');
    }

    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await getCachedInsights(userId, monthlyReport.monthId);
      if (cached) {
        console.log('Returning cached insights');
        return {
          ...cached,
          fromCache: true,
        };
      }
    }

    console.log('Generating new AI insights');

    // Build the prompt with PCOS-specific medical knowledge
    const prompt = buildInsightsPrompt(monthlyReport, previousMonths, userProfile);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' }, // Ensure JSON response
    });

    // Parse and structure the response
    const aiResponse = JSON.parse(completion.choices[0].message.content);

    // Add metadata
    const insights = {
      monthId: monthlyReport.monthId,
      generatedAt: new Date().toISOString(),
      model: AI_MODEL,
      summary: aiResponse.summary || '',
      patternsDetected: aiResponse.patterns || [],
      predictions: aiResponse.predictions || [],
      recommendations: aiResponse.recommendations || [],
      keyInsights: aiResponse.keyInsights || [],
      healthScore: aiResponse.healthScore || null,
      comparisonToPrevious: aiResponse.comparisonToPrevious || null,
      tokensUsed: completion.usage.total_tokens,
      fromCache: false,
    };

    // Cache the insights for future requests
    await cacheInsights(userId, monthlyReport.monthId, insights);

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw new Error(`Failed to generate AI insights: ${error.message}`);
  }
}

/**
 * Build the system prompt with PCOS expertise
 * @returns {string} System prompt
 */
function getSystemPrompt() {
  return `You are an expert PCOS (Polycystic Ovary Syndrome) health analyst and supportive wellness coach. Your role is to analyze monthly health tracking data and provide personalized, actionable insights.

Key Responsibilities:
1. Analyze patterns in weight, activity, sleep, energy, and menstrual cycles
2. Identify correlations between symptoms and lifestyle factors
3. Provide evidence-based recommendations aligned with PCOS management
4. Detect trends and predict potential health changes
5. Offer encouragement and celebrate progress
6. Flag concerns that may need medical attention

Medical Knowledge:
- PCOS is associated with insulin resistance, hormonal imbalances, and metabolic issues
- Weight management is crucial but should be approached holistically
- Regular cycles (28 ±7 days) indicate better hormonal balance
- High activity, good sleep, and stress management improve PCOS symptoms
- Mental health (anxiety, depression) is common in PCOS and should be addressed
- Sustainable lifestyle changes are more effective than drastic measures

Communication Style:
- Supportive, empowering, and non-judgmental
- Use clear, accessible language (not overly medical)
- Balance positivity with honest assessment
- Focus on actionable recommendations
- Celebrate small wins and progress

Response Format:
You must respond with a valid JSON object containing:
{
  "summary": "2-3 sentence overview of the month",
  "patterns": [
    {
      "title": "Pattern name",
      "description": "What you observed",
      "significance": "Why it matters",
      "type": "positive|neutral|negative"
    }
  ],
  "predictions": [
    {
      "title": "Prediction name",
      "description": "What might happen next month",
      "confidence": "high|medium|low",
      "basis": "Why you think this"
    }
  ],
  "recommendations": [
    {
      "category": "weight|activity|sleep|stress|medical|tracking",
      "priority": "high|medium|low",
      "action": "Specific action to take",
      "rationale": "Why this will help",
      "expectedBenefit": "What to expect"
    }
  ],
  "keyInsights": [
    "Short, impactful insight 1",
    "Short, impactful insight 2",
    "Short, impactful insight 3"
  ],
  "healthScore": 1-10 (overall health score for the month),
  "comparisonToPrevious": "Brief comparison to previous month if available"
}`;
}

/**
 * Build the user prompt with monthly report data
 * @param {Object} monthlyReport - Current month's data
 * @param {Array<Object>} previousMonths - Previous months' data
 * @param {Object} userProfile - User profile information
 * @returns {string} User prompt
 */
function buildInsightsPrompt(monthlyReport, previousMonths, userProfile) {
  const {
    monthId,
    totalDaysTracked,
    trackingCompletion,
    weightData = [],
    startWeight,
    endWeight,
    weightChange,
    weightTrend,
    avgWeight,
    goalWeight,
    periodsLogged,
    avgCycleLength,
    cycleRegularity,
    topSymptoms = [],
    mentalHealthAvg = {},
    avgOvulationScore,
    ovulationRegularity,
    fertileWindowsDetected,
    avgActivityLevel,
    avgSleepQuality,
    avgEnergyLevel,
    achievements = [],
    concerns = [],
    recommendations = [],
  } = monthlyReport;

  // Build the prompt
  let prompt = `Analyze this monthly health report for a woman with PCOS and provide comprehensive insights.

**MONTH:** ${monthId}
**TRACKING:** ${totalDaysTracked} days tracked (${trackingCompletion}% completion)

**WEIGHT JOURNEY:**
- Start Weight: ${startWeight || 'N/A'}kg
- End Weight: ${endWeight || 'N/A'}kg
- Change: ${weightChange > 0 ? '+' : ''}${weightChange || 'N/A'}kg (${weightTrend || 'unknown'})
- Average: ${avgWeight || 'N/A'}kg
- Goal: ${goalWeight || 'N/A'}kg
- Distance from Goal: ${
    goalWeight && endWeight ? Math.abs(goalWeight - endWeight).toFixed(1) : 'N/A'
  }kg

**MENSTRUAL CYCLE:**
- Periods Logged: ${periodsLogged || 0}
- Average Cycle Length: ${avgCycleLength || 'N/A'} days
- Regularity: ${cycleRegularity || 'unknown'}

**OVULATION:**
- Average Score: ${avgOvulationScore || 'N/A'}/10
- Fertile Windows Detected: ${fertileWindowsDetected || 0}
- Regularity: ${ovulationRegularity || 'unknown'}

**LIFESTYLE:**
- Activity Level: ${avgActivityLevel || 'N/A'}/5
- Sleep Quality: ${avgSleepQuality || 'N/A'}/5
- Energy Level: ${avgEnergyLevel || 'N/A'}/5

**SYMPTOMS:**`;

  if (topSymptoms.length > 0) {
    prompt += '\n';
    topSymptoms.forEach((symptom) => {
      prompt += `- ${symptom.name}: Severity ${symptom.avgSeverity.toFixed(1)}/10, Frequency ${
        symptom.frequency
      } weeks, Trend: ${symptom.trend}\n`;
    });
  } else {
    prompt += '\n- No symptoms tracked this month\n';
  }

  prompt += `\n**MENTAL HEALTH:**
- Anxiety: ${mentalHealthAvg.anxiety || 'N/A'}/10
- Depression: ${mentalHealthAvg.depression || 'N/A'}/10
- Mood Swings: ${mentalHealthAvg.moodSwings || 'N/A'}/10
`;

  // Add previous month comparison if available
  if (previousMonths.length > 0) {
    const previousMonth = previousMonths[0]; // Most recent previous month
    prompt += `\n**PREVIOUS MONTH COMPARISON:**
- Weight Change: ${previousMonth.weightChange || 'N/A'}kg → ${weightChange || 'N/A'}kg
- Tracking Completion: ${previousMonth.trackingCompletion || 'N/A'}% → ${trackingCompletion}%
- Cycle Regularity: ${previousMonth.cycleRegularity || 'N/A'} → ${cycleRegularity}
- Activity Level: ${previousMonth.avgActivityLevel || 'N/A'}/5 → ${avgActivityLevel}/5
`;
  }

  // Add user profile if available
  if (userProfile.age || userProfile.goals) {
    prompt += `\n**USER PROFILE:**`;
    if (userProfile.age) prompt += `\n- Age: ${userProfile.age}`;
    if (userProfile.goals) prompt += `\n- Goals: ${userProfile.goals}`;
  }

  // Add existing insights for context
  if (achievements.length > 0) {
    prompt += `\n\n**CURRENT ACHIEVEMENTS:**\n${achievements.map((a) => `- ${a}`).join('\n')}`;
  }

  if (concerns.length > 0) {
    prompt += `\n\n**CURRENT CONCERNS:**\n${concerns.map((c) => `- ${c}`).join('\n')}`;
  }

  prompt += `\n\n**ANALYSIS REQUEST:**
Please provide:
1. A comprehensive summary of this month's health journey
2. 3-5 key patterns you observe in the data
3. 2-3 predictions for next month based on current trends
4. 4-6 specific, actionable recommendations prioritized by impact
5. 3-5 key insights that stand out
6. An overall health score (1-10) for this month
7. Comparison to previous month if data is available

Focus on PCOS-specific insights related to:
- Weight management and insulin resistance
- Cycle regularity and hormonal balance
- Energy levels and metabolic health
- Mental health and stress management
- Sustainable lifestyle improvements

Be encouraging and supportive while providing honest, evidence-based guidance.`;

  return prompt;
}

/**
 * Generate insights for multiple months to identify long-term trends (with caching)
 * @param {string} userId - User ID
 * @param {Array<Object>} monthlyReports - Array of monthly reports
 * @param {Object} options - Optional configuration
 * @param {boolean} options.forceRegenerate - Skip cache and force new generation
 * @returns {Promise<Object>} AI-generated long-term insights
 */
export async function generateLongTermInsights(userId, monthlyReports, options = {}) {
  try {
    const { forceRegenerate = false } = options;

    if (!monthlyReports || monthlyReports.length === 0) {
      throw new Error('No monthly reports provided');
    }

    // Sort by date (most recent first)
    const sortedReports = monthlyReports.sort((a, b) => {
      return new Date(b.startDate) - new Date(a.startDate);
    });

    // Create cache key based on month count and latest month
    const cacheKey = `long-term-${sortedReports.length}m-${sortedReports[0].monthId}`;

    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await getCachedInsights(userId, cacheKey);
      if (cached) {
        console.log('Returning cached long-term insights');
        return {
          ...cached,
          fromCache: true,
        };
      }
    }

    console.log('Generating new long-term AI insights');

    // Build trend analysis prompt
    const prompt = buildLongTermTrendsPrompt(sortedReports);

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: getLongTermSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    const insights = {
      generatedAt: new Date().toISOString(),
      model: AI_MODEL,
      timeSpan: `${sortedReports.length} months`,
      summary: aiResponse.summary || '',
      longTermTrends: aiResponse.trends || [],
      progressAssessment: aiResponse.progressAssessment || {},
      strategicRecommendations: aiResponse.strategicRecommendations || [],
      milestones: aiResponse.milestones || [],
      tokensUsed: completion.usage.total_tokens,
      fromCache: false,
    };

    // Cache the insights for future requests
    await cacheInsights(userId, cacheKey, insights);

    return insights;
  } catch (error) {
    console.error('Error generating long-term insights:', error);
    throw new Error(`Failed to generate long-term insights: ${error.message}`);
  }
}

/**
 * System prompt for long-term trend analysis
 * @returns {string} System prompt
 */
function getLongTermSystemPrompt() {
  return `You are an expert PCOS health analyst specializing in long-term trend analysis. Your role is to identify patterns, progress, and strategic recommendations across multiple months of health tracking data.

Focus on:
1. Identifying long-term trends in weight, cycles, symptoms, and lifestyle
2. Assessing overall progress toward health goals
3. Detecting seasonal or cyclical patterns
4. Providing strategic, long-term recommendations
5. Celebrating sustained improvements
6. Identifying areas needing sustained focus

Response Format (JSON):
{
  "summary": "2-3 sentence overview of progress over time",
  "trends": [
    {
      "metric": "weight|cycles|symptoms|lifestyle",
      "direction": "improving|declining|stable",
      "description": "What's happening",
      "significance": "Why it matters"
    }
  ],
  "progressAssessment": {
    "overall": "excellent|good|fair|needs_attention",
    "strengths": ["Strength 1", "Strength 2"],
    "challenges": ["Challenge 1", "Challenge 2"],
    "momentum": "gaining|maintaining|losing"
  },
  "strategicRecommendations": [
    {
      "area": "Area to focus on",
      "strategy": "Long-term strategy",
      "rationale": "Why this matters long-term",
      "timeline": "Expected timeline for results"
    }
  ],
  "milestones": [
    {
      "achievement": "Milestone achieved",
      "month": "Month achieved",
      "impact": "Why it's significant"
    }
  ]
}`;
}

/**
 * Build prompt for long-term trend analysis
 * @param {Array<Object>} monthlyReports - Array of monthly reports
 * @returns {string} Prompt for long-term analysis
 */
function buildLongTermTrendsPrompt(monthlyReports) {
  let prompt = `Analyze ${monthlyReports.length} months of PCOS health tracking data and identify long-term trends, progress, and strategic recommendations.

**DATA OVERVIEW:**\n`;

  monthlyReports.forEach((report, index) => {
    prompt += `\n**MONTH ${monthlyReports.length - index}: ${report.monthId}**
- Weight Change: ${report.weightChange > 0 ? '+' : ''}${report.weightChange || 'N/A'}kg (${
      report.weightTrend || 'N/A'
    })
- Tracking Rate: ${report.trackingCompletion || 'N/A'}%
- Cycle Regularity: ${report.cycleRegularity || 'N/A'}
- Activity Level: ${report.avgActivityLevel || 'N/A'}/5
- Sleep Quality: ${report.avgSleepQuality || 'N/A'}/5
- Energy Level: ${report.avgEnergyLevel || 'N/A'}/5
- Top Symptoms: ${report.topSymptoms?.map((s) => s.name).join(', ') || 'None'}
- Mental Health (Anxiety): ${report.mentalHealthAvg?.anxiety || 'N/A'}/10
`;
  });

  prompt += `\n**ANALYSIS REQUEST:**
1. Identify 3-5 significant long-term trends
2. Assess overall progress (excellent/good/fair/needs attention)
3. List 3 key strengths and 3 key challenges
4. Provide 3-5 strategic recommendations for long-term success
5. Highlight any significant milestones achieved

Focus on sustainable, long-term PCOS management strategies.`;

  return prompt;
}

/**
 * Estimate cost of generating insights
 * @param {number} inputTokens - Estimated input tokens
 * @param {number} outputTokens - Estimated output tokens (default 1500)
 * @returns {number} Estimated cost in USD
 */
export function estimateInsightsCost(inputTokens, outputTokens = 1500) {
  // GPT-4o-mini pricing (as of Nov 2024)
  const INPUT_COST_PER_1K = 0.00015; // $0.15 per 1M tokens
  const OUTPUT_COST_PER_1K = 0.0006; // $0.60 per 1M tokens

  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  return inputCost + outputCost;
}

export default {
  generateMonthlyInsights,
  generateLongTermInsights,
  estimateInsightsCost,
};
