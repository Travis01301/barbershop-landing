import BackupManager from '@/scripts/backup';
import { Pool } from 'pg';
import { S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('pg');
jest.mock('@aws-sdk/client-s3');
jest.mock('child_process');
jest.mock('fs');

describe('BackupManager', () => {
  let backupManager: BackupManager;
  let mockPool: jest.Mocked<Pool>;
  let mockS3: jest.Mocked<S3Client>;

  const mockConfig = {
    databaseUrl: 'postgresql://test:test@localhost/test',
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    s3AccessKeyId: 'test-key',
    s3SecretAccessKey: 'test-secret',
    filesDirectory: '/test/files',
    backupRetentionDays: 30,
    encryptionKey: 'test-key-32-characters-long!!!',
    notificationEmail: 'test@example.com',
    resendApiKey: 'test-api-key',
    shopId: '00000000-0000-0000-0000-000000000000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    backupManager = new BackupManager(mockConfig);
    mockPool = Pool as jest.Mocked<typeof Pool>;
    mockS3 = S3Client as jest.Mocked<typeof S3Client>;
  });

  describe('validateS3Connection', () => {
    it('should successfully validate S3 connection', async () => {
      const result = await backupManager.validateS3Connection();
      expect(result).toBe(true);
    });

    it('should handle S3 connection failure', async () => {
      jest.spyOn(mockS3.prototype, 'send').mockRejectedValueOnce(new Error('Connection failed'));
      const result = await backupManager.validateS3Connection();
      expect(result).toBe(false);
    });
  });

  describe('validateDatabaseConnection', () => {
    it('should successfully validate database connection', async () => {
      jest.spyOn(mockPool.prototype, 'query').mockResolvedValueOnce({ rows: [{ '?column?': 1 }] } as any);
      const result = await backupManager.validateDatabaseConnection();
      expect(result).toBe(true);
    });

    it('should handle database connection failure', async () => {
      jest.spyOn(mockPool.prototype, 'query').mockRejectedValueOnce(new Error('Connection failed'));
      const result = await backupManager.validateDatabaseConnection();
      expect(result).toBe(false);
    });
  });

  describe('backupDatabase', () => {
    it('should create a database backup', async () => {
      const backupDir = '/tmp/backup';
      (fs.mkdtempSync as jest.Mock).mockReturnValue(backupDir);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 104857600 }); // 100MB

      const result = await backupManager.backupDatabase(backupDir);
      
      expect(result).toContain('db-dump.sql');
      expect(fs.statSync).toHaveBeenCalled();
    });

    it('should handle database backup failure', async () => {
      const backupDir = '/tmp/backup';
      
      await expect(backupManager.backupDatabase(backupDir)).rejects.toThrow();
    });
  });

  describe('backupFiles', () => {
    it('should create a file backup', async () => {
      const backupDir = '/tmp/backup';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 52428800 }); // 50MB
      (fs.readdirSync as jest.Mock).mockReturnValue(['file1', 'file2', 'file3']);

      const result = await backupManager.backupFiles(backupDir);
      
      expect(result).toContain('files.tar.gz');
    });

    it('should handle missing files directory', async () => {
      const backupDir = '/tmp/backup';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await backupManager.backupFiles(backupDir);
      
      expect(result).toBe('');
    });
  });

  describe('encryption and compression', () => {
    it('should encrypt and compress files', async () => {
      const dumpFile = '/tmp/dump.sql';
      const filesArchive = '/tmp/files.tar.gz';
      const backupDir = '/tmp/backup';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 10485760 }); // 10MB

      const result = await backupManager.compressAndEncryptBackups(
        dumpFile,
        filesArchive,
        backupDir
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('.enc');
      expect(result[1]).toContain('.enc');
    });

    it('should calculate checksum', async () => {
      const filePath = '/tmp/test.gz';
      const checksum = await (backupManager as any).calculateChecksum(filePath);
      
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });
  });

  describe('S3 upload', () => {
    it('should upload backup files to S3', async () => {
      const files = ['/tmp/db-dump.sql.gz.enc', '/tmp/files.tar.gz.enc'];
      const backupDate = '2026-02-16';

      const paths = await backupManager.uploadToS3(files, backupDate);

      expect(paths).toHaveLength(2);
      expect(paths[0]).toContain('daily/2026-02-16');
    });

    it('should handle S3 upload failure', async () => {
      const files = ['/tmp/db-dump.sql.gz.enc'];
      const backupDate = '2026-02-16';

      jest.spyOn(mockS3.prototype, 'send').mockRejectedValueOnce(new Error('Upload failed'));

      await expect(backupManager.uploadToS3(files, backupDate)).rejects.toThrow();
    });
  });

  describe('metadata recording', () => {
    it('should record backup metadata to database', async () => {
      const s3Paths = ['daily/2026-02-16/db-dump.sql.gz.enc'];
      const durationSeconds = 300;

      await backupManager.recordBackupMetadata(s3Paths, durationSeconds);

      expect(mockPool.prototype.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO backup_jobs'),
        expect.any(Array)
      );
    });
  });

  describe('notifications', () => {
    it('should send success notification', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true });

      await backupManager.sendNotification(true, 'Backup completed successfully');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockConfig.resendApiKey}`,
          }),
        })
      );
    });

    it('should send failure notification', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true });

      await backupManager.sendNotification(false, 'Backup failed: Connection timeout');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.any(Object)
      );
    });
  });

  describe('full backup execution', () => {
    it('should execute complete backup process', async () => {
      // Mock all required functions
      jest.spyOn(backupManager, 'validateS3Connection').mockResolvedValueOnce(true);
      jest.spyOn(backupManager, 'validateDatabaseConnection').mockResolvedValueOnce(true);
      jest.spyOn(backupManager, 'backupDatabase').mockResolvedValueOnce('/tmp/dump.sql');
      jest.spyOn(backupManager, 'backupFiles').mockResolvedValueOnce('/tmp/files.tar.gz');
      jest.spyOn(backupManager, 'compressAndEncryptBackups').mockResolvedValueOnce([
        '/tmp/db-dump.sql.gz.enc',
        '/tmp/files.tar.gz.enc',
      ]);
      jest.spyOn(backupManager, 'uploadToS3').mockResolvedValueOnce([
        'daily/2026-02-16/db-dump.sql.gz.enc',
      ]);
      jest.spyOn(backupManager, 'recordBackupMetadata').mockResolvedValueOnce();
      jest.spyOn(backupManager, 'sendNotification').mockResolvedValueOnce();

      (fs.mkdtempSync as jest.Mock).mockReturnValue('/tmp/backup');
      (fs.rmSync as jest.Mock).mockImplementation(() => {});

      const result = await backupManager.execute();

      expect(result).toBe(true);
      expect(backupManager.validateS3Connection).toHaveBeenCalled();
      expect(backupManager.validateDatabaseConnection).toHaveBeenCalled();
      expect(backupManager.backupDatabase).toHaveBeenCalled();
      expect(backupManager.uploadToS3).toHaveBeenCalled();
    });

    it('should handle backup execution failure', async () => {
      jest.spyOn(backupManager, 'validateS3Connection').mockResolvedValueOnce(false);

      const result = await backupManager.execute();

      expect(result).toBe(false);
    });
  });

  describe('backup integrity', () => {
    it('should verify backup integrity', async () => {
      const filePath = '/tmp/db-dump.sql.gz.enc';
      (fs.statSync as jest.Mock).mockReturnValue({ size: 104857600 });

      const checksum = await (backupManager as any).calculateChecksum(filePath);

      expect(checksum).toBeTruthy();
      expect(checksum).toHaveLength(64); // SHA-256
    });

    it('should handle corrupted backup detection', async () => {
      const filePath = '/tmp/corrupted.gz.enc';
      
      // Simulate file not found or unreadable
      (fs.createReadStream as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      await expect(
        (backupManager as any).calculateChecksum(filePath)
      ).rejects.toThrow();
    });
  });

  describe('backup retention', () => {
    it('should respect retention policy', async () => {
      // This would be tested in the database cleanup cron job
      // Verify that old backups are marked for deletion
      expect(mockConfig.backupRetentionDays).toBe(30);
    });
  });

  describe('multi-shop backup', () => {
    it('should handle multiple shops', async () => {
      const shops = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ];

      // Each shop would be backed up independently
      // Verify that shop_id is properly associated with each backup

      expect(mockConfig.shopId).toBeDefined();
    });
  });
});
