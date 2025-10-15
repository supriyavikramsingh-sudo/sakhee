import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Initialize __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (two levels up from scripts/) BEFORE any other imports
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import modules that depend on env vars
import { vectorStoreManager } from '../langchain/vectorStore.js';
import { embeddingsManager } from '../langchain/embeddings.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('MealTemplateIngestion');

class MealTemplateIngester {
  constructor() {
    this.templatesDir = path.join(__dirname, '../data/meal_templates');
    this.documents = [];
  }

  /**
   * Parse a meal template .txt file into structured documents
   */
  parseMealTemplate(content, filename) {
    const docs = [];
    const region = filename.replace('.txt', '').replace(/_/g, '-');

    // Split into sections by ## headers
    const sections = content.split(/\n## /);

    sections.forEach((section, idx) => {
      if (!section.trim()) return;

      const lines = section.split('\n');
      const sectionTitle = idx === 0 ? lines[0].replace(/^# /, '') : lines[0];
      const sectionContent = lines.slice(1).join('\n').trim();

      if (!sectionContent) return;

      // Further split into individual meals by ### headers
      const meals = sectionContent.split(/\n### /);

      meals.forEach((meal, mealIdx) => {
        if (!meal.trim()) return;

        const mealLines = meal.split('\n');
        const mealName = mealIdx === 0 ? mealLines[0].replace(/^### /, '') : mealLines[0];
        const mealContent = mealLines.slice(1).join('\n').trim();

        if (!mealContent) return;

        // Extract structured data
        const ingredients = this.extractIngredients(mealContent);
        const macros = this.extractMacros(mealContent);
        const budget = this.extractBudget(mealContent);
        const prepTime = this.extractPrepTime(mealContent);
        const tip = this.extractTip(mealContent);
        const gi = this.extractGI(mealContent);

        // Create a rich document for embedding
        const structuredContent = `
Region: ${region}
Category: ${sectionTitle}
Meal: ${mealName}
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
            category: sectionTitle.toLowerCase(),
            mealName: mealName,
            ingredients: ingredients.split(', '),
            protein: macros.protein,
            carbs: macros.carbs,
            fats: macros.fats,
            budgetMin: budget.split('-')[0],
            budgetMax: budget.split('-')[1] || budget.split('-')[0],
            prepTime: prepTime,
            gi: gi,
            tip: tip,
          },
        });
      });
    });

    return docs;
  }

  extractIngredients(content) {
    const match = content.match(/- Ingredients?: (.+)/);
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
  async loadTemplates() {
    try {
      logger.info('📂 Reading meal template files...');

      const files = fs.readdirSync(this.templatesDir).filter((file) => file.endsWith('.txt'));

      if (files.length === 0) {
        logger.warn('⚠️  No .txt files found in meal_templates directory');
        return [];
      }

      logger.info(`Found ${files.length} template files: ${files.join(', ')}`);

      for (const file of files) {
        const filePath = path.join(this.templatesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        logger.info(`📄 Processing ${file}...`);
        const docs = this.parseMealTemplate(content, file);
        this.documents.push(...docs);
        logger.info(`   ✓ Extracted ${docs.length} meal documents`);
      }

      logger.info(`✅ Total documents extracted: ${this.documents.length}`);
      return this.documents;
    } catch (error) {
      logger.error('Failed to load templates', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ingest documents into vector store
   */
  async ingest() {
    try {
      logger.info('🚀 Starting meal template ingestion...');

      // embeddings are already initialized as a singleton, no need to call initialize()
      logger.info('✅ Embeddings ready');

      // Initialize vector store
      await vectorStoreManager.initialize();
      logger.info('✅ Vector store initialized');

      // Load templates
      await this.loadTemplates();

      if (this.documents.length === 0) {
        logger.warn('⚠️  No documents to ingest');
        return false;
      }

      // Add documents to vector store
      logger.info('📝 Adding documents to vector store...');
      await vectorStoreManager.addDocuments(this.documents);

      logger.info('💾 Saving vector store to disk...');
      await vectorStoreManager.save();

      logger.info('✅ Meal template ingestion completed successfully!');
      logger.info(`📊 Summary: ${this.documents.length} meal documents indexed`);

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

      const testQueries = [
        'North Indian breakfast options',
        'West Indian vegetarian lunch',
        'East Indian dinner with fish',
        'Low GI breakfast meals',
        'High protein snacks',
      ];

      for (const query of testQueries) {
        logger.info(`\n🔍 Query: "${query}"`);
        const results = await vectorStoreManager.similaritySearch(query, 3);

        results.forEach((result, idx) => {
          logger.info(`  ${idx + 1}. ${result.metadata.mealName} (${result.metadata.region})`);
          logger.info(`     Score: ${result.score?.toFixed(4) || 'N/A'}`);
          logger.info(`     Category: ${result.metadata.category}`);
        });
      }

      logger.info('\n✅ Retrieval test completed');
    } catch (error) {
      logger.error('Retrieval test failed', { error: error.message });
    }
  }
}

// Main execution
const ingester = new MealTemplateIngester();

ingester
  .ingest()
  .then(() => ingester.testRetrieval())
  .then(() => {
    logger.info('🎉 All done! Meal templates are now available in the RAG system.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  });
