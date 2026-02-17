/**
 * Example: Payment Form with Analytics
 * Demonstrates tracking payment events
 */

'use client';

import React, { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface PaymentFormExampleProps {
  amount: number;
  planTier: 'free' | 'pro' | 'enterprise';
  promoCode?: string;
}

export function PaymentFormExample({
  amount,
  planTier,
  promoCode,
}: PaymentFormExampleProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { trackPaymentCompleted, trackPaymentFailed, trackPromoCodeApplied } = useAnalytics();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          planTier,
          cardNumber,
          promoCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Track successful payment
        trackPaymentCompleted(amount, 'USD', planTier);

        // If promo code was used, track it
        if (promoCode && data.discountAmount) {
          trackPromoCodeApplied(promoCode, data.discountAmount, amount);
        }

        console.log('Payment successful');
      } else {
        const errorData = await response.json();

        // Track failed payment
        trackPaymentFailed(
          errorData.errorCode || 'UNKNOWN',
          errorData.errorMessage || 'Payment processing failed',
        );

        console.error('Payment failed:', errorData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Track payment exception
      trackPaymentFailed('EXCEPTION', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-4 max-w-md">
      <div className="bg-gray-50 p-4 rounded">
        <p className="text-sm text-gray-600">Amount to pay</p>
        <p className="text-2xl font-bold">${(amount / 100).toFixed(2)}</p>
        {promoCode && (
          <p className="text-sm text-green-600">Promo code applied: {promoCode}</p>
        )}
      </div>

      <div>
        <label htmlFor="card" className="block text-sm font-medium">
          Card Number
        </label>
        <input
          id="card"
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-green-600 text-white py-2 rounded disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </button>
    </form>
  );
}
