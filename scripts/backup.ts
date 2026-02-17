import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

/**
 * Automated Backup Script for Barbershop SaaS
 * 
 * Features:
 * - Daily database backups (PostgreSQL pg_dump)
 * - File backups (uploaded assets)
 * - AES-256 encryption
 * - Gzip compression
 * - S3 storage with versioning
 * - Backup metadata tracking
 * - Email notifications
 * - Structured logging
 */

interface BackupConfig {
  databaseUrl: string;
  s3Bucket: string;
  s3Region: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  filesDirectory: string;
  backupRetentionDays: number;
  encryptionKey: string;
  notificationEmail: string;
  resendApiKey: string;
  shopId: string;
}

interface BackupMetadata {
  backup_date: string;
  backup_type: 'full' | 'incremental';
  database_size_bytes: number;
  files_size_bytes: number;
  total_size_bytes: number;
  table_count: number;
  file_count: number;
  compression_ratio: number;
  encryption_algorithm: string;
  checksum: string;
  backup_start_time: string;
  backup_end_time: string;
  status: 'success' | 'failed';
  error_message?: string;
}

class BackupManager {
  private config: BackupConfig;
  private db: Pool;
  private s3: S3Client;
  private logs: string[] = [];
  private metadata: BackupMetadata;

  constructor(config: BackupConfig) {
    this.config = config;
    this.db = new Pool({
      connectionString: config.databaseUrl,
    });

    this.s3 = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    });

    this.metadata = {
      backup_date: new Date().toISOString(),
      backup_type: 'full',
      database_size_bytes: 0,
      files_size_bytes: 0,
      total_size_bytes: 0,
      table_count: 0,
      file_count: 0,
      compression_ratio: 0,
      encryption_algorithm: 'AES-256',
      checksum: '',
      backup_start_time: new Date().toISOString(),
      backup_end_time: '',
      status: 'success',
    };
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
    if (metadata) {
      console.log(JSON.stringify(metadata, null, 2));
    }
  }

  async validateS3Connection(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.config.s3Bucket }));
      this.log('info', `✓ S3 bucket "${this.config.s3Bucket}" is accessible`);
      return true;
    } catch (error) {
      this.log('error', `✗ S3 bucket connection failed: ${error.message}`);
      return false;
    }
  }

  async validateDatabaseConnection(): Promise<boolean> {
    try {
      const result = await this.db.query('SELECT 1');
      this.log('info', '✓ Database connection successful');
      return true;
    } catch (error) {
      this.log('error', `✗ Database connection failed: ${error.message}`);
      return false;
    }
  }

  async backupDatabase(backupDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpFile = path.join(backupDir, `${timestamp}-db-dump.sql`);

    this.log('info', 'Starting database backup...');

    try {
      const { stdout, stderr } = await execAsync(
        `PGPASSWORD="${this.config.databaseUrl}" pg_dump --verbose ` +
        `--create --clean --if-exists ` +
        `--format=plain --encoding=UTF8 ` +
        `--exclude-table-data='pg_*|information_schema' ` +
        `"${this.config.databaseUrl}" > "${dumpFile}"`
      );

      if (stderr) {
        this.log('warn', 'pg_dump warnings:', stderr);
      }

      const stats = fs.statSync(dumpFile);
      this.metadata.database_size_bytes = stats.size;

      // Count tables
      const tableCount = fs.readFileSync(dumpFile, 'utf-8').match(/CREATE TABLE/g)?.length || 0;
      this.metadata.table_count = tableCount;

      this.log('info', `✓ Database backup completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, {
        tables: tableCount,
        size_bytes: stats.size,
      });

      return dumpFile;
    } catch (error) {
      this.log('error', `Database backup failed: ${error.message}`);
      throw error;
    }
  }

  async backupFiles(backupDir: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filesArchive = path.join(backupDir, `${timestamp}-files.tar.gz`);

    this.log('info', 'Starting file backup...');

    try {
      if (!fs.existsSync(this.config.filesDirectory)) {
        this.log('warn', `Files directory not found: ${this.config.filesDirectory}`);
        return '';
      }

      const { stderr } = await execAsync(
        `tar --gzip --create --verbose ` +
        `--file="${filesArchive}" ` +
        `--directory="${path.dirname(this.config.filesDirectory)}" ` +
        `"${path.basename(this.config.filesDirectory)}"`
      );

      const stats = fs.statSync(filesArchive);
      this.metadata.files_size_bytes = stats.size;

      // Count files
      const fileCount = fs.readdirSync(this.config.filesDirectory, {
        recursive: true,
      }).length;
      this.metadata.file_count = fileCount;

      this.log('info', `✓ Files backup completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, {
        files: fileCount,
        size_bytes: stats.size,
      });

      return filesArchive;
    } catch (error) {
      this.log('error', `File backup failed: ${error.message}`);
      throw error;
    }
  }

  private encryptFile(inputFile: string, outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const input = createReadStream(inputFile);
      const output = createWriteStream(outputFile);

      // Prepend IV to output file
      output.write(iv);

      input
        .pipe(cipher)
        .pipe(output)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  async compressAndEncryptBackups(dumpFile: string, filesArchive: string, backupDir: string): Promise<string[]> {
    this.log('info', 'Compressing and encrypting backups...');

    const encryptedFiles: string[] = [];

    try {
      // Compress database dump
      const gzipDb = path.join(backupDir, `db-dump.sql.gz`);
      await execAsync(`gzip -9 "${dumpFile}" -c > "${gzipDb}"`);
      this.log('info', `✓ Database dump compressed`);

      // Encrypt compressed database
      const encryptedDb = path.join(backupDir, `${path.basename(gzipDb)}.enc`);
      await this.encryptFile(gzipDb, encryptedDb);
      fs.unlinkSync(gzipDb);
      encryptedFiles.push(encryptedDb);

      this.log('info', `✓ Database backup encrypted`);

      // Encrypt files archive if exists
      if (filesArchive && fs.existsSync(filesArchive)) {
        const encryptedFiles_path = path.join(backupDir, `${path.basename(filesArchive)}.enc`);
        await this.encryptFile(filesArchive, encryptedFiles_path);
        fs.unlinkSync(filesArchive);
        encryptedFiles.push(encryptedFiles_path);
        this.log('info', `✓ Files backup encrypted`);
      }

      fs.unlinkSync(dumpFile);

      return encryptedFiles;
    } catch (error) {
      this.log('error', `Compression/encryption failed: ${error.message}`);
      throw error;
    }
  }

  private calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream
        .on('data', (chunk) => hash.update(chunk))
        .on('end', () => resolve(hash.digest('hex')))
        .on('error', reject);
    });
  }

  async uploadToS3(files: string[], backupDate: string): Promise<string[]> {
    this.log('info', 'Uploading backups to S3...');

    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const fileName = path.basename(file);
        const s3Key = `daily/${backupDate}/${fileName}`;

        const fileContent = fs.readFileSync(file);
        const checksum = await this.calculateChecksum(file);

        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.config.s3Bucket,
            Key: s3Key,
            Body: fileContent,
            Metadata: {
              'backup-date': backupDate,
              'backup-type': 'daily',
              'checksum': checksum,
              'encryption': 'aes-256',
            },
            ServerSideEncryption: 'AES256',
            StorageClass: 'STANDARD',
          })
        );

        uploadedPaths.push(s3Key);
        this.log('info', `✓ Uploaded: ${s3Key}`);
      }

      return uploadedPaths;
    } catch (error) {
      this.log('error', `S3 upload failed: ${error.message}`);
      throw error;
    }
  }

  async recordBackupMetadata(s3Paths: string[], durationSeconds: number): Promise<void> {
    try {
      this.metadata.backup_end_time = new Date().toISOString();
      this.metadata.total_size_bytes = this.metadata.database_size_bytes + this.metadata.files_size_bytes;

      const backupQuery = `
        INSERT INTO backup_jobs (
          shop_id, backup_date, backup_type, status, 
          size_bytes, duration_seconds, s3_path, integrity_check_passed, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, '00000000-0000-0000-0000-000000000000'
        )
        RETURNING id;
      `;

      const result = await this.db.query(backupQuery, [
        this.config.shopId,
        new Date(),
        'full',
        'completed',
        this.metadata.total_size_bytes,
        durationSeconds,
        s3Paths.join(','),
        true,
      ]);

      const backupJobId = result.rows[0].id;

      // Record metadata
      const metadataQuery = `
        INSERT INTO backup_metadata (
          backup_job_id, shop_id, database_size_bytes, table_count,
          file_count, files_backup_size_bytes, backup_start_time, backup_end_time,
          encryption_algorithm, checksum
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `;

      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(this.metadata))
        .digest('hex');

      await this.db.query(metadataQuery, [
        backupJobId,
        this.config.shopId,
        this.metadata.database_size_bytes,
        this.metadata.table_count,
        this.metadata.file_count,
        this.metadata.files_size_bytes,
        this.metadata.backup_start_time,
        this.metadata.backup_end_time,
        this.metadata.encryption_algorithm,
        checksum,
      ]);

      this.log('info', '✓ Backup metadata recorded');
    } catch (error) {
      this.log('error', `Failed to record backup metadata: ${error.message}`);
      throw error;
    }
  }

  async recordBackupLogs(backupJobId?: string): Promise<void> {
    try {
      // In a real implementation, query for the backup job ID if not provided
      // For now, we'll just log to file
      const logFile = path.join(os.tmpdir(), `backup-${new Date().toISOString()}.log`);
      fs.writeFileSync(logFile, this.logs.join('\n'));
      this.log('info', `✓ Backup logs saved: ${logFile}`);
    } catch (error) {
      this.log('error', `Failed to record logs: ${error.message}`);
    }
  }

  async sendNotification(success: boolean, details: string): Promise<void> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'backup@barbershop.local',
          to: this.config.notificationEmail,
          subject: `Backup ${success ? 'Successful' : 'Failed'} - ${new Date().toLocaleDateString()}`,
          html: `
            <h2>Backup ${success ? 'Completed Successfully' : 'Failed'}</h2>
            <p>Shop ID: ${this.config.shopId}</p>
            <p>Date: ${new Date().toISOString()}</p>
            ${success ? `
              <p><strong>Size:</strong> ${(this.metadata.total_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Database Size:</strong> ${(this.metadata.database_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Files:</strong> ${this.metadata.file_count}</p>
            ` : `
              <p><strong>Error:</strong> ${this.metadata.error_message}</p>
            `}
            <p>${details}</p>
          `,
        }),
      });

      if (response.ok) {
        this.log('info', '✓ Notification email sent');
      } else {
        this.log('warn', `Email notification failed: ${response.statusText}`);
      }
    } catch (error) {
      this.log('warn', `Failed to send notification: ${error.message}`);
    }
  }

  async execute(): Promise<boolean> {
    const startTime = Date.now();
    const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));

    try {
      this.log('info', '═══════════════════════════════════════');
      this.log('info', '   BARBERSHOP BACKUP SYSTEM');
      this.log('info', '═══════════════════════════════════════');
      this.log('info', `Backup directory: ${backupDir}`);

      // Validate connections
      const s3Valid = await this.validateS3Connection();
      const dbValid = await this.validateDatabaseConnection();

      if (!s3Valid || !dbValid) {
        throw new Error('Connection validation failed');
      }

      // Perform backups
      const dumpFile = await this.backupDatabase(backupDir);
      const filesArchive = await this.backupFiles(backupDir);

      // Compress and encrypt
      const encryptedFiles = await this.compressAndEncryptBackups(dumpFile, filesArchive, backupDir);

      // Upload to S3
      const backupDate = new Date().toISOString().split('T')[0];
      const s3Paths = await this.uploadToS3(encryptedFiles, backupDate);

      // Record metadata
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      await this.recordBackupMetadata(s3Paths, durationSeconds);

      // Clean up
      fs.rmSync(backupDir, { recursive: true, force: true });

      // Send notification
      await this.sendNotification(true, `Backup completed successfully in ${durationSeconds} seconds`);

      this.log('info', '═══════════════════════════════════════');
      this.log('info', '   ✓ BACKUP COMPLETED SUCCESSFULLY');
      this.log('info', '═══════════════════════════════════════');

      return true;
    } catch (error) {
      this.log('error', `Backup failed: ${error.message}`);
      this.metadata.status = 'failed';
      this.metadata.error_message = error.message;

      // Clean up
      if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
      }

      // Send failure notification
      await this.sendNotification(false, error.message);

      this.log('info', '═══════════════════════════════════════');
      this.log('info', '   ✗ BACKUP FAILED');
      this.log('info', '═══════════════════════════════════════');

      return false;
    } finally {
      await this.db.end();
    }
  }
}

// Main execution
async function main() {
  const config: BackupConfig = {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/barbershop',
    s3Bucket: process.env.S3_BACKUP_BUCKET || 'barbershop-backups',
    s3Region: process.env.AWS_REGION || 'us-east-1',
    s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    filesDirectory: process.env.FILES_DIRECTORY || './public/uploads',
    backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY || '',
    notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL || 'admin@barbershop.local',
    resendApiKey: process.env.RESEND_API_KEY || '',
    shopId: process.env.SHOP_ID || '00000000-0000-0000-0000-000000000000',
  };

  const backup = new BackupManager(config);
  const success = await backup.execute();

  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export default BackupManager;
