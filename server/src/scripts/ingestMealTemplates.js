import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Document } from '@langchain/core/documents';

// Initialize __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (two levels up from scripts/) BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import modules that depend on env vars
import { vectorStoreManager } from '../langchain/vectorStore.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('RAG-Ingestion');

class EnhancedRAGIngester {
  constructor() {
    this.templatesDir = path.join(__dirname, '../data/meal_templates');
    this.medicalDir = path.join(__dirname, '../data/medical');
    this.documents = [];
  }

  /**
   * Parse a meal template .txt file into structured documents
   * Extracts individual meals (####) instead of categories (###)
   */
  parseMealTemplate(content, filename) {
    const docs = [];
    const region = filename.replace('.txt', '').replace(/_/g, '-');

    // Split into sections by ## headers (regional sections)
    const sections = content.split(/\n## /);

    sections.forEach((section, sectionIdx) => {
      if (!section.trim()) return;

      const sectionLines = section.split('\n');
      const regionalSection =
        sectionIdx === 0 ? sectionLines[0].replace(/^# /, '') : sectionLines[0];
      const sectionContent = sectionLines.slice(1).join('\n').trim();

      if (!sectionContent) return;

      // Split into meal categories by ### headers (e.g., BREAKFAST OPTIONS)
      const categories = sectionContent.split(/\n### /);

      categories.forEach((category, categoryIdx) => {
        if (!category.trim()) return;

        const categoryLines = category.split('\n');
        const categoryName =
          categoryIdx === 0 ? categoryLines[0].replace(/^### /, '') : categoryLines[0];
        const categoryContent = categoryLines.slice(1).join('\n').trim();

        if (!categoryContent) return;

        // Split into individual meals by #### headers (e.g., "1. Poha with Sev")
        const individualMeals = categoryContent.split(/\n#### /);

        individualMeals.forEach((meal, mealIdx) => {
          if (!meal.trim()) return;

          const mealLines = meal.split('\n');
          const mealName = mealIdx === 0 ? mealLines[0].replace(/^#### /, '') : mealLines[0];
          const mealContent = mealLines.slice(1).join('\n').trim();

          if (!mealContent) return;

          // Extract structured data
          const state = this.extractState(mealContent);
          const dietType = this.extractDietType(mealContent);
          const ingredients = this.extractIngredients(mealContent);
          const macros = this.extractMacros(mealContent);
          const budget = this.extractBudget(mealContent);
          const prepTime = this.extractPrepTime(mealContent);
          const tip = this.extractTip(mealContent);
          const gi = this.extractGI(mealContent);

          // Create a rich document for embedding
          const structuredContent = `
Region: ${region}
State: ${state}
Regional Section: ${regionalSection}
Category: ${categoryName}
Meal: ${mealName}
Type: ${dietType}
Ingredients: ${ingredients}
Macros: Protein ${macros.protein}g, Carbs ${macros.carbs}g, Fats ${macros.fats}g
Budget: ${budget}
Prep Time: ${prepTime}
Glycemic Index: ${gi}
Tip: ${tip}
          `.trim();

          docs.push({
            content: structuredContent,
            metadata: {
              source: filename,
              type: 'meal_template',
              region: region,
              state: state,
              regionalSection: regionalSection.toLowerCase(),
              category: categoryName.toLowerCase(),
              mealName: mealName,
              dietType: dietType,
              ingredients: ingredients.split(', ').filter((i) => i),
              protein: macros.protein,
              carbs: macros.carbs,
              fats: macros.fats,
              budgetMin: budget.split('-')[0]?.replace('₹', '') || '0',
              budgetMax:
                budget.split('-')[1]?.replace('₹', '') ||
                budget.split('-')[0]?.replace('₹', '') ||
                '0',
              prepTime: prepTime,
              gi: gi,
              tip: tip,
            },
          });
        });
      });
    });

    // ===== VALIDATION: Check metadata completeness =====
    this.validateMealTemplates(docs, filename);

    return docs;
  }

  /**
   * Validate meal template metadata completeness
   * Warns about missing required fields and logs statistics
   */
  validateMealTemplates(docs, filename) {
    const stats = {
      total: docs.length,
      missingState: 0,
      missingType: 0,
      missingIngredients: 0,
      byDietType: {
        Vegetarian: 0,
        'Non-Vegetarian': 0,
        Vegan: 0,
        Jain: 0,
        Eggetarian: 0,
        Unknown: 0,
      },
      byState: {},
    };

    docs.forEach((doc, idx) => {
      const metadata = doc.metadata || {};
      const content = doc.content || '';

      // Check for missing State
      if (!metadata.state || metadata.state === 'Unknown') {
        stats.missingState++;
        logger.warn(`  ⚠️  Meal #${idx + 1} missing State: ${metadata.mealName || 'Unknown'}`);
      } else {
        stats.byState[metadata.state] = (stats.byState[metadata.state] || 0) + 1;
      }

      // Check for missing Type
      if (!metadata.dietType || metadata.dietType === 'Unknown') {
        stats.missingType++;
        logger.warn(`  ⚠️  Meal #${idx + 1} missing Type: ${metadata.mealName || 'Unknown'}`);
      } else {
        const dietType = metadata.dietType;
        if (stats.byDietType.hasOwnProperty(dietType)) {
          stats.byDietType[dietType]++;
        } else {
          stats.byDietType['Unknown']++;
        }
      }

      // Check for missing Ingredients
      if (!metadata.ingredients || metadata.ingredients.length === 0) {
        stats.missingIngredients++;
        logger.warn(
          `  ⚠️  Meal #${idx + 1} missing Ingredients: ${metadata.mealName || 'Unknown'}`
        );
      }

      // Verify content has Type: field (for RAG filtering)
      if (!/Type:\s*\w+/.test(content)) {
        logger.warn(
          `  ⚠️  Meal #${idx + 1} content missing 'Type:' field: ${metadata.mealName || 'Unknown'}`
        );
      }
    });

    // Log validation summary
    logger.info(`\n  ✅ Validation Summary for ${filename}:`);
    logger.info(`     Total meals: ${stats.total}`);
    logger.info(`     Missing State: ${stats.missingState}`);
    logger.info(`     Missing Type: ${stats.missingType}`);
    logger.info(`     Missing Ingredients: ${stats.missingIngredients}`);
    logger.info(`\n     Diet Type Distribution:`);
    Object.entries(stats.byDietType).forEach(([type, count]) => {
      if (count > 0) {
        logger.info(`       - ${type}: ${count}`);
      }
    });
    logger.info(`\n     State Distribution:`);
    Object.entries(stats.byState)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([state, count]) => {
        logger.info(`       - ${state}: ${count}`);
      });

    if (stats.missingState > 0 || stats.missingType > 0 || stats.missingIngredients > 0) {
      logger.warn(
        `\n  ⚠️  Found ${
          stats.missingState + stats.missingType + stats.missingIngredients
        } metadata issues in ${filename}`
      );
    } else {
      logger.info(`\n  ✨ All meals in ${filename} have complete metadata!`);
    }
  }

  /**
   * Parse medical guidance files (ingredient substitutes, symptom guidance, lab guidance)
   * These files use section-based structure with === markers
   */
  parseMedicalGuidance(content, filename) {
    const docs = [];

    // Determine document type from filename
    let docType = 'medical_info';
    if (filename.includes('ingredient_substitutes')) {
      docType = 'ingredient_substitute';
    } else if (filename.includes('symptom_dietary_guidance') || filename.includes('symptom')) {
      docType = 'symptom_guidance';
    } else if (filename.includes('lab_guidance')) {
      docType = 'lab_guidance';
    }

    logger.info(`   Parsing as type: ${docType}`);

    // Split by major sections (depends on file structure)
    let sections = [];

    if (docType === 'ingredient_substitute') {
      // Split by "--- INGREDIENT NAME ---" markers
      sections = content.split(/\n---\s+([A-Z\s\/&()]+)\s+---\n/);
    } else if (docType === 'symptom_guidance') {
      // Split by "--- SYMPTOM NAME ---" markers
      sections = content.split(/\n---\s+([A-Z\s\/&()]+)\s+---\n/);
    } else if (docType === 'lab_guidance') {
      // Split by "=== LAB: NAME ===" markers
      sections = content.split(/\n===\s+LAB:\s+([A-Z\s_()]+)\s+===\n/);
    } else {
      // For other medical files, split by major headers or chunk by paragraphs
      sections = this.chunkTextByParagraphs(content, 1500);
    }

    // Process sections
    if (Array.isArray(sections) && sections.length > 1) {
      for (let i = 1; i < sections.length; i += 2) {
        const sectionTitle = sections[i]?.trim();
        const sectionContent = sections[i + 1]?.trim();

        if (!sectionTitle || !sectionContent) continue;

        // Further chunk if content is too large (>2000 chars)
        if (sectionContent.length > 2000) {
          const chunks = this.chunkTextByParagraphs(sectionContent, 1500);
          chunks.forEach((chunk, idx) => {
            docs.push({
              content: `${sectionTitle}\n\n${chunk}`,
              metadata: {
                source: filename,
                type: docType,
                section: sectionTitle.toLowerCase(),
                chunkIndex: idx,
                totalChunks: chunks.length,
              },
            });
          });
        } else {
          docs.push({
            content: `${sectionTitle}\n\n${sectionContent}`,
            metadata: {
              source: filename,
              type: docType,
              section: sectionTitle.toLowerCase(),
            },
          });
        }
      }
    } else {
      // Fallback: chunk the entire content
      const chunks = this.chunkTextByParagraphs(content, 1500);
      chunks.forEach((chunk, idx) => {
        docs.push({
          content: chunk,
          metadata: {
            source: filename,
            type: docType,
            chunkIndex: idx,
            totalChunks: chunks.length,
          },
        });
      });
    }

    return docs;
  }

  /**
   * Chunk text by paragraphs to maintain semantic coherence
   */
  chunkTextByParagraphs(text, maxChunkSize = 1500) {
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      // If adding this paragraph would exceed max size, save current chunk
      if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedParagraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text]; // Fallback to full text if no chunks
  }

  // Extraction helpers for meal templates
  extractState(content) {
    // Match both "- State:" and "- **State:**" formats (strips markdown)
    const match = content.match(/-\s*\*?\*?State:\*?\*?\s*(.+?)[\s\n]/);
    return match ? match[1].trim() : '';
  }

  extractDietType(content) {
    // Match both "- Type:" and "- **Type:**" formats (strips markdown)
    const match = content.match(/-\s*\*?\*?Type:\*?\*?\s*(.+?)[\s\n]/);
    return match ? match[1].trim() : 'Vegetarian';
  }

  extractIngredients(content) {
    // Match both "- Ingredients:" and "- **Ingredients:**" formats (strips markdown)
    const match = content.match(/-\s*\*?\*?Ingredients?:\*?\*?\s*(.+?)[\s\n]/);
    return match ? match[1].trim() : '';
  }

  extractMacros(content) {
    const proteinMatch = content.match(/Protein (\d+)g/);
    const carbsMatch = content.match(/Carbs (\d+)g/);
    const fatsMatch = content.match(/Fats (\d+)g/);

    return {
      protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
      carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
      fats: fatsMatch ? parseInt(fatsMatch[1]) : 0,
    };
  }

  extractBudget(content) {
    const match = content.match(/- Budget: (₹[\d-]+)/);
    return match ? match[1] : '₹0';
  }

  extractPrepTime(content) {
    const match = content.match(/- Prep: (.+)/);
    return match ? match[1].trim() : '';
  }

  extractTip(content) {
    const match = content.match(/- Tip: (.+)/);
    return match ? match[1].trim() : '';
  }

  extractGI(content) {
    const match = content.match(/\(Low GI: ([★]+)\)/);
    return match ? 'Low' : 'Medium';
  }

  /**
   * Read all .txt files from meal_templates directory
   */
  async loadMealTemplates() {
    try {
      logger.info('📂 Reading meal template files...');

      if (!fs.existsSync(this.templatesDir)) {
        logger.warn(`⚠️  Meal templates directory not found: ${this.templatesDir}`);
        return [];
      }

      const files = fs.readdirSync(this.templatesDir).filter((file) => file.endsWith('.txt'));

      if (files.length === 0) {
        logger.warn('⚠️  No .txt files found in meal_templates directory');
        return [];
      }

      logger.info(`Found ${files.length} meal template files: ${files.join(', ')}`);

      let mealDocs = [];
      for (const file of files) {
        const filePath = path.join(this.templatesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        logger.info(`📄 Processing ${file}...`);
        const docs = this.parseMealTemplate(content, file);
        mealDocs.push(...docs);
        logger.info(`   ✓ Extracted ${docs.length} meal documents`);
      }

      logger.info(`✅ Total meal documents extracted: ${mealDocs.length}`);
      return mealDocs;
    } catch (error) {
      logger.error('Failed to load meal templates', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Read all .txt files from medical guidance directory
   */
  async loadMedicalGuidance() {
    try {
      logger.info('🏥 Reading medical guidance files...');

      if (!fs.existsSync(this.medicalDir)) {
        logger.warn(`⚠️  Medical directory not found: ${this.medicalDir}`);
        logger.info(
          '💡 Skipping medical guidance ingestion. Create the directory and add files to enable this feature.'
        );
        return [];
      }

      const files = fs.readdirSync(this.medicalDir).filter((file) => file.endsWith('.txt'));

      if (files.length === 0) {
        logger.warn('⚠️  No .txt files found in medical directory');
        logger.info('💡 Add medical guidance files to enable enhanced personalization.');
        return [];
      }

      logger.info(`Found ${files.length} medical guidance files: ${files.join(', ')}`);

      let medicalDocs = [];
      for (const file of files) {
        const filePath = path.join(this.medicalDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        logger.info(`📄 Processing ${file}...`);
        const docs = this.parseMedicalGuidance(content, file);
        medicalDocs.push(...docs);
        logger.info(`   ✓ Extracted ${docs.length} guidance documents`);
      }

      logger.info(`✅ Total medical documents extracted: ${medicalDocs.length}`);
      return medicalDocs;
    } catch (error) {
      logger.error('Failed to load medical guidance', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ingest all documents into vector store
   */
  async ingest() {
    try {
      logger.info('🚀 Starting enhanced RAG ingestion...');
      logger.info('='.repeat(60));

      // embeddings are already initialized as a singleton, no need to call initialize()
      logger.info('✅ Embeddings ready');

      // Initialize vector store
      await vectorStoreManager.initialize();
      logger.info('✅ Vector store initialized');

      // Load meal templates
      const mealDocs = await this.loadMealTemplates();

      // Load medical guidance
      const medicalDocs = await this.loadMedicalGuidance();

      // Combine all documents
      this.documents = [...mealDocs, ...medicalDocs];

      if (this.documents.length === 0) {
        logger.warn('⚠️  No documents to ingest');
        logger.info('💡 Add meal template or medical guidance files and re-run this script.');
        return false;
      }

      logger.info('='.repeat(60));
      logger.info('📊 Ingestion Summary:');
      logger.info(`   Meal Templates: ${mealDocs.length} documents`);
      logger.info(`   Medical Guidance: ${medicalDocs.length} documents`);
      logger.info(`   Total: ${this.documents.length} documents`);
      logger.info('='.repeat(60));

      const formattedDocs = this.documents.map((doc) => {
        // Validate metadata exists
        if (!doc.metadata || !doc.metadata.type) {
          logger.warn('Document missing type metadata:', {
            source: doc.metadata?.source || 'unknown',
          });
        }

        return {
          pageContent: doc.content || doc.pageContent,
          metadata: doc.metadata || { type: 'unknown' },
        };
      });

      // Add documents to vector store
      logger.info('📝 Adding documents to vector store...');
      await vectorStoreManager.addDocuments(formattedDocs);

      logger.info('💾 Saving vector store to disk...');
      await vectorStoreManager.save();

      logger.info('='.repeat(60));
      logger.info('✅ RAG ingestion completed successfully!');
      logger.info('='.repeat(60));

      return true;
    } catch (error) {
      logger.error('Ingestion failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Test retrieval after ingestion
   */
  async testRetrieval() {
    try {
      logger.info('🧪 Testing retrieval...');
      logger.info('='.repeat(60));

      const testQueries = [
        // Meal template queries
        { query: 'North Indian breakfast options', type: 'Meal Templates' },
        { query: 'West Indian vegetarian lunch', type: 'Meal Templates' },
        { query: 'East Indian dinner with fish', type: 'Meal Templates' },
        { query: 'Low GI breakfast meals', type: 'Meal Templates' },
        { query: 'High protein South Indian snacks', type: 'Meal Templates' },

        // Ingredient substitute queries
        { query: 'white rice substitute for PCOS vegetarian', type: 'Ingredient Substitutes' },
        { query: 'deep frying alternative baking method', type: 'Cooking Methods' },
        { query: 'maida substitute whole wheat PCOS', type: 'Ingredient Substitutes' },

        // Symptom guidance queries
        { query: 'insulin resistance dietary recommendations', type: 'Symptom Guidance' },
        { query: 'acne diet PCOS foods to avoid', type: 'Symptom Guidance' },
        { query: 'hair loss nutrition PCOS treatment', type: 'Symptom Guidance' },

        // Lab guidance queries
        { query: 'high fasting insulin dietary guidance', type: 'Lab Markers' },
        { query: 'elevated cholesterol PCOS nutrition', type: 'Lab Markers' },
      ];

      for (const { query, type } of testQueries) {
        logger.info(`\n🔍 [${type}] Query: "${query}"`);
        const results = await vectorStoreManager.similaritySearch(query, 3);

        if (results.length === 0) {
          logger.warn('   ⚠️  No results found');
          continue;
        }

        results.forEach((result, idx) => {
          const metadata = result.metadata;

          if (metadata.type === 'meal_template') {
            logger.info(
              `  ${idx + 1}. ${metadata.mealName || 'Unnamed Meal'} (${
                metadata.region || 'Unknown'
              })`
            );
            logger.info(
              `     Category: ${metadata.category || 'N/A'} | Diet: ${metadata.dietType || 'N/A'}`
            );
            logger.info(
              `     Macros: P${metadata.protein}g C${metadata.carbs}g F${metadata.fats}g | GI: ${metadata.gi}`
            );
          } else {
            logger.info(
              `  ${idx + 1}. [${metadata.type || 'Unknown Type'}] ${metadata.section || 'General'}`
            );
            logger.info(`     Source: ${metadata.source || 'N/A'}`);
            if (metadata.chunkIndex !== undefined) {
              logger.info(`     Chunk: ${metadata.chunkIndex + 1}/${metadata.totalChunks}`);
            }
          }

          // Show snippet of content
          const snippet = result.pageContent.substring(0, 150).replace(/\n/g, ' ');
          logger.info(`     Preview: ${snippet}...`);
        });
      }

      logger.info('\n' + '='.repeat(60));
      logger.info('✅ Retrieval test completed');
      logger.info('='.repeat(60));
    } catch (error) {
      logger.error('Retrieval test failed', { error: error.message });
    }
  }

  /**
   * Generate and display statistics about indexed documents
   */
  async displayStatistics() {
    try {
      logger.info('📊 RAG System Statistics:');
      logger.info('='.repeat(60));

      // Count by document type
      const typeCounts = {};
      this.documents.forEach((doc) => {
        const type = doc.metadata.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      logger.info('Document Type Distribution:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        const percentage = ((count / this.documents.length) * 100).toFixed(1);
        logger.info(`  - ${type}: ${count} documents (${percentage}%)`);
      });

      // Meal template statistics
      const mealDocs = this.documents.filter((d) => d.metadata.type === 'meal_template');
      if (mealDocs.length > 0) {
        logger.info('\nMeal Template Statistics:');

        const regionCounts = {};
        const dietCounts = {};
        mealDocs.forEach((doc) => {
          const region = doc.metadata.region || 'unknown';
          const diet = doc.metadata.dietType || 'unknown';
          regionCounts[region] = (regionCounts[region] || 0) + 1;
          dietCounts[diet] = (dietCounts[diet] || 0) + 1;
        });

        logger.info('  By Region:');
        Object.entries(regionCounts).forEach(([region, count]) => {
          logger.info(`    - ${region}: ${count} meals`);
        });

        logger.info('  By Diet Type:');
        Object.entries(dietCounts).forEach(([diet, count]) => {
          logger.info(`    - ${diet}: ${count} meals`);
        });
      }

      logger.info('='.repeat(60));
    } catch (error) {
      logger.error('Failed to display statistics', { error: error.message });
    }
  }
}

// Main execution
const ingester = new EnhancedRAGIngester();

ingester
  .ingest()
  .then(() => ingester.displayStatistics())
  .then(() => ingester.testRetrieval())
  .then(() => {
    logger.info('\n' + '🎉'.repeat(30));
    logger.info('🎉 SUCCESS! Enhanced RAG system is ready! 🎉');
    logger.info('🎉'.repeat(30));
    logger.info('\n📝 Next Steps:');
    logger.info('  1. Review the retrieval test results above');
    logger.info('  2. Update your meal plan controller to use multi-stage RAG retrieval');
    logger.info('  3. Test meal plan generation with the enhanced system');
    logger.info('  4. Monitor RAG quality metrics in generated meal plans\n');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  });
