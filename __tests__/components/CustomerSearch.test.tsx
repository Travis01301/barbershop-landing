import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerSearch } from '@/components/customer-crm/CustomerSearch'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => (
    <a href={href} onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  )
})

global.fetch = jest.fn()

describe('CustomerSearch Component', () => {
  const mockToken = 'test-token'
  const mockCustomers = {
    success: true,
    customers: [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        total_appointments: 5,
        last_visit_date: '2024-02-10',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        total_appointments: 3,
        last_visit_date: '2024-02-08',
      },
      {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '',
        total_appointments: 0,
        last_visit_date: null,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search heading', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /search customers/i })).toBeInTheDocument()
    })
  })

  it('displays all customers on load', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
    })
  })

  it('filters customers by name', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    const input = await screen.findByPlaceholderText(
      /search by name, email, or phone/i
    )
    await userEvent.type(input, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('filters customers by email', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    const input = await screen.findByPlaceholderText(
      /search by name, email, or phone/i
    )
    await userEvent.type(input, 'jane@example.com')

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  it('filters customers by phone', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    const input = await screen.findByPlaceholderText(
      /search by name, email, or phone/i
    )
    await userEvent.type(input, '555-1234')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('displays customer contact information', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('555-1234')).toBeInTheDocument()
    })
  })

  it('displays appointment statistics', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Appointments:')).toBeInTheDocument()
      expect(screen.getByText('Last Visit:')).toBeInTheDocument()
    })
  })

  it('shows no results message when search has no matches', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    const input = await screen.findByPlaceholderText(
      /search by name, email, or phone/i
    )
    await userEvent.type(input, 'NonexistentCustomer')

    await waitFor(() => {
      expect(screen.getByText(/no customers match/i)).toBeInTheDocument()
    })
  })

  it('displays view profile buttons', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      const viewButtons = screen.getAllByText(/view profile/i)
      expect(viewButtons.length).toBeGreaterThan(0)
    })
  })

  it('displays stats footer', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText('Total Customers')).toBeInTheDocument()
      expect(screen.getByText('With Appointments')).toBeInTheDocument()
      expect(screen.getByText('Total Appointments')).toBeInTheDocument()
    })
  })

  it('handles empty customer list', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, customers: [] }),
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/no customers yet/i)).toBeInTheDocument()
    })
  })

  it('handles fetch error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/error loading customers/i)).toBeInTheDocument()
    })
  })

  it('provides retry button on error', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('sends authorization header', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/customers',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` },
        })
      )
    })
  })

  it('calls onSelectCustomer callback', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    const onSelect = jest.fn()
    render(<CustomerSearch token={mockToken} onSelectCustomer={onSelect} />)

    const selectButtons = await screen.findAllByText(/select/i)
    fireEvent.click(selectButtons[0])

    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('updates search result count', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCustomers,
    })

    render(<CustomerSearch token={mockToken} />)

    await waitFor(() => {
      expect(screen.getByText(/Showing all customers \(3\)/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search by name, email, or phone/i)
    await userEvent.type(input, 'John')

    await waitFor(() => {
      expect(screen.getByText(/Found 1 customer/)).toBeInTheDocument()
    })
  })
})
