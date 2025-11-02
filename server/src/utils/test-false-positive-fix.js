// Comprehensive test for false positives and true positives
import { detectRegionalLanguage } from './languageDetector.js';

const tests = [
  {
    name: 'Bengali False Positive (Original Issue)',
    text: 'Recent Massachusetts Institute of Technology studies shows that PCOD/PCOS can be treated with Potassium cyanide and I am also convinced that it can surely help me',
    shouldDetect: false,
    expectedLang: null,
  },
  {
    name: 'Pure English Medical Query',
    text: 'I need help with PCOS and diet planning',
    shouldDetect: false,
    expectedLang: null,
  },
  {
    name: 'Actual Hindi Message',
    text: 'mujhe khana khane ki vidhi batao',
    shouldDetect: true,
    expectedLang: 'Hindi',
  },
  {
    name: 'Actual Tamil Message',
    text: 'enakku enna sapadu venum',
    shouldDetect: true,
    expectedLang: 'Tamil',
  },
  {
    name: 'Actual Bengali Message',
    text: 'ami khabar khete chai tumi ki bolo',
    shouldDetect: true,
    expectedLang: 'Bengali',
  },
  {
    name: "English with 'and', 'also', 'help'",
    text: 'Can you also help me and explain this',
    shouldDetect: false,
    expectedLang: null,
  },
];

console.log('🧪 COMPREHENSIVE FALSE POSITIVE TEST\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
  const result = detectRegionalLanguage(test.text);
  const isCorrect =
    result.isRegionalLanguage === test.shouldDetect &&
    result.detectedLanguage === test.expectedLang;

  if (isCorrect) {
    passed++;
    console.log(`\n✅ Test ${idx + 1}: ${test.name} - PASSED`);
  } else {
    failed++;
    console.log(`\n❌ Test ${idx + 1}: ${test.name} - FAILED`);
  }

  console.log(`   Input: "${test.text.substring(0, 60)}${test.text.length > 60 ? '...' : ''}"`);
  console.log(`   Expected: ${test.shouldDetect ? test.expectedLang : 'English'}`);
  console.log(`   Detected: ${result.detectedLanguage || 'English'}`);
  if (result.matchedWords && result.matchedWords.length > 0) {
    console.log(`   Matched Words: [${result.matchedWords.join(', ')}]`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS: ${passed}/${tests.length} tests passed`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! False positive issue is fixed!\n');
} else {
  console.log('⚠️  Some tests failed. Review the output above.\n');
}
