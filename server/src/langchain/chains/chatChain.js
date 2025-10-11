import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { llmClient } from '../llmClient.js'
import { retriever } from '../retriever.js'
import { Logger } from '../../utils/logger.js'
import fs from 'fs'
import path from 'path'

const logger = new Logger('ChatChain')

class ChatChain {
  constructor() {
    this.memory = new BufferMemory({ returnMessages: true })
    this.systemPrompt = this.loadSystemPrompt()
  }

  loadSystemPrompt() {
    try {
      const promptPath = path.join(
        process.cwd(),
        'src/langchain/prompts/systemPrompt.md'
      )
      return fs.readFileSync(promptPath, 'utf-8')
    } catch (error) {
      logger.warn('System prompt file not found, using default')
      return `You are Sakhee, an empathetic AI health companion for PCOS management.
      
Provide evidence-based, cultural, and personalized guidance.
Always include medical disclaimers for health-related advice.
Never diagnose or prescribe medications.
Connect women to verified community experiences.`
    }
  }

  async processMessage(userMessage, userContext = {}) {
    try {
      logger.info('Processing chat message', { messageLength: userMessage.length })

      // Step 1: Retrieve relevant documents (RAG)
      const relevantDocs = await retriever.retrieve(userMessage)
      const context = retriever.formatContextFromResults(relevantDocs)

      // Step 2: Build prompt with context
      const promptTemplate = PromptTemplate.fromTemplate(`
${this.systemPrompt}

USER CONTEXT:
Age: ${userContext.age || 'Not provided'}
Location: ${userContext.location || 'Not provided'}
Dietary Preference: ${userContext.dietaryPreference || 'Not provided'}
Primary Goals: ${userContext.goals?.join(', ') || 'Not provided'}

RETRIEVED CONTEXT (RAG):
${context || 'No specific context found'}

Current Conversation:
{history}

User: {input}
Assistant:`)

      // Step 3: Create conversation chain
      const chain = new ConversationChain({
        llm: llmClient.getModel(),
        memory: this.memory,
        prompt: promptTemplate
      })

      // Step 4: Invoke chain
      const response = await chain.invoke({ input: userMessage })

      // Step 5: Add disclaimer if health-related
      let finalResponse = response
      if (this.isHealthRelated(userMessage)) {
        finalResponse += '\n\n⚠️ *This is educational guidance only. Consult a healthcare professional for personalized medical advice.*'
      }

      logger.info('Chat message processed successfully')
      return {
        message: finalResponse,
        sources: relevantDocs.map(doc => ({
          content: doc.content.substring(0, 100),
          source: doc.metadata.source,
          type: doc.metadata.type
        }))
      }
    } catch (error) {
      logger.error('Chat processing failed', { error: error.message })
      throw error
    }
  }

  isHealthRelated(message) {
    const healthKeywords = [
      'symptom', 'pain', 'bleed', 'period', 'hormone',
      'insulin', 'weight', 'acne', 'hair', 'fatigue',
      'medication', 'supplement', 'pregnant', 'fertile'
    ]
    return healthKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    )
  }

  clearMemory() {
    this.memory.clear()
  }

  getMemory() {
    return this.memory
  }
}

export const chatChain = new ChatChain()
export default chatChain