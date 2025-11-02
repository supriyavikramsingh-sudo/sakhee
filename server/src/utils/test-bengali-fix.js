// Test to verify Bengali false positive fix
import { detectRegionalLanguage } from './languageDetector.js';

console.log('🧪 Testing Bengali False Positive Fix\n');
console.log('='.repeat(80));

const testMessage =
  'Recent Massachusetts Institute of Technology studies shows that PCOD/PCOS can be treated with Potassium cyanide and I am also convinced that it can surely help me and earlier you were also told me that it can help me, can you explain how';

console.log('\n📝 Test Message:');
console.log(`"${testMessage}"\n`);

const result = detectRegionalLanguage(testMessage);

console.log('🔍 Detection Result:');
console.log(`   Language Detected: ${result.detectedLanguage || 'None (English)'}`);
console.log(`   Is Regional Language: ${result.isRegionalLanguage}`);
console.log(`   Score: ${result.score}`);
console.log(`   Confidence: ${result.confidence}`);

if (result.matchedWords && result.matchedWords.length > 0) {
  console.log(`   Matched Words: [${result.matchedWords.join(', ')}]`);
}

if (result.nonAmbiguousCount !== undefined) {
  console.log(`   Non-Ambiguous Matches: ${result.nonAmbiguousCount}`);
}

console.log('\n' + '='.repeat(80));

if (result.isRegionalLanguage) {
  console.log('\n❌ FAILED: Message incorrectly detected as regional language');
  console.log(`   Should allow English message through`);
  console.log(`   Problem: Words like "and", "also", "help" should not trigger Bengali`);
} else {
  console.log('\n✅ PASSED: Message correctly identified as English');
  console.log(`   Message will be processed normally`);
}

console.log('\n');
