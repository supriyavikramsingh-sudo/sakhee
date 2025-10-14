import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Embeddings');

class EmbeddingsManager {
  constructor() {
    this.embeddings = null;
  }

  /**
   * Initialize embeddings
   */
  initialize() {
    if (this.embeddings) {
      logger.info('✅ Embeddings already initialized');
      return this.embeddings;
    }

    try {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
        stripNewLines: true,
      });

      logger.info('🔗 Embeddings initialized');
      return this.embeddings;
    } catch (error) {
      logger.error('Failed to initialize embeddings', { error: error.message });
      throw error;
    }
  }

  /**
   * Get embeddings instance
   */
  getEmbeddings() {
    if (!this.embeddings) {
      this.initialize();
    }
    return this.embeddings;
  }

  /**
   * Generate embeddings for text
   */
  async embedQuery(text) {
    const embeddings = this.getEmbeddings();
    return await embeddings.embedQuery(text);
  }

  /**
   * Generate embeddings for multiple documents
   */
  async embedDocuments(texts) {
    const embeddings = this.getEmbeddings();
    return await embeddings.embedDocuments(texts);
  }
}

// Export singleton instance
export const embeddingsManager = new EmbeddingsManager();
export default embeddingsManager;
