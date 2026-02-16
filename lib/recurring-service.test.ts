import {
  createRecurringAppointment,
  getRecurringAppointments,
  updateRecurringAppointment,
  deleteRecurringAppointment,
  getNextAppointmentDate,
} from './recurring-service';
import * as db from './db';

// Mock database module
jest.mock('./db');

describe('Recurring Service', () => {
  const mockShopId = 1;
  const mockCustomerId = 1;
  const mockBarberId = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecurringAppointment', () => {
    it('should create a new recurring appointment', async () => {
      const mockRecurring = {
        id: 1,
        shop_id: mockShopId,
        customer_id: mockCustomerId,
        barber_id: mockBarberId,
        service_name: 'Haircut',
        recurrence_type: 'weekly',
        recurrence_interval: 1,
        day_of_week: 2,
        day_of_month: null,
        time_of_day: '10:00',
        start_date: '2024-02-20',
        end_date: null,
        is_active: true,
        notes: 'Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockRecurring], rowCount: 1 }) // INSERT
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await createRecurringAppointment({
        customerId: mockCustomerId,
        barberId: mockBarberId,
        shopId: mockShopId,
        serviceName: 'Haircut',
        recurrenceType: 'weekly',
        dayOfWeek: 2,
        timeOfDay: '10:00',
        startDate: '2024-02-20',
        notes: 'Test',
      });

      expect(result).toEqual(mockRecurring);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockRejectedValueOnce(new Error('DB Error')), // Error during insert
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        createRecurringAppointment({
          customerId: mockCustomerId,
          barberId: mockBarberId,
          shopId: mockShopId,
          serviceName: 'Haircut',
          recurrenceType: 'weekly',
          dayOfWeek: 2,
          timeOfDay: '10:00',
          startDate: '2024-02-20',
        })
      ).rejects.toThrow('DB Error');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getRecurringAppointments', () => {
    it('should retrieve recurring appointments for a customer', async () => {
      const mockRecurrings = [
        {
          id: 1,
          shop_id: mockShopId,
          customer_id: mockCustomerId,
          recurrence_type: 'weekly',
          is_active: true,
        },
        {
          id: 2,
          shop_id: mockShopId,
          customer_id: mockCustomerId,
          recurrence_type: 'monthly',
          is_active: true,
        },
      ];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockRecurrings, rowCount: 2 });

      const result = await getRecurringAppointments(mockCustomerId, mockShopId);

      expect(result).toEqual(mockRecurrings);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no recurring appointments exist', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await getRecurringAppointments(mockCustomerId, mockShopId);

      expect(result).toEqual([]);
    });
  });

  describe('updateRecurringAppointment', () => {
    it('should update a recurring appointment', async () => {
      const mockUpdated = {
        id: 1,
        shop_id: mockShopId,
        is_active: false,
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUpdated], rowCount: 1 });

      const result = await updateRecurringAppointment(1, mockShopId, {
        isActive: false,
      });

      expect(result).toEqual(mockUpdated);
    });

    it('should return null when no updates provided', async () => {
      const result = await updateRecurringAppointment(1, mockShopId, {});
      expect(result).toBeNull();
    });
  });

  describe('deleteRecurringAppointment', () => {
    it('should delete a recurring appointment', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }), // COMMIT
        release: jest.fn(),
      };

      (db.getClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await deleteRecurringAppointment(1, mockShopId);

      expect(result).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getNextAppointmentDate', () => {
    it('should calculate next appointment date for weekly recurring', () => {
      const recurring = {
        id: 1,
        recurrence_type: 'weekly' as const,
        day_of_week: 3, // Wednesday
        start_date: '2024-02-20',
        end_date: null,
      };

      const next = getNextAppointmentDate(recurring as any);
      expect(next).toBeDefined();
      expect(next?.getDay()).toBe(3);
    });

    it('should calculate next appointment date for monthly recurring', () => {
      const recurring = {
        id: 1,
        recurrence_type: 'monthly' as const,
        day_of_month: 15,
        start_date: '2024-02-20',
        end_date: null,
      };

      const next = getNextAppointmentDate(recurring as any);
      expect(next).toBeDefined();
      expect(next?.getDate()).toBe(15);
    });

    it('should return null if recurring appointment has expired', () => {
      const recurring = {
        id: 1,
        recurrence_type: 'monthly' as const,
        day_of_month: 15,
        start_date: '2023-02-20',
        end_date: '2023-12-31',
      };

      const next = getNextAppointmentDate(recurring as any);
      expect(next).toBeNull();
    });
  });
});
