import express from 'express';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { safetyGuards } from './middleware/safetyGuards.js';
import { errorHandler } from './middleware/errorHandler.js';
import { Logger } from './utils/logger.js';
import { initializeCronJobs, stopAllCronJobs } from './cron/cronScheduler.js';
import chatRoutes from './routes/chat.js';
import mealPlanRoutes from './routes/mealPlan.js';
import uploadRoutes from './routes/upload.js';
import progressTrackerRoutes from './routes/progressTracker.js'; // Comprehensive progress tracker
import ragStatusRoutes from './routes/ragStatus.js';
import feedbackRoutes from './routes/feedback.js';
import userProfileRoutes from './routes/userProfile.js';
import subscriptionRoutes from './routes/subscription.js';
import metricsRoutes from './routes/metrics.js';
import recipeRoutes from './routes/recipes.js';
import jobRoutes from './routes/jobs.js';
import cronRoutes from './routes/cron.js';
import communityRoutes from './routes/community.js';
import { initializeRAG } from './langchain/initializeRAG.js';

const app = express();
const logger = new Logger('Server');

// ============================================
// RAG SYSTEM INITIALIZATION
// ============================================
logger.info('🤖 Initializing RAG system for meal templates...');
const ragReady = await initializeRAG();

if (ragReady) {
  logger.info('✅ RAG system ready - meal plans will use semantic search');
} else {
  logger.warn('⚠️  RAG system not fully initialized - using fallback templates');
  logger.info('💡 To enable RAG with new templates: npm run ingest:meals');
}

// ============================================
// CRON JOBS INITIALIZATION
// ============================================
logger.info('⏰ Initializing cron jobs...');
initializeCronJobs();
logger.info('✅ Cron jobs initialized');

// ============================================
// MIDDLEWARE
// ============================================

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS
app.use(corsMiddleware);

// Request logging
app.use(requestLogger);

// Rate limiting (apply to API routes)
app.use('/api/', rateLimiter);

// Safety guards for chat routes
app.use('/api/chat', safetyGuards);

// ============================================
// ROUTES
// ============================================
app.use('/api/chat', chatRoutes);
app.use('/api/meals', mealPlanRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/progress', progressTrackerRoutes); // Comprehensive progress tracker
app.use('/api/rag', ragStatusRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/user', userProfileRoutes);
app.use('/api/user', subscriptionRoutes); // Subscription routes under /api/user
app.use('/api/metrics', metricsRoutes); // Performance metrics routes
app.use('/api/jobs', jobRoutes); // Background job tracking routes
app.use('/api/cron', cronRoutes); // Cron job management routes
app.use('/api/community', communityRoutes); // Community signup routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rag: ragReady ? 'ready' : 'fallback-mode',
  });
});

// API Health check with detailed info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is running',
    version: '1.0.0',
    environment: env.NODE_ENV,
    rag: {
      initialized: ragReady,
      status: ragReady ? 'ready' : 'needs-ingestion',
      message: ragReady
        ? 'RAG system active - meal plans use semantic search'
        : 'RAG not initialized - run: npm run ingest:meals',
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Sakhee API',
    version: '1.0.0',
    status: 'running',
    message: 'AI-Powered PCOS Management Assistant API',
    endpoints: {
      health: '/api/health',
      ragStatus: '/api/rag/status',
      chat: '/api/chat (POST)',
      mealPlan: '/api/meal-plan (POST)',
    },
    documentation: 'Visit /api/health for system status',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Endpoint not found' },
  });
});

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
  logger.info(`📦 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 CORS Origin: ${env.CORS_ORIGIN}`);
  logger.info(`🏥 Health: http://localhost:${env.PORT}/api/health`);
  logger.info(`📊 RAG Status: http://localhost:${env.PORT}/api/rag/status`);
  logger.info('');

  if (!ragReady) {
    logger.info('⚠️  SETUP REQUIRED:');
    logger.info('   1. Ensure meal template .txt files are in: server/src/data/meal_templates/');
    logger.info('   2. Run ingestion: npm run ingest:meals');
    logger.info('   3. Restart server to enable RAG-powered meal plans');
    logger.info('');
  }
});

// Provide a friendly error message if the port is already in use
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    logger.error(
      `Port ${env.PORT} is already in use.\n` +
        `• Option 1: Stop the process using the port (e.g. with \`lsof -iTCP:${env.PORT} -sTCP:LISTEN -n -P\` and \`kill <PID>\`).\n` +
        `• Option 2: Start the server on a different port: \`PORT=5001 npm run start\` or set PORT in your .env file.`
    );
    process.exit(1);
  }
  logger.error('Server error', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  stopAllCronJobs();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopAllCronJobs();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
