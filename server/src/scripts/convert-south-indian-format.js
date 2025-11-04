/**
 * Script to convert south_indian.txt from [VEG]/[NON-VEG] tag format
 * to standardized - **Type:** format matching other regional templates.
 *
 * This script:
 * 1. Extracts state from section headers (## STATE NAME)
 * 2. Extracts diet type from [VEG]/[NON-VEG] tags in meal titles
 * 3. Adds - **State:** and - **Type:** metadata fields after meal title
 * 4. Removes [VEG]/[NON-VEG] tags from titles
 * 5. Creates a backup of original file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEAL_TEMPLATES_DIR = path.join(__dirname, '../data/meal_templates');
const INPUT_FILE = path.join(MEAL_TEMPLATES_DIR, 'south_indian.txt');
const BACKUP_FILE = path.join(MEAL_TEMPLATES_DIR, 'south_indian.txt.backup');
const OUTPUT_FILE = INPUT_FILE; // Overwrite original

// State name mapping (handles variations in casing)
const STATE_VARIATIONS = {
  'ANDHRA PRADESH': 'Andhra Pradesh',
  'Andhra Pradesh': 'Andhra Pradesh',
  KARNATAKA: 'Karnataka',
  Karnataka: 'Karnataka',
  KERALA: 'Kerala',
  Kerala: 'Kerala',
  'TAMIL NADU': 'Tamil Nadu',
  'Tamil Nadu': 'Tamil Nadu',
  TELANGANA: 'Telangana',
  Telangana: 'Telangana',
  PUDUCHERRY: 'Puducherry',
  Puducherry: 'Puducherry',
  LAKSHADWEEP: 'Lakshadweep',
  Lakshadweep: 'Lakshadweep',
};

function convertSouthIndianFormat() {
  console.log('🔄 Starting south_indian.txt format conversion...\n');

  // Read original file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: File not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_FILE, 'utf-8');

  // Create backup
  fs.writeFileSync(BACKUP_FILE, content);
  console.log(`✅ Backup created: ${BACKUP_FILE}\n`);

  const lines = content.split('\n');
  const outputLines = [];

  let currentState = null;
  let conversionStats = {
    totalMeals: 0,
    vegetarian: 0,
    nonVegetarian: 0,
    statesProcessed: new Set(),
    errors: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track state from section headers (## STATE NAME)
    if (line.startsWith('## ')) {
      const stateMatch = line.match(/^##\s+(.+)/);
      if (stateMatch) {
        const rawState = stateMatch[1].trim();
        // Remove any trailing descriptors (e.g., "- ISLAND SEAFOOD CUISINE")
        const cleanState = rawState.split(' - ')[0].trim();
        currentState = STATE_VARIATIONS[cleanState] || cleanState;
        conversionStats.statesProcessed.add(currentState);
        console.log(`📍 Processing state: ${currentState}`);
      }
      outputLines.push(line);
      continue;
    }

    // Process meal titles (#### Meal Name [VEG] or [NON-VEG])
    if (line.startsWith('#### ')) {
      // Try NON-VEG first (more specific), then VEG
      const nonVegMatch = line.match(/^(####\s+.+?)\s*\[NON-VEG\]/);
      const vegMatch = !nonVegMatch && line.match(/^(####\s+.+?)\s*\[VEG\]/);

      if (vegMatch || nonVegMatch) {
        conversionStats.totalMeals++;

        // Extract clean title (without diet tag)
        const cleanTitle = vegMatch ? vegMatch[1] : nonVegMatch[1];
        const dietType = vegMatch ? 'Vegetarian' : 'Non-Vegetarian';

        if (vegMatch) conversionStats.vegetarian++;
        if (nonVegMatch) conversionStats.nonVegetarian++;

        // Output clean title
        outputLines.push(cleanTitle);

        // Add State metadata (if we have it)
        if (currentState) {
          outputLines.push(`- **State:** ${currentState}`);
        } else {
          conversionStats.errors.push(`Line ${i + 1}: No state context for meal`);
          outputLines.push(`- **State:** Unknown`);
        }

        // Add Type metadata
        outputLines.push(`- **Type:** ${dietType}`);
      } else {
        // Meal title without diet tag (shouldn't happen, but handle gracefully)
        conversionStats.errors.push(
          `Line ${i + 1}: Meal title without [VEG]/[NON-VEG] tag: ${line}`
        );
        outputLines.push(line);
      }

      continue;
    }

    // All other lines pass through unchanged
    outputLines.push(line);
  }

  // Write converted content
  fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ CONVERSION COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Statistics:`);
  console.log(`   Total meals converted: ${conversionStats.totalMeals}`);
  console.log(`   - Vegetarian: ${conversionStats.vegetarian}`);
  console.log(`   - Non-Vegetarian: ${conversionStats.nonVegetarian}`);
  console.log(`   States processed: ${Array.from(conversionStats.statesProcessed).join(', ')}`);

  if (conversionStats.errors.length > 0) {
    console.log(`\n⚠️  Warnings (${conversionStats.errors.length}):`);
    conversionStats.errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (conversionStats.errors.length > 10) {
      console.log(`   ... and ${conversionStats.errors.length - 10} more`);
    }
  }

  console.log(`\n📁 Output file: ${OUTPUT_FILE}`);
  console.log(`📁 Backup file: ${BACKUP_FILE}`);
  console.log('\n✨ Conversion successful! You can now re-ingest meal templates.');
}

// Run conversion
try {
  convertSouthIndianFormat();
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
