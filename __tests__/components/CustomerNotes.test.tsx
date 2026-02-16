import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerNotes } from '@/components/customer-crm/CustomerNotes'

global.fetch = jest.fn()

describe('CustomerNotes Component', () => {
  const mockToken = 'test-token'
  const mockCustomerId = 1
  const mockCustomer = {
    success: true,
    customer: {
      id: 1,
      styling_notes: 'Fade with 2 on sides',
      allergies: 'Peanuts',
      health_notes: 'Scalp sensitive',
      do_not_disturb_time: '9am-11am',
      preferred_barber_id: 1,
      preferred_contact_method: 'email',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders customer notes heading', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /customer notes/i })).toBeInTheDocument()
    })
  })

  it('displays notes in view mode', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Fade with 2 on sides')).toBeInTheDocument()
      expect(screen.getByText('Peanuts')).toBeInTheDocument()
      expect(screen.getByText('Scalp sensitive')).toBeInTheDocument()
    })
  })

  it('enables edit mode when clicking edit button', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit notes/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /edit notes/i }))

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /styling preferences/i })).toBeInTheDocument()
    })
  })

  it('saves notes successfully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit notes/i }))
    })

    // Wait for edit mode and clear then type new value
    await waitFor(() => {
      const textarea = screen.getByDisplayValue('Fade with 2 on sides')
      expect(textarea).toBeInTheDocument()
    })

    // Mock successful save
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    fireEvent.click(screen.getByRole('button', { name: /save notes/i }))

    await waitFor(() => {
      expect(screen.getByText(/Notes saved successfully/)).toBeInTheDocument()
    })
  })

  it('cancels edit mode without saving', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /edit notes/i }))
    })

    const user = userEvent.setup()
    const textarea = await screen.findByDisplayValue('Fade with 2 on sides')
    await user.clear(textarea)
    await user.type(textarea, 'New notes')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    // Check that we're back in view mode
    await waitFor(() => {
      expect(screen.getByText('Fade with 2 on sides')).toBeInTheDocument()
    })
  })

  it('displays all note categories', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Styling Preferences')).toBeInTheDocument()
      expect(screen.getByText('Allergies & Sensitivities')).toBeInTheDocument()
      expect(screen.getByText('Health Considerations')).toBeInTheDocument()
    })
  })

  it('displays contact preferences', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Preferred Contact')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  it('displays DND times', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Do Not Disturb')).toBeInTheDocument()
      expect(screen.getByText('9am-11am')).toBeInTheDocument()
    })
  })

  it('handles fetch error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Error loading customer notes/i)).toBeInTheDocument()
    })
  })

  it('sends correct authorization header', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomer,
    })

    render(<CustomerNotes customerId={mockCustomerId} token={mockToken} />)

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
