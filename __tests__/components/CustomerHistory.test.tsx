import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CustomerHistory } from '@/components/customer-crm/CustomerHistory'

global.fetch = jest.fn()

describe('CustomerHistory Component', () => {
  const mockToken = 'test-token'
  const mockCustomerId = 1
  const mockAppointments = {
    success: true,
    customer: {
      appointment_history: [
        {
          id: 1,
          date: '2024-02-10T10:00:00Z',
          barber_name: 'John',
          status: 'completed',
          notes: 'Great fade',
          service: 'Haircut',
          amount: 2500,
        },
        {
          id: 2,
          date: '2024-02-03T11:00:00Z',
          barber_name: 'Mike',
          status: 'confirmed',
          notes: '',
          service: 'Trim',
          amount: 1500,
        },
        {
          id: 3,
          date: '2024-01-27T14:00:00Z',
          barber_name: 'Sarah',
          status: 'cancelled',
          notes: 'Customer requested cancellation',
          service: 'Design',
          amount: 3000,
        },
      ],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders appointment history heading', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /appointment history/i })).toBeInTheDocument()
    })
  })

  it('displays all appointments', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('Mike')).toBeInTheDocument()
      expect(screen.getByText('Sarah')).toBeInTheDocument()
    })
  })

  it('displays appointment status badges', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  it('filters appointments by status', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    // Click completed filter
    const completedButton = screen.getByRole('button', { name: /completed/i })
    fireEvent.click(completedButton)

    await waitFor(() => {
      expect(screen.getByText(/Great fade/)).toBeInTheDocument()
      expect(screen.queryByText('Sarah')).not.toBeInTheDocument()
    })
  })

  it('displays appointment details', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Great fade/)).toBeInTheDocument()
      expect(screen.getByText(/Haircut/)).toBeInTheDocument()
      expect(screen.getByText(/\$25.00/)).toBeInTheDocument()
    })
  })

  it('displays statistics', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Total Appointments')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })
  })

  it('handles empty appointment history', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        customer: { appointment_history: [] },
      }),
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/No appointments yet/)).toBeInTheDocument()
    })
  })

  it('handles fetch error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading appointment history/i)).toBeInTheDocument()
    })
  })

  it('sends correct authorization header', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAppointments,
    })

    render(<CustomerHistory customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/customers/${mockCustomerId}`,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      )
    })
  })
})
