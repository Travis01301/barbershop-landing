'use client';

import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_id: string;
  name?: string;
  email?: string;
  created_at: string;
  is_internal: boolean;
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customer_satisfaction_score?: number;
  satisfaction_comment?: string;
  created_at: string;
  updated_at: string;
}

interface TicketDetailProps {
  ticketId: string;
  shopId: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

export default function TicketDetail({ ticketId, shopId }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRating, setShowRating] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      if (!response.ok) throw new Error('Failed to fetch ticket');

      const data = await response.json();
      setTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          is_internal: false
        })
      });

      if (!response.ok) throw new Error('Failed to send reply');

      const data = await response.json();
      setMessages([...messages, data.message]);
      setReplyText('');
      
      // Refresh ticket details
      fetchTicketDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/satisfaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: rating,
          comment: ratingComment
        })
      });

      if (!response.ok) throw new Error('Failed to submit rating');

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      setShowRating(false);
      setRating(0);
      setRatingComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading ticket...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  if (!ticket) {
    return <div className="text-center py-4 text-gray-600">Ticket not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-gray-600 mt-2">Ticket #{ticket.ticket_number}</p>
          </div>
          <div className="space-y-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColors[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <p className="text-sm text-gray-600">Priority: {ticket.priority}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        <p className="text-sm text-gray-600 mt-4">
          Created: {new Date(ticket.created_at).toLocaleString()}
        </p>
      </div>

      {/* Messages */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map(msg => (
            <div key={msg.id} className={`p-4 rounded-lg ${msg.author_type === 'customer' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-900">
                  {msg.name || msg.email || 'Support'}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(msg.created_at).toLocaleString()}
                </span>
              </div>
              {msg.is_internal && (
                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mb-2">
                  Internal Only
                </span>
              )}
              <p className="text-gray-700">{msg.message}</p>
            </div>
          ))}
        </div>

        {/* Reply Form */}
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting || !replyText.trim()}
            className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Sending...' : 'Send Reply'}
          </button>
        </form>
      </div>

      {/* Rating Section */}
      {ticket.status === 'resolved' && !ticket.customer_satisfaction_score && (
        <div className="p-6 border-b bg-blue-50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rate Your Experience</h2>
          {showRating ? (
            <form onSubmit={handleRatingSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How satisfied are you with the resolution?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        rating === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-600'
                      }`}
                    >
                      {num} ⭐
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Additional comments (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Rating
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowRating(true)}
              className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Rate This Ticket
            </button>
          )}
        </div>
      )}

      {ticket.customer_satisfaction_score && (
        <div className="p-6 bg-green-50 border-t">
          <p className="text-gray-700">
            <strong>Your rating:</strong> {ticket.customer_satisfaction_score} ⭐
            {ticket.satisfaction_comment && (
              <>
                <br />
                <strong>Comment:</strong> {ticket.satisfaction_comment}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
