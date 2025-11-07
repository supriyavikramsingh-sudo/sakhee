// scripts/debug-breakfast-scores.js
// Diagnostic script to check actual similarity scores for breakfast queries

import { vectorStoreManager } from '../src/langchain/vectorStore.js';
import { embeddingsManager } from '../src/langchain/embeddings.js';
import { Logger } from '../src/utils/logger.js';

const logger = new Logger('BreakfastScoreDebug');

async function debugBreakfastScores() {
  console.log('\n🔍 BREAKFAST RETRIEVAL DEBUGGING\n');
  console.log('='.repeat(80));

  try {
    // Initialize vector store
    console.log('\n1️⃣ Initializing vector store...');
    await vectorStoreManager.initialize();
    const vectorStore = vectorStoreManager.getVectorStore();
    console.log('✅ Vector store initialized');

    // Test queries with different minScore thresholds
    const testQueries = [
      'Himachal Pradesh',
      'Himachal Pradesh breakfast',
      'Himachal Pradesh breakfast meals',
      'North Indian breakfast',
      'breakfast',
    ];

    const minScoreThresholds = [0.0, 0.1, 0.2, 0.3, 0.4];

    for (const query of testQueries) {
      console.log('\n' + '='.repeat(80));
      console.log(`\n📊 QUERY: "${query}"\n`);

      for (const minScore of minScoreThresholds) {
        console.log(`\n  Testing with minScore=${minScore}:`);

        // Get raw results from vector store (topK=10)
        const results = await vectorStoreManager.similaritySearch(query, 10);

        // Filter by minScore
        const filtered = results.filter((r) => {
          const score = r?.score ?? 0;
          return score >= minScore;
        });

        console.log(`  - Raw results: ${results.length}`);
        console.log(`  - Filtered (≥${minScore}): ${filtered.length}`);

        if (filtered.length > 0) {
          // Show top 3 results
          console.log(`\n  Top results:`);
          filtered.slice(0, 3).forEach((doc, idx) => {
            const metadata = doc.metadata || {};
            const content = (doc.content || doc.pageContent || '').slice(0, 200);
            const score = doc.score || 0;

            console.log(`\n    [${idx + 1}] Score: ${score.toFixed(4)}`);
            console.log(`        State: ${metadata.state}`);
            console.log(`        MealType: ${metadata.mealType}`);
            console.log(`        Category: ${metadata.category}`);
            console.log(`        Meal: ${metadata.mealName}`);
            console.log(`        Content snippet: ${content}...`);
          });
        } else {
          console.log(`  ❌ No results found with minScore≥${minScore}`);
        }

        if (results.length > 0 && filtered.length === 0) {
          console.log(`\n  ⚠️ Scores too low! Top raw scores:`);
          results.slice(0, 3).forEach((doc, idx) => {
            console.log(`    [${idx + 1}] Score: ${(doc.score || 0).toFixed(4)} (below threshold)`);
          });
        }
      }
    }

    // Part 2: Direct document inspection
    console.log('\n\n' + '='.repeat(80));
    console.log('\n2️⃣ DIRECT DOCUMENT INSPECTION\n');

    const allDocs = await vectorStoreManager.similaritySearch('Himachal Pradesh', 50);
    console.log(`Found ${allDocs.length} Himachal Pradesh documents\n`);

    // Check how many have "breakfast" or "MealType: breakfast"
    let withBreakfastKeyword = 0;
    let withMealTypeBreakfast = 0;
    let withCategoryBreakfast = 0;

    allDocs.forEach((doc) => {
      const content = (doc.content || doc.pageContent || '').toLowerCase();
      const metadata = doc.metadata || {};

      if (content.includes('breakfast')) withBreakfastKeyword++;
      if (metadata.mealType === 'breakfast') withMealTypeBreakfast++;
      if ((metadata.category || '').toLowerCase().includes('breakfast')) withCategoryBreakfast++;
    });

    console.log(`Documents containing "breakfast" keyword: ${withBreakfastKeyword}`);
    console.log(`Documents with mealType="breakfast": ${withMealTypeBreakfast}`);
    console.log(`Documents with "breakfast" in category: ${withCategoryBreakfast}`);

    // Part 3: Embedding similarity test
    console.log('\n\n' + '='.repeat(80));
    console.log('\n3️⃣ EMBEDDING SIMILARITY TEST\n');

    // Get embeddings for test queries
    const query1 = 'Himachal Pradesh';
    const query2 = 'Himachal Pradesh breakfast';

    console.log(`Computing embeddings for:\n- Query 1: "${query1}"\n- Query 2: "${query2}"\n`);

    const embedding1 = await embeddingsManager.embedQuery(query1);
    const embedding2 = await embeddingsManager.embedQuery(query2);

    console.log(`✅ Embedding dimensions: ${embedding1.length}`);

    // Get a sample breakfast document
    const breakfastDocs = allDocs.filter((doc) => {
      const metadata = doc.metadata || {};
      return metadata.mealType === 'breakfast';
    });

    if (breakfastDocs.length > 0) {
      const sampleDoc = breakfastDocs[0];
      const docContent = sampleDoc.content || sampleDoc.pageContent || '';

      console.log(`\nSample breakfast document:`);
      console.log(`  State: ${sampleDoc.metadata?.state}`);
      console.log(`  Meal: ${sampleDoc.metadata?.mealName}`);
      console.log(`  MealType: ${sampleDoc.metadata?.mealType}`);
      console.log(`  Content (first 300 chars):`);
      console.log(`  ${docContent.slice(0, 300)}...\n`);

      // Compute cosine similarity manually
      const docEmbedding = await embeddingsManager.embedQuery(docContent);

      const cosineSim1 = cosineSimilarity(embedding1, docEmbedding);
      const cosineSim2 = cosineSimilarity(embedding2, docEmbedding);

      console.log(`Cosine Similarity:`);
      console.log(`  Query 1 ("${query1}") vs Document: ${cosineSim1.toFixed(4)}`);
      console.log(`  Query 2 ("${query2}") vs Document: ${cosineSim2.toFixed(4)}`);

      if (cosineSim2 < cosineSim1) {
        console.log(`\n⚠️ WARNING: Adding "breakfast" to query DECREASED similarity!`);
        console.log(`  This explains why breakfast queries return 0 results.`);
      } else {
        console.log(`\n✅ Adding "breakfast" improved similarity (as expected)`);
      }
    } else {
      console.log(`\n❌ No breakfast documents found in sample`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Debugging complete\n');
  } catch (error) {
    console.error('\n❌ Error during debugging:', error.message);
    console.error(error.stack);
  }
}

// Helper: Calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

// Run the debugging
debugBreakfastScores().catch(console.error);
