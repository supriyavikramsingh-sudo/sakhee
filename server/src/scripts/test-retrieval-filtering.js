// server/src/scripts/test-retrieval-filtering.js
import { retriever } from '../langchain/retriever.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RetrievalTest');

async function testRetrievalFiltering() {
  console.log('🧪 TESTING RETRIEVAL AND FILTERING\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Symptom guidance retrieval
    console.log('\n📝 TEST 1: Symptom Guidance Retrieval');
    console.log('-'.repeat(60));

    const symptomQuery = 'insulin resistance PCOS dietary recommendations nutrition';
    console.log(`Query: "${symptomQuery}"\n`);

    const symptomResults = await retriever.retrieve(symptomQuery, 5);
    console.log(`✅ Retrieved ${symptomResults.length} documents\n`);

    // Detailed analysis
    symptomResults.forEach((doc, idx) => {
      console.log(`Document ${idx + 1}:`);
      console.log(`  Content: ${doc.pageContent?.substring(0, 80)}...`);
      console.log(`  Metadata:`, JSON.stringify(doc.metadata, null, 2));
      console.log(`  Has metadata?: ${!!doc.metadata}`);
      console.log(`  metadata.type value: "${doc.metadata?.type}"`);
      console.log(
        `  Type matches 'symptom_guidance'?: ${doc.metadata?.type === 'symptom_guidance'}`
      );
      console.log('');
    });

    // Try filtering
    const symptomDocs = symptomResults.filter((doc) => doc.metadata?.type === 'symptom_guidance');
    console.log(`🔍 Filtered results: ${symptomDocs.length} documents\n`);

    if (symptomDocs.length === 0) {
      console.log("❌ FILTERING FAILED! Let's try alternative filters:\n");

      // Try different filter approaches
      const altFilter1 = symptomResults.filter((doc) => {
        const type = doc.metadata?.type;
        console.log(`  Checking type: "${type}" (typeof: ${typeof type})`);
        return type === 'symptom_guidance';
      });
      console.log(`Alternative filter 1: ${altFilter1.length} results\n`);

      // Try checking if type includes the word
      const altFilter2 = symptomResults.filter((doc) => {
        const type = doc.metadata?.type || '';
        return type.includes('symptom');
      });
      console.log(`Alternative filter 2 (includes): ${altFilter2.length} results\n`);

      // Try checking source filename
      const altFilter3 = symptomResults.filter((doc) => {
        const source = doc.metadata?.source || '';
        return source.includes('symptom');
      });
      console.log(`Alternative filter 3 (source): ${altFilter3.length} results\n`);
    }

    // Test 2: Ingredient substitute retrieval
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 TEST 2: Ingredient Substitute Retrieval');
    console.log('-'.repeat(60));

    const substituteQuery = 'white rice PCOS substitute alternative vegetarian';
    console.log(`Query: "${substituteQuery}"\n`);

    const substituteResults = await retriever.retrieve(substituteQuery, 5);
    console.log(`✅ Retrieved ${substituteResults.length} documents\n`);

    substituteResults.forEach((doc, idx) => {
      console.log(`Document ${idx + 1}:`);
      console.log(`  Content: ${doc.pageContent?.substring(0, 80)}...`);
      console.log(`  Metadata:`, JSON.stringify(doc.metadata, null, 2));
      console.log(`  Type: "${doc.metadata?.type}"`);
      console.log(
        `  Type matches 'ingredient_substitute'?: ${doc.metadata?.type === 'ingredient_substitute'}`
      );
      console.log('');
    });

    const substituteDocs = substituteResults.filter(
      (doc) => doc.metadata?.type === 'ingredient_substitute'
    );
    console.log(`🔍 Filtered results: ${substituteDocs.length} documents\n`);

    // Test 3: Check retriever response format
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 TEST 3: Retriever Response Format Check');
    console.log('-'.repeat(60));

    const testQuery = 'PCOS';
    const testResults = await retriever.retrieve(testQuery, 2);

    console.log(`Sample document structure:`);
    if (testResults.length > 0) {
      const sample = testResults[0];
      console.log('Keys:', Object.keys(sample));
      console.log('Constructor:', sample.constructor.name);
      console.log('Type:', typeof sample);
      console.log('Is Document?:', sample.constructor.name === 'Document');
      console.log('\nFull object:', JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testRetrievalFiltering();
