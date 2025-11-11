import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { vectorStoreManager } from '../langchain/vectorStore.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('NutritionalDataIngestion');

class NutritionalDataIngester {
  constructor() {
    this.nutritionalDir = path.join(__dirname, '../data/nutritional');
    this.documents = [];
  }

  /**
   * Parse nutritional guidelines .txt files
   */
  parseNutritionalDocument(content, filename) {
    const docs = [];
    const topic = filename.replace('.txt', '').replace(/_/g, ' ');

    // Split by major sections (## headers or blank lines)
    const sections = content.split(/\n\n(?=[A-Z][A-Z\s]+:)/);

    sections.forEach((section) => {
      if (!section.trim() || section.length < 50) return;

      // Extract section title (first line, usually in CAPS)
      const lines = section.split('\n');
      const sectionTitle = lines[0].replace(':', '').trim();
      const sectionContent = lines.slice(1).join('\n').trim();

      if (!sectionContent) return;

      // Create structured document
      const structuredContent = `
Topic: ${topic}
Section: ${sectionTitle}

${sectionContent}
      `.trim();

      // Extract nutrients, foods, and guidelines
      const nutrients = this.extractNutrients(sectionContent);
      const foods = this.extractFoods(sectionContent);
      const category = this.categorizeNutritionalContent(sectionTitle);

      docs.push({
        content: structuredContent,
        metadata: {
          source: filename,
          type: 'nutritional_data',
          documentType: 'nutritional_data', // ⭐ CRITICAL: Add documentType for Pinecone filtering
          topic: topic,
          section: sectionTitle,
          category: category,
          nutrients: nutrients,
          foods: foods,
        },
      });
    });

    return docs;
  }

  /**
   * Extract nutrient mentions from content
   */
  extractNutrients(content) {
    const nutrients = new Set();
    const nutrientKeywords = [
      'protein',
      'carbohydrate',
      'carbs',
      'fat',
      'fiber',
      'omega-3',
      'omega-6',
      'vitamin A',
      'vitamin B',
      'vitamin C',
      'vitamin D',
      'vitamin E',
      'vitamin K',
      'calcium',
      'iron',
      'magnesium',
      'zinc',
      'selenium',
      'chromium',
      'folate',
      'inositol',
      'biotin',
      'potassium',
      'sodium',
      'antioxidant',
      'glycemic index',
      'GI',
      'macro',
      'micro',
    ];

    nutrientKeywords.forEach((nutrient) => {
      if (content.toLowerCase().includes(nutrient.toLowerCase())) {
        nutrients.add(nutrient);
      }
    });

    return Array.from(nutrients);
  }

  /**
   * Extract food mentions from content
   */
  extractFoods(content) {
    const foods = new Set();
    const foodKeywords = [
      'dal',
      'lentil',
      'chickpea',
      'rajma',
      'chole',
      'moong',
      'masoor',
      'rice',
      'wheat',
      'oats',
      'quinoa',
      'millet',
      'bajra',
      'jowar',
      'ragi',
      'vegetable',
      'fruit',
      'spinach',
      'broccoli',
      'cauliflower',
      'paneer',
      'tofu',
      'egg',
      'chicken',
      'fish',
      'salmon',
      'nuts',
      'almond',
      'walnut',
      'seeds',
      'chia',
      'flax',
      'pumpkin seed',
      'yogurt',
      'curd',
      'milk',
      'ghee',
      'butter',
      'oil',
      'olive oil',
      'apple',
      'berry',
      'banana',
      'orange',
      'guava',
      'papaya',
    ];

    foodKeywords.forEach((food) => {
      if (content.toLowerCase().includes(food)) {
        foods.add(food);
      }
    });

    return Array.from(foods);
  }

  /**
   * Categorize nutritional content
   */
  categorizeNutritionalContent(section) {
    const text = section.toLowerCase();

    if (
      text.includes('macro') ||
      text.includes('protein') ||
      text.includes('carb') ||
      text.includes('fat')
    )
      return 'macronutrients';
    if (text.includes('glycemic') || text.includes('gi')) return 'glycemic_index';
    if (text.includes('vitamin') || text.includes('mineral') || text.includes('supplement'))
      return 'micronutrients';
    if (text.includes('protein source') || text.includes('food')) return 'food_sources';
    if (text.includes('mistake') || text.includes('avoid')) return 'mistakes_to_avoid';
    if (text.includes('expectation') || text.includes('timeline')) return 'expectations';
    if (text.includes('meal timing') || text.includes('when to eat')) return 'meal_timing';
    if (text.includes('hydration') || text.includes('water')) return 'hydration';

    return 'general_nutrition';
  }

  /**
   * Read all nutritional data files
   */
  async loadNutritionalData() {
    try {
      logger.info('📂 Reading nutritional data files...');

      if (!fs.existsSync(this.nutritionalDir)) {
        logger.warn('⚠️  Nutritional data directory not found. Creating it...');
        fs.mkdirSync(this.nutritionalDir, { recursive: true });
        logger.info('✅ Directory created. Please add nutritional data .txt files.');
        return [];
      }

      const files = fs.readdirSync(this.nutritionalDir).filter((file) => file.endsWith('.txt'));

      if (files.length === 0) {
        logger.warn('⚠️  No .txt files found in nutritional directory');
        return [];
      }

      logger.info(`Found ${files.length} nutritional data files: ${files.join(', ')}`);

      for (const file of files) {
        const filePath = path.join(this.nutritionalDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        logger.info(`📄 Processing ${file}...`);
        const docs = this.parseNutritionalDocument(content, file);
        this.documents.push(...docs);
        logger.info(`   ✓ Extracted ${docs.length} nutritional documents`);
      }

      logger.info(`✅ Total nutritional documents extracted: ${this.documents.length}`);
      return this.documents;
    } catch (error) {
      logger.error('Failed to load nutritional data', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Ingest nutritional data into vector store
   */
  async ingest() {
    try {
      logger.info('🚀 Starting nutritional data ingestion...');

      // Embeddings are already initialized as singleton
      logger.info('✅ Embeddings ready');

      // Initialize vector store
      await vectorStoreManager.initialize();
      logger.info('✅ Vector store initialized');

      // Load nutritional data
      await this.loadNutritionalData();

      if (this.documents.length === 0) {
        logger.warn('⚠️  No documents to ingest');
        return false;
      }

      // Add documents to vector store
      logger.info('📝 Adding nutritional documents to vector store...');
      await vectorStoreManager.addDocuments(this.documents);

      logger.info('💾 Saving vector store to disk...');
      await vectorStoreManager.save();

      logger.info('✅ Nutritional data ingestion completed successfully!');
      logger.info(`📊 Summary: ${this.documents.length} nutritional documents indexed`);

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
      logger.info('🧪 Testing nutritional data retrieval...');

      const testQueries = [
        'What is the ideal macronutrient ratio for PCOS?',
        'Best protein sources for vegetarians',
        'Low glycemic index foods',
        'Supplements for PCOS',
        'Common nutrition mistakes with PCOS',
      ];

      for (const query of testQueries) {
        logger.info(`\n🔍 Query: "${query}"`);
        const results = await vectorStoreManager.similaritySearch(query, 3);

        results.forEach((result, idx) => {
          logger.info(`  ${idx + 1}. ${result.metadata.section}`);
          logger.info(`     Score: ${result.score?.toFixed(4) || 'N/A'}`);
          logger.info(`     Category: ${result.metadata.category}`);
          if (result.metadata.nutrients) {
            // Handle both array and string formats
            const nutrients = Array.isArray(result.metadata.nutrients)
              ? result.metadata.nutrients.slice(0, 3).join(', ')
              : typeof result.metadata.nutrients === 'string'
              ? result.metadata.nutrients
              : JSON.stringify(result.metadata.nutrients);
            logger.info(`     Nutrients: ${nutrients}`);
          }
        });
      }

      logger.info('\n✅ Retrieval test completed');
    } catch (error) {
      logger.error('Retrieval test failed', { error: error.message });
    }
  }
}

// Main execution
const ingester = new NutritionalDataIngester();

ingester
  .ingest()
  .then(() => ingester.testRetrieval())
  .then(() => {
    logger.info('🎉 All done! Nutritional data is now available in the RAG system.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  });
