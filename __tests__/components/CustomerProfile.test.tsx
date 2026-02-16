import { render, screen, waitFor } from '@testing-library/react'
import { CustomerProfile } from '@/components/customer-crm/CustomerProfile'

// Mock fetch
global.fetch = jest.fn()

describe('CustomerProfile Component', () => {
  const mockToken = 'test-token'
  const mockCustomerId = 1
  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    address: '123 Main St',
    preferred_barber_id: 1,
    styling_notes: 'Fade with 2 on sides',
    allergies: 'Peanuts',
    health_notes: 'Scalp sensitive',
    preferred_contact_method: 'email',
    do_not_disturb_time: '9am-11am',
    total_appointments: 5,
    last_visit_date: '2024-02-10',
    created_at: '2024-01-01',
    updated_at: '2024-02-15',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, customer: mockCustomer }),
              }),
            100
          )
        )
    )

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)
    expect(screen.getByRole('heading', { name: /customer profile/i })).toBeInTheDocument()
  })

  it('fetches and displays customer data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('555-1234')).toBeInTheDocument()
    })
  })

  it('displays total appointments', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays customer preferences', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Fade with 2 on sides')).toBeInTheDocument()
      expect(screen.getByText('Peanuts')).toBeInTheDocument()
      expect(screen.getByText('Scalp sensitive')).toBeInTheDocument()
    })
  })

  it('displays membership information', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Member since/)).toBeInTheDocument()
    })
  })

  it('handles fetch error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch customer')
    )

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading customer/i)).toBeInTheDocument()
    })
  })

  it('sends correct authorization header', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/customers/${mockCustomerId}`,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      )
    })
  })

  it('displays last visit date', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customer: mockCustomer }),
    })

    render(<CustomerProfile customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Feb 10, 2024/)).toBeInTheDocument()
    })
  })
})
