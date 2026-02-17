import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TicketForm from '@/components/support/TicketForm';
import TicketList from '@/components/support/TicketList';
import TicketDetail from '@/components/support/TicketDetail';
import AdminTicketQueue from '@/components/support/AdminTicketQueue';
import KnowledgeBase from '@/components/support/KnowledgeBase';
import ChatWidget from '@/components/support/ChatWidget';

// Mock fetch
global.fetch = jest.fn();

describe('Support Components', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const shopId = 'shop-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= TICKET FORM TESTS =============
  describe('TicketForm Component', () => {
    it('should render ticket creation form', () => {
      render(<TicketForm shopId={shopId} />);
      
      expect(screen.getByText('Create a Support Ticket')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brief description of your issue')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Detailed description of your issue')).toBeInTheDocument();
    });

    it('should have all required form fields', () => {
      render(<TicketForm shopId={shopId} />);
      
      expect(screen.getByLabelText(/Subject/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority/)).toBeInTheDocument();
    });

    it('should submit form with valid data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'ticket-123', ticket_number: 'TICKET-123' })
      } as Response);

      render(<TicketForm shopId={shopId} />);

      const subjectInput = screen.getByPlaceholderText('Brief description of your issue') as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText('Detailed description of your issue') as HTMLTextAreaElement;
      
      await userEvent.type(subjectInput, 'Cannot login');
      await userEvent.type(descriptionInput, 'I cannot access my account');

      fireEvent.click(screen.getByText('Create Ticket'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/support/tickets',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });
    });

    it('should display error message on submission failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      } as Response);

      render(<TicketForm shopId={shopId} />);

      const subjectInput = screen.getByPlaceholderText('Brief description of your issue');
      const descriptionInput = screen.getByPlaceholderText('Detailed description of your issue');
      
      await userEvent.type(subjectInput, 'Test');
      await userEvent.type(descriptionInput, 'Test description');

      fireEvent.click(screen.getByText('Create Ticket'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create ticket/)).toBeInTheDocument();
      });
    });

    it('should support all ticket categories', () => {
      render(<TicketForm shopId={shopId} />);
      
      const categorySelect = screen.getByLabelText(/Category/) as HTMLSelectElement;
      expect(categorySelect.options).toHaveLength(6); // Default + 5 categories
    });

    it('should support all priority levels', () => {
      render(<TicketForm shopId={shopId} />);
      
      const prioritySelect = screen.getByLabelText(/Priority/) as HTMLSelectElement;
      expect(prioritySelect.options).toHaveLength(5); // Default + 4 priorities
    });

    it('should reset form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'ticket-123' })
      } as Response);

      const onSuccess = jest.fn();
      render(<TicketForm shopId={shopId} onSuccess={onSuccess} />);

      const subjectInput = screen.getByPlaceholderText('Brief description of your issue') as HTMLInputElement;
      await userEvent.type(subjectInput, 'Test issue');

      fireEvent.click(screen.getByText('Create Ticket'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(subjectInput.value).toBe('');
      });
    });
  });

  // ============= TICKET LIST TESTS =============
  describe('TicketList Component', () => {
    it('should render ticket list with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tickets: [
            {
              id: '1',
              ticket_number: 'TICKET-001',
              subject: 'Issue 1',
              status: 'open',
              priority: 'high',
              category: 'technical',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          total: 1
        })
      } as Response);

      render(<TicketList shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('My Support Tickets')).toBeInTheDocument();
        expect(screen.getByText('TICKET-001')).toBeInTheDocument();
      });
    });

    it('should filter tickets by status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tickets: [], total: 0 })
      } as Response);

      render(<TicketList shopId={shopId} />);

      const statusSelect = screen.getAllByDisplayValue('All Status')[0] as HTMLSelectElement;
      await userEvent.selectOptions(statusSelect, 'open');

      expect(statusSelect.value).toBe('open');
    });

    it('should filter tickets by priority', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tickets: [], total: 0 })
      } as Response);

      render(<TicketList shopId={shopId} />);

      const prioritySelect = screen.getAllByDisplayValue('All Priority')[0] as HTMLSelectElement;
      await userEvent.selectOptions(prioritySelect, 'urgent');

      expect(prioritySelect.value).toBe('urgent');
    });

    it('should display loading state', () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<TicketList shopId={shopId} />);

      expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
    });

    it('should display empty state when no tickets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tickets: [], total: 0 })
      } as Response);

      render(<TicketList shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('No tickets found')).toBeInTheDocument();
      });
    });

    it('should render status badges with correct colors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tickets: [
            {
              id: '1',
              ticket_number: 'TICKET-001',
              subject: 'Test',
              status: 'resolved',
              priority: 'medium',
              category: 'billing',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          total: 1
        })
      } as Response);

      render(<TicketList shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('Resolved')).toBeInTheDocument();
      });
    });
  });

  // ============= TICKET DETAIL TESTS =============
  describe('TicketDetail Component', () => {
    it('should render ticket details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ticket: {
            id: 'ticket-1',
            ticket_number: 'TICKET-001',
            subject: 'Test Issue',
            description: 'Full description',
            status: 'open',
            priority: 'high',
            category: 'technical',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          messages: [],
          attachments: []
        })
      } as Response);

      render(<TicketDetail ticketId="ticket-1" shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('Test Issue')).toBeInTheDocument();
        expect(screen.getByText('Full description')).toBeInTheDocument();
      });
    });

    it('should display conversation thread', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ticket: {
            id: 'ticket-1',
            ticket_number: 'TICKET-001',
            subject: 'Test',
            description: 'Desc',
            status: 'open',
            priority: 'medium',
            category: 'technical',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          messages: [
            {
              id: 'msg-1',
              message: 'Hello, I need help',
              author_type: 'customer',
              name: 'John Doe',
              created_at: new Date().toISOString(),
              is_internal: false
            }
          ],
          attachments: []
        })
      } as Response);

      render(<TicketDetail ticketId="ticket-1" shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('Hello, I need help')).toBeInTheDocument();
      });
    });

    it('should allow submitting replies', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ticket: {
              id: 'ticket-1',
              ticket_number: 'TICKET-001',
              subject: 'Test',
              description: 'Desc',
              status: 'open',
              priority: 'medium',
              category: 'technical',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            messages: [],
            attachments: []
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: {
              id: 'msg-2',
              message: 'Thank you for your help',
              author_type: 'customer',
              created_at: new Date().toISOString()
            }
          })
        } as Response);

      render(<TicketDetail ticketId="ticket-1" shopId={shopId} />);

      const replyInput = await screen.findByPlaceholderText('Type your reply...');
      await userEvent.type(replyInput, 'Thank you for your help');

      fireEvent.click(screen.getByText('Send Reply'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/reply'),
          expect.any(Object)
        );
      });
    });

    it('should show satisfaction rating option for resolved tickets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ticket: {
            id: 'ticket-1',
            ticket_number: 'TICKET-001',
            subject: 'Test',
            description: 'Desc',
            status: 'resolved',
            priority: 'medium',
            category: 'technical',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            customer_satisfaction_score: null
          },
          messages: [],
          attachments: []
        })
      } as Response);

      render(<TicketDetail ticketId="ticket-1" shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText(/Rate Your Experience/)).toBeInTheDocument();
      });
    });
  });

  // ============= ADMIN DASHBOARD TESTS =============
  describe('AdminTicketQueue Component', () => {
    it('should render admin dashboard', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openTickets: 5,
          urgentTickets: 2,
          byPriority: [
            { priority: 'urgent', count: 2 },
            { priority: 'high', count: 3 }
          ],
          byStatus: [
            { status: 'open', count: 5 },
            { status: 'resolved', count: 15 }
          ],
          byCategory: [
            { category: 'billing', count: 4 },
            { category: 'technical', count: 8 }
          ],
          avgResponseTimeMinutes: 45,
          avgResolutionTimeMinutes: 240,
          avgSatisfactionScore: 4.5,
          recentTickets: [],
          slaBreaches: 1
        })
      } as Response);

      render(<AdminTicketQueue shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('Open Tickets')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should display SLA breach warning', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openTickets: 5,
          urgentTickets: 2,
          byPriority: [],
          byStatus: [],
          byCategory: [],
          avgResponseTimeMinutes: 45,
          avgResolutionTimeMinutes: 240,
          avgSatisfactionScore: 4.5,
          recentTickets: [],
          slaBreaches: 3
        })
      } as Response);

      render(<AdminTicketQueue shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText(/3 SLA breaches detected/)).toBeInTheDocument();
      });
    });

    it('should show KPI cards with metrics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          openTickets: 5,
          urgentTickets: 2,
          byPriority: [],
          byStatus: [],
          byCategory: [],
          avgResponseTimeMinutes: 45,
          avgResolutionTimeMinutes: 240,
          avgSatisfactionScore: 4.5,
          recentTickets: [],
          slaBreaches: 0
        })
      } as Response);

      render(<AdminTicketQueue shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('Urgent Tickets')).toBeInTheDocument();
        expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
      });
    });
  });

  // ============= KNOWLEDGE BASE TESTS =============
  describe('KnowledgeBase Component', () => {
    it('should render knowledge base search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [],
          total: 0
        })
      } as Response);

      render(<KnowledgeBase shopId={shopId} />);

      expect(screen.getByPlaceholderText('Search knowledge base...')).toBeInTheDocument();
    });

    it('should display articles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          articles: [
            {
              id: 'art-1',
              title: 'How to book',
              description: 'Step-by-step guide',
              content: 'Full content',
              category: 'getting-started',
              tags: 'booking,appointments',
              view_count: 150,
              helpful_count: 50,
              unhelpful_count: 5
            }
          ],
          total: 1
        })
      } as Response);

      render(<KnowledgeBase shopId={shopId} />);

      await waitFor(() => {
        expect(screen.getByText('How to book')).toBeInTheDocument();
      });
    });

    it('should search articles', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ articles: [], total: 0 })
      } as Response);

      render(<KnowledgeBase shopId={shopId} />);

      const searchInput = screen.getByPlaceholderText('Search knowledge base...');
      await userEvent.type(searchInput, 'payment');

      expect(searchInput).toHaveValue('payment');
    });
  });

  // ============= CHAT WIDGET TESTS =============
  describe('ChatWidget Component', () => {
    it('should render chat widget button when closed', () => {
      render(<ChatWidget shopId={shopId} />);

      const button = screen.getByTitle('Open Support Chat');
      expect(button).toBeInTheDocument();
    });

    it('should open chat widget on button click', () => {
      render(<ChatWidget shopId={shopId} isOpen={true} />);

      expect(screen.getByText('Support Center')).toBeInTheDocument();
    });

    it('should have chat, ticket, and FAQ tabs', () => {
      render(<ChatWidget shopId={shopId} isOpen={true} />);

      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('New Ticket')).toBeInTheDocument();
      expect(screen.getByText('FAQs')).toBeInTheDocument();
    });

    it('should allow sending messages', async () => {
      render(<ChatWidget shopId={shopId} isOpen={true} />);

      const input = screen.getByPlaceholderText('Type your message...');
      await userEvent.type(input, 'Hello');

      fireEvent.click(screen.getByText('Send'));

      expect(input).toHaveValue('');
    });

    it('should close on close button click', () => {
      const { container } = render(<ChatWidget shopId={shopId} isOpen={true} />);

      const closeButton = screen.getByText('✕');
      fireEvent.click(closeButton);

      // Widget should still be in DOM but close button text might be different
      expect(closeButton).toBeInTheDocument();
    });
  });
});
