import {
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyBalance,
  generateReferralCode,
  validateReferralCode,
  applyReferralReward,
  getReferralStats,
} from './loyalty-service';
import * as db from './db';

// Mock database module
jest.mock('./db');

describe('Loyalty Service', () => {
  const mockShopId = 1;
  const mockCustomerId = 1;
  const mockReferrerId = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('earnLoyaltyPoints', () => {
    it('should earn points from appointment', async () => {
      const mockTransaction = {
        id: 1,
        shop_id: mockShopId,
        customer_id: mockCustomerId,
        appointment_id: 1,
        transaction_type: 'earn',
        points_amount: 100,
        amount_usd: 100,
        created_at: new Date().toISOString(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // INSERT transaction
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE customer
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await earnLoyaltyPoints({
        customerId: mockCustomerId,
        shopId: mockShopId,
        appointmentId: 1,
        amount: 100,
      });

      expect(result?.points_amount).toBe(100);
      expect(result?.transaction_type).toBe('earn');
    });

    it('should calculate points as 1 point per dollar', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ points_amount: 75 }],
            rowCount: 1,
          }) // INSERT
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await earnLoyaltyPoints({
        customerId: mockCustomerId,
        shopId: mockShopId,
        appointmentId: 1,
        amount: 75,
      });

      expect(result?.points_amount).toBe(75);
    });
  });

  describe('redeemLoyaltyPoints', () => {
    it('should redeem points for discount', async () => {
      const mockTransaction = {
        id: 2,
        points_amount: -100,
        amount_usd: 10,
        transaction_type: 'redeem',
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ loyalty_points: 150 }],
            rowCount: 1,
          }) // SELECT balance
          .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 }) // INSERT
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await redeemLoyaltyPoints({
        customerId: mockCustomerId,
        shopId: mockShopId,
        pointsToRedeem: 100,
        appointmentId: 1,
      });

      expect(result?.discountAmount).toBe(10); // 100 points / 10 = $10
      expect(result?.transaction.points_amount).toBe(-100);
    });

    it('should prevent redeeming more points than available', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ loyalty_points: 50 }],
            rowCount: 1,
          }) // SELECT balance
          .mockResolvedValueOnce({ rowCount: 1 }), // ROLLBACK
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        redeemLoyaltyPoints({
          customerId: mockCustomerId,
          shopId: mockShopId,
          pointsToRedeem: 100,
          appointmentId: 1,
        })
      ).rejects.toThrow('Insufficient points');
    });
  });

  describe('getLoyaltyBalance', () => {
    it('should return customer loyalty balance', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ loyalty_points: 250, total_spent: 250 }],
        rowCount: 1,
      });

      const result = await getLoyaltyBalance(mockCustomerId, mockShopId);

      expect(result?.points).toBe(250);
      expect(result?.redeemedValue).toBe(25); // 250 points / 10 = $25
    });

    it('should return null when customer not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getLoyaltyBalance(999, mockShopId);

      expect(result).toBeNull();
    });
  });

  describe('generateReferralCode', () => {
    it('should generate unique referral code', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ referral_code: null }], rowCount: 1 }) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE

      const result = await generateReferralCode(mockCustomerId, mockShopId);

      expect(result).toBeDefined();
      expect(result).toMatch(/^REF-[A-F0-9]{8}$/);
    });

    it('should return existing code if already generated', async () => {
      const existingCode = 'REF-ABC12345';
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ referral_code: existingCode }],
        rowCount: 1,
      });

      const result = await generateReferralCode(mockCustomerId, mockShopId);

      expect(result).toBe(existingCode);
    });
  });

  describe('validateReferralCode', () => {
    it('should validate referral code and return referrer info', async () => {
      const mockReferrer = {
        id: mockReferrerId,
        name: 'John',
        email: 'john@example.com',
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockReferrer],
        rowCount: 1,
      });

      const result = await validateReferralCode('REF-ABC12345', mockShopId);

      expect(result).toEqual(mockReferrer);
    });

    it('should return null for invalid code', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await validateReferralCode('INVALID', mockShopId);

      expect(result).toBeNull();
    });
  });

  describe('applyReferralReward', () => {
    it('should apply $5 reward to both referrer and referee', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ id: mockReferrerId }],
            rowCount: 1,
          }) // SELECT referrer
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT existing
          .mockResolvedValueOnce({
            rows: [{ id: 1, reward_amount: 5 }],
            rowCount: 1,
          }) // INSERT reward
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE referrer
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE referee
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT transaction 1
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT transaction 2
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE reward status
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await applyReferralReward({
        referralCode: 'REF-ABC12345',
        refereeCustomerId: mockCustomerId,
        shopId: mockShopId,
        appointmentId: 1,
      });

      expect(result?.reward_amount).toBe(5);
    });

    it('should prevent duplicate reward application', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({
            rows: [{ id: mockReferrerId }],
            rowCount: 1,
          }) // SELECT referrer
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // SELECT existing
          .mockResolvedValueOnce({ rowCount: 1 }), // ROLLBACK
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        applyReferralReward({
          referralCode: 'REF-ABC12345',
          refereeCustomerId: mockCustomerId,
          shopId: mockShopId,
          appointmentId: 1,
        })
      ).rejects.toThrow('Referral reward already applied');
    });
  });

  describe('getReferralStats', () => {
    it('should return referral statistics for customer', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            referral_code: 'REF-ABC12345',
            completed_referrals: 2,
            active_referrals: 1,
            total_reward: 15,
          },
        ],
        rowCount: 1,
      });

      const result = await getReferralStats(mockCustomerId, mockShopId);

      expect(result?.referralCode).toBe('REF-ABC12345');
      expect(result?.totalReferrals).toBe(3);
      expect(result?.activeReferrals).toBe(1);
      expect(result?.totalRewardEarned).toBe(15);
    });
  });
});
