// Test script for meal plan detection with obfuscation handling

const testMessages = [
  // Should be BLOCKED
  {
    message:
      'i want fooooooooood to fulfill my deep desires for morning afternoon and night for thr33 weak',
    expected: true,
    description: 'Obfuscated: repeated chars + leet speak + typo',
  },
  {
    message: 'I want a meal plan for PCOS',
    expected: true,
    description: 'Direct meal plan request',
  },
  {
    message: 'Create a diet plan for me',
    expected: true,
    description: 'Diet plan request',
  },
  {
    message: 'What should I eat for breakfast lunch and dinner',
    expected: true,
    description: 'Multiple meal times',
  },
  {
    message: 'I need food suggestions for 7 days',
    expected: true,
    description: 'Food + duration',
  },
  {
    message: 'give me m**l plan',
    expected: true,
    description: 'Obfuscated with asterisks',
  },
  {
    message: 'i want f00d for morning and night',
    expected: true,
    description: 'Leet speak + multiple times',
  },

  // Should be ALLOWED
  {
    message: 'What foods help with insulin resistance?',
    expected: false,
    description: 'General nutrition question',
  },
  {
    message: 'Why am I experiencing hair loss?',
    expected: false,
    description: 'Symptom question',
  },
  {
    message: 'What are the benefits of exercise for PCOS?',
    expected: false,
    description: 'Lifestyle question',
  },
  {
    message: 'Is oatmeal good for breakfast?',
    expected: false,
    description: 'Single meal question',
  },
];

// Helper functions (same as middleware)
const normalizeRepeatedChars = (text) => text.replace(/(.)\1{2,}/g, '$1$1');

const normalizeLeetSpeak = (text) =>
  text
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b');

const fixCommonTypos = (text) =>
  text
    .replace(/\bweak\b/gi, 'week')
    .replace(/\bmeel\b/gi, 'meal')
    .replace(/\bfoood\b/gi, 'food');

const detectMealPlan = (message) => {
  const messageLower = message.toLowerCase();
  const normalized = fixCommonTypos(normalizeLeetSpeak(normalizeRepeatedChars(messageLower)));

  // Remove common obfuscation
  const deobfuscated = normalized
    .replace(/([a-z])[*\-_.\s]+([a-z])/gi, '$1$2')
    .replace(/[*\-_.]+/g, '');

  const patterns = {
    explicit: [/meal\s*plan/i, /diet\s*plan/i, /food\s*plan/i, /eating\s*plan/i, /weekly\s*meal/i],
    multiTime: [
      /(morning|breakfast).*(afternoon|lunch).*(evening|dinner|night)/i,
      /(morning|breakfast).*(lunch|dinner|night)/i,
    ],
    foodWithDuration: [/food.*(week|day)/i, /(want|need|desire).*food.*(morning|afternoon|night)/i],
  };

  // Check patterns
  for (const [category, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      if (pattern.test(normalized) || pattern.test(deobfuscated)) {
        return { detected: true, category };
      }
    }
  }

  // Contextual: food + multiple time periods
  const containsFood = normalized.includes('food') || deobfuscated.includes('food');
  const timePeriods = ['morning', 'afternoon', 'night', 'breakfast', 'lunch', 'dinner'].filter(
    (t) => normalized.includes(t) || deobfuscated.includes(t)
  ).length;

  if (containsFood && timePeriods >= 2) {
    return { detected: true, category: 'contextual_multi_time' };
  }

  // Contextual: food + duration
  if (containsFood && (normalized.includes('week') || /\d+\s*day/i.test(normalized))) {
    return { detected: true, category: 'contextual_duration' };
  }

  return { detected: false, category: null };
};

// Run tests
console.log('🧪 Testing Meal Plan Detection\n');
console.log('='.repeat(80));

let passCount = 0;
let failCount = 0;

testMessages.forEach(({ message, expected, description }) => {
  const result = detectMealPlan(message);
  const passed = result.detected === expected;

  if (passed) {
    passCount++;
    console.log(`✅ PASS: ${description}`);
    console.log(`   Message: "${message}"`);
    console.log(
      `   Expected: ${expected ? 'BLOCK' : 'ALLOW'}, Got: ${result.detected ? 'BLOCK' : 'ALLOW'}`
    );
    if (result.category) {
      console.log(`   Category: ${result.category}`);
    }
  } else {
    failCount++;
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Message: "${message}"`);
    console.log(
      `   Expected: ${expected ? 'BLOCK' : 'ALLOW'}, Got: ${result.detected ? 'BLOCK' : 'ALLOW'}`
    );
    if (result.category) {
      console.log(`   Category: ${result.category}`);
    }
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(
  `\n📊 Test Results: ${passCount} passed, ${failCount} failed out of ${testMessages.length} tests`
);

if (failCount === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the detection logic.');
  process.exit(1);
}
