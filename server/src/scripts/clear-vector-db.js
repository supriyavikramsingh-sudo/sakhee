/**
 * Sakhee - Vector Database Cleanup Script
 *
 * This script clears the HNSWLib vector store used for RAG.
 * Use cases:
 * - Clear corrupted embeddings
 * - Reset after medical literature updates
 * - Clear cached Reddit insights
 * - Force re-indexing of knowledge base
 *
 * SAFETY: Always backup before clearing production data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Vector store is in server/src/storage/localCache/vectordb
const VECTOR_STORE_PATH = path.join(__dirname, '..', 'storage', 'localCache', 'vectordb');
const BACKUP_PATH = path.join(__dirname, '..', '..', '..', 'backups', 'vectorstore');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

/**
 * Create readline interface for user confirmation
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for confirmation
 */
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Log with colors
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if vector store exists
 */
function vectorStoreExists() {
  return fs.existsSync(VECTOR_STORE_PATH);
}

/**
 * Get vector store size
 */
function getVectorStoreSize() {
  if (!vectorStoreExists()) return 0;

  let totalSize = 0;
  const files = fs.readdirSync(VECTOR_STORE_PATH);

  files.forEach((file) => {
    const filePath = path.join(VECTOR_STORE_PATH, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });

  return totalSize;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create backup of vector store
 */
function createBackup() {
  if (!vectorStoreExists()) {
    log('No vector store found to backup', 'yellow');
    return false;
  }

  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }

    // Create timestamped backup folder
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFolder = path.join(BACKUP_PATH, `backup_${timestamp}`);
    fs.mkdirSync(backupFolder, { recursive: true });

    // Copy all files
    const files = fs.readdirSync(VECTOR_STORE_PATH);
    files.forEach((file) => {
      const sourcePath = path.join(VECTOR_STORE_PATH, file);
      const destPath = path.join(backupFolder, file);
      fs.copyFileSync(sourcePath, destPath);
    });

    log(`✓ Backup created: ${backupFolder}`, 'green');
    return backupFolder;
  } catch (error) {
    log(`✗ Backup failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Clear vector store
 */
function clearVectorStore() {
  if (!vectorStoreExists()) {
    log('No vector store found to clear', 'yellow');
    return false;
  }

  try {
    const files = fs.readdirSync(VECTOR_STORE_PATH);

    files.forEach((file) => {
      const filePath = path.join(VECTOR_STORE_PATH, file);
      fs.unlinkSync(filePath);
    });

    // Remove the directory itself
    fs.rmdirSync(VECTOR_STORE_PATH);

    log('✓ Vector store cleared successfully', 'green');
    return true;
  } catch (error) {
    log(`✗ Clear failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Clear specific collection type
 */
function clearByType(type) {
  if (!vectorStoreExists()) {
    log('No vector store found', 'yellow');
    return false;
  }

  try {
    const files = fs.readdirSync(VECTOR_STORE_PATH);
    const pattern = new RegExp(`${type}`, 'i');
    let clearedCount = 0;

    files.forEach((file) => {
      if (pattern.test(file)) {
        const filePath = path.join(VECTOR_STORE_PATH, file);
        fs.unlinkSync(filePath);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      log(`✓ Cleared ${clearedCount} ${type} files`, 'green');
    } else {
      log(`No ${type} files found`, 'yellow');
    }
    return true;
  } catch (error) {
    log(`✗ Clear by type failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * List vector store contents
 */
function listContents() {
  if (!vectorStoreExists()) {
    log('No vector store found', 'yellow');
    return;
  }

  log('\n📊 Vector Store Contents:', 'blue');
  log('─'.repeat(60), 'blue');

  const files = fs.readdirSync(VECTOR_STORE_PATH);

  files.forEach((file) => {
    const filePath = path.join(VECTOR_STORE_PATH, file);
    const stats = fs.statSync(filePath);
    log(`  ${file} - ${formatBytes(stats.size)}`, 'magenta');
  });

  log('─'.repeat(60), 'blue');
  log(`Total: ${files.length} files, ${formatBytes(getVectorStoreSize())}`, 'blue');
  log('');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  log('\n🔵 Sakhee Vector Database Cleanup Tool', 'blue');
  log('═'.repeat(60), 'blue');

  // Handle commands
  if (command === 'list' || command === 'ls') {
    listContents();
    rl.close();
    return;
  }

  if (command === 'backup') {
    createBackup();
    rl.close();
    return;
  }

  if (command === 'clear-reddit') {
    log('\n🗑️  Clearing Reddit insights from vector store...', 'yellow');
    const answer = await askQuestion('Are you sure? (yes/no): ');
    if (answer.toLowerCase() === 'yes') {
      createBackup();
      clearByType('reddit');
    } else {
      log('Cancelled', 'yellow');
    }
    rl.close();
    return;
  }

  if (command === 'clear-medical') {
    log('\n🗑️  Clearing medical literature from vector store...', 'yellow');
    const answer = await askQuestion('Are you sure? (yes/no): ');
    if (answer.toLowerCase() === 'yes') {
      createBackup();
      clearByType('medical');
    } else {
      log('Cancelled', 'yellow');
    }
    rl.close();
    return;
  }

  // Default: Full clear
  log('\n⚠️  WARNING: This will permanently delete all vector embeddings!', 'red');

  if (!vectorStoreExists()) {
    log('No vector store found to clear', 'yellow');
    rl.close();
    return;
  }

  const size = getVectorStoreSize();
  log(`Current vector store size: ${formatBytes(size)}`, 'yellow');

  log('\nThis action will:', 'yellow');
  log('  1. Create a backup in ./backups/vectorstore/', 'yellow');
  log('  2. Delete all vector embeddings', 'yellow');
  log('  3. Require re-indexing on next startup', 'yellow');

  const answer = await askQuestion('\nType "CLEAR" to confirm deletion: ');

  if (answer === 'CLEAR') {
    log('\n🔄 Creating backup...', 'blue');
    const backupPath = createBackup();

    if (backupPath) {
      log('\n🗑️  Clearing vector store...', 'blue');
      const success = clearVectorStore();

      if (success) {
        log('\n✓ Vector database cleared successfully!', 'green');
        log(`Backup location: ${backupPath}`, 'green');
        log('\n💡 Next steps:', 'blue');
        log('  1. Restart your backend server', 'blue');
        log('  2. Vector store will be re-indexed automatically', 'blue');
        log('  3. Initial indexing may take a few minutes', 'blue');
      }
    } else {
      log('\n✗ Clear cancelled due to backup failure', 'red');
      log('Your data is safe!', 'green');
    }
  } else {
    log('\n✗ Clear cancelled', 'yellow');
    log('No changes made to vector store', 'green');
  }

  rl.close();
}

// Handle errors
process.on('uncaughtException', (error) => {
  log(`\n✗ Unexpected error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});

// Run
main().catch((error) => {
  log(`\n✗ Error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});
