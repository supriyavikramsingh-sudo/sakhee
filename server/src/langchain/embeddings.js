import { OpenAIEmbeddings } from '@langchain/openai'
import { env } from '../config/env.js'
import { appConfig } from '../config/appConfig.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger('Embeddings')

class EmbeddingsManager {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: appConfig.embeddings.model,
      openAIApiKey: env.OPENAI_API_KEY
    })
    logger.info('🔗 Embeddings initialized')
  }

  async generateEmbedding(text) {
    try {
      const embedding = await this.embeddings.embedQuery(text)
      return embedding
    } catch (error) {
      logger.error('Embedding generation failed', { error: error.message })
      throw error
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts)
      return embeddings
    } catch (error) {
      logger.error('Batch embedding generation failed', { error: error.message })
      throw error
    }
  }

  getEmbeddings() {
    return this.embeddings
  }
}

export const embeddingsManager = new EmbeddingsManager()
export default embeddingsManager