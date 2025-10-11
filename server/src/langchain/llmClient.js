import { OpenAI } from '@langchain/openai'
import { env } from '../config/env.js'
import { appConfig } from '../config/appConfig.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger('LLMClient')

class LLMClient {
  constructor() {
    this.llm = new OpenAI({
      modelName: appConfig.model.name,
      temperature: appConfig.model.temperature,
      maxTokens: appConfig.model.maxTokens,
      openAIApiKey: env.OPENAI_API_KEY,
      topP: appConfig.model.topP,
      frequencyPenalty: appConfig.model.frequencyPenalty,
      presencePenalty: appConfig.model.presencePenalty
    })
    logger.info('🤖 LLM Client initialized')
  }

  async invoke(prompt) {
    try {
      const response = await this.llm.invoke(prompt)
      return response
    } catch (error) {
      logger.error('LLM invocation failed', { error: error.message })
      throw error
    }
  }

  async stream(prompt, onChunk) {
    try {
      const stream = await this.llm.stream(prompt)
      for await (const chunk of stream) {
        onChunk(chunk)
      }
    } catch (error) {
      logger.error('LLM streaming failed', { error: error.message })
      throw error
    }
  }

  getModel() {
    return this.llm
  }
}

export const llmClient = new LLMClient()
export default llmClient
