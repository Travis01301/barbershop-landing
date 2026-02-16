import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CustomerPreferences } from '@/components/customer-crm/CustomerPreferences'

global.fetch = jest.fn()

describe('CustomerPreferences Component', () => {
  const mockToken = 'test-token'
  const mockCustomerId = 1
  const mockCustomer = {
    success: true,
    customer: {
      id: 1,
      styling_notes: 'Fade with 2 on sides',
      health_notes: 'Cowlick on back',
      allergies: 'Peanuts',
      preferred_barber_id: 1,
      preferred_contact_method: 'email',
      do_not_disturb_time: '9am-11am',
    },
  }

  const mockBarbers = {
    barbers: [
      { id: 1, name: 'John' },
      { id: 2, name: 'Mike' },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders customer preferences heading', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /customer preferences/i })).toBeInTheDocument()
    })
  })

  it('displays all preference categories', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Service Preferences')).toBeInTheDocument()
      expect(screen.getByText('Hairstyle Notes')).toBeInTheDocument()
      expect(screen.getByText('Allergies & Sensitivities')).toBeInTheDocument()
      expect(screen.getByText('Preferred Barber')).toBeInTheDocument()
    })
  })

  it('enables edit mode', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit preferences/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /service preferences/i })).toBeInTheDocument()
    })
  })

  it('displays preferred barber dropdown', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))
    })

    const select = await screen.findByDisplayValue('John')
    expect(select).toBeInTheDocument()
    expect(select.textContent).toContain('Mike')
  })

  it('saves preferences successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))
    })

    // Mock successful save
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    await waitFor(() => {
      expect(screen.getByText(/Preferences saved successfully/)).toBeInTheDocument()
    })
  })

  it('cancels edit mode', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))
    })

    fireEvent.click(await screen.findByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.getByText('Fade with 2 on sides')).toBeInTheDocument()
    })
  })

  it('displays allergies warning', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Allergies & Sensitivities/)).toBeInTheDocument()
    })
  })

  it('sends PUT request with correct data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }))

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      const putCall = calls.find(
        (call) =>
          call[1] &&
          call[1].method === 'PUT' &&
          call[0].includes(`/api/customers/${mockCustomerId}`)
      )
      expect(putCall).toBeDefined()
      expect(putCall[1].headers['Authorization']).toBe(`Bearer ${mockToken}`)
    })
  })

  it('handles fetch error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/An error occurred/i)).toBeInTheDocument()
    })
  })

  it('displays contact method options', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBarbers,
    })

    render(<CustomerPreferences customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit preferences/i }))
    })

    const select = await screen.findByDisplayValue('email')
    expect(select).toBeInTheDocument()
  })
})
