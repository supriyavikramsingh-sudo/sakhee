/**
 * Sakhee - Vector Database Health Check Script
 *
 * Validates vector store integrity and provides diagnostics
 *
 * Usage:
 *   npm run vector:health
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vector store is in server/src/storage/localCache/vectordb
// __dirname is server/src/scripts, so go up 1 level to server/src
const VECTOR_STORE_PATH = path.join(__dirname, '..', 'storage', 'localCache', 'vectordb');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if vector store exists
 */
function checkVectorStoreExists() {
  const exists = fs.existsSync(VECTOR_STORE_PATH);
  log(`\n📁 Vector Store Existence: ${exists ? '✓' : '✗'}`, exists ? 'green' : 'red');

  if (exists) {
    const files = fs.readdirSync(VECTOR_STORE_PATH);
    log(`   Files found: ${files.length}`, 'cyan');

    let totalSize = 0;
    files.forEach((file) => {
      const filePath = path.join(VECTOR_STORE_PATH, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      log(`   - ${file}: ${formatBytes(stats.size)}`, 'magenta');
    });

    log(`   Total size: ${formatBytes(totalSize)}`, 'cyan');
  } else {
    log('   Vector store directory not found', 'yellow');
    log(`   Expected location: ${VECTOR_STORE_PATH}`, 'yellow');
  }

  return exists;
}

/**
 * Check OpenAI API key
 */
function checkOpenAIKey() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  log(`\n🔑 OpenAI API Key: ${hasKey ? '✓' : '✗'}`, hasKey ? 'green' : 'red');

  if (!hasKey) {
    log('   OPENAI_API_KEY not found in environment variables', 'red');
    log('   Vector store cannot be loaded without API key', 'yellow');
  } else {
    const keyPreview = process.env.OPENAI_API_KEY.substring(0, 10) + '...';
    log(`   Key found: ${keyPreview}`, 'cyan');
  }

  return hasKey;
}

/**
 * Test vector store loading
 */
async function testVectorStoreLoading() {
  log('\n🔄 Testing Vector Store Loading...', 'blue');

  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
    });

    const vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);

    log('   ✓ Vector store loaded successfully', 'green');

    // Try a test query
    const testQuery = 'PCOS symptoms';
    log(`\n🔍 Running test query: "${testQuery}"`, 'blue');

    const results = await vectorStore.similaritySearch(testQuery, 3);

    log(`   ✓ Retrieved ${results.length} results`, 'green');

    if (results.length > 0) {
      log('\n   Sample result:', 'cyan');
      log(`   "${results[0].pageContent.substring(0, 100)}..."`, 'magenta');
    }

    return true;
  } catch (error) {
    log(`   ✗ Failed to load vector store: ${error.message}`, 'red');

    if (error.message.includes('ENOENT')) {
      log('   Possible causes:', 'yellow');
      log('   - Vector store files are missing or corrupted', 'yellow');
      log('   - Vector store has not been initialized yet', 'yellow');
    } else if (error.message.includes('API')) {
      log('   Possible causes:', 'yellow');
      log('   - Invalid or expired OpenAI API key', 'yellow');
      log('   - Network connectivity issues', 'yellow');
    }

    return false;
  }
}

/**
 * Check file permissions
 */
function checkPermissions() {
  log('\n🔐 File Permissions Check:', 'blue');

  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    log('   ⚠️  Vector store directory does not exist', 'yellow');
    return false;
  }

  try {
    // Check read permission
    fs.accessSync(VECTOR_STORE_PATH, fs.constants.R_OK);
    log('   ✓ Read access: OK', 'green');

    // Check write permission
    fs.accessSync(VECTOR_STORE_PATH, fs.constants.W_OK);
    log('   ✓ Write access: OK', 'green');

    return true;
  } catch (error) {
    log(`   ✗ Permission error: ${error.message}`, 'red');
    log('   Check folder permissions and ownership', 'yellow');
    return false;
  }
}

/**
 * Estimate vector count (approximation)
 */
function estimateVectorCount() {
  log('\n📊 Vector Statistics:', 'blue');

  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    log('   No data to analyze', 'yellow');
    return;
  }

  try {
    const files = fs.readdirSync(VECTOR_STORE_PATH);
    const docstoreFile = files.find((f) => f.includes('docstore'));

    if (docstoreFile) {
      const docstorePath = path.join(VECTOR_STORE_PATH, docstoreFile);
      const content = fs.readFileSync(docstorePath, 'utf-8');
      const data = JSON.parse(content);

      const docCount = Object.keys(data).length;
      log(`   Approximate document count: ${docCount}`, 'cyan');

      // Analyze document types
      const types = {};
      Object.values(data).forEach((doc) => {
        const type = doc.metadata?.source || 'unknown';
        types[type] = (types[type] || 0) + 1;
      });

      log('\n   Document types:', 'cyan');
      Object.entries(types).forEach(([type, count]) => {
        log(`   - ${type}: ${count}`, 'magenta');
      });
    } else {
      log('   Unable to read document store', 'yellow');
    }
  } catch (error) {
    log(`   ✗ Error analyzing vectors: ${error.message}`, 'red');
  }
}

/**
 * Provide recommendations
 */
function provideRecommendations(results) {
  log('\n💡 Recommendations:', 'cyan');
  log('─'.repeat(60), 'cyan');

  const { exists, hasKey, loaded, hasPermissions } = results;

  if (!exists) {
    log('   • Initialize vector store by starting the backend server', 'yellow');
    log('   • Or run the data ingestion script', 'yellow');
  }

  if (!hasKey) {
    log('   • Add OPENAI_API_KEY to your .env file', 'yellow');
    log('   • Verify the API key is valid and active', 'yellow');
  }

  if (!loaded && exists && hasKey) {
    log('   • Vector store files may be corrupted', 'yellow');
    log('   • Consider clearing and re-indexing:', 'yellow');
    log('     npm run vector:clear', 'cyan');
  }

  if (!hasPermissions) {
    log('   • Fix file permissions:', 'yellow');
    log('     chmod -R 755 data/vectorstore/', 'cyan');
  }

  if (exists && hasKey && loaded) {
    log('   ✓ Vector store is healthy!', 'green');
    log('   • No action needed', 'green');
  }

  log('─'.repeat(60), 'cyan');
}

/**
 * Main execution
 */
async function main() {
  log('\n🏥 Sakhee Vector Database Health Check', 'blue');
  log('═'.repeat(60), 'blue');

  const results = {};

  // Run all checks
  results.exists = checkVectorStoreExists();
  results.hasKey = checkOpenAIKey();
  results.hasPermissions = checkPermissions();

  if (results.exists && results.hasKey) {
    results.loaded = await testVectorStoreLoading();
    estimateVectorCount();
  } else {
    results.loaded = false;
  }

  // Summary
  log('\n📋 Health Check Summary:', 'blue');
  log('─'.repeat(60), 'blue');

  const checks = [
    { name: 'Vector Store Exists', status: results.exists },
    { name: 'OpenAI API Key', status: results.hasKey },
    { name: 'File Permissions', status: results.hasPermissions },
    { name: 'Vector Store Loading', status: results.loaded },
  ];

  checks.forEach((check) => {
    const icon = check.status ? '✓' : '✗';
    const color = check.status ? 'green' : 'red';
    log(`   ${icon} ${check.name}`, color);
  });

  log('─'.repeat(60), 'blue');

  const overallHealth = Object.values(results).every((v) => v === true);
  const status = overallHealth ? 'HEALTHY ✓' : 'ISSUES DETECTED ✗';
  const statusColor = overallHealth ? 'green' : 'red';

  log(`\n🎯 Overall Status: ${status}`, statusColor);

  // Provide recommendations
  provideRecommendations(results);

  log('\n');

  process.exit(overallHealth ? 0 : 1);
}

main().catch((error) => {
  log(`\n✗ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
