// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing'
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing'
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/barbershop_test'

// Global test utilities
global.fetch = jest.fn()
