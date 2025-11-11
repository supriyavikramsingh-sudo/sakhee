#!/usr/bin/env node

/**
 * Comprehensive RAG Retrieval Test
 * Tests all major query types to verify Chroma Cloud integration
 */

import { vectorStoreManager } from './src/langchain/vectorStore.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRAGRetrieval() {
  console.log('🧪 Comprehensive RAG Retrieval Test\n');
  console.log('='.repeat(80));

  const testQueries = [
    {
      category: 'Medical Guidelines',
      queries: [
        'What are the symptoms of PCOS?',
        'How is PCOS diagnosed?',
        'PCOS treatment options',
      ],
    },
    {
      category: 'Supplements',
      queries: [
        'Best supplements for PCOS insulin resistance',
        'Inositol benefits for PCOS',
        'Vitamin D for PCOS',
      ],
    },
    {
      category: 'Keto Substitutes',
      queries: [
        'Keto bread alternatives for PCOS',
        'Low carb rice substitutes',
        'Sugar-free sweeteners for keto',
      ],
    },
    {
      category: 'Ingredient Substitutes',
      queries: [
        'Replace white rice for PCOS',
        'Healthy oil alternatives',
        'Low glycemic flour options',
      ],
    },
    {
      category: 'Lab Values',
      queries: [
        'High testosterone lab results diet',
        'Insulin resistance lab values',
        'PCOS hormone levels dietary guidance',
      ],
    },
    {
      category: 'Mental Health',
      queries: ['PCOS and anxiety', 'Depression with PCOS', 'Mental health support for PCOS'],
    },
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  try {
    // Initialize vector store
    console.log('\n📦 Initializing Chroma Cloud vector store...');
    await vectorStoreManager.initialize();
    console.log('✅ Vector store ready\n');

    // Get stats
    const stats = await vectorStoreManager.getStats();
    console.log('📊 Vector Store Statistics:');
    console.log(`   - Collection: ${stats.collectionName}`);
    console.log(`   - Documents: ${stats.documentCount}`);
    console.log(`   - Tenant: ${stats.cloudTenant}`);
    console.log(`   - Database: ${stats.cloudDatabase}`);
    console.log('');

    // Run tests for each category
    for (const { category, queries } of testQueries) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Category: ${category}`);
      console.log('='.repeat(80));

      for (const query of queries) {
        totalTests++;
        console.log(`\n🔍 Query: "${query}"`);

        try {
          const results = await vectorStoreManager.similaritySearch(query, 3);

          if (results && results.length > 0) {
            passedTests++;
            console.log(`   ✅ SUCCESS: Found ${results.length} results`);

            results.forEach((result, idx) => {
              const preview = result.content.substring(0, 100).replace(/\n/g, ' ');
              console.log(`   ${idx + 1}. Score: ${result.score.toFixed(4)} | ${preview}...`);
              console.log(
                `      Category: ${result.metadata.category || 'N/A'} | Source: ${
                  result.metadata.source || 'N/A'
                }`
              );
            });
          } else {
            failedTests++;
            console.log('   ❌ FAILED: No results found');
          }
        } catch (error) {
          failedTests++;
          console.log(`   ❌ ERROR: ${error.message}`);
        }
      }
    }

    // Final summary
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 Test Summary');
    console.log('='.repeat(80));
    console.log(`Total Tests:  ${totalTests}`);
    console.log(
      `✅ Passed:     ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`
    );
    console.log(
      `❌ Failed:     ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`
    );
    console.log('='.repeat(80));

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Chroma Cloud RAG is working perfectly!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please investigate.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testRAGRetrieval();
