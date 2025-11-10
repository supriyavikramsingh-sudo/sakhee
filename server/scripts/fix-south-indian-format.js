// scripts/fix-south-indian-format.js
// Fix south_indian.txt to match the standard format:
// 1. Remove GI info and stars from headings
// 2. Add GI as metadata field

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../src/data/meal_templates/south_indian.txt');

console.log('🔧 Fixing south_indian.txt format...\n');

// Read file
let content = fs.readFileSync(filePath, 'utf-8');

// Count stars before removal
const starCount = (content.match(/★/g) || []).length;
console.log(`Found ${starCount} stars to remove\n`);

// Track changes
let changesLog = [];

// Step 1: Extract GI info from headings and store them
// Pattern: #### Meal Name (Low GI: ★★★) or #### Meal Name (Medium GI: ★★)
const headingPattern = /^(####\s+)(.+?)\s*\((Low|Medium|High)\s+GI:\s*★+\)/gm;

let match;
const giMapping = new Map();

// First pass: extract GI info
const tempContent = content.replace(headingPattern, (fullMatch, prefix, mealName, giLevel) => {
  // Store the GI level for this meal
  giMapping.set(mealName.trim(), giLevel);
  // Return clean heading
  return `${prefix}${mealName}`;
});

console.log(`Extracted GI info for ${giMapping.size} meals\n`);

// Step 2: Add GI metadata after "Prep:" line
// For each meal, find the prep line and add GI after it
let finalContent = tempContent;

for (const [mealName, giLevel] of giMapping) {
  // Find the meal section
  const mealHeadingRegex = new RegExp(
    `(####\\s+${mealName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n(?:.*\\n)*?- Prep:.*\\n)`,
    'm'
  );

  finalContent = finalContent.replace(mealHeadingRegex, (match) => {
    // Check if GI already exists
    if (match.includes('- GI:')) {
      return match;
    }
    // Add GI metadata after Prep line
    return match + `- GI: ${giLevel}\n`;
  });
}

// Step 3: Remove any remaining stars
finalContent = finalContent.replace(/★/g, '');

// Write back
fs.writeFileSync(filePath, finalContent, 'utf-8');

console.log('✅ Transformations completed:');
console.log(`   - Removed ${starCount} stars from headings`);
console.log(`   - Added GI metadata for ${giMapping.size} meals`);
console.log(`   - Standardized format to match other files`);

console.log('\n📋 Sample transformations:');
let sampleCount = 0;
for (const [mealName, giLevel] of giMapping) {
  if (sampleCount < 3) {
    console.log(`   "${mealName}" → Added "- GI: ${giLevel}"`);
    sampleCount++;
  }
}

console.log('\n⚠️  Next step: Re-ingest meal templates');
console.log('   Run: npm run ingest:meals\n');
