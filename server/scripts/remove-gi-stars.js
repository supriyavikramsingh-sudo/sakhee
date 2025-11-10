// scripts/remove-gi-stars.js
// Remove GI stars (⭐) from meal template files
// Converts "GI: Low ⭐⭐⭐" → "GI: Low"

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mealTemplatesDir = path.join(__dirname, '../src/data/meal_templates');

const files = [
  'north_indian.txt',
  'south_indian.txt',
  'east_indian_meals.txt',
  'west_indian_meals.txt',
  'central_indian.txt',
];

console.log('🧹 Removing GI stars from meal templates...\n');

let totalChanges = 0;

for (const filename of files) {
  const filePath = path.join(mealTemplatesDir, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    continue;
  }

  // Read file
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalLength = content.length;

  // Count stars before removal
  const starCount = (content.match(/⭐/g) || []).length;

  // Remove stars from GI lines and notes
  // Pattern: "GI: Low ⭐⭐⭐" → "GI: Low"
  // Pattern: "**GI:** Low ⭐⭐⭐" → "**GI:** Low"
  // Pattern: "Low GI options (⭐⭐⭐)" → "Low GI options"
  content = content.replace(/(\s*-\s*\*?\*?GI:?\*?\*?\s*(?:Low|Medium|High))\s*⭐+/gi, '$1');
  content = content.replace(/(GI\s+options?)\s*\(⭐+\)/gi, '$1');
  content = content.replace(/\s*\(⭐+\)\s*/g, ' '); // Remove any remaining star patterns

  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');

  const newLength = content.length;
  const savedBytes = originalLength - newLength;
  const savedChars = savedBytes;

  console.log(`✅ ${filename}`);
  console.log(`   Removed ${starCount} stars`);
  console.log(`   Saved ${savedChars} characters (~${Math.round(savedChars / 4)} tokens)`);
  console.log('');

  totalChanges += starCount;
}

console.log(`\n🎉 Complete! Removed ${totalChanges} stars from ${files.length} files`);
console.log(`📊 Estimated token savings: ~${Math.round(totalChanges / 4)} tokens per ingestion`);
console.log(`\n⚠️  Next step: Re-ingest meal templates`);
console.log(`   Run: npm run ingest:meals\n`);
