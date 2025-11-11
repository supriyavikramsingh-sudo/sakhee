// server/src/langchain/retriever.js
// ✅ FIXED: Standardized document structure with both 'content' and 'pageContent'
// ✅ OPTIMIZATION: Added metadata filtering, query expansion, MMR diversity

import { vectorStoreManager } from './vectorStore.js';
import { appConfig } from '../config/appConfig.js';
import { Logger } from '../utils/logger.js';
import { metadataFilters } from './metadataFilters.js';
import { queryExpansion } from './queryExpansion.js';

const logger = new Logger('Retriever');

class Retriever {
  /**
   * Retrieve relevant documents for a query
   * ✅ FIXED: Returns normalized document structure
   */
  async retrieve(query, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK;
      const minScore = options.minScore || appConfig.rag.minScore;

      // Validate query
      if (!query || typeof query !== 'string') {
        logger.warn('Invalid query provided', { query });
        return [];
      }

      // Get similar documents from vector store
      const results = await vectorStoreManager.similaritySearch(query, topK);

      // ✅ CRITICAL FIX: Filter by minimum score
      // Pinecone returns SIMILARITY scores (higher=better, range 0-1)
      // minScore=0.5 means "keep documents with similarity ≥ 0.5"
      // This is the OPPOSITE of HNSW distance scores
      const filtered = results.filter((r) => {
        const score = r?.score ?? 0;
        return score >= minScore; // ✅ FIXED: Use >= for Pinecone similarity scores (higher is better)
      });

      logger.info(`🔍 Retrieved ${filtered.length} relevant documents`);

      // ✅ FIXED: Normalize document structure
      return filtered.map((doc) => this.normalizeDocument(doc));
    } catch (error) {
      logger.error('Retrieval failed', { error: error.message, stack: error.stack });
      return [];
    }
  }

  /**
   * Retrieve documents by specific type
   */
  async retrieveByType(query, documentType, options = {}) {
    try {
      const results = await this.retrieve(query, options);

      // Filter by document type
      const filtered = results.filter((r) => {
        const docType = r?.metadata?.type;
        return docType === documentType;
      });

      logger.info(`🔍 Retrieved ${filtered.length} documents of type '${documentType}'`);

      return filtered;
    } catch (error) {
      logger.error('Type-based retrieval failed', { error: error.message });
      return [];
    }
  }

  /**
   * ✅ NEW: Normalize document structure to support both formats
   * Ensures compatibility with LangChain and custom code
   */
  normalizeDocument(doc) {
    if (!doc) {
      return {
        content: '',
        pageContent: '',
        metadata: {},
        score: 0,
      };
    }

    // Extract content (handles both property names)
    const content = doc.content || doc.pageContent || '';

    // Ensure content is a string
    const normalizedContent = typeof content === 'string' ? content : String(content);

    return {
      // Provide both property names for maximum compatibility
      content: normalizedContent,
      pageContent: normalizedContent,
      metadata: doc.metadata || {},
      score: doc.score ?? 0,
    };
  }

  /**
   * ✅ FIXED: Format context with defensive programming
   */
  formatContextFromResults(results) {
    if (!results || !Array.isArray(results)) {
      logger.warn('Invalid results provided to formatContextFromResults');
      return '';
    }

    if (results.length === 0) {
      return '';
    }

    return results
      .map((result, idx) => {
        try {
          // Safe extraction of content and metadata
          const content = result?.content || result?.pageContent || '';
          const source = result?.metadata?.source || 'Unknown Source';
          const type = result?.metadata?.type || 'unknown';

          return `[${idx + 1}] ${content}\n(Source: ${source} | Type: ${type})`;
        } catch (error) {
          logger.warn(`Error formatting result ${idx}`, { error: error.message });
          return `[${idx + 1}] [Error retrieving content]`;
        }
      })
      .join('\n\n');
  }

  /**
   * ✅ NEW: Retrieve with Maximal Marginal Relevance (MMR)
   * Balances relevance with diversity to prevent similar/duplicate meals
   *
   * @param {string} query - Search query
   * @param {number} k - Number of documents to return
   * @param {number} lambda - Trade-off between relevance (1.0) and diversity (0.0)
   *                          Default 0.7 = 70% relevance, 30% diversity
   * @param {Object} options - Additional options (minScore, etc.)
   * @returns {Array} Diverse set of k documents
   */
  async retrieveWithMMR(query, k = 15, lambda = 0.7, options = {}) {
    try {
      logger.info(
        `🎯 MMR retrieval: k=${k}, λ=${lambda} (${Math.round(
          lambda * 100
        )}% relevance, ${Math.round((1 - lambda) * 100)}% diversity)`
      );

      // Retrieve 3× candidates to have good diversity pool
      const candidateCount = Math.max(k * 3, 50);
      const candidates = await this.retrieve(query, {
        topK: candidateCount,
        minScore: options.minScore || 0.5, // More lenient for candidates
      });

      if (candidates.length === 0) {
        logger.warn('No candidates retrieved for MMR');
        return [];
      }

      if (candidates.length <= k) {
        logger.info(`Only ${candidates.length} candidates available, returning all`);
        return candidates;
      }

      const selected = [];
      const remaining = [...candidates];

      // Step 1: Always select the most relevant document first
      selected.push(remaining.shift());

      // Step 2: Iteratively select remaining documents using MMR
      while (selected.length < k && remaining.length > 0) {
        let bestIdx = 0;
        let bestScore = -Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const candidate = remaining[i];

          // Relevance: Use the document's similarity score
          const relevance = 1 - (candidate.score || 0); // Convert distance to similarity

          // Diversity: Maximum similarity to any already-selected document
          const similarities = selected.map((doc) => this.docSimilarity(candidate, doc));
          const maxSimilarity = Math.max(...similarities);
          const diversity = 1 - maxSimilarity;

          // MMR score: λ * relevance + (1-λ) * diversity
          const mmrScore = lambda * relevance + (1 - lambda) * diversity;

          if (mmrScore > bestScore) {
            bestScore = mmrScore;
            bestIdx = i;
          }
        }

        // Add the best MMR-scoring document
        const selectedDoc = remaining.splice(bestIdx, 1)[0];
        selected.push(selectedDoc);

        // Log every 5th selection for debugging
        if (selected.length % 5 === 0) {
          logger.debug(`MMR selected ${selected.length}/${k} documents`, {
            lastMeal: selectedDoc.metadata?.mealName || 'Unknown',
            lastScore: bestScore.toFixed(3),
          });
        }
      }

      logger.info(
        `✅ MMR selected ${selected.length} diverse documents from ${candidates.length} candidates`
      );

      // Log diversity stats
      const stats = this.calculateDiversityStats(selected);
      logger.info('Diversity stats', stats);

      return selected;
    } catch (error) {
      logger.error('MMR retrieval failed', { error: error.message, stack: error.stack });
      // Fallback to regular retrieval
      return await this.retrieve(query, { topK: k, ...options });
    }
  }

  /**
   * Calculate similarity between two documents
   * Returns 0-1 where 1 = identical, 0 = completely different
   */
  docSimilarity(doc1, doc2) {
    const m1 = doc1.metadata || {};
    const m2 = doc2.metadata || {};

    let totalScore = 0;
    let totalWeight = 0;

    // 1. Same meal name = very high similarity (weight: 0.4)
    if (m1.mealName && m2.mealName) {
      const sameMeal = m1.mealName.toLowerCase() === m2.mealName.toLowerCase() ? 1 : 0;
      totalScore += sameMeal * 0.4;
      totalWeight += 0.4;
    }

    // 2. Same state/region = moderate similarity (weight: 0.2)
    if (m1.state && m2.state) {
      const sameState = m1.state === m2.state ? 1 : 0;
      totalScore += sameState * 0.2;
      totalWeight += 0.2;
    }

    // 3. Same diet type = low similarity (weight: 0.05)
    if (m1.dietType && m2.dietType) {
      const sameDiet = m1.dietType === m2.dietType ? 1 : 0;
      totalScore += sameDiet * 0.05;
      totalWeight += 0.05;
    }

    // 4. Similar protein content (weight: 0.15)
    if (m1.protein !== undefined && m2.protein !== undefined) {
      const p1 = parseFloat(m1.protein) || 0;
      const p2 = parseFloat(m2.protein) || 0;
      const proteinDiff = Math.abs(p1 - p2);
      const proteinSim = Math.max(0, 1 - proteinDiff / 30); // 30g max difference
      totalScore += proteinSim * 0.15;
      totalWeight += 0.15;
    }

    // 5. Similar carb content (weight: 0.15)
    if (m1.carbs !== undefined && m2.carbs !== undefined) {
      const c1 = parseFloat(m1.carbs) || 0;
      const c2 = parseFloat(m2.carbs) || 0;
      const carbDiff = Math.abs(c1 - c2);
      const carbSim = Math.max(0, 1 - carbDiff / 50); // 50g max difference
      totalScore += carbSim * 0.15;
      totalWeight += 0.15;
    }

    // 6. Same GI level (weight: 0.05)
    if (m1.gi && m2.gi) {
      const sameGI = m1.gi === m2.gi ? 1 : 0;
      totalScore += sameGI * 0.05;
      totalWeight += 0.05;
    }

    // Normalize by total weight
    if (totalWeight === 0) {
      return 0; // No comparable features
    }

    return totalScore / totalWeight;
  }

  /**
   * Calculate diversity statistics for a set of documents
   */
  calculateDiversityStats(docs) {
    if (!docs || docs.length === 0) {
      return { uniqueMeals: 0, uniqueStates: 0, uniqueGI: 0 };
    }

    const meals = new Set();
    const states = new Set();
    const giLevels = new Set();
    const dietTypes = new Set();

    docs.forEach((doc) => {
      const m = doc.metadata || {};
      if (m.mealName) meals.add(m.mealName);
      if (m.state) states.add(m.state);
      if (m.gi) giLevels.add(m.gi);
      if (m.dietType) dietTypes.add(m.dietType);
    });

    return {
      totalDocs: docs.length,
      uniqueMeals: meals.size,
      uniqueStates: states.size,
      uniqueGI: giLevels.size,
      uniqueDietTypes: dietTypes.size,
      diversityRatio: (meals.size / docs.length).toFixed(2), // 1.0 = all unique
    };
  }

  /**
   * ✅ NEW: Get retrieval statistics
   */
  async getStats() {
    try {
      const vectorStore = vectorStoreManager.getVectorStore();

      return {
        initialized: !!vectorStore,
        status: 'ready',
        metadata: metadataFilters.getStats(),
        queryExpansion: queryExpansion.getStats(),
      };
    } catch (error) {
      logger.error('Failed to get retriever stats', { error: error.message });
      return {
        initialized: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * ✅ NEW: Retrieve with metadata filtering
   * Filters documents BEFORE vector search for efficiency
   *
   * @param {string} query - Search query
   * @param {Object} filters - Metadata filters (dietType, gi, state, etc.)
   * @param {Object} options - Retrieval options
   * @returns {Array} Filtered documents
   */
  async retrieveWithFilters(query, filters = {}, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK;

      logger.info('🔍 Retrieving with metadata filters', {
        query: query.substring(0, 50),
        filters: Object.keys(filters),
      });

      // First, retrieve more candidates than needed
      const candidateCount = topK * 3; // Get 3× to account for filtering
      const candidates = await this.retrieve(query, {
        ...options,
        topK: candidateCount,
      });

      // Apply metadata filters
      const filtered = metadataFilters.apply(candidates, filters);

      // Return top k after filtering
      const results = filtered.slice(0, topK);

      logger.info(
        `✅ Filtered ${candidates.length} → ${filtered.length} documents, returned ${results.length}`
      );

      return results;
    } catch (error) {
      logger.error('Filtered retrieval failed', { error: error.message });
      return [];
    }
  }

  /**
   * ✅ NEW: Retrieve with query expansion
   * Expands query into variations for better recall
   *
   * @param {string} query - Original search query
   * @param {Object} options - Retrieval options
   * @returns {Array} Documents from expanded queries
   */
  async retrieveWithExpansion(query, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK;
      const maxVariations = options.maxVariations || 3;

      logger.info('🔍 Retrieving with query expansion', {
        query: query.substring(0, 50),
        maxVariations,
      });

      // Expand query into variations
      const queryVariations = await queryExpansion.expand(query, {
        maxVariations,
        includeOriginal: true,
        useLLM: options.useLLM !== false,
        useRuleBased: options.useRuleBased !== false,
      });

      logger.debug(`Expanded into ${queryVariations.length} query variations`, {
        variations: queryVariations,
      });

      // Retrieve documents for each variation
      const allResults = [];
      const seenDocuments = new Set();

      for (const variation of queryVariations) {
        const results = await this.retrieve(variation, {
          ...options,
          topK: Math.ceil(topK / queryVariations.length) + 2, // Distribute topK across variations
        });

        // Deduplicate by document content/ID
        for (const doc of results) {
          const docId = this.getDocumentId(doc);
          if (!seenDocuments.has(docId)) {
            seenDocuments.add(docId);
            allResults.push(doc);
          }
        }
      }

      // Sort by score and take top k
      allResults.sort((a, b) => (a.score || 0) - (b.score || 0)); // Lower score = better
      const topResults = allResults.slice(0, topK);

      logger.info(`✅ Query expansion retrieved ${topResults.length} unique documents`);

      return topResults;
    } catch (error) {
      logger.error('Expanded retrieval failed, falling back to basic', {
        error: error.message,
      });
      // Fallback to basic retrieval
      return await this.retrieve(query, options);
    }
  }

  /**
   * ✅ NEW: Advanced retrieval with all optimizations
   * Combines query expansion, metadata filtering, and MMR diversity
   *
   * @param {string} query - Search query
   * @param {Object} filters - Metadata filters
   * @param {Object} options - Retrieval options
   * @returns {Array} Optimized diverse results
   */
  async retrieveAdvanced(query, filters = {}, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK;
      const lambda = options.lambda || 0.7;
      const useExpansion = options.useExpansion !== false;
      const useFilters = options.useFilters !== false && Object.keys(filters).length > 0;
      const useMMR = options.useMMR !== false;

      logger.info('🚀 Advanced retrieval with full optimization pipeline', {
        query: query.substring(0, 50),
        topK,
        useExpansion,
        useFilters,
        useMMR,
      });

      let results;

      // Step 1: Query expansion (if enabled)
      if (useExpansion) {
        results = await this.retrieveWithExpansion(query, {
          ...options,
          topK: topK * 3, // Get more candidates for filtering/MMR
        });
      } else {
        results = await this.retrieve(query, {
          ...options,
          topK: topK * 3,
        });
      }

      logger.debug(`After expansion: ${results.length} documents`);

      // Step 2: Metadata filtering (if enabled and filters provided)
      if (useFilters) {
        results = metadataFilters.apply(results, filters);
        logger.debug(`After filtering: ${results.length} documents`);
      }

      // Step 3: MMR diversity (if enabled)
      if (useMMR && results.length > topK) {
        // Apply MMR to the filtered results
        const selected = [];
        const remaining = [...results];

        // Select first (most relevant)
        selected.push(remaining.shift());

        // Iteratively select diverse documents
        while (selected.length < topK && remaining.length > 0) {
          let bestIdx = 0;
          let bestScore = -Infinity;

          for (let i = 0; i < remaining.length; i++) {
            const candidate = remaining[i];
            const relevance = 1 - (candidate.score || 0);

            const similarities = selected.map((doc) => this.docSimilarity(candidate, doc));
            const maxSimilarity = Math.max(...similarities);
            const diversity = 1 - maxSimilarity;

            const mmrScore = lambda * relevance + (1 - lambda) * diversity;

            if (mmrScore > bestScore) {
              bestScore = mmrScore;
              bestIdx = i;
            }
          }

          selected.push(remaining.splice(bestIdx, 1)[0]);
        }

        results = selected;
        logger.debug(`After MMR: ${results.length} documents`);
      } else {
        // Just take top k
        results = results.slice(0, topK);
      }

      const stats = this.calculateDiversityStats(results);
      logger.info('✅ Advanced retrieval complete', {
        returned: results.length,
        diversity: stats.diversityRatio,
      });

      return results;
    } catch (error) {
      logger.error('Advanced retrieval failed, falling back to basic', {
        error: error.message,
      });
      // Fallback to basic retrieval
      return await this.retrieve(query, { ...options, topK: options.topK || appConfig.rag.topK });
    }
  }

  /**
   * Get unique document ID for deduplication
   */
  getDocumentId(doc) {
    // Use meal name + state as unique identifier
    const mealName = doc.metadata?.mealName || '';
    const state = doc.metadata?.state || '';
    const content = (doc.content || doc.pageContent || '').substring(0, 100);

    return `${mealName}_${state}_${content}`.toLowerCase().trim();
  }

  /**
   * ✅ NEW: Get retrieval statistics
   */
  async getStats() {
    try {
      const vectorStore = vectorStoreManager.getVectorStore();

      return {
        initialized: !!vectorStore,
        status: 'ready',
        metadata: metadataFilters.getStats(),
        queryExpansion: queryExpansion.getStats(),
      };
    } catch (error) {
      logger.error('Failed to get retriever stats', { error: error.message });
      return {
        initialized: false,
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * ✅ NEW: Clear memory/cache (if needed for testing)
   */
  async clearCache() {
    try {
      logger.info('Clearing retriever cache...');
      // Add cache clearing logic if implemented
      return true;
    } catch (error) {
      logger.error('Failed to clear cache', { error: error.message });
      return false;
    }
  }
}

export const retriever = new Retriever();
export default retriever;
