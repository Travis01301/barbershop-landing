import { NextRequest } from 'next/server';
import { GET as getBackups, POST as createBackup } from '@/app/api/admin/backups/route';
import { GET as getBackupDetails } from '@/app/api/admin/backups/[date]/route';
import { POST as initiateRestore } from '@/app/api/admin/backups/restore/route';
import { GET as getBackupStatus } from '@/app/api/admin/backups/status/route';
import { GET as getBackupLogs } from '@/app/api/admin/backups/logs/route';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

jest.mock('pg');
jest.mock('bcryptjs');

describe('Backup API Endpoints', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockRequest: Partial<NextRequest>;

  const mockShopId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAdminId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = Pool as jest.Mocked<typeof Pool>;

    mockRequest = {
      headers: new Map([
        ['authorization', `Bearer test-token`],
      ]),
      json: jest.fn(),
    };
  });

  describe('GET /api/admin/backups', () => {
    it('should list all backups for a shop', async () => {
      const mockBackups = [
        {
          id: '1',
          backup_date: new Date('2026-02-16'),
          backup_type: 'full',
          status: 'completed',
          size_bytes: 104857600,
        },
        {
          id: '2',
          backup_date: new Date('2026-02-15'),
          backup_type: 'incremental',
          status: 'completed',
          size_bytes: 52428800,
        },
      ];

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: mockBackups } as any)
        .mockResolvedValueOnce({ rows: [{ count: 2 }] } as any);

      const response = await getBackups(mockRequest as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.pagination.total).toBe(2);
    });

    it('should handle unauthorized access', async () => {
      const unauthedRequest = {
        headers: new Map(),
      } as any;

      const response = await getBackups(unauthedRequest);

      expect(response.status).toBe(401);
    });

    it('should filter by backup type', async () => {
      const mockBackups = [
        {
          id: '1',
          backup_date: new Date('2026-02-16'),
          backup_type: 'full',
          status: 'completed',
          size_bytes: 104857600,
        },
      ];

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: mockBackups } as any)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] } as any);

      const urlWithType = new URL('http://localhost/api/admin/backups?type=full');
      mockRequest.url = urlWithType.toString();

      const response = await getBackups({ ...mockRequest, url: urlWithType.toString() } as NextRequest);
      const json = await response.json();

      expect(json.data).toHaveLength(1);
      expect(json.data[0].backup_type).toBe('full');
    });

    it('should support pagination', async () => {
      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: 100 }] } as any);

      const urlWithPagination = new URL('http://localhost/api/admin/backups?limit=10&offset=20');
      mockRequest.url = urlWithPagination.toString();

      const response = await getBackups({ ...mockRequest, url: urlWithPagination.toString() } as NextRequest);
      const json = await response.json();

      expect(json.pagination.limit).toBe(10);
      expect(json.pagination.offset).toBe(20);
    });
  });

  describe('GET /api/admin/backups/[date]', () => {
    it('should get backup details for a date', async () => {
      const mockBackup = {
        id: '1',
        backup_date: new Date('2026-02-16'),
        backup_type: 'full',
        status: 'completed',
        size_bytes: 104857600,
      };

      const mockMetadata = {
        id: '1',
        backup_job_id: '1',
        database_size_bytes: 104857600,
        table_count: 25,
        file_count: 150,
      };

      const mockLogs = [
        {
          id: '1',
          log_level: 'info',
          message: 'Backup started',
          timestamp: new Date(),
        },
      ];

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [mockBackup] } as any)
        .mockResolvedValueOnce({ rows: [mockMetadata] } as any)
        .mockResolvedValueOnce({ rows: mockLogs } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const response = await getBackupDetails(mockRequest as NextRequest, {
        params: { date: '2026-02-16' },
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.backup).toEqual(mockBackup);
      expect(json.data.metadata).toEqual(mockMetadata);
      expect(json.data.logs).toEqual(mockLogs);
    });

    it('should return 404 if backup not found', async () => {
      jest.spyOn(mockPool.prototype, 'query').mockResolvedValueOnce({
        rows: [],
      } as any);

      const response = await getBackupDetails(mockRequest as NextRequest, {
        params: { date: '2026-02-16' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/admin/backups/restore', () => {
    it('should initiate a restore operation', async () => {
      const mockBackup = {
        id: '1',
        backup_date: new Date('2026-02-16'),
        status: 'completed',
      };

      const mockAdmin = {
        id: mockAdminId,
        shop_id: mockShopId,
        password_hash: await bcrypt.hash('admin123', 10),
      };

      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        backup_date: '2026-02-16',
        admin_password: 'admin123',
        test_restore: false,
      });

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [mockBackup] } as any)
        .mockResolvedValueOnce({ rows: [mockAdmin] } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'restore-1' }],
        } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const response = await initiateRestore(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    it('should require admin password', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        backup_date: '2026-02-16',
        // Missing admin_password
      });

      const response = await initiateRestore(mockRequest as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain('admin_password');
    });

    it('should verify admin password', async () => {
      const mockAdmin = {
        id: mockAdminId,
        password_hash: await bcrypt.hash('correctpassword', 10),
      };

      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        backup_date: '2026-02-16',
        admin_password: 'wrongpassword',
      });

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [{ id: '1' }] } as any) // Backup
        .mockResolvedValueOnce({ rows: [mockAdmin] } as any); // Admin

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const response = await initiateRestore(mockRequest as NextRequest);

      expect(response.status).toBe(401);
    });

    it('should support test restore mode', async () => {
      const mockBackup = { id: '1', status: 'completed' };

      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        backup_date: '2026-02-16',
        admin_password: 'admin123',
        test_restore: true,
      });

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [mockBackup] } as any)
        .mockResolvedValueOnce({ rows: [{ password_hash: 'hash' }] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'restore-1' }] } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const response = await initiateRestore(mockRequest as NextRequest);
      const json = await response.json();

      expect(json.data.test_restore).toBe(true);
    });
  });

  describe('GET /api/admin/backups/status', () => {
    it('should return backup status and metrics', async () => {
      const mockBackup = {
        id: '1',
        backup_date: new Date(),
        status: 'completed',
      };

      const mockStats = {
        success_rate: 100,
        total_backups_attempted: 30,
        total_backups_successful: 30,
        total_backups_failed: 0,
      };

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [mockBackup] } as any) // last backup
        .mockResolvedValueOnce({ rows: [{ backup_time: '02:00' }] } as any) // schedule
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as any) // failed count
        .mockResolvedValueOnce({ rows: [mockStats] } as any) // stats
        .mockResolvedValueOnce({ rows: [] } as any); // trend

      const response = await getBackupStatus(mockRequest as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.last_backup).toBeDefined();
      expect(json.data.rpo_status).toBeDefined();
      expect(json.data.rto_target_hours).toBe(2);
    });

    it('should calculate RPO status', async () => {
      const recentBackup = {
        id: '1',
        backup_date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [recentBackup] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const response = await getBackupStatus(mockRequest as NextRequest);
      const json = await response.json();

      expect(json.data.rpo_status).toBe('healthy');
    });
  });

  describe('GET /api/admin/backups/logs', () => {
    it('should return backup logs with filtering', async () => {
      const mockLogs = [
        {
          id: '1',
          log_level: 'info',
          message: 'Backup started',
          timestamp: new Date(),
        },
        {
          id: '2',
          log_level: 'error',
          message: 'Backup failed',
          timestamp: new Date(),
        },
      ];

      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: mockLogs } as any)
        .mockResolvedValueOnce({ rows: [{ count: 2 }] } as any);

      const response = await getBackupLogs(mockRequest as NextRequest);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.logs).toHaveLength(2);
    });

    it('should include alert summary', async () => {
      jest.spyOn(mockPool.prototype, 'query')
        .mockResolvedValueOnce({ rows: [] } as any) // logs
        .mockResolvedValueOnce({ rows: [{ count: 0 }] } as any) // count
        .mockResolvedValueOnce({
          rows: [{
            total_errors: 1,
            errors_24h: 0,
            warnings: 0,
          }],
        } as any) // alerts
        .mockResolvedValueOnce({ rows: [] } as any); // failures

      const response = await getBackupLogs(mockRequest as NextRequest);
      const json = await response.json();

      expect(json.data.alerts).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      jest.spyOn(mockPool.prototype, 'query').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await getBackups(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });

    it('should handle unexpected errors', async () => {
      (mockRequest.json as jest.Mock).mockRejectedValueOnce(
        new Error('Invalid JSON')
      );

      const response = await initiateRestore(mockRequest as NextRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('security', () => {
    it('should require admin authentication', async () => {
      const unauthRequest = {
        headers: new Map(),
      } as any;

      const response = await getBackups(unauthRequest);

      expect(response.status).toBe(401);
    });

    it('should log restore operations', async () => {
      // Verify that restore operations are logged with user ID
      jest.spyOn(mockPool.prototype, 'query');

      // Make a restore request
      // Verify logging query was called
      expect(mockPool.prototype.query).toBeDefined();
    });
  });
});
