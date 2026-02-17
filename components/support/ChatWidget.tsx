'use client';

import React, { useState } from 'react';
import TicketForm from './TicketForm';

interface ChatWidgetProps {
  shopId: string;
  isOpen?: boolean;
}

export default function ChatWidget({ shopId, isOpen = false }: ChatWidgetProps) {
  const [open, setOpen] = useState(isOpen);
  const [tab, setTab] = useState<'chat' | 'create' | 'faq'>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot'; text: string }>>([
    { type: 'bot', text: 'Hello! How can we help you today?' }
  ]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages([...messages, { type: 'user', text: message }]);
    setMessage('');

    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: `Thanks for your message: "${message}". A support agent will be with you shortly!`
      }]);
    }, 500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition z-40"
        title="Open Support Chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-xl w-96 max-w-full max-h-96 flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">Support Center</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-white hover:opacity-80"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 py-2 text-sm font-medium ${
            tab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('create')}
          className={`flex-1 py-2 text-sm font-medium ${
            tab === 'create'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          New Ticket
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`flex-1 py-2 text-sm font-medium ${
            tab === 'faq'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          FAQs
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {tab === 'chat' && (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'create' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Create a support ticket for detailed assistance
            </p>
            <TicketForm
              shopId={shopId}
              onSuccess={() => {
                setTab('chat');
                setMessages([...messages, {
                  type: 'bot',
                  text: 'Your ticket has been created! You can track it in your account.'
                }]);
              }}
            />
          </div>
        )}

        {tab === 'faq' && (
          <div className="space-y-3">
            <div className="text-sm">
              <h4 className="font-semibold text-gray-900 mb-2">Common Issues</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="cursor-pointer hover:text-blue-600">
                  • How do I schedule an appointment?
                </li>
                <li className="cursor-pointer hover:text-blue-600">
                  • How do I edit my booking?
                </li>
                <li className="cursor-pointer hover:text-blue-600">
                  • How do I request a refund?
                </li>
                <li className="cursor-pointer hover:text-blue-600">
                  • How do I update my payment method?
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {tab === 'chat' && (
        <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2 bg-white rounded-b-lg">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
