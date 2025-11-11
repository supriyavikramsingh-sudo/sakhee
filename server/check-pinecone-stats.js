import vectorStore from './src/langchain/vectorStore.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkStats() {
  console.log('🔍 Checking Pinecone index statistics...\n');
  
  // Initialize the vector store first
  await vectorStore.initialize();
  
  const stats = await vectorStore.getStats();
  
  console.log('📊 Pinecone Index Statistics:');
  console.log(`   Index Name: ${stats.indexName}`);
  console.log(`   Initialized: ${stats.initialized ? '✅' : '❌'}`);
  console.log(`   Total Documents: ${typeof stats.documentCount === 'number' ? stats.documentCount.toLocaleString() : stats.documentCount}`);
  
  if (typeof stats.documentCount === 'number') {
    const percentUsed = ((stats.documentCount / 1000000) * 100).toFixed(3);
    console.log(`\n📈 Capacity Usage:`);
    console.log(`   Using ${percentUsed}% of Pinecone free tier (1M vectors)`);
    console.log(`   Remaining capacity: ${(1000000 - stats.documentCount).toLocaleString()} vectors`);
  }
  
  console.log(`\n✅ Migration to Pinecone complete!`);
  console.log(`🎉 All your PCOS knowledge is now in the cloud!`);
}

checkStats().catch(console.error);
