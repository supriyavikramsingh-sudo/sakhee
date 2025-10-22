// server/src/scripts/diagnose-vectorstore.js
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { OpenAIEmbeddings } from '@langchain/openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function diagnoseVectorStore() {
  console.log('🔍 DETAILED VECTOR STORE DIAGNOSIS\n');
  console.log('='.repeat(60));

  try {
    const vectorStorePath = path.join(__dirname, '../storage/localCache/vectordb');

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });

    console.log('📂 Loading vector store from:', vectorStorePath);
    const vectorStore = await HNSWLib.load(vectorStorePath, embeddings);

    console.log('✅ Vector store loaded\n');

    // Test query to get sample documents
    console.log('🔍 Retrieving sample documents...\n');

    const queries = [
      'white rice substitute PCOS',
      'insulin resistance dietary',
      'north indian breakfast',
      'symptom guidance PCOS',
    ];

    for (const query of queries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log('-'.repeat(60));

      const results = await vectorStore.similaritySearch(query, 3);

      results.forEach((doc, idx) => {
        console.log(`\n  Result ${idx + 1}:`);
        console.log(`  Content preview: ${doc.pageContent.substring(0, 80)}...`);
        console.log(`  Metadata:`, JSON.stringify(doc.metadata, null, 2));

        // Check what fields exist
        console.log(`  Available fields:`, Object.keys(doc));
        console.log(`  Metadata keys:`, Object.keys(doc.metadata || {}));
      });
    }

    // Try to access the docstore directly
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 DOCSTORE ANALYSIS');
    console.log('='.repeat(60));

    // Access internal docstore
    if (vectorStore.docstore) {
      console.log('✅ Docstore exists');

      // Try to get a sample of documents
      const docstoreData = vectorStore.docstore._docs || vectorStore.docstore.docs;

      if (docstoreData) {
        console.log(`📄 Total documents in docstore: ${Object.keys(docstoreData).length}`);

        // Sample first 5 documents
        const sampleKeys = Object.keys(docstoreData).slice(0, 5);
        console.log('\n🔬 Sample Documents:\n');

        sampleKeys.forEach((key, idx) => {
          const doc = docstoreData[key];
          console.log(`\nDocument ${idx + 1}:`);
          console.log(`  Key: ${key}`);
          console.log(`  Content: ${(doc.pageContent || '').substring(0, 80)}...`);
          console.log(`  Metadata:`, JSON.stringify(doc.metadata || {}, null, 2));
        });

        // Analyze metadata distribution
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 METADATA TYPE DISTRIBUTION');
        console.log('='.repeat(60));

        const typeCounts = {};
        Object.values(docstoreData).forEach((doc) => {
          const type = doc.metadata?.type || 'unknown';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        console.log('\nDocument Types Found:');
        Object.entries(typeCounts).forEach(([type, count]) => {
          const percentage = ((count / Object.keys(docstoreData).length) * 100).toFixed(1);
          console.log(`  - ${type}: ${count} documents (${percentage}%)`);
        });

        // Check for documents WITH type metadata
        const docsWithType = Object.values(docstoreData).filter(
          (doc) => doc.metadata?.type && doc.metadata.type !== 'unknown'
        );

        console.log(`\n✅ Documents WITH type metadata: ${docsWithType.length}`);
        console.log(
          `❌ Documents WITHOUT type metadata: ${
            Object.keys(docstoreData).length - docsWithType.length
          }`
        );

        if (docsWithType.length > 0) {
          console.log('\n📋 Sample document WITH metadata:');
          const sample = docsWithType[0];
          console.log(
            JSON.stringify(
              {
                content: sample.pageContent?.substring(0, 100) + '...',
                metadata: sample.metadata,
              },
              null,
              2
            )
          );
        }
      } else {
        console.log('⚠️  Cannot access docstore data structure');
      }
    } else {
      console.log('❌ No docstore found in vector store');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

diagnoseVectorStore();
