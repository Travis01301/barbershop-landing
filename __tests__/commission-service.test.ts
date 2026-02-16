import { CommissionService } from '@/lib/services/commission-service';
import { Client } from 'pg';
import type { CommissionRate, CommissionCalculationInput } from '@/lib/types/commission';

// Mock client
const mockClient = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Client;

describe('CommissionService', () => {
  let service: CommissionService;
  const mockQuery = mockClient.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommissionService(mockClient);
  });

  describe('getActiveCommissionRate', () => {
    it('should return barber override if active', async () => {
      const override = {
        id: 'override-1',
        shop_id: 'shop-1',
        barber_id: 'barber-1',
        rate_type: 'flat',
        base_rate: 50,
      };

      const defaultRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'flat',
        base_rate: 40,
        is_default: true,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [override] }) // Override query
        .mockResolvedValueOnce({ rows: [defaultRate] }); // Default query

      const rate = await service.getActiveCommissionRate('shop-1', 'barber-1');

      expect(rate?.base_rate).toBe(50);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return default rate if no override', async () => {
      const defaultRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'flat',
        base_rate: 40,
        is_default: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [] }); // No override
      mockQuery.mockResolvedValueOnce({ rows: [defaultRate] }); // Default rate

      const rate = await service.getActiveCommissionRate('shop-1', 'barber-1');

      expect(rate?.base_rate).toBe(40);
    });

    it('should throw error if no default rate exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No override
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No default

      await expect(service.getActiveCommissionRate('shop-1', 'barber-1')).rejects.toThrow(
        'No default commission rate found'
      );
    });
  });

  describe('calculateCommission', () => {
    const input: CommissionCalculationInput = {
      appointment_id: 'apt-1',
      barber_id: 'barber-1',
      service_type: 'haircut',
      service_price: 50,
    };

    it('should calculate flat commission correctly', async () => {
      const rate: CommissionRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'flat',
        base_rate: 40,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No override
        .mockResolvedValueOnce({ rows: [rate] }) // Default rate
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // Month revenue
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', base_commission: 20 }] }); // Transaction

      const result = await service.calculateCommission(input, 'shop-1');

      expect(result.base_commission).toBe(20); // 50 * 0.4
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should apply tiered commission based on monthly revenue', async () => {
      const rate: CommissionRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'tiered',
        base_rate: 40,
        tiered_rules: [
          { threshold: 500, rate: 45 },
          { threshold: 1000, rate: 50 },
        ],
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No override
        .mockResolvedValueOnce({ rows: [rate] }) // Default rate
        .mockResolvedValueOnce({ rows: [{ total: 600 }] }) // Month revenue > 500
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', base_commission: 22.5 }] }); // Transaction

      const result = await service.calculateCommission(input, 'shop-1');

      // At $600 revenue, should apply 45% tier
      expect(result.base_commission).toBe(22.5); // 50 * 0.45
    });

    it('should handle tips based on include_tip_in_commission flag', async () => {
      const inputWithTip: CommissionCalculationInput = {
        ...input,
        tip_amount: 10,
        include_tip_in_commission: true,
      };

      const rate: CommissionRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'flat',
        base_rate: 40,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No override
        .mockResolvedValueOnce({ rows: [rate] }) // Default rate
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // Month revenue
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', base_commission: 24 }] }); // Transaction

      const result = await service.calculateCommission(inputWithTip, 'shop-1');

      // (50 + 10) * 0.4 = 24
      expect(result.base_commission).toBe(24);
    });

    it('should handle discounts correctly', async () => {
      const inputWithDiscount: CommissionCalculationInput = {
        ...input,
        discount_amount: 10,
      };

      const rate: CommissionRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'flat',
        base_rate: 40,
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No override
        .mockResolvedValueOnce({ rows: [rate] }) // Default rate
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // Month revenue
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', base_commission: 16 }] }); // Transaction

      const result = await service.calculateCommission(inputWithDiscount, 'shop-1');

      // (50 - 10) * 0.4 = 16
      expect(result.base_commission).toBe(16);
    });

    it('should apply service-specific rates', async () => {
      const rate: CommissionRate = {
        id: 'rate-1',
        shop_id: 'shop-1',
        rate_type: 'service_specific',
        base_rate: 40,
        service_rates: {
          haircut: 45,
          'beard trim': 40,
          specialty: 50,
        },
        is_default: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // No override
        .mockResolvedValueOnce({ rows: [rate] }) // Default rate
        .mockResolvedValueOnce({ rows: [{ total: 0 }] }) // Month revenue
        .mockResolvedValueOnce({ rows: [{ id: 'tx-1', base_commission: 22.5 }] }); // Transaction

      const result = await service.calculateCommission(input, 'shop-1');

      // 50 * 0.45 = 22.5 (haircut rate)
      expect(result.base_commission).toBe(22.5);
    });
  });

  describe('cancelAppointmentCommission', () => {
    it('should mark transaction as refunded', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.cancelAppointmentCommission('shop-1', 'apt-1', 'Customer cancellation');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE commission_transactions'),
        expect.arrayContaining(['shop-1', 'apt-1', 'Customer cancellation'])
      );
    });
  });

  describe('getMonthlyStatement', () => {
    it('should aggregate transactions, bonuses, and deductions', async () => {
      const mockDate = new Date('2024-01-15');

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'tx-1',
              service_price: 100,
              base_commission: 40,
              transaction_date: mockDate,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'bonus-1',
              bonus_amount: 50,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'ded-1',
              amount: 10,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              total_appointments: 10,
              total_revenue: 1000,
              total_commission: 400,
            },
          ],
        });

      const statement = await service.getMonthlyStatement('shop-1', 'barber-1', mockDate);

      expect(statement.total_commission).toBe(40);
      expect(statement.total_bonuses).toBe(50);
      expect(statement.total_deductions).toBe(10);
      expect(statement.tax_withheld).toBeCloseTo(6, 1); // 40 * 0.15
    });
  });

  describe('calculatePayouts', () => {
    it('should create payouts for all active barbers', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ barber_id: 'barber-1' }, { barber_id: 'barber-2' }],
        })
        .mockResolvedValueOnce({ rows: [{ total_commission: 400 }] })
        .mockResolvedValueOnce({ rows: [{ total_bonuses: 50 }] })
        .mockResolvedValueOnce({ rows: [{ total_deductions: 10 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payout-1', net_payout: 424 }] })
        .mockResolvedValueOnce({ rows: [{ total_commission: 300 }] })
        .mockResolvedValueOnce({ rows: [{ total_bonuses: 0 }] })
        .mockResolvedValueOnce({ rows: [{ total_deductions: 0 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payout-2', net_payout: 255 }] });

      const payouts = await service.calculatePayouts('shop-1', startDate, endDate);

      expect(payouts).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
