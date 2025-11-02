// server/src/controllers/chatController.js
// Chat Controller - MVC Pattern Implementation with Enhanced Logging

import { chatChain } from '../langchain/chains/chatChain.js';
import { Logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('ChatController');

// Store for chat history (replace with DB in production)
const chatHistories = new Map();
const chatFeedback = new Map();

export class ChatController {
  /**
   * Process chat message with AI response
   * POST /api/chat/message
   */
  static async processMessage(req, res) {
    const requestId = uuidv4();
    logger.startRequest(requestId, 'POST', '/api/chat/message', req.get('User-Agent'));
    logger.functionEntry('ChatController.processMessage', { hasBody: !!req.body }, requestId);

    try {
      const { message, userId, userContext = {} } = req.body;

      // Input validation
      if (!message || message.trim().length === 0) {
        logger.warn('Empty message provided', { requestId, userId });
        logger.endRequest(requestId, 400);
        return res.status(400).json({
          success: false,
          error: { message: 'Message cannot be empty' },
        });
      }

      if (!userId) {
        logger.warn('Missing userId', { requestId });
        logger.endRequest(requestId, 400);
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' },
        });
      }

      logger.info('Processing chat message with lab value integration', {
        requestId,
        userId,
        messageLength: message.length,
        hasUserContext: !!userContext,
      });

      // Get or create chat history
      if (!chatHistories.has(userId)) {
        chatHistories.set(userId, []);
        logger.debug('Created new chat history for user', { requestId, userId });
      }

      // CRITICAL: Pass userId in userContext for lab value retrieval
      const enrichedContext = {
        ...userContext,
        userId, // Ensure userId is always available
      };

      logger.debug('Enriched context prepared', { requestId, userId, contextKeys: Object.keys(enrichedContext) });

      // Process message with RAG + Lab Values + Reddit + SERP
      const startTime = Date.now();
      logger.performanceLog('chatChain.processMessage - START', 0, { requestId, userId });
      
      const response = await chatChain.processMessage(message, enrichedContext);
      
      const processingDuration = Date.now() - startTime;
      logger.performanceLog('chatChain.processMessage - COMPLETE', processingDuration, { 
        requestId, 
        userId,
        hasResponse: !!response,
        sourcesCount: response?.sources?.length || 0
      });

      // Add to history
      const history = chatHistories.get(userId);
      const userMessage = {
        type: 'user',
        message,
        timestamp: new Date(),
      };
      
      const assistantMessage = {
        type: 'assistant',
        message: response.message,
        sources: response.sources,
        contextUsed: response.contextUsed,
        timestamp: new Date(),
      };

      history.push(userMessage, assistantMessage);

      // Keep only last 50 messages
      if (history.length > 50) {
        const trimmedHistory = history.slice(-50);
        chatHistories.set(userId, trimmedHistory);
        logger.debug('Chat history trimmed', { requestId, userId, newLength: trimmedHistory.length });
      }

      // Check for health-related flags
      const requiresDoctor = req.requiresDoctorConsultation;
      const severity = req.severityLevel;

      if (requiresDoctor) {
        logger.warn('Doctor consultation required flag detected', { requestId, userId, severity });
      }

      const responseData = {
        success: true,
        data: {
          message: response.message,
          sources: response.sources,
          contextUsed: response.contextUsed,
          requiresDoctor,
          severity,
          timestamp: new Date(),
        },
      };

      logger.info('Chat message processed successfully', {
        requestId,
        userId,
        responseLength: response.message?.length || 0,
        sourcesCount: response.sources?.length || 0,
        requiresDoctor,
        severity
      });

      logger.functionExit('ChatController.processMessage', 'success', requestId);
      logger.endRequest(requestId, 200, JSON.stringify(responseData).length);
      
      res.json(responseData);

    } catch (error) {
      logger.error('Chat message processing failed', { 
        requestId,
        error: error.message, 
        stack: error.stack,
        userId: req.body?.userId
      });
      
      logger.functionExit('ChatController.processMessage', 'error', requestId);
      logger.endRequest(requestId, 500);
      
      res.status(500).json({
        success: false,
        error: { message: 'Failed to process message', details: error.message },
      });
    }
  }

  /**
   * Get chat history for a user
   * GET /api/chat/history/:userId
   */
  static async getChatHistory(req, res) {
    const requestId = uuidv4();
    logger.startRequest(requestId, 'GET', `/api/chat/history/${req.params.userId}`, req.get('User-Agent'));
    logger.functionEntry('ChatController.getChatHistory', { userId: req.params.userId }, requestId);

    try {
      const { userId } = req.params;
      const history = chatHistories.get(userId) || [];

      logger.info('Chat history retrieved', {
        requestId,
        userId,
        messageCount: history.length
      });

      const responseData = {
        success: true,
        data: {
          messages: history,
          count: history.length,
        },
      };

      logger.functionExit('ChatController.getChatHistory', 'success', requestId);
      logger.endRequest(requestId, 200, JSON.stringify(responseData).length);
      
      res.json(responseData);

    } catch (error) {
      logger.error('Get chat history failed', { 
        requestId,
        error: error.message,
        userId: req.params.userId
      });
      
      logger.functionExit('ChatController.getChatHistory', 'error', requestId);
      logger.endRequest(requestId, 500);
      
      res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve chat history' },
      });
    }
  }

  /**
   * Clear chat history for a user
   * DELETE /api/chat/history/:userId
   */
  static async clearChatHistory(req, res) {
    const requestId = uuidv4();
    logger.startRequest(requestId, 'DELETE', `/api/chat/history/${req.params.userId}`, req.get('User-Agent'));
    logger.functionEntry('ChatController.clearChatHistory', { userId: req.params.userId }, requestId);

    try {
      const { userId } = req.params;
      const hadHistory = chatHistories.has(userId);
      const messageCount = hadHistory ? chatHistories.get(userId).length : 0;
      
      chatHistories.delete(userId);

      logger.info('Chat history cleared', { 
        requestId,
        userId,
        hadHistory,
        clearedMessageCount: messageCount
      });

      const responseData = {
        success: true,
        data: { message: 'Chat history cleared successfully' },
      };

      logger.functionExit('ChatController.clearChatHistory', 'success', requestId);
      logger.endRequest(requestId, 200, JSON.stringify(responseData).length);
      
      res.json(responseData);

    } catch (error) {
      logger.error('Clear chat history failed', { 
        requestId,
        error: error.message,
        userId: req.params.userId
      });
      
      logger.functionExit('ChatController.clearChatHistory', 'error', requestId);
      logger.endRequest(requestId, 500);
      
      res.status(500).json({
        success: false,
        error: { message: 'Failed to clear chat history' },
      });
    }
  }

  /**
   * Submit feedback for a chat message
   * POST /api/chat/feedback
   */
  static async submitFeedback(req, res) {
    const requestId = uuidv4();
    logger.startRequest(requestId, 'POST', '/api/chat/feedback', req.get('User-Agent'));
    logger.functionEntry('ChatController.submitFeedback', { hasBody: !!req.body }, requestId);

    try {
      const { userId, messageId, userPrompt, aiResponse, feedbackType } = req.body;

      // Input validation
      if (!userId || !messageId || !feedbackType) {
        logger.warn('Missing required feedback fields', { 
          requestId,
          hasUserId: !!userId,
          hasMessageId: !!messageId,
          hasFeedbackType: !!feedbackType
        });
        
        logger.endRequest(requestId, 400);
        return res.status(400).json({
          success: false,
          error: { message: 'userId, messageId, and feedbackType are required' },
        });
      }

      if (!['thumbs_up', 'thumbs_down'].includes(feedbackType)) {
        logger.warn('Invalid feedback type', { requestId, feedbackType, userId });
        logger.endRequest(requestId, 400);
        return res.status(400).json({
          success: false,
          error: { message: 'feedbackType must be either thumbs_up or thumbs_down' },
        });
      }

      const feedbackEntry = {
        userId,
        messageId,
        userPrompt: userPrompt || '',
        aiResponse: aiResponse || '',
        feedbackType,
        timestamp: new Date(),
      };

      // Store feedback (using messageId as key for easy retrieval)
      chatFeedback.set(messageId, feedbackEntry);

      logger.info('Chat feedback submitted', {
        requestId,
        userId,
        messageId,
        feedbackType,
        hasUserPrompt: !!userPrompt,
        hasAiResponse: !!aiResponse
      });

      const responseData = {
        success: true,
        data: {
          message: 'Feedback submitted successfully',
          feedbackId: messageId,
        },
      };

      logger.functionExit('ChatController.submitFeedback', 'success', requestId);
      logger.endRequest(requestId, 200, JSON.stringify(responseData).length);
      
      res.json(responseData);

    } catch (error) {
      logger.error('Submit chat feedback failed', { 
        requestId,
        error: error.message,
        userId: req.body?.userId
      });
      
      logger.functionExit('ChatController.submitFeedback', 'error', requestId);
      logger.endRequest(requestId, 500);
      
      res.status(500).json({
        success: false,
        error: { message: 'Failed to submit feedback' },
      });
    }
  }

  /**
   * Get feedback history for a user (admin/analytics use)
   * GET /api/chat/feedback/:userId
   */
  static async getFeedbackHistory(req, res) {
    const requestId = uuidv4();
    logger.startRequest(requestId, 'GET', `/api/chat/feedback/${req.params.userId}`, req.get('User-Agent'));
    logger.functionEntry('ChatController.getFeedbackHistory', { userId: req.params.userId }, requestId);

    try {
      const { userId } = req.params;
      const userFeedback = [];

      // Filter feedback by userId
      for (const [messageId, feedback] of chatFeedback.entries()) {
        if (feedback.userId === userId) {
          userFeedback.push(feedback);
        }
      }

      logger.info('Chat feedback history retrieved', {
        requestId,
        userId,
        feedbackCount: userFeedback.length
      });

      const responseData = {
        success: true,
        data: {
          feedback: userFeedback,
          count: userFeedback.length,
        },
      };

      logger.functionExit('ChatController.getFeedbackHistory', 'success', requestId);
      logger.endRequest(requestId, 200, JSON.stringify(responseData).length);
      
      res.json(responseData);

    } catch (error) {
      logger.error('Get chat feedback failed', { 
        requestId,
        error: error.message,
        userId: req.params.userId
      });
      
      logger.functionExit('ChatController.getFeedbackHistory', 'error', requestId);
      logger.endRequest(requestId, 500);
      
      res.status(500).json({
        success: false,
        error: { message: 'Failed to retrieve feedback' },
      });
    }
  }
}

export default ChatController;
