/**
 * Sakhee - Scheduled Vector Database Backup Cleanup
 *
 * Automatically removes old backups based on retention policy
 *
 * Retention Policy:
 * - Keep last 7 daily backups
 * - Keep last 4 weekly backups (>7 days old)
 * - Keep last 6 monthly backups (>30 days old)
 * - Delete anything older than 180 days
 *
 * Usage:
 *   node scripts/scheduled-cleanup.js
 *
 * Cron Setup (daily at 2 AM):
 *   0 2 * * * cd /path/to/sakhee && node scripts/scheduled-cleanup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_PATH = path.join(__dirname, '..', 'backups', 'vectorstore');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'cleanup.log');

// Retention configuration
const RETENTION_POLICY = {
  daily: 7, // Keep last 7 days
  weekly: 4, // Keep last 4 weeks
  monthly: 6, // Keep last 6 months
  maxAge: 180, // Delete anything older than 180 days
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

/**
 * Log to both console and file
 */
function log(message, color = 'reset', level = 'INFO') {
  const timestamp = new Date().toISOString();
  const coloredMessage = `${colors[color]}${message}${colors.reset}`;
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  console.log(coloredMessage);

  // Append to log file
  try {
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_PATH, logMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Get all backups with metadata
 */
function getBackups() {
  if (!fs.existsSync(BACKUP_PATH)) {
    log('Backup directory does not exist', 'yellow', 'WARN');
    return [];
  }

  const backups = fs
    .readdirSync(BACKUP_PATH)
    .filter((file) => {
      const backupDir = path.join(BACKUP_PATH, file);
      return fs.statSync(backupDir).isDirectory() && file.startsWith('backup_');
    })
    .map((backup) => {
      const backupDir = path.join(BACKUP_PATH, backup);
      const stats = fs.statSync(backupDir);

      // Parse timestamp from folder name (backup_YYYY-MM-DDTHH-MM-SS)
      const timestampStr = backup.replace('backup_', '').replace(/-/g, ':');
      const timestamp = new Date(timestampStr);

      let totalSize = 0;
      try {
        const files = fs.readdirSync(backupDir);
        files.forEach((file) => {
          const filePath = path.join(backupDir, file);
          totalSize += fs.statSync(filePath).size;
        });
      } catch (error) {
        log(`Error reading backup ${backup}: ${error.message}`, 'red', 'ERROR');
      }

      return {
        name: backup,
        path: backupDir,
        timestamp: timestamp,
        age: Math.floor((Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24)),
        size: totalSize,
      };
    })
    .filter((backup) => !isNaN(backup.timestamp.getTime())) // Filter invalid timestamps
    .sort((a, b) => b.timestamp - a.timestamp); // Newest first

  return backups;
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
 * Categorize backup by age
 */
function categorizeBackup(backup) {
  if (backup.age <= 7) return 'daily';
  if (backup.age <= 30) return 'weekly';
  if (backup.age <= 180) return 'monthly';
  return 'expired';
}

/**
 * Determine which backups to keep
 */
function determineBackupsToKeep(backups) {
  const toKeep = new Set();
  const categories = {
    daily: [],
    weekly: [],
    monthly: [],
    expired: [],
  };

  // Categorize all backups
  backups.forEach((backup) => {
    const category = categorizeBackup(backup);
    categories[category].push(backup);
  });

  // Keep required number from each category
  categories.daily.slice(0, RETENTION_POLICY.daily).forEach((b) => toKeep.add(b.name));
  categories.weekly.slice(0, RETENTION_POLICY.weekly).forEach((b) => toKeep.add(b.name));
  categories.monthly.slice(0, RETENTION_POLICY.monthly).forEach((b) => toKeep.add(b.name));

  // Expired backups will be deleted
  const toDelete = backups.filter((b) => !toKeep.has(b.name));

  return { toKeep: Array.from(toKeep), toDelete };
}

/**
 * Delete a backup directory
 */
function deleteBackup(backup) {
  try {
    fs.rmSync(backup.path, { recursive: true, force: true });
    log(`  Deleted: ${backup.name} (${backup.age} days old, ${formatBytes(backup.size)})`, 'gray');
    return true;
  } catch (error) {
    log(`  Failed to delete ${backup.name}: ${error.message}`, 'red', 'ERROR');
    return false;
  }
}

/**
 * Generate cleanup report
 */
function generateReport(backups, toDelete, deletedCount, freedSpace) {
  log('\n' + '═'.repeat(70), 'blue');
  log('CLEANUP REPORT', 'blue');
  log('═'.repeat(70), 'blue');

  log(`\nTotal backups found: ${backups.length}`, 'blue');
  log(`Backups to delete: ${toDelete.length}`, 'yellow');
  log(`Backups to keep: ${backups.length - toDelete.length}`, 'green');

  if (toDelete.length > 0) {
    log(
      `\nBackups deleted: ${deletedCount}`,
      deletedCount === toDelete.length ? 'green' : 'yellow'
    );
    log(`Space freed: ${formatBytes(freedSpace)}`, 'green');

    if (deletedCount < toDelete.length) {
      log(
        `\n⚠️  Warning: ${toDelete.length - deletedCount} backups failed to delete`,
        'yellow',
        'WARN'
      );
    }
  } else {
    log('\n✓ No backups need to be deleted', 'green');
  }

  log('\n' + '═'.repeat(70), 'blue');
}

/**
 * Main cleanup logic
 */
function performCleanup(dryRun = false) {
  log('╔═══════════════════════════════════════════════════════════════════╗', 'blue');
  log('║  Sakhee Vector Database Backup Cleanup                          ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'blue');

  if (dryRun) {
    log('\n🔍 DRY RUN MODE - No backups will be deleted', 'yellow', 'INFO');
  }

  log('\n📋 Retention Policy:', 'blue');
  log(`  • Daily: Keep last ${RETENTION_POLICY.daily} backups (≤7 days)`, 'gray');
  log(`  • Weekly: Keep last ${RETENTION_POLICY.weekly} backups (8-30 days)`, 'gray');
  log(`  • Monthly: Keep last ${RETENTION_POLICY.monthly} backups (31-180 days)`, 'gray');
  log(`  • Delete: All backups older than ${RETENTION_POLICY.maxAge} days`, 'gray');

  log('\n🔍 Scanning backups...', 'blue');

  const backups = getBackups();

  if (backups.length === 0) {
    log('No backups found', 'yellow', 'WARN');
    return;
  }

  log(`Found ${backups.length} backup(s)`, 'green');

  const { toKeep, toDelete } = determineBackupsToKeep(backups);

  if (toDelete.length === 0) {
    log('\n✓ All backups are within retention policy', 'green');
    return;
  }

  log(`\n🗑️  ${toDelete.length} backup(s) marked for deletion:`, 'yellow');

  let deletedCount = 0;
  let freedSpace = 0;

  toDelete.forEach((backup) => {
    if (dryRun) {
      log(
        `  [DRY RUN] Would delete: ${backup.name} (${backup.age} days old, ${formatBytes(
          backup.size
        )})`,
        'yellow'
      );
    } else {
      if (deleteBackup(backup)) {
        deletedCount++;
        freedSpace += backup.size;
      }
    }
  });

  if (!dryRun) {
    generateReport(backups, toDelete, deletedCount, freedSpace);
  } else {
    log(
      `\n✓ Dry run complete. Would delete ${toDelete.length} backups and free ${formatBytes(
        toDelete.reduce((sum, b) => sum + b.size, 0)
      )}`,
      'yellow'
    );
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  try {
    performCleanup(dryRun);
    log('\n✓ Cleanup completed successfully\n', 'green');
    process.exit(0);
  } catch (error) {
    log(`\n✗ Cleanup failed: ${error.message}`, 'red', 'ERROR');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { performCleanup, getBackups };
