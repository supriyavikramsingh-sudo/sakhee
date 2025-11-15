// server/src/services/firebaseCacheService.js
// This service provides persistent caching in Firestore for Reddit & Spoonacular data
// Note: SERP cache methods are deprecated but kept for backward compatibility
// Replace in-memory caching in production

import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Logger } from '../utils/logger.js';

const logger = new Logger('FirebaseCacheService');

class FirebaseCacheService {
  constructor() {
    this.collections = {
      redditInsights: 'community_insights',
      nutritionData: 'nutrition_data',
      serpResults: 'serp_cache',
    };

    this.ttl = {
      reddit: 7 * 24 * 60 * 60 * 1000, // 7 days
      nutrition: 30 * 24 * 60 * 60 * 1000, // 30 days
      serp: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  /**
   * Cache Reddit insights in Firestore
   */
  async cacheRedditInsights(topic, timeFilter, insights) {
    try {
      const cacheKey = `${topic || 'general'}_${timeFilter}`;
      const docRef = doc(db, this.collections.redditInsights, cacheKey);

      await setDoc(docRef, {
        topic,
        timeFilter,
        insights,
        cachedAt: serverTimestamp(),
        expiresAt: Date.now() + this.ttl.reddit,
      });

      logger.info('Reddit insights cached', { cacheKey, count: insights.insights?.length });
    } catch (error) {
      logger.error('Failed to cache Reddit insights', { error: error.message });
    }
  }

  /**
   * Get cached Reddit insights
   */
  async getCachedRedditInsights(topic, timeFilter) {
    try {
      const cacheKey = `${topic || 'general'}_${timeFilter}`;
      const docRef = doc(db, this.collections.redditInsights, cacheKey);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      // Check if expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        logger.info('Cache expired', { cacheKey });
        await deleteDoc(docRef);
        return null;
      }

      logger.info('Cache hit', { cacheKey });
      return data.insights;
    } catch (error) {
      logger.error('Failed to get cached Reddit insights', { error: error.message });
      return null;
    }
  }

  /**
   * Cache nutrition data
   */
  async cacheNutrition(foodItem, location, nutritionData) {
    try {
      const cacheKey = `${foodItem.toLowerCase()}_${location}`;
      const docRef = doc(db, this.collections.nutritionData, cacheKey);

      await setDoc(docRef, {
        foodItem,
        location,
        data: nutritionData,
        cachedAt: serverTimestamp(),
        expiresAt: Date.now() + this.ttl.nutrition,
      });

      logger.info('Nutrition data cached', { foodItem, location });
    } catch (error) {
      logger.error('Failed to cache nutrition data', { error: error.message });
    }
  }

  /**
   * Get cached nutrition data
   */
  async getCachedNutrition(foodItem, location) {
    try {
      const cacheKey = `${foodItem.toLowerCase()}_${location}`;
      const docRef = doc(db, this.collections.nutritionData, cacheKey);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      // Check if expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        await deleteDoc(docRef);
        return null;
      }

      return data.data;
    } catch (error) {
      logger.error('Failed to get cached nutrition', { error: error.message });
      return null;
    }
  }

  /**
   * Cache SERP search results
   * @deprecated SERP API has been replaced by Spoonacular. This method is kept for backward compatibility.
   * See spoonacularService.js for the new implementation.
   */
  async cacheSerpResults(query, results) {
    logger.warn('DEPRECATED: cacheSerpResults() - SERP API has been replaced by Spoonacular');
    try {
      const cacheKey = query.toLowerCase().replace(/\s+/g, '_');
      const docRef = doc(db, this.collections.serpResults, cacheKey);

      await setDoc(docRef, {
        query,
        results,
        cachedAt: serverTimestamp(),
        expiresAt: Date.now() + this.ttl.serp,
      });

      logger.info('SERP results cached', { query });
    } catch (error) {
      logger.error('Failed to cache SERP results', { error: error.message });
    }
  }

  /**
   * Get cached SERP results
   * @deprecated SERP API has been replaced by Spoonacular. This method is kept for backward compatibility.
   * See spoonacularService.js for the new implementation.
   */
  async getCachedSerpResults(query) {
    logger.warn('DEPRECATED: getCachedSerpResults() - SERP API has been replaced by Spoonacular');
    try {
      const cacheKey = query.toLowerCase().replace(/\s+/g, '_');
      const docRef = doc(db, this.collections.serpResults, cacheKey);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();

      if (data.expiresAt && Date.now() > data.expiresAt) {
        await deleteDoc(docRef);
        return null;
      }

      return data.results;
    } catch (error) {
      logger.error('Failed to get cached SERP results', { error: error.message });
      return null;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      const now = Date.now();
      let totalDeleted = 0;

      for (const collectionName of Object.values(this.collections)) {
        const q = query(collection(db, collectionName), where('expiresAt', '<', now));

        const snapshot = await getDocs(q);

        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(docSnapshot.ref);
          totalDeleted++;
        }
      }

      logger.info(`Cleared ${totalDeleted} expired cache entries`);
      return totalDeleted;
    } catch (error) {
      logger.error('Failed to clear expired cache', { error: error.message });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const stats = {};

      for (const [key, collectionName] of Object.entries(this.collections)) {
        const snapshot = await getDocs(collection(db, collectionName));
        stats[key] = {
          total: snapshot.size,
          active: 0,
          expired: 0,
        };

        const now = Date.now();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.expiresAt && data.expiresAt > now) {
            stats[key].active++;
          } else {
            stats[key].expired++;
          }
        });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message });
      return null;
    }
  }

  /**
   * Clear all cache for a specific type
   */
  async clearCacheByType(type) {
    try {
      const collectionName = this.collections[type];
      if (!collectionName) {
        throw new Error(`Invalid cache type: ${type}`);
      }

      const snapshot = await getDocs(collection(db, collectionName));
      let deleted = 0;

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(docSnapshot.ref);
        deleted++;
      }

      logger.info(`Cleared ${deleted} ${type} cache entries`);
      return deleted;
    } catch (error) {
      logger.error('Failed to clear cache by type', { error: error.message });
      return 0;
    }
  }
}

export const firebaseCacheService = new FirebaseCacheService();
export default firebaseCacheService;
