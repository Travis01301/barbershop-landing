'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  shopSlug: string;
  barberId: number;
  serviceId: number;
  scheduledDate: string;
  customerInfo: any;
  onSuccess: (booking: any, token: string) => void;
  onBack: () => void;
}

function CheckoutForm({
  shopSlug,
  barberId,
  serviceId,
  scheduledDate,
  customerInfo,
  onSuccess,
  onBack,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [promoCode, setPromoCode] = useState('');
  const [promoValidated, setPromoValidated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Create booking first
      const createResponse = await fetch('/api/public/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: shopSlug,
          barberId,
          serviceId,
          scheduledDate,
          customerEmail: customerInfo.email,
          customerPhone: customerInfo.phone,
          customerName: customerInfo.name,
          stylingNotes: customerInfo.stylingNotes,
          firstTimeCustomer: customerInfo.firstTimeCustomer,
          promoCode: promoCode || null,
        }),
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        setError(createData.error || 'Failed to create booking');
        setLoading(false);
        return;
      }

      const { booking, paymentIntentId } = createData.booking;

      // Confirm payment
      if (paymentIntentId) {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error('Card element not found');

        const { error: confirmError } = await stripe.confirmCardPayment(paymentIntentId, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email,
            },
          },
        });

        if (confirmError) {
          setError(confirmError.message || 'Payment failed');
          setLoading(false);
          return;
        }
      }

      // Success
      onSuccess(createData.booking, createData.booking.token);
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Deposit Amount
        </label>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">$10.00</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            This deposit will secure your booking. Remaining balance due at the appointment.
          </p>
        </div>
      </div>

      {/* Promo Code */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Promo Code (Optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="LAUNCH50"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={promoValidated}
          />
          {!promoValidated && promoCode && (
            <button
              type="button"
              className="px-4 py-3 bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-semibold"
              onClick={() => setPromoValidated(true)}
            >
              Apply
            </button>
          )}
        </div>
        {promoValidated && promoCode && (
          <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">✓ Promo code applied</p>
          </div>
        )}
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Card Information
        </label>
        <div className="p-4 border border-slate-300 rounded-lg bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1e293b',
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
        <p className="text-xs text-slate-600">
          <strong>Cancellation Policy:</strong> Free cancellation up to 48 hours before appointment.
          Cancellations within 48 hours will incur a $15 fee.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-4 py-3 border border-slate-300 text-slate-900 dark:text-slate-100 rounded-lg font-bold hover:bg-slate-50 dark:bg-slate-900 transition-all"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-bold transition-all"
        >
          {loading ? 'Processing...' : 'Confirm & Pay $10'}
        </button>
      </div>
    </form>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Secure Payment</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Complete your booking by paying the deposit</p>

        <Elements stripe={stripePromise}>
          <CheckoutForm {...props} />
        </Elements>
      </div>
    </div>
  );
}
