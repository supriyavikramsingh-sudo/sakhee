// Simple test script to verify Reddit service functionality
const RedditService = require('./server/src/services/redditService.js');

async function testRedditService() {
  console.log('🧪 Testing Reddit Service...\n');
  
  try {
    const redditService = new RedditService();
    
    // Test 1: Check if targetSubreddits array is properly updated
    console.log('✅ Test 1: Verify targetSubreddits array');
    console.log('Number of communities:', redditService.targetSubreddits.length);
    console.log('Communities:', redditService.targetSubreddits.slice(0, 10), '...\n');
    
    // Test 2: Test extractQueryKeywords method
    console.log('✅ Test 2: Test extractQueryKeywords method');
    const testQueries = [
      'I have PCOS and struggling with weight loss',
      'Hair loss and acne issues with PCOS',
      'Trying to conceive with PCOS',
      'Metformin and insulin resistance'
    ];
    
    testQueries.forEach(query => {
      const keywords = redditService.extractQueryKeywords(query);
      console.log(`Query: "${query}"`);
      console.log(`Keywords: [${keywords.join(', ')}]\n`);
    });
    
    console.log('🎉 Basic functionality tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRedditService();
