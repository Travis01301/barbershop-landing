// Load environment variables for tests
require('dotenv').config({ path: '.env.test' });

// Suppress console logs during tests unless DEBUG=true
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Set test timeouts
jest.setTimeout(30000);

// Mock Stripe in tests (optional)
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    charges: {
      create: jest.fn().mockResolvedValue({ id: 'ch_test' }),
    },
  }));
});

// Mock email sending
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg_test' }),
  })),
}));
