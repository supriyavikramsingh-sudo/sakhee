import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (handles both running from root and server dir)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvs = [
  'OPENAI_API_KEY',
  'SPOONACULAR_API_KEY',
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
];

// Validate required environment variables
// Skip validation if SKIP_ENV_VALIDATION is set (useful for scripts that don't need all vars)
if (!process.env.SKIP_ENV_VALIDATION) {
  const missing = requiredEnvs.filter((env) => !process.env[env]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file');
    process.exit(1);
  }
}

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Spoonacular API
  SPOONACULAR_API_KEY: process.env.SPOONACULAR_API_KEY,

  // Reddit OAuth
  REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
  REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
  REDDIT_REDIRECT_URI:
    process.env.REDDIT_REDIRECT_URI || 'http://localhost:3000/auth/reddit/callback',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // File Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),

  // Dev flag
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

console.log('✅ Environment variables loaded');

export default env;
