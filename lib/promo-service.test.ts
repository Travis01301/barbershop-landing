import { promoService } from './promo-service';
import * as db from './db';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('./db');
jest.mock('stripe');

describe('PromoService', () => {
  let mockQuery: jest.MockedFunction<typeof db.query>;
  let mockGetClient: jest.MockedFunction<typeof db.getClient>;
  let mockStripeCouponsCreate: jest.MockedFunction<any>;
  let mockStripeSubscriptionsUpdate: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQuery = db.query as jest.MockedFunction<typeof db.query>;
    mockGetClient = db.getClient as jest.MockedFunction<typeof db.getClient>;
    mockStripeCouponsCreate = jest.fn();
    mockStripeSubscriptionsUpdate = jest.fn();

    // Mock Stripe instance
    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => ({
      coupons: {
        create: mockStripeCouponsCreate,
      },
      subscriptions: {
        update: mockStripeSubscriptionsUpdate,
      },
    } as any));
  });

  describe('validatePromoCode', () => {
    it('should return invalid if code not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await promoService.validatePromoCode('INVALID');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Promo code not found');
    });

    it('should return invalid if code is inactive', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: false,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      const result = await promoService.validatePromoCode('LAUNCH50');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Promo code is inactive');
    });

    it('should return invalid if code has expired', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: yesterday.toISOString(),
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      const result = await promoService.validatePromoCode('LAUNCH50');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Promo code has expired');
    });

    it('should return invalid if max uses reached', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: 10,
            used_count: 10,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      const result = await promoService.validatePromoCode('LAUNCH50');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Promo code has reached maximum usage limit');
    });

    it('should return invalid if shop already has active promo code', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'LAUNCH50',
              discount_percent: 50,
              duration_months: 6,
              max_uses: null,
              used_count: 0,
              expires_at: null,
              is_active: true,
              stripe_coupon_id: 'cpon_123',
              created_by: 1,
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              description: null,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ active_promo_code_id: 2 }],
          rowCount: 1,
        });

      const result = await promoService.validatePromoCode('LAUNCH50', 1);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Shop already has an active promo code');
    });

    it('should return valid for a valid promo code', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      const result = await promoService.validatePromoCode('LAUNCH50');
      
      expect(result.isValid).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code?.code).toBe('LAUNCH50');
    });

    it('should normalize code to uppercase', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      await promoService.validatePromoCode('launch50');
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['LAUNCH50'])
      );
    });
  });

  describe('redeemPromoCode', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      mockGetClient.mockResolvedValue(mockClient as any);
    });

    it('should prevent duplicate redemptions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // Already redeemed

      const result = await promoService.redeemPromoCode('LAUNCH50', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DUPLICATE_REDEMPTION');
    });

    it('should successfully redeem a valid promo code', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No existing usage
        .mockResolvedValueOnce({
          rows: [{ id: 1, discount_applied: 19.5, discount_end_at: tomorrow.toISOString() }],
          rowCount: 1,
        }) // Insert usage
        .mockResolvedValueOnce({ rowCount: 1 }) // Update shop
        .mockResolvedValueOnce({ rowCount: 1 }); // Update usage count

      const result = await promoService.redeemPromoCode('LAUNCH50', 1);

      expect(result.success).toBe(true);
      expect(result.discountApplied).toBe(19.5);
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should handle Stripe coupon application errors gracefully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 50,
            duration_months: 6,
            max_uses: null,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            description: null,
          },
        ],
        rowCount: 1,
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ id: 1, discount_applied: 19.5, discount_end_at: new Date().toISOString() }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      mockStripeSubscriptionsUpdate.mockRejectedValueOnce(new Error('Stripe API error'));

      const result = await promoService.redeemPromoCode('LAUNCH50', 1, 'sub_123');

      // Should still succeed even if Stripe fails
      expect(result.success).toBe(true);
    });
  });

  describe('getAnalytics', () => {
    it('should return aggregated analytics data', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              code: 'LAUNCH50',
              discount_percent: 50,
              duration_months: 6,
              max_uses: null,
              used_count: 5,
              expires_at: null,
              is_active: true,
              stripe_coupon_id: 'cpon_123',
              created_by: 1,
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              description: null,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              code_id: 1,
              redemptions: 5,
              total_discount: 97.5,
            },
          ],
          rowCount: 1,
        });

      const analytics = await promoService.getAnalytics();

      expect(analytics.totalCodes).toBe(1);
      expect(analytics.activeCodes).toBe(1);
      expect(analytics.totalRedemptions).toBe(5);
      expect(analytics.totalDiscountApplied).toBe(97.5);
      expect(analytics.codes).toHaveLength(1);
      expect(analytics.codes[0].code).toBe('LAUNCH50');
    });

    it('should handle empty analytics', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const analytics = await promoService.getAnalytics();

      expect(analytics.totalCodes).toBe(0);
      expect(analytics.totalRedemptions).toBe(0);
      expect(analytics.codes).toHaveLength(0);
    });
  });

  describe('updatePromoCode', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      mockGetClient.mockResolvedValue(mockClient as any);
    });

    it('should update promo code with provided fields', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            code: 'LAUNCH50',
            discount_percent: 75,
            duration_months: 6,
            max_uses: 100,
            used_count: 0,
            expires_at: null,
            is_active: true,
            stripe_coupon_id: 'cpon_123',
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: '2024-01-02',
            description: 'Updated',
          },
        ],
        rowCount: 1,
      });

      const result = await promoService.updatePromoCode(1, {
        discountPercent: 75,
        maxUses: 100,
        description: 'Updated',
      });

      expect(result.id).toBe(1);
      expect(result.discountPercent).toBe(75);
      expect(result.maxUses).toBe(100);
    });

    it('should throw error if code not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        promoService.updatePromoCode(999, { isActive: false })
      ).rejects.toThrow('Promo code not found');
    });
  });

  describe('cleanupExpiredCodes', () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      mockGetClient.mockResolvedValue(mockClient as any);
    });

    it('should deactivate and remove expired codes', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }, { id: 2 }],
          rowCount: 2,
        })
        .mockResolvedValueOnce({ rowCount: 2 })
        .mockResolvedValueOnce({ rowCount: 3 });

      const count = await promoService.cleanupExpiredCodes();

      expect(count).toBe(2);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it('should return 0 if no expired codes', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const count = await promoService.cleanupExpiredCodes();

      expect(count).toBe(0);
    });
  });
});
