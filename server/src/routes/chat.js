import express from 'express'
import { chatChain } from '../langchain/chains/chatChain.js'
import { Logger } from '../utils/logger.js'

const router = express.Router()
const logger = new Logger('ChatRoutes')

// Store for chat history (replace with DB in production)
const chatHistories = new Map()

/**
 * POST /api/chat/message
 * Send a message and get AI response
 */
router.post('/message', async (req, res) => {
  try {
    const { message, userId, userContext = {} } = req.body

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message cannot be empty' }
      })
    }

    logger.info('Processing chat message', { userId, messageLength: message.length })

    // Get or create chat history
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, [])
    }

    // Process message with RAG
    const response = await chatChain.processMessage(message, userContext)

    // Add to history
    const history = chatHistories.get(userId)
    history.push({
      type: 'user',
      message,
      timestamp: new Date()
    })
    history.push({
      type: 'assistant',
      message: response.message,
      sources: response.sources,
      timestamp: new Date()
    })

    // Keep only last 50 messages
    if (history.length > 50) {
      chatHistories.set(userId, history.slice(-50))
    }

    // Check for health-related flags
    const requiresDoctor = req.requiresDoctorConsultation
    const severity = req.severityLevel

    res.json({
      success: true,
      data: {
        message: response.message,
        sources: response.sources,
        requiresDoctor,
        severity,
        timestamp: new Date()
      }
    })
  } catch (error) {
    logger.error('Chat message processing failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process message' }
    })
  }
})

/**
 * GET /api/chat/history/:userId
 * Get chat history for a user
 */
router.get('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const history = chatHistories.get(userId) || []

    res.json({
      success: true,
      data: {
        messages: history,
        count: history.length
      }
    })
  } catch (error) {
    logger.error('Get chat history failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve history' }
    })
  }
})

/**
 * DELETE /api/chat/history/:userId
 * Clear chat history
 */
router.delete('/history/:userId', (req, res) => {
  try {
    const { userId } = req.params
    chatHistories.delete(userId)

    logger.info('Chat history cleared', { userId })

    res.json({
      success: true,
      message: 'Chat history cleared'
    })
  } catch (error) {
    logger.error('Clear history failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to clear history' }
    })
  }
})

/**
 * POST /api/chat/disclaimer-acknowledged
 * Track disclaimer acknowledgment
 */
router.post('/disclaimer-acknowledged', (req, res) => {
  try {
    const { userId } = req.body

    logger.info('Disclaimer acknowledged', { userId })

    res.json({
      success: true,
      message: 'Disclaimer acknowledged'
    })
  } catch (error) {
    logger.error('Disclaimer acknowledgment failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: { message: 'Failed to acknowledge disclaimer' }
    })
  }
})

export default router