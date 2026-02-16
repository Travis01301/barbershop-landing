import * as queueService from './queue-service';
import { getPool } from './db';
import { jest } from '@jest/globals';

// Mock the database
jest.mock('./db');

describe('Queue Service', () => {
  const mockQuery = jest.fn();
  const mockPool = { query: mockQuery } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('checkInCustomer', () => {
    it('should check in a customer to the queue', async () => {
      const shopId = 'shop-123';
      const entry = {
        id: 'queue-1',
        customer_name: 'John Doe',
        customer_phone: '555-1234',
        service_type: 'haircut',
        estimated_duration: 30,
        position_in_queue: 1,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_position: 0 }] }) // max position
        .mockResolvedValueOnce({ rows: [entry] }); // insert

      const result = await queueService.checkInCustomer(
        shopId,
        'John Doe',
        '555-1234',
        'haircut',
        30
      );

      expect(result).toEqual(entry);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should increment position in queue', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ max_position: 5 }] })
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 6 }] });

      const result = await queueService.checkInCustomer(
        'shop-1',
        'Jane',
        '555-5555',
        'fade',
        30
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getQueueStatus', () => {
    it('should return current queue status', async () => {
      const shopId = 'shop-123';
      const queue = [
        {
          id: 'q1',
          position_in_queue: 1,
          customer_name: 'John',
          service_type: 'haircut',
          estimated_duration: 30,
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: queue }) // waiting customers
        .mockResolvedValueOnce({ rows: [{ avg_wait: 25 }] }); // avg wait

      const result = await queueService.getQueueStatus(shopId);

      expect(result.total_waiting).toBe(1);
      expect(result.queue_display).toEqual(queue);
    });

    it('should calculate estimated wait time', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { estimated_duration: 30 },
            { estimated_duration: 45 },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ avg_wait: 30 }] });

      const result = await queueService.getQueueStatus('shop-1');

      expect(result.estimated_wait_time).toBeGreaterThan(0);
    });
  });

  describe('assignCustomerToBarber', () => {
    it('should assign customer to barber', async () => {
      const entry = {
        id: 'q1',
        position_in_queue: 2,
        shop_id: 'shop-1',
        status: 'in-service',
        barber_id: 'barber-1',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 2, shop_id: 'shop-1' }] }) // get entry
        .mockResolvedValueOnce({ rows: [entry] }) // update entry
        .mockResolvedValueOnce({ rows: [] }); // update positions

      const result = await queueService.assignCustomerToBarber('q1', 'barber-1');

      expect(result.status).toBe('in-service');
      expect(result.barber_id).toBe('barber-1');
    });

    it('should update positions for remaining customers', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 3, shop_id: 'shop-1' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'in-service' }] })
        .mockResolvedValueOnce({ rows: [] });

      await queueService.assignCustomerToBarber('q1', 'barber-1');

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('completeService', () => {
    it('should mark service as completed', async () => {
      const entry = {
        id: 'q1',
        status: 'completed',
        wait_time_minutes: 25,
        assigned_at: new Date(Date.now() - 25 * 60000),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ assigned_at: new Date(Date.now() - 25 * 60000) }] })
        .mockResolvedValueOnce({ rows: [entry] });

      const result = await queueService.completeService('q1');

      expect(result.status).toBe('completed');
    });

    it('should calculate wait time', async () => {
      const now = Date.now();
      const earlier = now - 30 * 60000; // 30 minutes ago

      mockQuery
        .mockResolvedValueOnce({ rows: [{ assigned_at: new Date(earlier) }] })
        .mockResolvedValueOnce({ rows: [{ wait_time_minutes: 30 }] });

      const result = await queueService.completeService('q1');

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelQueueEntry', () => {
    it('should cancel a queue entry', async () => {
      const entry = {
        id: 'q1',
        status: 'cancelled',
        position_in_queue: 2,
        shop_id: 'shop-1',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 2, shop_id: 'shop-1', status: 'waiting' }] })
        .mockResolvedValueOnce({ rows: [entry] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await queueService.cancelQueueEntry('q1');

      expect(result.status).toBe('cancelled');
    });

    it('should update positions after cancellation', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 2, shop_id: 'shop-1', status: 'waiting' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'cancelled' }] })
        .mockResolvedValueOnce({ rows: [] });

      await queueService.cancelQueueEntry('q1');

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('updateDailyAnalytics', () => {
    it('should calculate and update daily analytics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            total: 10,
            completed: 7,
            no_shows: 1,
            cancelled: 2,
            avg_wait: 20,
            max_wait: 45,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ hour: 14, count: 5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_wait_time_minutes: 20 }] });

      const result = await queueService.updateDailyAnalytics('shop-1', '2024-01-15');

      expect(result.total_walk_ins).toBe(10);
      expect(result.total_completed).toBe(7);
    });
  });

  describe('markAsNoShow', () => {
    it('should mark customer as no-show', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ position_in_queue: 1, shop_id: 'shop-1', status: 'waiting' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'no-show' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await queueService.markAsNoShow('q1');

      expect(result.status).toBe('no-show');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if queue entry not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(queueService.assignCustomerToBarber('invalid-id', 'barber-1')).rejects.toThrow(
        'Queue entry not found'
      );
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection error'));

      await expect(queueService.checkInCustomer('shop-1', 'John', '555-1234', 'haircut', 30)).rejects.toThrow(
        'Failed to check in customer'
      );
    });
  });
});
