import {
  joinWaitlist,
  getWaitlistForBarber,
  updateWaitlistPriority,
  promoteFromWaitlist,
  cancelWaitlistEntry,
  getWaitlistPosition,
  getWaitlistSize,
} from './waitlist-service';
import * as db from './db';

// Mock database and services
jest.mock('./db');
jest.mock('./sms-service', () => ({
  sendSMS: jest.fn(),
}));
jest.mock('./email-service', () => ({
  sendEmail: jest.fn(),
}));

describe('Waitlist Service', () => {
  const mockShopId = 1;
  const mockCustomerId = 1;
  const mockBarberId = 2;
  const mockDate = '2024-03-15';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinWaitlist', () => {
    it('should add customer to waitlist', async () => {
      const mockWaitlist = {
        id: 1,
        shop_id: mockShopId,
        customer_id: mockCustomerId,
        barber_id: mockBarberId,
        preferred_date: mockDate,
        priority_rank: 1,
        priority_level: 'standard',
        status: 'waiting',
        created_at: new Date().toISOString(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 }) // COUNT
          .mockResolvedValueOnce({ rows: [mockWaitlist], rowCount: 1 }) // INSERT
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT history
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await joinWaitlist({
        customerId: mockCustomerId,
        barberId: mockBarberId,
        shopId: mockShopId,
        preferredDate: mockDate,
      });

      expect(result).toEqual(mockWaitlist);
      expect(result?.priority_rank).toBe(1);
    });

    it('should set correct priority rank based on queue position', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ count: 5 }], rowCount: 1 }) // COUNT existing entries
          .mockResolvedValueOnce({
            rows: [{ id: 1, priority_rank: 6 }],
            rowCount: 1,
          }) // INSERT
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT history
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await joinWaitlist({
        customerId: mockCustomerId,
        barberId: mockBarberId,
        shopId: mockShopId,
        preferredDate: mockDate,
      });

      expect(result?.priority_rank).toBe(6);
    });
  });

  describe('getWaitlistForBarber', () => {
    it('should retrieve waitlist for barber', async () => {
      const mockEntries = [
        {
          id: 1,
          customer_id: 1,
          customer_name: 'John',
          priority_rank: 1,
          status: 'waiting',
        },
        {
          id: 2,
          customer_id: 2,
          customer_name: 'Jane',
          priority_rank: 2,
          status: 'waiting',
        },
      ];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockEntries, rowCount: 2 });

      const result = await getWaitlistForBarber(mockBarberId, mockShopId, mockDate);

      expect(result).toEqual(mockEntries);
      expect(result.length).toBe(2);
    });

    it('should filter by date when provided', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      await getWaitlistForBarber(mockBarberId, mockShopId, mockDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND w.preferred_date = $3'),
        expect.arrayContaining([mockBarberId, mockShopId, mockDate])
      );
    });
  });

  describe('updateWaitlistPriority', () => {
    it('should upgrade customer priority level', async () => {
      const mockUpdated = {
        id: 1,
        priority_level: 'priority',
        priority_fee_charged: 5.0,
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT history
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await updateWaitlistPriority(1, mockShopId, 'priority', 5.0);

      expect(result?.priority_level).toBe('priority');
      expect(result?.priority_fee_charged).toBe(5.0);
    });
  });

  describe('promoteFromWaitlist', () => {
    it('should promote customer and send notifications', async () => {
      const mockWaitlist = {
        id: 1,
        customer_id: mockCustomerId,
        email: 'customer@example.com',
        phone: '5551234567',
        preferred_date: mockDate,
      };

      const mockUpdated = {
        id: 1,
        status: 'promoted',
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockWaitlist], rowCount: 1 }) // SELECT
          .mockResolvedValueOnce({ rows: [mockUpdated], rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT history
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      // Get the mocked sendEmail and sendSMS
      const sendEmailMock = require('./email-service').sendEmail;
      const sendSMSMock = require('./sms-service').sendSMS;
      sendEmailMock.mockResolvedValue(true);
      sendSMSMock.mockResolvedValue(true);

      const result = await promoteFromWaitlist(1, mockShopId, 1);

      expect(result?.status).toBe('promoted');
      expect(sendEmailMock).toHaveBeenCalledWith(
        'customer@example.com',
        expect.any(String),
        expect.any(String)
      );
      expect(sendSMSMock).toHaveBeenCalledWith(
        '5551234567',
        expect.any(String)
      );
    });
  });

  describe('cancelWaitlistEntry', () => {
    it('should cancel waitlist entry', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }) // INSERT history
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await cancelWaitlistEntry(1, mockShopId, 'User cancelled');

      expect(result).toBe(true);
    });
  });

  describe('getWaitlistPosition', () => {
    it('should return position in waitlist', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ priority_rank: 3 }],
        rowCount: 1,
      });

      const result = await getWaitlistPosition(mockCustomerId, mockBarberId, mockDate);

      expect(result).toBe(3);
    });

    it('should return null if not on waitlist', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getWaitlistPosition(mockCustomerId, mockBarberId, mockDate);

      expect(result).toBeNull();
    });
  });

  describe('getWaitlistSize', () => {
    it('should return total size of waitlist', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [{ count: 5 }],
        rowCount: 1,
      });

      const result = await getWaitlistSize(mockBarberId, mockShopId, mockDate);

      expect(result).toBe(5);
    });
  });
});
