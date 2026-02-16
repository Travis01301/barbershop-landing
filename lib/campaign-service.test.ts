import * as campaignService from './campaign-service';
import { getPool } from './db';
import { jest } from '@jest/globals';

// Mock the database and Resend
jest.mock('./db');
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'email-id' }),
    },
  })),
}));

describe('Campaign Service', () => {
  const mockQuery = jest.fn();
  const mockPool = { query: mockQuery } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const campaign = {
        id: 'campaign-1',
        shop_id: 'shop-1',
        name: 'Holiday Sale',
        campaign_type: 'promotion',
        subject: 'Special Offer',
        html_content: '<div>Content</div>',
        sender_email: 'noreply@example.com',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [campaign] });

      const result = await campaignService.createCampaign('shop-1', {
        name: 'Holiday Sale',
        campaign_type: 'promotion',
        subject: 'Special Offer',
        html_content: '<div>Content</div>',
        sender_email: 'noreply@example.com',
      });

      expect(result).toEqual(campaign);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should set default status to draft', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ status: 'draft' }],
      });

      const result = await campaignService.createCampaign('shop-1', {
        name: 'Test',
        campaign_type: 'custom',
        subject: 'Test',
        html_content: 'test',
        sender_email: 'test@example.com',
      });

      expect(result.status).toBe('draft');
    });
  });

  describe('getCampaigns', () => {
    it('should get campaigns for a shop', async () => {
      const campaigns = [
        { id: 'c1', name: 'Campaign 1', status: 'sent' },
        { id: 'c2', name: 'Campaign 2', status: 'draft' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: campaigns });

      const result = await campaignService.getCampaigns('shop-1');

      expect(result.campaigns).toEqual(campaigns);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'c1', status: 'sent' }] });

      const result = await campaignService.getCampaigns('shop-1', 'sent');

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should support pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 50 }] })
        .mockResolvedValueOnce({ rows: [] });

      await campaignService.getCampaigns('shop-1', undefined, 25, 25);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'c1',
          name: 'Updated Campaign',
          status: 'scheduled',
        }],
      });

      const result = await campaignService.updateCampaign('c1', {
        name: 'Updated Campaign',
        status: 'scheduled',
      });

      expect(result.name).toBe('Updated Campaign');
    });

    it('should throw error if campaign not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        campaignService.updateCampaign('invalid-id', { name: 'Test' })
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('sendCampaign', () => {
    it('should send campaign to recipients', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'c1',
            subject: 'Test',
            html_content: 'Content',
            sender_email: 'test@example.com',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // update to sending
        .mockResolvedValueOnce({ rows: [] }) // insert email 1
        .mockResolvedValueOnce({ rows: [] }) // insert email 2
        .mockResolvedValueOnce({ rows: [] }); // update campaign

      await campaignService.sendCampaign('c1', ['user1@example.com', 'user2@example.com']);

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle send failures gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'c1',
            subject: 'Test',
            html_content: 'Content',
            sender_email: 'test@example.com',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // update to sending

      // This should not throw despite email failures
      await expect(
        campaignService.sendCampaign('c1', ['user@example.com'])
      ).resolves.not.toThrow();
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should get campaign analytics', async () => {
      const analytics = {
        id: 'a1',
        campaign_id: 'c1',
        total_recipients: 100,
        total_delivered: 95,
        total_opened: 38,
        total_clicked: 8,
        open_rate: 38,
        click_rate: 8,
      };

      mockQuery.mockResolvedValueOnce({ rows: [analytics] });

      const result = await campaignService.getCampaignAnalytics('c1');

      expect(result).toEqual(analytics);
    });

    it('should initialize analytics if not exists', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // not found
        .mockResolvedValueOnce({ rows: [{ id: 'a1', campaign_id: 'c1' }] }); // initialized

      const result = await campaignService.getCampaignAnalytics('c1');

      expect(result.campaign_id).toBe('c1');
    });
  });

  describe('createAutoTrigger', () => {
    it('should create auto-trigger rule', async () => {
      const trigger = {
        id: 't1',
        shop_id: 'shop-1',
        campaign_id: 'c1',
        trigger_name: 'Inactive Users',
        trigger_type: 'no_book',
        trigger_condition: 'days_since_visit > 30',
        enabled: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [trigger] });

      const result = await campaignService.createAutoTrigger('shop-1', {
        campaign_id: 'c1',
        trigger_name: 'Inactive Users',
        trigger_type: 'no_book',
        trigger_condition: 'days_since_visit > 30',
      });

      expect(result.enabled).toBe(true);
    });
  });

  describe('createRedemptionCode', () => {
    it('should create redemption code', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'r1',
          coupon_code: 'SUMMER20',
          discount_percent: 20,
          redeemed: false,
        }],
      });

      const result = await campaignService.createRedemptionCode(
        'c1',
        'e1',
        'SUMMER20',
        undefined,
        20
      );

      expect(result.coupon_code).toBe('SUMMER20');
    });
  });

  describe('redeemCoupon', () => {
    it('should redeem a coupon', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          coupon_code: 'SUMMER20',
          redeemed: true,
          redeemed_at: new Date(),
        }],
      });

      const result = await campaignService.redeemCoupon('SUMMER20');

      expect(result.redeemed).toBe(true);
    });

    it('should throw error for invalid coupon', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(campaignService.redeemCoupon('INVALID')).rejects.toThrow(
        'Coupon code not found'
      );
    });
  });

  describe('trackEmailOpen', () => {
    it('should track email open', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await campaignService.trackEmailOpen('tracking-code-123');

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('trackEmailClick', () => {
    it('should track email click', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ clicked_links: null }] })
        .mockResolvedValueOnce({ rows: [] });

      await campaignService.trackEmailClick('tracking-code-123', 'https://example.com');

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in createCampaign', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        campaignService.createCampaign('shop-1', {
          name: 'Test',
          campaign_type: 'custom',
          subject: 'Test',
          html_content: 'test',
          sender_email: 'test@example.com',
        })
      ).rejects.toThrow('Failed to create campaign');
    });

    it('should handle errors gracefully in getCampaigns', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(campaignService.getCampaigns('shop-1')).rejects.toThrow(
        'Failed to get campaigns'
      );
    });
  });
});
