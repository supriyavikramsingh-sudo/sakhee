/**
 * Sakhee - Vector Database Restore Script
 *
 * Restores vector store from a backup
 *
 * Usage:
 *   npm run vector:restore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VECTOR_STORE_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'src',
  'storage',
  'localCache',
  'vectordb'
);
const BACKUP_PATH = path.join(__dirname, '..', '..', '..', 'backups', 'vectorstore');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt user for input
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
 * Get folder size
 */
function getFolderSize(folderPath) {
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });

  return totalSize;
}

/**
 * List available backups
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_PATH)) {
    log('No backup directory found', 'yellow');
    return [];
  }

  const backups = fs
    .readdirSync(BACKUP_PATH)
    .filter((item) => {
      const itemPath = path.join(BACKUP_PATH, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .map((backup) => {
      const backupPath = path.join(BACKUP_PATH, backup);
      const stats = fs.statSync(backupPath);
      const size = getFolderSize(backupPath);

      return {
        name: backup,
        path: backupPath,
        created: stats.birthtime,
        size: size,
      };
    })
    .sort((a, b) => b.created - a.created); // Sort by date, newest first

  return backups;
}

/**
 * Restore vector store from backup
 */
function restoreFromBackup(backupPath) {
  try {
    // Create vector store directory if it doesn't exist
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
      fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
    } else {
      // Clear existing vector store
      const files = fs.readdirSync(VECTOR_STORE_PATH);
      files.forEach((file) => {
        const filePath = path.join(VECTOR_STORE_PATH, file);
        fs.unlinkSync(filePath);
      });
    }

    // Copy backup files to vector store
    const backupFiles = fs.readdirSync(backupPath);
    backupFiles.forEach((file) => {
      const sourcePath = path.join(backupPath, file);
      const destPath = path.join(VECTOR_STORE_PATH, file);
      fs.copyFileSync(sourcePath, destPath);
    });

    log(`✓ Restored ${backupFiles.length} files from backup`, 'green');
    return true;
  } catch (error) {
    log(`✗ Restore failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  log('\n♻️  Sakhee Vector Database Restore Tool', 'blue');
  log('═'.repeat(60), 'blue');

  // List available backups
  const backups = listBackups();

  if (backups.length === 0) {
    log('\nNo backups found', 'yellow');
    log(`Expected location: ${BACKUP_PATH}`, 'cyan');
    rl.close();
    return;
  }

  log('\n📦 Available Backups:', 'blue');
  log('─'.repeat(60), 'blue');

  backups.forEach((backup, index) => {
    log(`\n${index + 1}. ${backup.name}`, 'cyan');
    log(`   Created: ${backup.created.toLocaleString()}`, 'magenta');
    log(`   Size: ${formatBytes(backup.size)}`, 'magenta');
  });

  log('\n─'.repeat(60), 'blue');

  // Prompt user to select backup
  const answer = await askQuestion('\nSelect backup number to restore (or "cancel"): ');

  if (answer.toLowerCase() === 'cancel') {
    log('\n✗ Restore cancelled', 'yellow');
    rl.close();
    return;
  }

  const selectedIndex = parseInt(answer) - 1;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= backups.length) {
    log('\n✗ Invalid selection', 'red');
    rl.close();
    return;
  }

  const selectedBackup = backups[selectedIndex];

  // Confirm restore
  log(`\n⚠️  This will replace the current vector store with:`, 'yellow');
  log(`   ${selectedBackup.name}`, 'cyan');
  log(`   Created: ${selectedBackup.created.toLocaleString()}`, 'cyan');
  log(`   Size: ${formatBytes(selectedBackup.size)}`, 'cyan');

  const confirm = await askQuestion('\nType "RESTORE" to confirm: ');

  if (confirm === 'RESTORE') {
    log('\n🔄 Restoring vector store...', 'blue');

    const success = restoreFromBackup(selectedBackup.path);

    if (success) {
      log('\n✓ Vector store restored successfully!', 'green');
      log('\n💡 Next steps:', 'blue');
      log('  1. Restart your backend server', 'blue');
      log('  2. Vector store is ready to use', 'blue');
    } else {
      log('\n✗ Restore failed', 'red');
    }
  } else {
    log('\n✗ Restore cancelled', 'yellow');
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
