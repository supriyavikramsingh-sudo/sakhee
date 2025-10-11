import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { embeddingsManager } from './embeddings.js'
import fs from 'fs'
import path from 'path'
import { Logger } from '../utils/logger.js'

const logger = new Logger('VectorStore')

class VectorStoreManager {
  constructor() {
    this.vectorStore = null
    this.dbPath = './src/storage/localCache/vectordb'
  }

  async initialize() {
    try {
      // Try to load existing vector store
      if (fs.existsSync(this.dbPath)) {
        logger.info('📦 Loading existing vector store...')
        this.vectorStore = await HNSWLib.load(
          this.dbPath,
          embeddingsManager.getEmbeddings()
        )
      } else {
        // Create new vector store
        logger.info('📦 Creating new vector store...')
        this.vectorStore = new HNSWLib(
          embeddingsManager.getEmbeddings(),
          { space: 'cosine' }
        )
      }
      logger.info('✅ Vector store ready')
      return this.vectorStore
    } catch (error) {
      logger.error('Vector store initialization failed', { error: error.message })
      // Create fallback empty vector store
      this.vectorStore = new HNSWLib(
        embeddingsManager.getEmbeddings(),
        { space: 'cosine' }
      )
      return this.vectorStore
    }
  }

  async addDocuments(documents) {
    try {
      if (!this.vectorStore) {
        await this.initialize()
      }
      
      // Add documents to vector store
      const docs = documents.map((doc, idx) => ({
        pageContent: doc.content,
        metadata: {
          source: doc.source || 'unknown',
          type: doc.type || 'general',
          id: doc.id || idx,
          ...doc.metadata
        }
      }))

      await this.vectorStore.addDocuments(docs)
      logger.info(`📝 Added ${docs.length} documents to vector store`)
      
      // Save to disk
      await this.save()
      
      return true
    } catch (error) {
      logger.error('Failed to add documents', { error: error.message })
      throw error
    }
  }

  async similaritySearch(query, k = 5) {
    try {
      if (!this.vectorStore) {
        await this.initialize()
      }

      const results = await this.vectorStore.similaritySearchWithScore(query, k)
      
      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: score
      }))
    } catch (error) {
      logger.error('Similarity search failed', { error: error.message })
      return []
    }
  }

  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      await this.vectorStore.save(this.dbPath)
      logger.info('💾 Vector store saved to disk')
    } catch (error) {
      logger.warn('Vector store save failed (non-critical)', { error: error.message })
    }
  }

  getVectorStore() {
    return this.vectorStore
  }
}

export const vectorStoreManager = new VectorStoreManager()
export default vectorStoreManager