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

const logger = new Logger('MedicalKnowledgeIngestion');

class MedicalKnowledgeIngester {
  constructor() {
    this.medicalDir = path.join(__dirname, '../data/medical');
    this.documents = [];
  }

  /**
   * Parse medical knowledge .txt files into structured documents
   */
  parseMedicalDocument(content, filename) {
    const docs = [];
    const topic = filename.replace('.txt', '').replace(/_/g, ' ');

    // Split by major sections (## headers)
    const sections = content.split(/\n## /);

    sections.forEach((section, idx) => {
      if (!section.trim()) return;

      const lines = section.split('\n');
      const sectionTitle = idx === 0 ? lines[0].replace(/^# /, '') : lines[0];
      const sectionContent = lines.slice(1).join('\n').trim();

      if (!sectionContent) return;

      // Further split into subsections by ### headers
      const subsections = sectionContent.split(/\n### /);

      subsections.forEach((subsection, subIdx) => {
        if (!subsection.trim()) return;

        const subLines = subsection.split('\n');
        const subsectionTitle = subIdx === 0 ? subLines[0].replace(/^### /, '') : subLines[0];
        const subsectionContent = subLines.slice(1).join('\n').trim();

        if (!subsectionContent) return;

        // Create structured document
        const structuredContent = `
Topic: ${topic}
Section: ${sectionTitle}
Subsection: ${subsectionTitle}

Content:
${subsectionContent}
        `.trim();

        // Extract key information for metadata
        const keywords = this.extractKeywords(subsectionContent);
        const category = this.categorizeContent(sectionTitle, subsectionTitle);

        docs.push({
          content: structuredContent,
          metadata: {
            source: filename,
            type: 'medical_knowledge',
            topic: topic,
            section: sectionTitle,
            subsection: subsectionTitle,
            category: category,
            keywords: keywords,
          },
        });
      });
    });

    return docs;
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    const keywords = new Set();
    const commonKeywords = [
      'PCOS',
      'PCOD',
      'insulin resistance',
      'hormone',
      'testosterone',
      'ovulation',
      'period',
      'cycle',
      'symptom',
      'treatment',
      'diet',
      'exercise',
      'weight',
      'fertility',
      'pregnancy',
      'medication',
      'metformin',
      'birth control',
      'acne',
      'hirsutism',
      'hair loss',
      'mood',
      'anxiety',
      'depression',
      'inflammation',
      'thyroid',
      'vitamin',
      'supplement',
      'inositol',
      'diagnosis',
      'ultrasound',
      'blood test',
      'AMH',
      'LH',
      'FSH',
      'estrogen',
      'progesterone',
    ];

    commonKeywords.forEach((keyword) => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        keywords.add(keyword);
      }
    });

    return Array.from(keywords);
  }

  /**
   * Categorize content for better retrieval
   */
  categorizeContent(section, subsection) {
    const text = `${section} ${subsection}`.toLowerCase();

    if (text.includes('symptom') || text.includes('sign')) return 'symptoms';
    if (text.includes('diagnosis') || text.includes('test')) return 'diagnosis';
    if (text.includes('treatment') || text.includes('medication')) return 'treatment';
    if (text.includes('diet') || text.includes('nutrition') || text.includes('food'))
      return 'nutrition';
    if (text.includes('exercise') || text.includes('lifestyle')) return 'lifestyle';
    if (text.includes('fertility') || text.includes('pregnancy')) return 'fertility';
    if (text.includes('complication') || text.includes('risk')) return 'complications';
    if (text.includes('mental') || text.includes('emotional') || text.includes('mood'))
      return 'mental_health';

    return 'general';
  }

  /**
   * Read all medical knowledge files
   */
  async loadMedicalKnowledge() {
    try {
      logger.info('📂 Reading medical knowledge files...');

      if (!fs.existsSync(this.medicalDir)) {
        logger.warn('⚠️  Medical knowledge directory not found. Creating it...');
        fs.mkdirSync(this.medicalDir, { recursive: true });
        logger.info('✅ Directory created. Please add medical knowledge .txt files.');
        return [];
      }

      const files = fs.readdirSync(this.medicalDir).filter((file) => file.endsWith('.txt'));

      if (files.length === 0) {
        logger.warn('⚠️  No .txt files found in medical directory');
        return [];
      }

      logger.info(`Found ${files.length} medical knowledge files: ${files.join(', ')}`);

      for (const file of files) {
        const filePath = path.join(this.medicalDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        logger.info(`📄 Processing ${file}...`);
        const docs = this.parseMedicalDocument(content, file);
        this.documents.push(...docs);
        logger.info(`   ✓ Extracted ${docs.length} knowledge documents`);
      }

      logger.info(`✅ Total medical documents extracted: ${this.documents.length}`);
      return this.documents;
    } catch (error) {
      logger.error('Failed to load medical knowledge', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Ingest medical knowledge into vector store
   */
  async ingest() {
    try {
      logger.info('🚀 Starting medical knowledge ingestion...');

      // Embeddings are already initialized as singleton
      logger.info('✅ Embeddings ready');

      // Initialize vector store
      await vectorStoreManager.initialize();
      logger.info('✅ Vector store initialized');

      // Load medical knowledge
      await this.loadMedicalKnowledge();

      if (this.documents.length === 0) {
        logger.warn('⚠️  No documents to ingest');
        return false;
      }

      // Add documents to vector store
      logger.info('📝 Adding medical documents to vector store...');
      await vectorStoreManager.addDocuments(this.documents);

      logger.info('💾 Saving vector store to disk...');
      await vectorStoreManager.save();

      logger.info('✅ Medical knowledge ingestion completed successfully!');
      logger.info(`📊 Summary: ${this.documents.length} medical documents indexed`);

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
      logger.info('🧪 Testing medical knowledge retrieval...');

      const testQueries = [
        'What are the symptoms of PCOS?',
        'How is PCOS diagnosed?',
        'Treatment options for PCOS',
        'PCOS and insulin resistance',
        'Mental health effects of PCOS',
      ];

      for (const query of testQueries) {
        logger.info(`\n🔍 Query: "${query}"`);
        const results = await vectorStoreManager.similaritySearch(query, 3);

        results.forEach((result, idx) => {
          logger.info(`  ${idx + 1}. ${result.metadata.subsection} (${result.metadata.topic})`);
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
const ingester = new MedicalKnowledgeIngester();

ingester
  .ingest()
  .then(() => ingester.testRetrieval())
  .then(() => {
    logger.info('🎉 All done! Medical knowledge is now available in the RAG system.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  });
