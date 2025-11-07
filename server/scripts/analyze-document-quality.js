// server/scripts/analyze-document-quality.js
// Analyze your meal template data to identify quality issues

import { vectorStoreManager } from '../src/langchain/vectorStore.js';
import { retriever } from '../src/langchain/retriever.js';
import { Logger } from '../src/utils/logger.js';

const logger = new Logger('DocumentQualityAnalyzer');

async function analyzeDocumentQuality() {
  try {
    logger.info('=== DOCUMENT QUALITY ANALYSIS ===');

    // Initialize
    await vectorStoreManager.initialize();

    // Get sample documents
    const sampleQuery = 'meal breakfast';
    const results = await retriever.retrieve(sampleQuery, { topK: 10, minScore: 0.0 });

    if (results.length === 0) {
      logger.warn('No documents found. Vector store may be empty.');
      return;
    }

    logger.info(`Analyzing ${results.length} sample documents...`);

    // Analysis metrics
    const metrics = {
      avgLength: 0,
      avgWordCount: 0,
      hasEmojis: 0,
      hasStars: 0,
      hasSpecialChars: 0,
      hasGIStars: 0,
      hasLongLines: 0,
      hasMetadata: 0,
      documents: [],
    };

    for (const doc of results) {
      const content = doc.content || doc.pageContent || '';

      // Basic stats
      const length = content.length;
      const wordCount = content.split(/\s+/).length;

      // Quality checks
      const hasEmojis = /[★☆🔥💪✨👌😊🌟]/g.test(content);
      const hasStars = /★+|☆+/.test(content);
      const hasGIStars = /GI:\s*★+/.test(content);
      const hasSpecialChars = /[★☆🔥💪✨👌]/.test(content);
      const hasLongLines = content.split('\n').some((line) => line.length > 200);
      const hasMetadata = /\*\*(State|Region|Category|Type|Budget):\*\*/.test(content);

      metrics.avgLength += length;
      metrics.avgWordCount += wordCount;
      metrics.hasEmojis += hasEmojis ? 1 : 0;
      metrics.hasStars += hasStars ? 1 : 0;
      metrics.hasGIStars += hasGIStars ? 1 : 0;
      metrics.hasSpecialChars += hasSpecialChars ? 1 : 0;
      metrics.hasLongLines += hasLongLines ? 1 : 0;
      metrics.hasMetadata += hasMetadata ? 1 : 0;

      metrics.documents.push({
        length,
        wordCount,
        score: doc.score,
        preview: content.substring(0, 150) + '...',
      });
    }

    // Calculate averages
    metrics.avgLength = Math.round(metrics.avgLength / results.length);
    metrics.avgWordCount = Math.round(metrics.avgWordCount / results.length);

    // Calculate percentages
    const pct = (count) => `${Math.round((count / results.length) * 100)}%`;

    // Report
    logger.info('\n📊 DOCUMENT QUALITY REPORT\n');

    logger.info('📏 Size Metrics:');
    logger.info(`   Average length: ${metrics.avgLength} chars`);
    logger.info(`   Average words: ${metrics.avgWordCount} words`);
    logger.info(`   Ideal length: 300-500 chars (focused chunks)`);
    if (metrics.avgLength > 800) {
      logger.warn(`   ⚠️  Documents are too long! Reduce chunkSize in config.`);
    } else if (metrics.avgLength < 200) {
      logger.warn(`   ⚠️  Documents are too short! May be missing context.`);
    } else {
      logger.info(`   ✅ Length is reasonable.`);
    }
    logger.info('');

    logger.info('🧹 Noise Detection:');
    logger.info(
      `   Has emojis: ${pct(metrics.hasEmojis)} (${metrics.hasEmojis}/${results.length})`
    );
    logger.info(
      `   Has stars (★☆): ${pct(metrics.hasStars)} (${metrics.hasStars}/${results.length})`
    );
    logger.info(
      `   Has GI stars: ${pct(metrics.hasGIStars)} (${metrics.hasGIStars}/${results.length})`
    );
    logger.info(
      `   Has special chars: ${pct(metrics.hasSpecialChars)} (${metrics.hasSpecialChars}/${
        results.length
      })`
    );

    if (metrics.hasEmojis > 0 || metrics.hasStars > 0) {
      logger.warn(`   ⚠️  Found noise! Clean documents before re-embedding.`);
      logger.info(`   → Remove emojis, stars, and special characters`);
    } else {
      logger.info(`   ✅ No emojis/stars detected.`);
    }
    logger.info('');

    logger.info('📝 Structure Quality:');
    logger.info(
      `   Has metadata blocks: ${pct(metrics.hasMetadata)} (${metrics.hasMetadata}/${
        results.length
      })`
    );
    logger.info(
      `   Has long lines (>200 chars): ${pct(metrics.hasLongLines)} (${metrics.hasLongLines}/${
        results.length
      })`
    );

    if (metrics.hasMetadata > results.length * 0.7) {
      logger.warn(`   ⚠️  Too much metadata! Consider stripping non-semantic fields.`);
    } else {
      logger.info(`   ✅ Metadata density is reasonable.`);
    }
    logger.info('');

    // Sample documents
    logger.info('📄 Sample Documents (top 3):');
    metrics.documents.slice(0, 3).forEach((doc, i) => {
      logger.info(
        `\n   [${i + 1}] Length: ${doc.length} chars, Words: ${doc.wordCount}, Score: ${
          doc.score?.toFixed(3) || 'N/A'
        }`
      );
      logger.info(`       Preview: ${doc.preview.substring(0, 120)}...`);
    });
    logger.info('');

    // Recommendations
    logger.info('💡 RECOMMENDATIONS:\n');

    let priority = 1;

    if (metrics.avgLength > 800) {
      logger.info(`${priority++}. 🥇 REDUCE CHUNK SIZE (High Priority)`);
      logger.info(`   → Current avg: ${metrics.avgLength} chars`);
      logger.info(`   → Target: 400 chars`);
      logger.info(`   → Edit: server/src/config/appConfig.js`);
      logger.info(`   → Change: chunkSize: 1000 → 400`);
      logger.info(`   → Expected: +50% embedding scores (0.3 → 0.45)`);
      logger.info('');
    }

    if (metrics.hasGIStars > 0 || metrics.hasStars > 0 || metrics.hasEmojis > 0) {
      logger.info(`${priority++}. 🥈 CLEAN NOISE (High Priority)`);
      logger.info(`   → Remove GI stars: ${metrics.hasGIStars} docs affected`);
      logger.info(`   → Remove emojis: ${metrics.hasEmojis} docs affected`);
      logger.info(`   → Remove rating stars: ${metrics.hasStars} docs affected`);
      logger.info(`   → Create preprocessing script (see GUIDE_BOOST_EMBEDDING_SCORES.md)`);
      logger.info(`   → Expected: +15% embedding scores (0.45 → 0.52)`);
      logger.info('');
    }

    if (metrics.hasMetadata > results.length * 0.7) {
      logger.info(`${priority++}. 🥉 STRIP METADATA (Medium Priority)`);
      logger.info(`   → ${metrics.hasMetadata} docs have metadata blocks`);
      logger.info(`   → Keep only: Meal Name, Type, Ingredients, Recipe, Macros`);
      logger.info(`   → Remove: Stars, ratings, budget details, long descriptions`);
      logger.info(`   → Expected: +10% embedding scores`);
      logger.info('');
    }

    logger.info(`${priority++}. 📚 NEXT STEPS:`);
    logger.info(`   1. Implement top 2-3 recommendations above`);
    logger.info(`   2. Re-ingest data: npm run vector:clear && npm run ingest:all`);
    logger.info(`   3. Test again: node scripts/diagnose-retrieval.js`);
    logger.info(`   4. Full guide: GUIDE_BOOST_EMBEDDING_SCORES.md`);
    logger.info('');

    logger.info('=== ANALYSIS COMPLETE ===');
    process.exit(0);
  } catch (error) {
    logger.error('Analysis failed:', error);
    process.exit(1);
  }
}

analyzeDocumentQuality();
