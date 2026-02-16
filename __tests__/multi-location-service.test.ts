import multiLocationService from '@/lib/multi-location-service';
import * as db from '@/lib/db';

jest.mock('@/lib/db');
jest.mock('@/lib/logger', () => ({
  logger: {
    createChild: () => ({
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

describe('Multi-Location Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLocation', () => {
    it('should create a new parent location', async () => {
      const mockLocation = {
        id: 1,
        name: 'Main Shop',
        slug: 'main-shop',
        parent_shop_id: null,
        is_parent_location: true,
        location_type: 'parent',
        address: '123 Main St',
        phone: '555-1234',
        email: 'shop@example.com',
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockLocation],
        rowCount: 1,
      });

      const result = await multiLocationService.createLocation({
        name: 'Main Shop',
        slug: 'main-shop',
        address: '123 Main St',
        phone: '555-1234',
        email: 'shop@example.com',
      });

      expect(result).toEqual({
        id: 1,
        name: 'Main Shop',
        slug: 'main-shop',
        parentShopId: null,
        isParentLocation: true,
        locationType: 'parent',
        address: '123 Main St',
        phone: '555-1234',
        email: 'shop@example.com',
        createdAt: '2026-02-16T00:00:00Z',
        updatedAt: '2026-02-16T00:00:00Z',
      });
    });

    it('should create a franchise location with parent reference', async () => {
      const mockLocation = {
        id: 2,
        name: 'Downtown Branch',
        slug: 'downtown-branch',
        parent_shop_id: 1,
        is_parent_location: false,
        location_type: 'franchise',
        address: '456 Branch St',
        phone: '555-5678',
        email: 'branch@example.com',
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockLocation],
        rowCount: 1,
      });

      const result = await multiLocationService.createLocation({
        name: 'Downtown Branch',
        slug: 'downtown-branch',
        address: '456 Branch St',
        phone: '555-5678',
        email: 'branch@example.com',
        parentShopId: 1,
      });

      expect(result.locationType).toBe('franchise');
      expect(result.parentShopId).toBe(1);
    });

    it('should handle creation errors', async () => {
      (db.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(
        multiLocationService.createLocation({
          name: 'Test',
          slug: 'test',
        })
      ).rejects.toThrow();
    });
  });

  describe('getLocations', () => {
    it('should return all locations', async () => {
      const mockLocations = [
        {
          id: 1,
          name: 'Main Shop',
          slug: 'main-shop',
          parent_shop_id: null,
          is_parent_location: true,
          location_type: 'parent',
          address: '123 Main St',
          phone: '555-1234',
          email: 'shop@example.com',
          created_at: '2026-02-16T00:00:00Z',
          updated_at: '2026-02-16T00:00:00Z',
        },
        {
          id: 2,
          name: 'Downtown Branch',
          slug: 'downtown-branch',
          parent_shop_id: 1,
          is_parent_location: false,
          location_type: 'franchise',
          address: '456 Branch St',
          phone: '555-5678',
          email: 'branch@example.com',
          created_at: '2026-02-16T00:00:00Z',
          updated_at: '2026-02-16T00:00:00Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockLocations,
        rowCount: 2,
      });

      const result = await multiLocationService.getLocations();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Main Shop');
      expect(result[1].parentShopId).toBe(1);
    });

    it('should filter by parentShopId', async () => {
      const mockLocations = [
        {
          id: 2,
          name: 'Downtown Branch',
          slug: 'downtown-branch',
          parent_shop_id: 1,
          is_parent_location: false,
          location_type: 'franchise',
          address: '456 Branch St',
          phone: '555-5678',
          email: 'branch@example.com',
          created_at: '2026-02-16T00:00:00Z',
          updated_at: '2026-02-16T00:00:00Z',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockLocations,
        rowCount: 1,
      });

      const result = await multiLocationService.getLocations(undefined, 1);

      expect(result).toHaveLength(1);
      expect(result[0].parentShopId).toBe(1);
    });
  });

  describe('assignStaffToLocation', () => {
    it('should assign staff to location', async () => {
      const mockAssignment = {
        id: 1,
        user_id: 10,
        shop_id: 1,
        primary_location: true,
        start_date: '2026-02-16',
        end_date: null,
        assignment_type: 'regular',
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockAssignment],
        rowCount: 1,
      });

      const result = await multiLocationService.assignStaffToLocation(10, 1, {
        primaryLocation: true,
      });

      expect(result.userId).toBe(10);
      expect(result.shopId).toBe(1);
      expect(result.primaryLocation).toBe(true);
    });

    it('should handle temporary assignments', async () => {
      const mockAssignment = {
        id: 1,
        user_id: 10,
        shop_id: 2,
        primary_location: false,
        start_date: '2026-02-20',
        end_date: '2026-03-20',
        assignment_type: 'temporary',
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockAssignment],
        rowCount: 1,
      });

      const result = await multiLocationService.assignStaffToLocation(10, 2, {
        startDate: '2026-02-20',
        endDate: '2026-03-20',
        assignmentType: 'temporary',
      });

      expect(result.assignmentType).toBe('temporary');
      expect(result.endDate).toBe('2026-03-20');
    });
  });

  describe('requestCrossLocationTransfer', () => {
    it('should create a transfer request', async () => {
      const mockTransfer = {
        id: 1,
        user_id: 10,
        from_shop_id: 1,
        to_shop_id: 2,
        transfer_date: '2026-02-20',
        reason: 'Staff request',
        status: 'pending',
        approved_by: null,
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockTransfer],
        rowCount: 1,
      });

      const result = await multiLocationService.requestCrossLocationTransfer(10, 1, 2, {
        transferDate: '2026-02-20',
        reason: 'Staff request',
      });

      expect(result.status).toBe('pending');
      expect(result.fromShopId).toBe(1);
      expect(result.toShopId).toBe(2);
    });
  });

  describe('getLocationHierarchy', () => {
    it('should return parent and children for parent location', async () => {
      const mockParent = {
        id: 1,
        name: 'Main Shop',
        slug: 'main-shop',
        parent_shop_id: null,
        is_parent_location: true,
        location_type: 'parent',
        address: '123 Main St',
        phone: '555-1234',
        email: 'shop@example.com',
        created_at: '2026-02-16T00:00:00Z',
        updated_at: '2026-02-16T00:00:00Z',
      };

      const mockChildren = [
        {
          id: 2,
          name: 'Downtown Branch',
          slug: 'downtown-branch',
          parent_shop_id: 1,
          is_parent_location: false,
          location_type: 'franchise',
          address: '456 Branch St',
          phone: '555-5678',
          email: 'branch@example.com',
          created_at: '2026-02-16T00:00:00Z',
          updated_at: '2026-02-16T00:00:00Z',
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockParent], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockChildren, rowCount: 1 });

      const result = await multiLocationService.getLocationHierarchy(1);

      expect(result.parent).toEqual(expect.objectContaining({ id: 1 }));
      expect(result.children).toHaveLength(1);
    });
  });

  describe('getConsolidatedRevenue', () => {
    it('should return consolidated revenue for parent location', async () => {
      const mockRevenue = [
        {
          parent_shop_id: 1,
          child_shop_id: 2,
          revenue_date: '2026-02-16',
          total_revenue: '1500.00',
          appointment_count: 10,
          average_transaction: '150.00',
        },
        {
          parent_shop_id: 1,
          child_shop_id: 3,
          revenue_date: '2026-02-16',
          total_revenue: '2000.00',
          appointment_count: 12,
          average_transaction: '166.67',
        },
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockRevenue,
        rowCount: 2,
      });

      const result = await multiLocationService.getConsolidatedRevenue(1);

      expect(result).toHaveLength(2);
      expect(result[0].total_revenue).toBe('1500.00');
    });
  });
});
