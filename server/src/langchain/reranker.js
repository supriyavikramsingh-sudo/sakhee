// server/src/langchain/reranker.js
import { Logger } from '../utils/logger.js';

const logger = new Logger('HybridReRanker');

/**
 * Hybrid Re-Ranking System
 *
 * Combines semantic similarity (from vector search) with feature-based scoring
 * to improve meal recommendation quality beyond pure semantic matching.
 *
 * Features scored:
 * - Nutritional alignment (protein, carbs, fiber, GI)
 * - Budget constraints
 * - Preparation time
 *
 * Dynamic weights based on query intent:
 * - "high protein" → boost protein weight
 * - "quick meals" → boost time weight
 * - "budget friendly" → boost budget weight
 * - Keto mode → boost low-carb weight
 */
export class HybridReRanker {
  constructor(config = {}) {
    this.config = {
      // Default feature weights (sum should be 1.0)
      defaultWeights: {
        semantic: 0.4, // Semantic similarity from vector search
        protein: 0.15, // Protein content alignment
        carbs: 0.1, // Carb content alignment (context-dependent)
        gi: 0.2, // Glycemic index preference
        budget: 0.1, // Budget alignment
        time: 0.05, // Prep time alignment
      },

      // Target ranges for scoring
      targetProtein: 25, // Target protein per meal (grams)
      targetCarbs: 45, // Target carbs for normal diet (grams)
      ketoMaxCarbs: 15, // Max carbs for keto (grams)
      maxPrepTime: 45, // Default max prep time (minutes)

      // Score normalization parameters
      proteinRange: [0, 40], // Min/max protein for normalization
      carbRange: [0, 60], // Min/max carbs for normalization
      budgetRange: [20, 500], // Min/max budget for normalization
      timeRange: [10, 60], // Min/max time for normalization

      ...config,
    };

    logger.info('HybridReRanker initialized', {
      defaultWeights: this.config.defaultWeights,
    });
  }

  /**
   * Re-rank documents using hybrid scoring
   *
   * @param {Array} docs - Documents from vector search (with .score)
   * @param {string} query - Original search query
   * @param {Object} userPreferences - User preferences and constraints
   * @returns {Array} Re-ranked documents with scores
   */
  reRank(docs, query, userPreferences = {}) {
    if (!docs || docs.length === 0) {
      logger.warn('No documents to re-rank');
      return [];
    }

    logger.info(`Re-ranking ${docs.length} documents`, {
      query: query.substring(0, 50),
      isKeto: userPreferences.isKeto || false,
      budget: userPreferences.budget,
    });

    // Detect query intent and get dynamic weights
    const weights = this.getFeatureWeights(query, userPreferences);

    logger.debug('Feature weights', weights);

    // Score each document
    const scored = docs.map((doc) => {
      const features = this.extractFeatures(doc);
      const featureScores = this.scoreFeatures(features, userPreferences);
      const combinedScore = this.computeCombinedScore(featureScores, weights);

      return {
        ...doc,
        originalScore: doc.score || 0,
        reRankScore: combinedScore,
        features,
        featureScores,
        weights,
      };
    });

    // Sort by re-rank score (descending)
    scored.sort((a, b) => b.reRankScore - a.reRankScore);

    // Log top results for debugging
    if (scored.length > 0) {
      const top = scored[0];
      logger.info('Top re-ranked result', {
        mealName: top.metadata?.mealName || 'Unknown',
        originalScore: top.originalScore.toFixed(3),
        reRankScore: top.reRankScore.toFixed(3),
        improvement: ((top.reRankScore - top.originalScore) * 100).toFixed(1) + '%',
        topFeatures: Object.entries(top.featureScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, score]) => `${name}:${score.toFixed(2)}`),
      });
    }

    return scored;
  }

  /**
   * Extract features from document metadata
   */
  extractFeatures(doc) {
    const metadata = doc.metadata || {};

    return {
      // Nutritional features
      protein: this.parseNumber(metadata.protein, 0),
      carbs: this.parseNumber(metadata.carbs, 0),
      fats: this.parseNumber(metadata.fats, 0),
      fiber: this.parseNumber(metadata.fiber, 0),
      calories: this.parseNumber(metadata.calories, 0),

      // GI level
      gi: this.normalizeGI(metadata.gi),

      // Practical constraints
      budgetMin: this.parseNumber(metadata.budgetMin, 0),
      budgetMax: this.parseNumber(metadata.budgetMax, 999),
      prepTime: this.parsePrepTime(metadata.prepTime),

      // Semantic similarity (from vector search)
      semanticScore: doc.score || 0,

      // Metadata
      mealName: metadata.mealName || 'Unknown',
      state: metadata.state || 'Unknown',
      dietType: metadata.dietType || 'Unknown',
    };
  }

  /**
   * Score each feature (normalize to 0-1 range)
   */
  scoreFeatures(features, userPreferences = {}) {
    const scores = {};

    // Semantic score (already 0-1 from vector search)
    scores.semantic = Math.max(0, Math.min(1, features.semanticScore));

    // Protein score (higher is better, up to target)
    scores.protein = this.scoreProtein(features.protein, userPreferences);

    // Carb score (context-dependent: keto vs normal)
    scores.carbs = this.scoreCarbs(features.carbs, userPreferences);

    // GI score (Low=1.0, Medium=0.7, High=0.3)
    scores.gi = this.scoreGI(features.gi);

    // Budget score (within user budget is good)
    scores.budget = this.scoreBudget(features.budgetMax, userPreferences.budget);

    // Time score (shorter prep time is better, up to max)
    scores.time = this.scoreTime(features.prepTime, userPreferences.maxPrepTime);

    return scores;
  }

  /**
   * Score protein content
   * Higher protein is better, up to target (25g default)
   */
  scoreProtein(protein, prefs = {}) {
    const target = prefs.targetProtein || this.config.targetProtein;
    const [min, max] = this.config.proteinRange;

    // Normalize to 0-1
    const normalized = Math.max(0, Math.min(1, (protein - min) / (max - min)));

    // Bonus for hitting target
    const targetBonus = protein >= target ? 0.2 : 0;

    return Math.min(1.0, normalized + targetBonus);
  }

  /**
   * Score carb content (context-dependent)
   * Keto: lower is better (< 15g = 1.0, > 50g = 0)
   * Normal: moderate is best (30-50g = 1.0, very high/low = penalty)
   */
  scoreCarbs(carbs, prefs = {}) {
    if (prefs.isKeto) {
      // Keto: Lower carbs = higher score
      const maxCarbs = prefs.ketoMaxCarbs || this.config.ketoMaxCarbs;
      return Math.max(0, 1 - carbs / (maxCarbs * 3));
    } else {
      // Normal: Moderate carbs = higher score
      const target = prefs.targetCarbs || this.config.targetCarbs;
      const distance = Math.abs(carbs - target);
      return Math.max(0, 1 - distance / target);
    }
  }

  /**
   * Score GI level
   * Low GI is preferred for PCOS
   */
  scoreGI(gi) {
    const giScores = {
      Low: 1.0,
      Medium: 0.7,
      High: 0.3,
    };

    return giScores[gi] || 0.5;
  }

  /**
   * Score budget alignment
   * Within budget = 1.0, over budget = penalty
   */
  scoreBudget(budgetMax, userBudget) {
    if (!userBudget || userBudget <= 0) {
      return 1.0; // No budget constraint
    }

    if (budgetMax <= userBudget) {
      return 1.0; // Within budget
    }

    // Over budget: linear penalty
    const overage = budgetMax - userBudget;
    const penalty = overage / userBudget;

    return Math.max(0, 1 - penalty);
  }

  /**
   * Score prep time
   * Shorter is better, up to max time
   */
  scoreTime(prepTime, maxTime) {
    if (!maxTime || maxTime <= 0) {
      return 1.0; // No time constraint
    }

    if (prepTime <= maxTime) {
      // Within limit: shorter is better
      return 1.0 - (prepTime / maxTime) * 0.3;
    }

    // Over limit: penalty
    const overage = prepTime - maxTime;
    const penalty = overage / maxTime;

    return Math.max(0, 0.7 - penalty);
  }

  /**
   * Compute combined score using weighted sum
   */
  computeCombinedScore(featureScores, weights) {
    let combinedScore = 0;

    for (const [feature, score] of Object.entries(featureScores)) {
      const weight = weights[feature] || 0;
      combinedScore += score * weight;
    }

    return combinedScore;
  }

  /**
   * Get dynamic feature weights based on query intent and user preferences
   */
  getFeatureWeights(query, userPreferences = {}) {
    // Start with default weights
    const weights = { ...this.config.defaultWeights };

    const queryLower = query.toLowerCase();

    // Detect query intent and adjust weights
    // Use if-else to ensure only the primary intent is applied
    // Use word boundaries to avoid false matches (e.g., "breakfast" shouldn't match "fast")

    // High protein intent (most specific, check first)
    if (queryLower.includes('high protein') || queryLower.includes('protein-rich')) {
      logger.debug('Detected high-protein intent');
      weights.protein = 0.3;
      weights.semantic = 0.3;
      weights.gi = 0.15;
      weights.carbs = 0.1;
      weights.budget = 0.1;
      weights.time = 0.05;
    }
    // Quick meal intent (use word boundaries to avoid "breakfast" matching "fast")
    else if (/\b(quick|fast|easy)\b/.test(queryLower)) {
      logger.debug('Detected quick-meal intent');
      weights.time = 0.2;
      weights.semantic = 0.3;
      weights.protein = 0.15;
      weights.gi = 0.15;
      weights.carbs = 0.1;
      weights.budget = 0.1;
    }
    // Budget intent
    else if (
      queryLower.includes('budget') ||
      queryLower.includes('cheap') ||
      queryLower.includes('affordable') ||
      queryLower.includes('low cost')
    ) {
      logger.debug('Detected budget intent');
      weights.budget = 0.25;
      weights.semantic = 0.3;
      weights.protein = 0.15;
      weights.gi = 0.15;
      weights.carbs = 0.1;
      weights.time = 0.05;
    }
    // Low GI intent
    else if (
      queryLower.includes('low gi') ||
      queryLower.includes('low glycemic') ||
      queryLower.includes('blood sugar')
    ) {
      logger.debug('Detected low-GI intent');
      weights.gi = 0.3;
      weights.semantic = 0.3;
      weights.protein = 0.15;
      weights.carbs = 0.1;
      weights.budget = 0.1;
      weights.time = 0.05;
    }
    // Generic protein intent (less specific than "high protein")
    else if (queryLower.includes('protein')) {
      logger.debug('Detected protein intent');
      weights.protein = 0.25;
      weights.semantic = 0.35;
      weights.gi = 0.15;
      weights.carbs = 0.1;
      weights.budget = 0.1;
      weights.time = 0.05;
    }

    // Keto mode (can combine with above intents)
    if (userPreferences.isKeto) {
      logger.debug('Keto mode active - boosting carb weight');
      weights.carbs = 0.25; // High weight for low-carb selection
      weights.protein = 0.2;
      weights.semantic = 0.25;
      weights.gi = 0.15;
      weights.budget = 0.1;
      weights.time = 0.05;
    }

    // Normalize weights to ensure they sum to 1.0
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      logger.warn(`Weights don't sum to 1.0 (sum=${sum.toFixed(3)}), normalizing`);
      for (const key in weights) {
        weights[key] = weights[key] / sum;
      }
    }

    return weights;
  }

  // ===== HELPER METHODS =====

  /**
   * Parse number from string or return default
   */
  parseNumber(value, defaultValue = 0) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * Parse prep time from string like "25 mins" or "30-45 mins"
   */
  parsePrepTime(timeStr) {
    if (!timeStr) return 30; // Default 30 mins

    if (typeof timeStr === 'number') return timeStr;

    // Try to extract first number
    const match = timeStr.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }

    return 30; // Default
  }

  /**
   * Normalize GI string to standard format
   */
  normalizeGI(gi) {
    if (!gi) return 'Medium';

    const giStr = String(gi).toLowerCase();

    if (giStr.includes('low')) return 'Low';
    if (giStr.includes('high')) return 'High';

    return 'Medium';
  }

  /**
   * Get statistics about re-ranking performance
   */
  getStats(originalDocs, rerankedDocs) {
    if (!originalDocs || !rerankedDocs || originalDocs.length === 0 || rerankedDocs.length === 0) {
      return null;
    }

    // Calculate average score improvement
    let totalImprovement = 0;
    let changedPositions = 0;

    for (let i = 0; i < Math.min(10, rerankedDocs.length); i++) {
      const reranked = rerankedDocs[i];
      const originalIdx = originalDocs.findIndex(
        (d) => d.metadata?.mealName === reranked.metadata?.mealName
      );

      if (originalIdx !== -1 && originalIdx !== i) {
        changedPositions++;
      }

      const improvement = reranked.reRankScore - reranked.originalScore;
      totalImprovement += improvement;
    }

    return {
      totalDocs: rerankedDocs.length,
      changedPositions,
      avgImprovement: (totalImprovement / Math.min(10, rerankedDocs.length)).toFixed(3),
      topScores: rerankedDocs.slice(0, 5).map((d) => ({
        name: d.metadata?.mealName || 'Unknown',
        original: d.originalScore.toFixed(3),
        reranked: d.reRankScore.toFixed(3),
      })),
    };
  }
}
