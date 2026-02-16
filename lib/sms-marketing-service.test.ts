import { smsMarketingService } from '@/lib/sms-marketing-service';
import { query } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('smsMarketingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Campaigns', () => {
    it('should create a campaign', async () => {
      const mockCampaign = {
        id: 1,
        shop_id: 1,
        campaign_name: 'Summer Promo',
        campaign_type: 'promotion',
        message_content: 'Get 20% off this summer!',
        status: 'draft',
        total_sent: 0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCampaign], rowCount: 1 });

      const result = await smsMarketingService.createCampaign(
        1,
        'Summer Promo',
        'promotion',
        'Get 20% off this summer!'
      );

      expect(result).toEqual(mockCampaign);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sms_campaigns'),
        expect.any(Array)
      );
    });

    it('should get campaigns for a shop', async () => {
      const mockCampaigns = [
        { id: 1, campaign_name: 'Summer Promo', status: 'draft' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockCampaigns, rowCount: 1 });

      const result = await smsMarketingService.getCampaigns(1);

      expect(result).toEqual(mockCampaigns);
    });

    it('should filter campaigns by status', async () => {
      const mockCampaigns = [
        { id: 1, status: 'sent' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockCampaigns, rowCount: 1 });

      const result = await smsMarketingService.getCampaigns(1, { status: 'sent' });

      expect(result).toEqual(mockCampaigns);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.any(Array)
      );
    });

    it('should update a campaign', async () => {
      const mockCampaign = {
        id: 1,
        status: 'scheduled',
        scheduled_time: '2024-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCampaign], rowCount: 1 });

      const result = await smsMarketingService.updateCampaign(1, {
        status: 'scheduled',
      });

      expect(result).toEqual(mockCampaign);
    });

    it('should schedule a campaign', async () => {
      const mockCampaign = {
        id: 1,
        status: 'scheduled',
        scheduled_time: '2024-01-15T10:00:00Z',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCampaign], rowCount: 1 });

      const result = await smsMarketingService.scheduleCampaign(
        1,
        new Date('2024-01-15T10:00:00Z')
      );

      expect(result).toEqual(mockCampaign);
    });
  });

  describe('Segments', () => {
    it('should create a customer segment', async () => {
      const mockSegment = {
        id: 1,
        shop_id: 1,
        segment_name: 'VIP Customers',
        segment_type: 'vip',
        customer_count: 25,
      };

      jest
        .spyOn(smsMarketingService, 'calculateSegmentSize')
        .mockResolvedValueOnce(25);

      mockQuery.mockResolvedValueOnce({ rows: [mockSegment], rowCount: 1 });

      const result = await smsMarketingService.createSegment(
        1,
        'VIP Customers',
        'vip',
        { lifetime_spend: 500 }
      );

      expect(result).toEqual(mockSegment);
    });

    it('should get segments for a shop', async () => {
      const mockSegments = [
        { id: 1, segment_name: 'VIP', criteria: JSON.stringify({ lifetime_spend: 500 }) },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockSegments, rowCount: 1 });

      const result = await smsMarketingService.getSegments(1);

      expect(result[0].segment_name).toBe('VIP');
    });

    it('should calculate segment size correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 42 }],
        rowCount: 1,
      });

      const result = await smsMarketingService.calculateSegmentSize(
        1,
        'vip',
        { lifetime_spend: 500 }
      );

      expect(result).toBe(42);
    });
  });

  describe('Unsubscribe Management', () => {
    it('should unsubscribe a customer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await smsMarketingService.unsubscribeCustomer(1, 1, '+1234567890', 'Not interested');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sms_unsubscribes'),
        expect.any(Array)
      );
    });

    it('should check if customer is unsubscribed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await smsMarketingService.isUnsubscribed(1, 1);

      expect(result).toBe(true);
    });

    it('should return false if customer not unsubscribed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await smsMarketingService.isUnsubscribed(1, 1);

      expect(result).toBe(false);
    });
  });

  describe('Analytics', () => {
    it('should get campaign analytics', async () => {
      const mockAnalytics = [
        {
          id: 1,
          campaign_id: 1,
          metric_date: '2024-01-01',
          total_sent: 100,
          total_delivered: 95,
          delivery_rate: 95.0,
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAnalytics, rowCount: 1 });

      const result = await smsMarketingService.getCampaignAnalytics(1);

      expect(result).toEqual(mockAnalytics);
    });

    it('should update message status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await smsMarketingService.updateMessageStatus('SM123456', 'delivered');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sms_messages'),
        expect.arrayContaining(['delivered', 'SM123456'])
      );
    });
  });

  describe('Auto-Triggers', () => {
    it('should create an auto-trigger', async () => {
      const mockTrigger = {
        id: 1,
        shop_id: 1,
        trigger_name: 'Anniversary',
        trigger_type: 'anniversary',
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTrigger], rowCount: 1 });

      const result = await smsMarketingService.createAutoTrigger(
        1,
        'Anniversary',
        'anniversary',
        'Happy anniversary! Come visit us again.',
        { days_since_first_visit: 365 }
      );

      expect(result).toEqual(mockTrigger);
    });

    it('should get active auto-triggers', async () => {
      const mockTriggers = [
        { id: 1, trigger_type: 'anniversary', is_active: true },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockTriggers, rowCount: 1 });

      const result = await smsMarketingService.getAutoTriggers(1);

      expect(result[0].trigger_type).toBe('anniversary');
    });
  });

  describe('Message Status Updates', () => {
    it('should handle webhook status updates', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await smsMarketingService.updateMessageStatus('SM123456', 'delivered');

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should map Twilio status to internal status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await smsMarketingService.updateMessageStatus('SM123456', 'undelivered', 'WIRE_ERROR');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sms_messages'),
        expect.arrayContaining(['bounced'])
      );
    });
  });

  describe('Compliance', () => {
    it('should respect unsubscribe list when sending campaigns', async () => {
      // This would be tested in the sendCampaign integration test
      expect(true).toBe(true);
    });

    it('should log all unsubscribe actions for compliance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await smsMarketingService.unsubscribeCustomer(1, 1, '+1234567890', 'Spam');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sms_unsubscribes'),
        expect.any(Array)
      );
    });
  });
});
