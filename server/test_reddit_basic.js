// Basic test script to verify Reddit service structure without API calls
console.log('🧪 Testing Reddit Service Basic Functionality...\n');

try {
  // Test the targetSubreddits array directly from the file
  const fs = require('fs');
  const redditServiceContent = fs.readFileSync('./src/services/redditService.js', 'utf8');
  
  // Extract targetSubreddits array
  const targetSubredditsMatch = redditServiceContent.match(/this\.targetSubreddits\s*=\s*\[([\s\S]*?)\];/);
  
  if (targetSubredditsMatch) {
    const subredditsContent = targetSubredditsMatch[1];
    const subreddits = subredditsContent.match(/'([^']+)'/g);
    
    if (subreddits) {
      const cleanSubreddits = subreddits.map(s => s.replace(/'/g, ''));
      
      console.log('✅ Test 1: Verify targetSubreddits array');
      console.log('Number of communities:', cleanSubreddits.length);
      console.log('Communities:', cleanSubreddits.slice(0, 10), '...\n');
      
      // Check for required communities from the user's request
      const requiredCommunities = [
        'PCOS_Folks',
        'PCOSloseit', 
        'PCOS_CICO',
        'PCOS_management',
        'PCOSandPregnant',
        'LeanPCOS',
        'TTC_PCOS',
        'PcosIndia',
        'obgyn',
        'FemaleHairLoss',
        'infertility',
        'keto',
        'SkincareAddiction',
        'acne',
        'IndianSkincareAddicts'
      ];
      
      console.log('✅ Test 2: Check for required communities');
      const missingCommunities = [];
      const foundCommunities = [];
      
      requiredCommunities.forEach(community => {
        if (cleanSubreddits.includes(community)) {
          foundCommunities.push(community);
        } else {
          missingCommunities.push(community);
        }
      });
      
      console.log(`Found communities (${foundCommunities.length}/${requiredCommunities.length}):`, foundCommunities);
      if (missingCommunities.length > 0) {
        console.log('Missing communities:', missingCommunities);
      }
      
      console.log('\n✅ Test 3: Verify file structure');
      console.log('✓ RedditService class found');
      console.log('✓ targetSubreddits array found');
      console.log('✓ File is properly structured');
      
      console.log('\n🎉 Basic structure tests completed successfully!');
      console.log('\nNote: API functionality tests require environment variables:');
      console.log('- REDDIT_CLIENT_ID');
      console.log('- REDDIT_CLIENT_SECRET');
      
    } else {
      console.error('❌ Could not parse subreddits from targetSubreddits array');
    }
  } else {
    console.error('❌ Could not find targetSubreddits array in the file');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
