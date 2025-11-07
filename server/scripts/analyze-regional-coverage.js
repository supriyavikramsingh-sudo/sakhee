// server/scripts/analyze-regional-coverage.js
// Comprehensive analysis of regional meal template coverage and quality

import { vectorStoreManager } from '../src/langchain/vectorStore.js';
import { retriever } from '../src/langchain/retriever.js';
import { Logger } from '../src/utils/logger.js';

const logger = new Logger('RegionalCoverageAnalyzer');

async function analyzeRegionalCoverage() {
  try {
    logger.info('=== COMPREHENSIVE REGIONAL MEAL ANALYSIS ===\n');

    // Initialize
    await vectorStoreManager.initialize();

    // Define regions to test
    const regions = [
      'Himachal Pradesh',
      'Rajasthan',
      'Rajasthani',
      'Bihar',
      'Bihari',
      'Uttar Pradesh',
      'Maharashtra',
      'Gujarat',
      'Punjab',
      'Uttarakhand',
      'South Indian',
      'Tamil Nadu',
      'Kerala',
      'Karnataka',
      'Andhra Pradesh',
      'West Bengal',
      'Bengali',
      'Goa',
      'Goan',
    ];

    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const dietTypes = ['vegetarian', 'non-vegetarian'];

    logger.info('📊 PART 1: REGIONAL COVERAGE ANALYSIS\n');

    const coverageResults = [];

    for (const region of regions) {
      logger.info(`\n🔍 Analyzing: ${region}`);
      logger.info('─'.repeat(60));

      const regionData = {
        region,
        totalDocs: 0,
        byMealType: {},
        byDietType: {},
        avgScore: 0,
        topScores: [],
        sampleMeals: [],
      };

      // Test general region query
      const generalQuery = `${region} meal dish cuisine`;
      const generalResults = await retriever.retrieve(generalQuery, {
        topK: 50,
        minScore: 0.0,
      });

      regionData.totalDocs = generalResults.length;
      regionData.avgScore =
        generalResults.length > 0
          ? generalResults.reduce((sum, r) => sum + r.score, 0) / generalResults.length
          : 0;
      regionData.topScores = generalResults.slice(0, 5).map((r) => r.score);

      logger.info(`   Total documents: ${regionData.totalDocs}`);
      logger.info(`   Avg score: ${regionData.avgScore.toFixed(3)}`);
      logger.info(`   Top 5 scores: ${regionData.topScores.map((s) => s.toFixed(3)).join(', ')}`);

      // Test by meal type
      for (const mealType of mealTypes) {
        const query = `${region} ${mealType} meal`;
        const results = await retriever.retrieve(query, { topK: 20, minScore: 0.3 });
        regionData.byMealType[mealType] = results.length;
      }

      logger.info(`   By meal type:`);
      logger.info(`      Breakfast: ${regionData.byMealType.breakfast}`);
      logger.info(`      Lunch: ${regionData.byMealType.lunch}`);
      logger.info(`      Dinner: ${regionData.byMealType.dinner}`);
      logger.info(`      Snacks: ${regionData.byMealType.snacks}`);

      // Test by diet type
      for (const dietType of dietTypes) {
        const query = `${region} ${dietType} meal`;
        const results = await retriever.retrieve(query, { topK: 20, minScore: 0.3 });
        regionData.byDietType[dietType] = results.length;
      }

      logger.info(`   By diet type:`);
      logger.info(`      Vegetarian: ${regionData.byDietType.vegetarian}`);
      logger.info(`      Non-Vegetarian: ${regionData.byDietType['non-vegetarian']}`);

      // Get sample meal names
      if (generalResults.length > 0) {
        regionData.sampleMeals = generalResults.slice(0, 3).map((r) => {
          const content = r.content || r.pageContent || '';
          // Try to extract meal name
          const nameMatch =
            content.match(/Meal Name:\s*([^\n]+)/i) || content.match(/^([^\n]{10,80})/);
          return {
            name: nameMatch ? nameMatch[1].trim() : 'Unknown',
            score: r.score,
            preview: content.substring(0, 100),
          };
        });

        logger.info(`   Sample meals:`);
        regionData.sampleMeals.forEach((meal, i) => {
          logger.info(`      ${i + 1}. ${meal.name} (score: ${meal.score.toFixed(3)})`);
        });
      }

      coverageResults.push(regionData);
    }

    // ===== PART 2: SPECIFIC HIMACHAL PRADESH DEEP DIVE =====
    logger.info('\n\n📍 PART 2: HIMACHAL PRADESH DEEP DIVE\n');
    logger.info('─'.repeat(60));

    // Test exact queries that user is making
    const himachalQueries = [
      'Himachal Pradesh breakfast meals dishes regional non-vegetarian',
      'Himachal Pradesh lunch traditional recipes authentic non-vegetarian',
      'Himachal Pradesh dinner evening meal main course non-vegetarian',
      'Himachal Pradesh snacks traditional dishes non-vegetarian',
      'Himachal Pradesh cuisine traditional regional specialties',
    ];

    logger.info('\n🔬 Testing actual user queries:\n');

    for (const query of himachalQueries) {
      logger.info(`\nQuery: "${query}"`);
      const results = await retriever.retrieve(query, { topK: 10, minScore: 0.0 });

      logger.info(`   Results: ${results.length} documents`);

      if (results.length > 0) {
        logger.info(
          `   Top 3 scores: ${results
            .slice(0, 3)
            .map((r) => r.score.toFixed(3))
            .join(', ')}`
        );
        logger.info(
          `   Avg score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(
            3
          )}`
        );

        // Analyze what was retrieved
        const himachalCount = results.filter((r) => {
          const content = (r.content || r.pageContent || '').toLowerCase();
          return content.includes('himachal');
        }).length;

        const otherRegions = results.filter((r) => {
          const content = (r.content || r.pageContent || '').toLowerCase();
          return !content.includes('himachal');
        });

        logger.info(`   Himachal docs: ${himachalCount}/${results.length}`);
        logger.info(`   Other regions: ${otherRegions.length}/${results.length}`);

        if (otherRegions.length > 0) {
          logger.info(`   Other regions found:`);
          otherRegions.slice(0, 3).forEach((r) => {
            const content = (r.content || r.pageContent || '').toLowerCase();
            const stateMatch = content.match(/state:\s*([^\n]+)/i);
            const regionMatch = content.match(/region:\s*([^\n]+)/i);
            const region = stateMatch?.[1] || regionMatch?.[1] || 'Unknown';
            logger.info(`      - ${region} (score: ${r.score.toFixed(3)})`);
          });
        }

        // Show top 3 retrieved meals
        logger.info(`   Top 3 retrieved meals:`);
        results.slice(0, 3).forEach((r, i) => {
          const content = r.content || r.pageContent || '';
          const nameMatch = content.match(/Meal Name:\s*([^\n]+)/i);
          const stateMatch = content.match(/State:\s*([^\n]+)/i);
          const mealName = nameMatch?.[1] || 'Unknown';
          const state = stateMatch?.[1] || 'Unknown';

          logger.info(`      ${i + 1}. ${mealName} (${state}) - Score: ${r.score.toFixed(3)}`);
        });
      } else {
        logger.warn(`   ⚠️  NO RESULTS FOUND!`);
      }
    }

    // ===== PART 3: EMBEDDING QUALITY ANALYSIS =====
    logger.info('\n\n🔬 PART 3: EMBEDDING QUALITY ANALYSIS\n');
    logger.info('─'.repeat(60));

    // Test with different query formulations
    const queryVariations = [
      { query: 'Himachal Pradesh', label: 'Region only' },
      { query: 'Himachal Pradesh breakfast', label: 'Region + meal type' },
      { query: 'Himachal Pradesh non-vegetarian', label: 'Region + diet' },
      { query: 'Himachal Pradesh breakfast non-vegetarian', label: 'Region + meal + diet' },
      {
        query: 'Himachal Pradesh breakfast meals dishes regional non-vegetarian',
        label: 'Full query (actual)',
      },
      { query: 'Himachali breakfast', label: 'Colloquial term' },
      { query: 'North Indian mountain cuisine', label: 'Descriptive' },
      { query: 'chicken curry himachal', label: 'Dish-based' },
    ];

    logger.info('\n📝 Testing query formulations:\n');

    for (const { query, label } of queryVariations) {
      const results = await retriever.retrieve(query, { topK: 5, minScore: 0.0 });
      const avgScore =
        results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;

      const himachalCount = results.filter((r) => {
        const content = (r.content || r.pageContent || '').toLowerCase();
        return content.includes('himachal');
      }).length;

      logger.info(
        `${label.padEnd(30)} | Results: ${
          results.length
        } | Himachal: ${himachalCount}/5 | Avg: ${avgScore.toFixed(3)}`
      );
    }

    // ===== PART 4: DOCUMENT CONTENT ANALYSIS =====
    logger.info('\n\n📄 PART 4: HIMACHAL DOCUMENT CONTENT ANALYSIS\n');
    logger.info('─'.repeat(60));

    // Get all Himachal docs
    const allHimachalDocs = await retriever.retrieve('Himachal Pradesh', {
      topK: 50,
      minScore: 0.0,
    });

    logger.info(`\nFound ${allHimachalDocs.length} total Himachal Pradesh documents`);

    if (allHimachalDocs.length > 0) {
      // Analyze content structure
      const sampleDoc = allHimachalDocs[0];
      const content = sampleDoc.content || sampleDoc.pageContent || '';

      logger.info(`\n📋 Sample Himachal document structure:`);
      logger.info(`   Length: ${content.length} chars`);
      logger.info(`   Words: ${content.split(/\s+/).length} words`);
      logger.info(`   Lines: ${content.split('\n').length} lines`);

      // Show first 500 chars
      logger.info(`\n📝 First 500 characters of sample doc:`);
      logger.info('─'.repeat(60));
      logger.info(content.substring(0, 500));
      logger.info('─'.repeat(60));

      // Check for common fields
      const hasFields = {
        mealName: /Meal Name:/i.test(content),
        state: /State:/i.test(content),
        region: /Region:/i.test(content),
        ingredients: /Ingredients:/i.test(content),
        recipe: /Recipe:|Preparation:|Instructions:/i.test(content),
        nutrition: /Protein:|Carbs:|Nutrition/i.test(content),
        type: /Type:|Diet Type:/i.test(content),
        category: /Category:/i.test(content),
      };

      logger.info(`\n🏷️  Document fields present:`);
      Object.entries(hasFields).forEach(([field, present]) => {
        logger.info(`   ${present ? '✅' : '❌'} ${field}`);
      });

      // Analyze all Himachal docs
      logger.info(`\n📊 Analysis of all ${allHimachalDocs.length} Himachal docs:`);

      const mealNames = new Set();
      const categories = {};
      const dietTypes = {};

      allHimachalDocs.forEach((doc) => {
        const content = doc.content || doc.pageContent || '';

        // Extract meal name
        const nameMatch = content.match(/Meal Name:\s*([^\n]+)/i);
        if (nameMatch) {
          mealNames.add(nameMatch[1].trim());
        }

        // Extract category
        const catMatch = content.match(/Category:\s*([^\n]+)/i);
        if (catMatch) {
          const cat = catMatch[1].trim();
          categories[cat] = (categories[cat] || 0) + 1;
        }

        // Extract diet type
        const typeMatch = content.match(/Type:\s*([^\n]+)/i);
        if (typeMatch) {
          const type = typeMatch[1].trim();
          dietTypes[type] = (dietTypes[type] || 0) + 1;
        }
      });

      logger.info(`   Unique meals: ${mealNames.size}`);
      logger.info(`   Categories:`, categories);
      logger.info(`   Diet types:`, dietTypes);

      if (mealNames.size > 0) {
        logger.info(`\n   Sample meal names (first 10):`);
        Array.from(mealNames)
          .slice(0, 10)
          .forEach((name, i) => {
            logger.info(`      ${i + 1}. ${name}`);
          });
      }
    }

    // ===== PART 5: SUMMARY & RECOMMENDATIONS =====
    logger.info('\n\n📋 PART 5: SUMMARY & RECOMMENDATIONS\n');
    logger.info('─'.repeat(60));

    const himachalData = coverageResults.find((r) => r.region === 'Himachal Pradesh');

    if (himachalData) {
      logger.info(`\n✅ Himachal Pradesh Coverage:`);
      logger.info(`   Total docs: ${himachalData.totalDocs}`);
      logger.info(`   Avg score: ${himachalData.avgScore.toFixed(3)}`);
      logger.info(`   Breakfast: ${himachalData.byMealType.breakfast}`);
      logger.info(`   Lunch: ${himachalData.byMealType.lunch}`);
      logger.info(`   Dinner: ${himachalData.byMealType.dinner}`);
      logger.info(`   Vegetarian: ${himachalData.byDietType.vegetarian}`);
      logger.info(`   Non-Vegetarian: ${himachalData.byDietType['non-vegetarian']}`);

      // Diagnose issues
      logger.info(`\n🔍 Issue Diagnosis:`);

      if (allHimachalDocs.length >= 30) {
        logger.info(`   ✅ Data present: ${allHimachalDocs.length} Himachal docs found`);
      } else {
        logger.warn(`   ⚠️  Data missing: Only ${allHimachalDocs.length} docs (expected 30)`);
      }

      if (himachalData.avgScore < 0.4) {
        logger.warn(`   ⚠️  Low embedding scores: Avg ${himachalData.avgScore.toFixed(3)}`);
        logger.info(`   → Possible causes:`);
        logger.info(`      1. Query-document vocabulary mismatch`);
        logger.info(`      2. Document structure not optimized for search`);
        logger.info(`      3. Embedding model not capturing regional semantics`);
      }

      if (himachalData.byMealType.breakfast === 0) {
        logger.warn(`   ⚠️  No breakfast results for "Himachal Pradesh breakfast"`);
        logger.info(`   → Check if meal type field is being indexed correctly`);
      }

      if (himachalData.byDietType['non-vegetarian'] === 0) {
        logger.warn(`   ⚠️  No non-veg results despite non-veg query`);
        logger.info(`   → Check if diet type field is being indexed correctly`);
      }
    }

    logger.info(`\n💡 Recommendations:`);

    if (allHimachalDocs.length > 0 && himachalData.avgScore < 0.4) {
      logger.info(`\n1. 🎯 QUERY-DOCUMENT MISMATCH (Most Likely Cause)`);
      logger.info(`   Issue: Your queries use different terms than your documents`);
      logger.info(`   Solution: Analyze vocabulary gap`);
      logger.info(`      - Check what terms are in your documents`);
      logger.info(`      - Check what terms are in your queries`);
      logger.info(`      - Add synonyms or expand queries`);
    }

    if (
      himachalData &&
      (himachalData.byMealType.breakfast === 0 || himachalData.byDietType['non-vegetarian'] === 0)
    ) {
      logger.info(`\n2. 🏷️  METADATA FILTERING TOO STRICT`);
      logger.info(`   Issue: Your filters in Stage 1 are excluding valid documents`);
      logger.info(`   Solution: Review filtering logic in performMultiStageRetrieval`);
      logger.info(`      - Check diet type matching`);
      logger.info(`      - Check meal type categorization`);
      logger.info(`      - Loosen filters temporarily to test`);
    }

    logger.info(`\n3. 📊 NEXT STEPS:`);
    logger.info(`   1. Review the sample document shown above`);
    logger.info(`   2. Compare document vocabulary with query terms`);
    logger.info(`   3. Check filtering logic in mealPlanChain.js (Stage 1)`);
    logger.info(`   4. Test with minScore=0.0 to see all matches`);
    logger.info(`   5. Consider query expansion or document preprocessing`);

    logger.info('\n=== ANALYSIS COMPLETE ===\n');
    process.exit(0);
  } catch (error) {
    logger.error('Analysis failed:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
}

analyzeRegionalCoverage();
