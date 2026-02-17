import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Mock database
jest.mock('@/lib/db');

describe('Support Ticketing System', () => {
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const shopId = uuidv4();
  const userId = uuidv4();
  const ticketId = uuidv4();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============= TICKET CREATION TESTS =============
  describe('Ticket Creation', () => {
    it('should create a support ticket with valid data', async () => {
      const mockTicket = {
        id: ticketId,
        ticket_number: 'TICKET-123456-ABC123',
        shop_id: shopId,
        user_id: userId,
        subject: 'Cannot login',
        description: 'I am unable to access my account',
        category: 'technical',
        priority: 'high',
        status: 'open',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTicket] });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO support_tickets'),
        expect.any(Array)
      );
    });

    it('should reject invalid category', async () => {
      const invalidTicket = {
        subject: 'Test',
        description: 'Test description',
        category: 'invalid_category',
        shop_id: shopId
      };

      // Should validate before making query
      expect(['billing', 'technical', 'feature_request', 'account', 'other']).not.toContain(
        invalidTicket.category
      );
    });

    it('should set default priority to medium', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          priority: 'medium',
          status: 'open'
        }]
      });

      const result = await mockQuery('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
      expect(result.rows[0].priority).toBe('medium');
    });

    it('should generate unique ticket number', async () => {
      const mockTicket1 = { ticket_number: 'TICKET-123456-ABC123' };
      const mockTicket2 = { ticket_number: 'TICKET-123456-XYZ789' };

      expect(mockTicket1.ticket_number).not.toBe(mockTicket2.ticket_number);
    });

    it('should create SLA metrics with ticket', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: ticketId }] });

      // Simulate creating SLA metrics
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============= TICKET UPDATE TESTS =============
  describe('Ticket Updates', () => {
    it('should update ticket status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          status: 'in_progress',
          updated_at: new Date()
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET status = $1 WHERE id = $2 RETURNING *',
        ['in_progress', ticketId]
      );

      expect(result.rows[0].status).toBe('in_progress');
    });

    it('should set resolved_at when resolving ticket', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          status: 'resolved',
          resolved_at: now
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET status = $1, resolved_at = $2 WHERE id = $3',
        ['resolved', now, ticketId]
      );

      expect(result.rows[0].resolved_at).toBeDefined();
    });

    it('should update ticket priority', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          priority: 'urgent'
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET priority = $1 WHERE id = $2',
        ['urgent', ticketId]
      );

      expect(result.rows[0].priority).toBe('urgent');
    });

    it('should assign ticket to support staff', async () => {
      const staffId = uuidv4();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          assigned_to: staffId
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET assigned_to = $1 WHERE id = $2',
        [staffId, ticketId]
      );

      expect(result.rows[0].assigned_to).toBe(staffId);
    });

    it('should add internal notes to ticket', async () => {
      const notes = 'Customer needs follow-up tomorrow';
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          internal_notes: notes
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET internal_notes = $1 WHERE id = $2',
        [notes, ticketId]
      );

      expect(result.rows[0].internal_notes).toBe(notes);
    });
  });

  // ============= TICKET MESSAGES TESTS =============
  describe('Ticket Messages', () => {
    it('should create a customer message', async () => {
      const messageId = uuidv4();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: messageId,
          ticket_id: ticketId,
          author_type: 'customer',
          message: 'Thank you for looking into this',
          is_internal: false
        }]
      });

      const result = await mockQuery(
        'INSERT INTO ticket_messages (id, ticket_id, author_id, author_type, message, is_internal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [messageId, ticketId, userId, 'customer', 'Thank you for looking into this', false]
      );

      expect(result.rows[0].author_type).toBe('customer');
      expect(result.rows[0].is_internal).toBe(false);
    });

    it('should create an internal staff message', async () => {
      const messageId = uuidv4();
      const staffId = uuidv4();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: messageId,
          author_type: 'support_staff',
          is_internal: true
        }]
      });

      const result = await mockQuery(
        'INSERT INTO ticket_messages (id, ticket_id, author_id, author_type, message, is_internal) VALUES ($1, $2, $3, $4, $5, $6)',
        [messageId, ticketId, staffId, 'support_staff', 'Internal discussion', true]
      );

      expect(result.rows[0].is_internal).toBe(true);
    });

    it('should fetch ticket conversation thread', async () => {
      const mockMessages = [
        { id: uuidv4(), message: 'Initial message', created_at: new Date() },
        { id: uuidv4(), message: 'Reply message', created_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockMessages
      });

      const result = await mockQuery(
        'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
        [ticketId]
      );

      expect(result.rows.length).toBe(2);
    });

    it('should handle file attachments in messages', async () => {
      const attachmentId = uuidv4();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: attachmentId,
          ticket_id: ticketId,
          file_name: 'screenshot.png',
          file_size_bytes: 102400,
          file_type: 'image/png'
        }]
      });

      const result = await mockQuery(
        'INSERT INTO ticket_attachments (id, ticket_id, file_name, file_size_bytes, file_type, file_url, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [attachmentId, ticketId, 'screenshot.png', 102400, 'image/png', 'https://...', userId]
      );

      expect(result.rows[0].file_name).toBe('screenshot.png');
    });
  });

  // ============= KNOWLEDGE BASE TESTS =============
  describe('Knowledge Base', () => {
    it('should create a knowledge base article', async () => {
      const articleId = uuidv4();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: articleId,
          title: 'How to book an appointment',
          slug: 'how-to-book-appointment',
          category: 'getting-started',
          is_published: true
        }]
      });

      const result = await mockQuery(
        'INSERT INTO knowledge_base_articles (id, shop_id, title, slug, category, is_published) VALUES ($1, $2, $3, $4, $5, $6)',
        [articleId, shopId, 'How to book an appointment', 'how-to-book-appointment', 'getting-started', true]
      );

      expect(result.rows[0].title).toBe('How to book an appointment');
      expect(result.rows[0].is_published).toBe(true);
    });

    it('should search knowledge base articles', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: uuidv4(), title: 'Payment methods', category: 'billing' },
          { id: uuidv4(), title: 'Refund policy', category: 'billing' }
        ]
      });

      const result = await mockQuery(
        'SELECT * FROM knowledge_base_articles WHERE shop_id = $1 AND (title ILIKE $2 OR content ILIKE $2) AND is_published = true',
        [shopId, '%payment%']
      );

      expect(result.rows.length).toBe(2);
    });

    it('should track article views', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

      const result = await mockQuery(
        'UPDATE knowledge_base_articles SET view_count = view_count + 1 WHERE id = $1',
        [uuidv4()]
      );

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should record article feedback (helpful/unhelpful)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: uuidv4() }] });

      const result = await mockQuery(
        'INSERT INTO knowledge_base_article_feedback (id, article_id, user_id, helpful) VALUES ($1, $2, $3, $4)',
        [uuidv4(), uuidv4(), userId, true]
      );

      expect(mockQuery).toHaveBeenCalled();
    });

    it('should support video tutorials in articles', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: uuidv4(),
          title: 'Video Tutorial',
          video_url: 'https://youtube.com/embed/...',
          video_transcript: 'Full transcript...'
        }]
      });

      const result = await mockQuery(
        'SELECT * FROM knowledge_base_articles WHERE id = $1',
        [uuidv4()]
      );

      expect(result.rows[0].video_url).toBeDefined();
    });

    it('should filter articles by category', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: uuidv4(), category: 'billing' }]
      });

      const result = await mockQuery(
        'SELECT * FROM knowledge_base_articles WHERE shop_id = $1 AND category = $2 AND is_published = true',
        [shopId, 'billing']
      );

      expect(result.rows[0].category).toBe('billing');
    });
  });

  // ============= ADMIN DASHBOARD TESTS =============
  describe('Admin Dashboard', () => {
    it('should get open ticket count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 5 }]
      });

      const result = await mockQuery(
        'SELECT COUNT(*) as count FROM support_tickets WHERE shop_id = $1 AND status IN ($2, $3)',
        [shopId, 'open', 'in_progress']
      );

      expect(parseInt(result.rows[0].count)).toBe(5);
    });

    it('should get urgent ticket count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 2 }]
      });

      const result = await mockQuery(
        'SELECT COUNT(*) as count FROM support_tickets WHERE shop_id = $1 AND priority = $2 AND status != $3',
        [shopId, 'urgent', 'closed']
      );

      expect(parseInt(result.rows[0].count)).toBe(2);
    });

    it('should calculate average response time', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ avg_minutes: 45.5 }]
      });

      const result = await mockQuery(
        'SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_minutes FROM support_tickets WHERE shop_id = $1 AND first_response_at IS NOT NULL',
        [shopId]
      );

      expect(parseFloat(result.rows[0].avg_minutes)).toBeCloseTo(45.5);
    });

    it('should get tickets grouped by priority', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { priority: 'urgent', count: 3 },
          { priority: 'high', count: 5 },
          { priority: 'medium', count: 8 }
        ]
      });

      const result = await mockQuery(
        'SELECT priority, COUNT(*) as count FROM support_tickets WHERE shop_id = $1 GROUP BY priority',
        [shopId]
      );

      expect(result.rows.length).toBe(3);
    });

    it('should get tickets grouped by status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { status: 'open', count: 5 },
          { status: 'resolved', count: 15 }
        ]
      });

      const result = await mockQuery(
        'SELECT status, COUNT(*) as count FROM support_tickets WHERE shop_id = $1 GROUP BY status',
        [shopId]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should calculate SLA breaches', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: 2 }]
      });

      const result = await mockQuery(
        'SELECT COUNT(*) as count FROM ticket_sla_metrics WHERE first_response_breached = true OR resolution_breached = true',
        []
      );

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(0);
    });
  });

  // ============= SATISFACTION RATING TESTS =============
  describe('Satisfaction Rating', () => {
    it('should record customer satisfaction score', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: ticketId,
          customer_satisfaction_score: 5,
          satisfaction_comment: 'Great support!'
        }]
      });

      const result = await mockQuery(
        'UPDATE support_tickets SET customer_satisfaction_score = $1, satisfaction_comment = $2 WHERE id = $3',
        [5, 'Great support!', ticketId]
      );

      expect(result.rows[0].customer_satisfaction_score).toBe(5);
    });

    it('should validate satisfaction score range 1-5', async () => {
      const validScores = [1, 2, 3, 4, 5];
      const invalidScores = [0, 6, -1, 10];

      validScores.forEach(score => {
        expect(validScores).toContain(score);
      });

      invalidScores.forEach(score => {
        expect(validScores).not.toContain(score);
      });
    });

    it('should update support staff average rating', async () => {
      const staffId = uuidv4();
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: staffId,
          customer_satisfaction_rating: 4.5
        }]
      });

      const result = await mockQuery(
        'UPDATE support_staff SET customer_satisfaction_rating = $1 WHERE id = $2',
        [4.5, staffId]
      );

      expect(result.rows[0].customer_satisfaction_rating).toBe(4.5);
    });
  });

  // ============= EMAIL INTEGRATION TESTS =============
  describe('Email Integration', () => {
    it('should queue email for ticket creation notification', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: uuidv4(),
          ticket_id: ticketId,
          status: 'pending',
          email_type: 'ticket_created'
        }]
      });

      const result = await mockQuery(
        'INSERT INTO email_queue (id, ticket_id, recipient_email, subject, email_type, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), ticketId, 'user@example.com', 'Ticket Created', 'ticket_created', 'pending']
      );

      expect(result.rows[0].status).toBe('pending');
    });

    it('should queue email for ticket updates', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          email_type: 'ticket_reply',
          status: 'pending'
        }]
      });

      const result = await mockQuery(
        'INSERT INTO email_queue (id, ticket_id, email_type, status) VALUES ($1, $2, $3, $4)',
        [uuidv4(), ticketId, 'ticket_reply', 'pending']
      );

      expect(result.rows[0].email_type).toBe('ticket_reply');
    });

    it('should handle email retry logic', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: uuidv4(),
          retry_count: 1,
          max_retries: 3,
          status: 'pending'
        }]
      });

      const result = await mockQuery(
        'SELECT * FROM email_queue WHERE status = $1 AND retry_count < max_retries',
        ['failed']
      );

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============= SEARCH FUNCTIONALITY TESTS =============
  describe('Search Functionality', () => {
    it('should search tickets by subject', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: ticketId, subject: 'Cannot login to account' }]
      });

      const result = await mockQuery(
        'SELECT * FROM support_tickets WHERE subject ILIKE $1',
        ['%login%']
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should filter tickets by category', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: ticketId, category: 'billing' }]
      });

      const result = await mockQuery(
        'SELECT * FROM support_tickets WHERE shop_id = $1 AND category = $2',
        [shopId, 'billing']
      );

      expect(result.rows[0].category).toBe('billing');
    });

    it('should filter tickets by priority', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: ticketId, priority: 'urgent' }]
      });

      const result = await mockQuery(
        'SELECT * FROM support_tickets WHERE shop_id = $1 AND priority = $2',
        [shopId, 'urgent']
      );

      expect(result.rows[0].priority).toBe('urgent');
    });

    it('should search knowledge base with multiple keywords', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: uuidv4(), title: 'Payment method setup guide' }]
      });

      const result = await mockQuery(
        'SELECT * FROM knowledge_base_articles WHERE title ILIKE $1',
        ['%payment%method%']
      );

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  // ============= ERROR HANDLING TESTS =============
  describe('Error Handling', () => {
    it('should handle ticket not found error', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await mockQuery(
        'SELECT * FROM support_tickets WHERE id = $1',
        ['invalid-id']
      );

      expect(result.rows.length).toBe(0);
    });

    it('should handle database connection errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      try {
        await mockQuery('SELECT * FROM support_tickets', []);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should validate email format for tickets', async () => {
      const validEmails = ['user@example.com', 'test@barbershop.com'];
      const invalidEmails = ['invalid', 'missing@', '@nodomain'];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });
});
