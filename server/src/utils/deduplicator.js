// server/src/utils/deduplicator.js
// Remove duplicate documents from retrieval results

import { Logger } from './logger.js';

const logger = new Logger('Deduplicator');

class Deduplicator {
  /**
   * Remove duplicate documents based on mealName + state
   * Special handling for "All States" - prefer state-specific versions
   * @param {Array} documents - Array of documents with metadata
   * @param {Object} options - Deduplication options
   * @returns {Array} - Deduplicated documents
   */
  deduplicateDocuments(documents, options = {}) {
    const {
      keyFields = ['mealName', 'state'], // Fields to check for duplicates
      keepFirst = true, // Keep first occurrence or best score
      logStats = true,
      handleAllStates = true, // Special handling for "All States"
    } = options;

    if (!documents || documents.length === 0) {
      return [];
    }

    const originalCount = documents.length;

    if (handleAllStates) {
      // ✅ ENHANCED: Smart deduplication with "All States" handling
      return this._deduplicateWithAllStatesHandling(documents, logStats);
    }

    // Original simple deduplication (fallback)
    const seen = new Map();
    const deduplicated = [];

    for (const doc of documents) {
      const metadata = doc.metadata || {};

      // Create unique key from specified fields
      const key = keyFields
        .map((field) => (metadata[field] || 'unknown').toString().toLowerCase().trim())
        .join('|');

      if (!seen.has(key)) {
        // First occurrence
        seen.set(key, doc);
        deduplicated.push(doc);
      } else {
        // Duplicate found
        if (!keepFirst) {
          // Replace if current doc has better score
          const existingDoc = seen.get(key);
          const existingScore = existingDoc.score || 0;
          const currentScore = doc.score || 0;

          if (currentScore > existingScore) {
            // Replace with better scoring document
            const index = deduplicated.indexOf(existingDoc);
            deduplicated[index] = doc;
            seen.set(key, doc);
          }
        }
        // If keepFirst=true, skip this duplicate
      }
    }

    const removedCount = originalCount - deduplicated.length;

    if (logStats && removedCount > 0) {
      logger.info(
        `Removed ${removedCount} duplicate documents (${originalCount} → ${deduplicated.length})`
      );

      // Show sample duplicates
      const duplicates = documents.filter((doc) => {
        const metadata = doc.metadata || {};
        const key = keyFields
          .map((field) => (metadata[field] || 'unknown').toString().toLowerCase().trim())
          .join('|');
        return seen.get(key) !== doc;
      });

      if (duplicates.length > 0 && duplicates.length <= 3) {
        logger.info(`Sample duplicates removed:`);
        duplicates.forEach((doc, idx) => {
          const metadata = doc.metadata || {};
          logger.info(
            `  ${idx + 1}. ${metadata.mealName || 'Unknown'} (${metadata.state || 'Unknown state'})`
          );
        });
      }
    }

    return deduplicated;
  }

  /**
   * Smart deduplication with "All States" handling
   * Priority: State-specific > All States
   */
  _deduplicateWithAllStatesHandling(documents, logStats = true) {
    const originalCount = documents.length;

    // Group by normalized meal name (case-insensitive, trimmed)
    const mealGroups = new Map();

    for (const doc of documents) {
      const metadata = doc.metadata || {};
      const mealName = (metadata.mealName || 'unknown').toString().toLowerCase().trim();

      if (!mealGroups.has(mealName)) {
        mealGroups.set(mealName, []);
      }
      mealGroups.get(mealName).push(doc);
    }

    const deduplicated = [];
    let allStatesPreferred = 0;
    let stateSpecificPreferred = 0;

    // Process each meal group
    for (const [mealName, docs] of mealGroups) {
      if (docs.length === 1) {
        // No duplicates for this meal
        deduplicated.push(docs[0]);
        continue;
      }

      // Separate "All States" from state-specific
      const allStatesDocs = docs.filter((doc) => {
        const state = (doc.metadata?.state || '').toLowerCase();
        return state === 'all states' || state === 'all';
      });

      const stateSpecificDocs = docs.filter((doc) => {
        const state = (doc.metadata?.state || '').toLowerCase();
        return state !== 'all states' && state !== 'all' && state !== '';
      });

      // Decision logic:
      if (stateSpecificDocs.length > 0) {
        // Prefer state-specific versions
        // Keep all unique state-specific versions (different states)
        const statesSeen = new Map();

        for (const doc of stateSpecificDocs) {
          const state = (doc.metadata?.state || 'unknown').toLowerCase();

          if (!statesSeen.has(state)) {
            statesSeen.set(state, doc);
            deduplicated.push(doc);
          } else {
            // Same meal, same state - keep best score
            const existing = statesSeen.get(state);
            if ((doc.score || 0) > (existing.score || 0)) {
              const index = deduplicated.indexOf(existing);
              deduplicated[index] = doc;
              statesSeen.set(state, doc);
            }
          }
        }

        stateSpecificPreferred += stateSpecificDocs.length;

        // Skip "All States" versions (we have state-specific ones)
        if (allStatesDocs.length > 0 && logStats) {
          logger.info(`  ✅ Preferred state-specific "${mealName}" over "All States" version`);
        }
      } else if (allStatesDocs.length > 0) {
        // No state-specific versions, keep best "All States" version
        const bestAllStates = allStatesDocs.reduce((best, doc) =>
          (doc.score || 0) > (best.score || 0) ? doc : best
        );
        deduplicated.push(bestAllStates);
        allStatesPreferred++;
      } else {
        // No state info - keep all (shouldn't happen with good data)
        deduplicated.push(...docs);
      }
    }

    const removedCount = originalCount - deduplicated.length;

    if (logStats && removedCount > 0) {
      logger.info(
        `Removed ${removedCount} duplicate documents (${originalCount} → ${deduplicated.length})`
      );
      logger.info(`  State-specific preferred: ${stateSpecificPreferred} meals`);
      if (allStatesPreferred > 0) {
        logger.info(`  "All States" kept (no specific version): ${allStatesPreferred} meals`);
      }
    }

    return deduplicated;
  }

  /**
   * Remove duplicates from multiple document arrays
   * Useful for multi-stage retrieval
   */
  deduplicateMultiStage(documentArrays, options = {}) {
    // Flatten all arrays
    const allDocuments = documentArrays.flat();

    // Deduplicate
    return this.deduplicateDocuments(allDocuments, options);
  }

  /**
   * Get deduplication statistics
   */
  getStats(documents, keyFields = ['mealName', 'state']) {
    const seen = new Map();
    let duplicateCount = 0;

    for (const doc of documents) {
      const metadata = doc.metadata || {};
      const key = keyFields
        .map((field) => (metadata[field] || 'unknown').toString().toLowerCase().trim())
        .join('|');

      if (seen.has(key)) {
        duplicateCount++;
      } else {
        seen.set(key, true);
      }
    }

    return {
      totalDocuments: documents.length,
      uniqueDocuments: seen.size,
      duplicateDocuments: duplicateCount,
      duplicationRate: ((duplicateCount / documents.length) * 100).toFixed(1) + '%',
    };
  }
}

export const deduplicator = new Deduplicator();
export default deduplicator;
