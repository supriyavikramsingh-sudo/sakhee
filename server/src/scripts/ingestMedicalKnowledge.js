// CRITICAL: Load environment variables BEFORE any other imports
// This must happen before env.js is loaded by any dependency
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory FIRST
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Now import other modules that depend on environment variables
import fs from 'fs';
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

        // Further split into sub-subsections by #### headers
        const subsubsections = subsectionContent.split(/\n#### /);

        subsubsections.forEach((subsubsection, subsubIdx) => {
          if (!subsubsection.trim()) return;

          const subsubLines = subsubsection.split('\n');
          const subsubsectionTitle =
            subsubIdx === 0 ? subsubLines[0].replace(/^#### /, '') : subsubLines[0];
          const finalContent = subsubLines.slice(1).join('\n').trim();

          if (!finalContent) {
            // No #### subsections, use the whole subsection content
            if (subsubIdx === 0) {
              const structuredContent = `
Topic: ${topic}
Section: ${sectionTitle}
Subsection: ${subsectionTitle}

Content:
${subsectionContent}
              `.trim();

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
            }
            return;
          }

          // Create structured document with sub-subsection
          const structuredContent = `
Topic: ${topic}
Section: ${sectionTitle}
Subsection: ${subsectionTitle}
Sub-subsection: ${subsubsectionTitle}

Content:
${finalContent}
          `.trim();

          const keywords = this.extractKeywords(finalContent);
          const category = this.categorizeContent(sectionTitle, subsectionTitle);

          docs.push({
            content: structuredContent,
            metadata: {
              source: filename,
              type: 'medical_knowledge',
              topic: topic,
              section: sectionTitle,
              subsection: subsectionTitle,
              subsubsection: subsubsectionTitle,
              category: category,
              keywords: keywords,
            },
          });
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

      // Add documents to vector store in batches to avoid token limit
      logger.info('📝 Adding medical documents to vector store...');
      const BATCH_SIZE = 1; // Process 1 document at a time to identify problematic documents
      const MAX_TOKENS = 6000; // Skip documents exceeding this token count (~75% of 8192 limit)
      const totalDocs = this.documents.length;
      const skippedDocs = [];

      for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
        const batch = this.documents.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalDocs / BATCH_SIZE);

        // Log document details for debugging
        const docInfo = batch.map((doc) => {
          const contentLength = doc.content?.length || 0;
          const approxTokens = Math.ceil(contentLength / 4); // Rough estimate: 1 token ≈ 4 chars
          return {
            display: `${doc.metadata?.source || 'unknown'}:${
              doc.metadata?.section || 'n/a'
            } (~${approxTokens} tokens)`,
            tokens: approxTokens,
            doc: doc,
          };
        });

        // Skip documents that are too large
        const doc = docInfo[0];
        if (doc.tokens > MAX_TOKENS) {
          logger.warn(
            `⚠️  Skipping batch ${batchNum}/${totalBatches} (exceeds ${MAX_TOKENS} token limit): ${doc.display}`
          );
          skippedDocs.push(doc.display);
          continue;
        }

        logger.info(`📦 Batch ${batchNum}/${totalBatches}: ${doc.display}`);

        try {
          await vectorStoreManager.addDocuments([doc.doc]);
        } catch (error) {
          logger.error(`❌ Failed to add batch ${batchNum}`, {
            documents: doc.display,
            error: error.message,
          });
          throw error;
        }
      }

      // Log skipped documents summary
      if (skippedDocs.length > 0) {
        logger.warn(
          `⚠️  Skipped ${skippedDocs.length} large documents (exceed ${MAX_TOKENS} tokens):`
        );
        skippedDocs.forEach((doc) => logger.warn(`   - ${doc}`));
        logger.warn(
          `   💡 Consider splitting these documents into smaller sections with ### headers`
        );
      }

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
