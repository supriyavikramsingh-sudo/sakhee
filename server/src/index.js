import express from 'express';
import { env } from './config/env.js';
import { corsMiddleware } from './middleware/corsMiddleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { safetyGuards } from './middleware/safetyGuards.js';
import { errorHandler } from './middleware/errorHandler.js';
import { Logger } from './utils/logger.js';
import chatRoutes from './routes/chat.js'
import mealPlanRoutes from './routes/mealPlan.js'
import uploadRoutes from './routes/upload.js'
import progressRoutes from './routes/progress.js'

const app = express();
const logger = new Logger('Server');

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
app.use('/api/upload', uploadRoutes);
app.use('/api/progress', progressRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (placeholder for now)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is running',
    version: '1.0.0',
    environment: env.NODE_ENV
  });
});

// Chat API (placeholder)
app.post('/api/chat', (req, res) => {
  res.json({ message: 'Chat endpoint placeholder' });
});

// Meal Planning API (placeholder)
app.post('/api/meals/generate', (req, res) => {
  res.json({ message: 'Meal planning endpoint placeholder' });
});

// Onboarding API (placeholder)
app.post('/api/onboarding/create', (req, res) => {
  res.json({ message: 'Onboarding endpoint placeholder' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Endpoint not found' }
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
});

// Provide a friendly error message if the port is already in use
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    logger.error(`Port ${env.PORT} is already in use.\n` +
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
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;