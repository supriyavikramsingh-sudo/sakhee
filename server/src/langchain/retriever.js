import { vectorStoreManager } from './vectorStore.js'
import { appConfig } from '../config/appConfig.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger('Retriever')

class Retriever {
  async retrieve(query, options = {}) {
    try {
      const topK = options.topK || appConfig.rag.topK
      const minScore = options.minScore || appConfig.rag.minScore

      // Get similar documents from vector store
      const results = await vectorStoreManager.similaritySearch(query, topK)

      // Filter by minimum score
      const filtered = results.filter(r => r.score >= minScore)

      logger.info(`🔍 Retrieved ${filtered.length} relevant documents`)

      return filtered
    } catch (error) {
      logger.error('Retrieval failed', { error: error.message })
      return []
    }
  }

  async retrieveByType(query, documentType, options = {}) {
    try {
      const results = await this.retrieve(query, options)
      
      // Filter by document type
      const filtered = results.filter(
        r => r.metadata.type === documentType
      )

      return filtered
    } catch (error) {
      logger.error('Type-based retrieval failed', { error: error.message })
      return []
    }
  }

  formatContextFromResults(results) {
    return results
      .map((result, idx) => {
        const source = result.metadata.source || 'Unknown Source'
        return `[${idx + 1}] ${result.content}\n(Source: ${source})`
      })
      .join('\n\n')
  }
}

export const retriever = new Retriever()
export default retriever