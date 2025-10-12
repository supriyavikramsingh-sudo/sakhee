import { OpenAI } from '@langchain/openai';
import { env } from '../config/env.js';
import { appConfig } from '../config/appConfig.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('LLMClient');

class LLMClient {
  constructor() {
    this.llm = new OpenAI({
      modelName: appConfig.model.name,
      temperature: appConfig.model.temperature,
      maxTokens: appConfig.model.maxTokens,
      openAIApiKey: env.OPENAI_API_KEY,
      topP: appConfig.model.topP,
      frequencyPenalty: appConfig.model.frequencyPenalty,
      presencePenalty: appConfig.model.presencePenalty,
    });
    logger.info('🤖 LLM Client initialized');
  }

  /**
   * Invoke LLM with optional parameter overrides
   * @param {string} prompt - The prompt to send
   * @param {object} options - Optional overrides (maxTokens, temperature, etc.)
   * @returns {Promise<string>} - LLM response
   */
  async invoke(prompt, options = {}) {
    try {
      // If options provided, create a temporary LLM instance with overrides
      if (options && Object.keys(options).length > 0) {
        const tempLLM = new OpenAI({
          modelName: options.modelName || appConfig.model.name,
          temperature: options.temperature ?? appConfig.model.temperature,
          maxTokens: options.maxTokens ?? appConfig.model.maxTokens,
          openAIApiKey: env.OPENAI_API_KEY,
          topP: options.topP ?? appConfig.model.topP,
          frequencyPenalty: options.frequencyPenalty ?? appConfig.model.frequencyPenalty,
          presencePenalty: options.presencePenalty ?? appConfig.model.presencePenalty,
        });

        // CRITICAL: Force JSON mode if requested
        const invokeOptions = {};
        if (options.responseFormat === 'json_object') {
          invokeOptions.response_format = { type: 'json_object' };
        }

        logger.info('🔧 LLM invoked with overrides', {
          maxTokens: options.maxTokens ?? appConfig.model.maxTokens,
          temperature: options.temperature ?? appConfig.model.temperature,
          jsonMode: !!options.responseFormat,
        });

        const response = await tempLLM.invoke(prompt, invokeOptions);
        return response;
      }

      // Use default configuration
      logger.info('📤 LLM invoked with defaults');
      const response = await this.llm.invoke(prompt);
      return response;
    } catch (error) {
      logger.error('LLM invocation failed', { error: error.message });
      throw error;
    }
  }

  async stream(prompt, onChunk, options = {}) {
    try {
      // Create streaming-compatible LLM instance
      const streamLLM = new OpenAI({
        modelName: options.modelName || appConfig.model.name,
        temperature: options.temperature ?? appConfig.model.temperature,
        maxTokens: options.maxTokens ?? appConfig.model.maxTokens,
        openAIApiKey: env.OPENAI_API_KEY,
        streaming: true, // Enable streaming
      });

      logger.info('📡 LLM streaming started');
      const stream = await streamLLM.stream(prompt);

      for await (const chunk of stream) {
        onChunk(chunk);
      }

      logger.info('✅ LLM streaming completed');
    } catch (error) {
      logger.error('LLM streaming failed', { error: error.message });
      throw error;
    }
  }

  getModel() {
    return this.llm;
  }
}

export const llmClient = new LLMClient();
export default llmClient;
