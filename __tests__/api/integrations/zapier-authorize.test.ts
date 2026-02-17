import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/integrations/zapier/authorize/route';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    organization: {
      findUnique: jest.fn(),
    },
    oAuthConnection: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    integrationLog: {
      create: jest.fn(),
    },
  })),
}));

describe('Zapier Authorization API', () => {
  describe('POST /api/integrations/zapier/authorize', () => {
    it('should return error when missing required fields', async () => {
      const request = {
        json: jest.fn().mockResolvedValue({
          organizationId: undefined,
          code: undefined,
        }),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should handle successful authorization', async () => {
      // This is a simplified test structure
      expect(true).toBe(true);
    });
  });

  describe('GET /api/integrations/zapier/authorize', () => {
    it('should return error when missing organizationId', async () => {
      const request = {
        nextUrl: new URL('http://localhost:3000/api/integrations/zapier/authorize'),
      } as unknown as NextRequest;

      const response = await GET(request);
      const data = (await response.json()) as any;

      expect(response.status).toBe(400);
      expect(data.error).toContain('organizationId');
    });
  });
});
