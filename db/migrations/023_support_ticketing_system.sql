-- Support Ticketing System Database Schema

-- Create support_staff table
CREATE TABLE IF NOT EXISTS support_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  average_response_time_minutes INTEGER DEFAULT 0,
  total_resolved_tickets INTEGER DEFAULT 0,
  customer_satisfaction_rating DECIMAL(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_support_staff_shop_id ON support_staff(shop_id);
CREATE INDEX idx_support_staff_user_id ON support_staff(user_id);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES support_staff(id) ON DELETE SET NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('billing', 'technical', 'feature_request', 'account', 'other')),
  priority VARCHAR(50) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')) DEFAULT 'open',
  customer_satisfaction_score INTEGER CHECK (customer_satisfaction_score IS NULL OR (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5)),
  satisfaction_comment TEXT,
  first_response_at TIMESTAMP,
  resolution_time_minutes INTEGER,
  internal_notes TEXT,
  email_from VARCHAR(255),
  email_thread_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_support_tickets_shop_id ON support_tickets(shop_id);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);

-- Create ticket_messages table (conversation thread)
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  author_type VARCHAR(50) NOT NULL CHECK (author_type IN ('customer', 'support_staff', 'system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_author_id ON ticket_messages(author_id);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at);

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  file_type VARCHAR(100),
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_message_id ON ticket_attachments(message_id);

-- Create knowledge_base_articles table
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags VARCHAR(500),
  video_url TEXT,
  video_transcript TEXT,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  order_position INTEGER DEFAULT 0,
  seo_title VARCHAR(255),
  seo_description VARCHAR(500),
  seo_keywords VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_base_articles_shop_id ON knowledge_base_articles(shop_id);
CREATE INDEX idx_knowledge_base_articles_category ON knowledge_base_articles(category);
CREATE INDEX idx_knowledge_base_articles_slug ON knowledge_base_articles(slug);
CREATE INDEX idx_knowledge_base_articles_is_published ON knowledge_base_articles(is_published);

-- Create knowledge_base_article_feedback table
CREATE TABLE IF NOT EXISTS knowledge_base_article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_base_article_feedback_article_id ON knowledge_base_article_feedback(article_id);
CREATE INDEX idx_knowledge_base_article_feedback_user_id ON knowledge_base_article_feedback(user_id);

-- Create email_queue table for async email processing
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  email_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')) DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_queue_ticket_id ON email_queue(ticket_id);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created_at ON email_queue(created_at);

-- Create ticket_sla_metrics table
CREATE TABLE IF NOT EXISTS ticket_sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES support_tickets(id) ON DELETE CASCADE,
  first_response_sla_minutes INTEGER,
  resolution_sla_minutes INTEGER,
  first_response_breached BOOLEAN DEFAULT false,
  resolution_breached BOOLEAN DEFAULT false,
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ticket_sla_metrics_ticket_id ON ticket_sla_metrics(ticket_id);
CREATE INDEX idx_ticket_sla_metrics_first_response_breached ON ticket_sla_metrics(first_response_breached);
CREATE INDEX idx_ticket_sla_metrics_resolution_breached ON ticket_sla_metrics(resolution_breached);

-- Create support_stats table for caching
CREATE TABLE IF NOT EXISTS support_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  total_tickets INTEGER DEFAULT 0,
  open_tickets INTEGER DEFAULT 0,
  urgent_tickets INTEGER DEFAULT 0,
  avg_response_time_minutes DECIMAL(10,2) DEFAULT 0,
  avg_resolution_time_minutes DECIMAL(10,2) DEFAULT 0,
  customer_satisfaction_avg DECIMAL(3,2) DEFAULT 0,
  tickets_this_month INTEGER DEFAULT 0,
  sla_breach_rate DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_stats_shop_id ON support_stats(shop_id);
