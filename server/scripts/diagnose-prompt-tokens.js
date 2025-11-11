#!/usr/bin/env node

/**
 * Diagnostic script to analyze prompt token distribution
 * Helps identify what's causing the 197k character prompts
 */

import { Logger } from '../src/utils/logger.js';

const logger = new Logger('PromptDiagnostic');

// Rough token estimator (1 token ≈ 4 characters for English)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function analyzePromptBreakdown(promptLength, mealCount, substituteCount, symptomCount, labCount) {
  const breakdown = {
    totalChars: promptLength,
    totalTokens: estimateTokens(promptLength),

    // Estimated breakdown
    meals: {
      chars: mealCount * 400, // ~400 chars per compressed meal
      tokens: estimateTokens(mealCount * 400),
      percentage: (((mealCount * 400) / promptLength) * 100).toFixed(1),
    },

    substitutes: {
      chars: substituteCount * 350, // ~350 chars per substitute
      tokens: estimateTokens(substituteCount * 350),
      percentage: (((substituteCount * 350) / promptLength) * 100).toFixed(1),
    },

    symptomGuidance: {
      chars: symptomCount * 500, // ~500 chars per symptom doc
      tokens: estimateTokens(symptomCount * 500),
      percentage: (((symptomCount * 500) / promptLength) * 100).toFixed(1),
    },

    labGuidance: {
      chars: labCount * 500,
      tokens: estimateTokens(labCount * 500),
      percentage: (((labCount * 500) / promptLength) * 100).toFixed(1),
    },

    instructions: {
      chars:
        promptLength -
        (mealCount * 400 + substituteCount * 350 + symptomCount * 500 + labCount * 500),
      tokens: 0,
      percentage: 0,
    },
  };

  breakdown.instructions.tokens = estimateTokens(breakdown.instructions.chars);
  breakdown.instructions.percentage = ((breakdown.instructions.chars / promptLength) * 100).toFixed(
    1
  );

  return breakdown;
}

// Example from your logs
const promptLength = 197749;
const mealCount = 40;
const substituteCount = 84; // ⚠️ TOO HIGH!
const symptomCount = 12;
const labCount = 3;

const analysis = analyzePromptBreakdown(
  promptLength,
  mealCount,
  substituteCount,
  symptomCount,
  labCount
);

logger.info('📊 Prompt Token Analysis');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TOTAL PROMPT SIZE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Characters: ${analysis.totalChars.toLocaleString()}`);
console.log(`  Est. Tokens: ${analysis.totalTokens.toLocaleString()}`);
console.log(`  GPT-4o-mini limit: 128,000 tokens`);
console.log(`  Usage: ${((analysis.totalTokens / 128000) * 100).toFixed(1)}% of limit`);
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  BREAKDOWN BY SECTION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  1. Meal Templates (${mealCount} meals)`);
console.log(
  `     Tokens: ${analysis.meals.tokens.toLocaleString()} (${analysis.meals.percentage}%)`
);
console.log('');

console.log(`  2. Ingredient Substitutes (${substituteCount} docs) ⚠️ TOO HIGH!`);
console.log(
  `     Tokens: ${analysis.substitutes.tokens.toLocaleString()} (${
    analysis.substitutes.percentage
  }%)`
);
console.log(`     🔥 RECOMMENDATION: Reduce to 15-20 docs (save ~22k tokens)`);
console.log('');

console.log(`  3. Symptom Guidance (${symptomCount} docs)`);
console.log(
  `     Tokens: ${analysis.symptomGuidance.tokens.toLocaleString()} (${
    analysis.symptomGuidance.percentage
  }%)`
);
console.log('');

console.log(`  4. Lab Guidance (${labCount} docs)`);
console.log(
  `     Tokens: ${analysis.labGuidance.tokens.toLocaleString()} (${
    analysis.labGuidance.percentage
  }%)`
);
console.log('');

console.log(`  5. Instructions & Context`);
console.log(
  `     Tokens: ${analysis.instructions.tokens.toLocaleString()} (${
    analysis.instructions.percentage
  }%)`
);
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  HALLUCINATION RISK ANALYSIS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const risks = [];
if (analysis.totalTokens > 50000) {
  risks.push('⚠️  HIGH: Prompt > 50k tokens - "Lost in the middle" problem');
}
if (substituteCount > 30) {
  risks.push('🔥 CRITICAL: Too many substitute docs create noise');
}
if (mealCount < 15 * 3) {
  // 15 per cuisine for 3 cuisines
  risks.push('⚠️  MEDIUM: Too few meal templates - LLM will hallucinate to fill gaps');
}
if (analysis.substitutes.percentage > 30) {
  risks.push('🔥 CRITICAL: Substitutes dominate prompt - critical instructions get lost');
}

risks.forEach((risk) => console.log(`  ${risk}`));

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  RECOMMENDED FIXES (Priority Order)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  1. 🔥 CRITICAL: Reduce substitutes from 84 → 20');
console.log(
  `     Impact: Save ~22,400 tokens (${(
    (((substituteCount - 20) * 350) / analysis.totalTokens) *
    100
  ).toFixed(1)}% reduction)`
);
console.log('');
console.log('  2. 🔥 CRITICAL: Move forbidden dishes to prompt START');
console.log('     Impact: LLM sees constraints first, not buried in middle');
console.log('');
console.log('  3. 🔧 MEDIUM: Increase meal templates from 40 → 70');
console.log('     Impact: More examples = less hallucination');
console.log('');
console.log('  4. 🔧 MEDIUM: Deduplicate substitute docs more aggressively');
console.log('     Impact: Remove redundant information');
console.log('');
console.log('  5. 🔧 LOW: Better compression (keep critical fields)');
console.log('     Impact: Preserve meal names/ingredients while reducing size');
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  WHY "Upma" HALLUCINATION HAPPENED');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  ✓ "Upma" was correctly marked as FORBIDDEN');
console.log('  ✓ No "upma" meals were in the RAG retrieval');
console.log('  ✗ LLM ignored forbidden list (buried in 197k prompt)');
console.log('  ✗ Only 13 meals per cuisine - too few examples');
console.log('  ✗ 84 substitute docs created noise, diluted attention');
console.log('  ✗ LLM filled gaps with generic dishes it knows');
console.log('  ✗ Added regional tag to seem authentic: "(Keto Manipuri)"');
console.log('');
console.log('  ROOT CAUSE: Information overload + weak constraint placement');
console.log('  SOLUTION: Reduce noise (substitutes) + strengthen constraints (move to top)');
console.log('');
