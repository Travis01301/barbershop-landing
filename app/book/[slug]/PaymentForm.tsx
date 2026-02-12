'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { CardElement, Elements, useElements, useStripe, PaymentRequestButtonElement } from '@stripe/react-stripe-js'
import { useEffect } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '')

interface PaymentFormProps {
  appointmentId: number
  amount: number
  email: string
  shopSlug: string
  onSuccess: () => void
  onError: (error: string) => void
}

function PaymentFormContent({ appointmentId, amount, email, shopSlug, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [selectedTip, setSelectedTip] = useState(0)
  const [paymentRequest, setPaymentRequest] = useState<any>(null)
  const [showCardForm, setShowCardForm] = useState(true)

  // Initialize payment request for Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) return

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: `Barbershop Deposit + Tip`,
        amount: amount + selectedTip,
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    })

    // Check if Apple Pay or Google Pay is available
    pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr)
        setShowCardForm(false)
      }
    })

    // Handle payment method selection
    pr.on('paymentmethod', async (e) => {
      if (!stripe) return

      setLoading(true)
      try {
        const totalAmount = amount + selectedTip
        const intentRes = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId,
            amount: totalAmount / 100,
            email,
            shopSlug,
            description: `Booking deposit${selectedTip > 0 ? ` + tip` : ''}`,
          }),
        })

        const intentData = await intentRes.json()
        if (!intentData.success) {
          e.complete('fail')
          onError(intentData.error || 'Failed to create payment')
          setLoading(false)
          return
        }

        // Confirm the payment
        const { paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
          payment_method: e.paymentMethod.id,
        })

        if (paymentIntent?.status === 'succeeded') {
          const confirmRes = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: intentData.paymentIntentId,
              appointmentId,
            }),
          })

          const confirmData = await confirmRes.json()
          if (confirmData.success) {
            e.complete('success')
            onSuccess()
          } else {
            e.complete('fail')
            onError('Payment succeeded but failed to confirm')
          }
        } else {
          e.complete('fail')
          onError(paymentIntent?.last_payment_error?.message || 'Payment failed')
        }
      } catch (err) {
        e.complete('fail')
        onError((err as Error).message || 'Payment process failed')
      } finally {
        setLoading(false)
      }
    })
  }, [stripe, amount, selectedTip, appointmentId, email, shopSlug, onSuccess, onError])

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        onError('Card element not found')
        setLoading(false)
        return
      }

      const totalAmount = amount + selectedTip

      const intentRes = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          amount: totalAmount / 100,
          email,
          shopSlug,
          description: `Booking deposit${selectedTip > 0 ? ` + $${(selectedTip / 100).toFixed(2)} tip` : ''}`,
        }),
      })

      const intentData = await intentRes.json()
      if (!intentData.success) {
        onError(intentData.error || 'Failed to create payment')
        setLoading(false)
        return
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { email },
        },
      })

      if (error) {
        onError(error.message || 'Payment failed')
        setLoading(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: intentData.paymentIntentId,
            appointmentId,
          }),
        })

        const confirmData = await confirmRes.json()
        if (confirmData.success) {
          onSuccess()
        } else {
          onError('Payment succeeded but failed to confirm')
        }
      }
    } catch (err) {
      onError((err as Error).message || 'Payment process failed')
    } finally {
      setLoading(false)
    }
  }

  const tipOptions = [
    { label: 'No tip', value: 0 },
    { label: '15%', value: Math.round(amount * 0.15) },
    { label: '18%', value: Math.round(amount * 0.18) },
    { label: '20%', value: Math.round(amount * 0.20) },
    { label: 'Custom', value: -1 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-slate-900 mb-4">Deposit Amount</h3>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            ${(amount / 100).toFixed(2)}
          </p>
          <p className="text-sm text-slate-600 mt-1">Required to confirm booking</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-900 mb-3">Add Tip (Optional)</h3>
        <div className="grid grid-cols-5 gap-2">
          {tipOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedTip(option.value)}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all border-2 ${
                selectedTip === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-900 hover:border-blue-300'
              }`}
            >
              {option.label}
              {option.value > 0 && <div className="text-xs">${(option.value / 100).toFixed(2)}</div>}
            </button>
          ))}
        </div>
      </div>

      {paymentRequest && (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500 font-semibold">Fast checkout</span>
            </div>
          </div>
          <PaymentRequestButtonElement options={{ paymentRequest }} />
        </div>
      )}

      {showCardForm && (
        <form onSubmit={handleCardPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Card Details</label>
            <div className="p-4 border border-slate-300 rounded-lg bg-white">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1e293b',
                      '::placeholder': {
                        color: '#94a3b8',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex justify-between mb-2">
              <p className="text-slate-600">Deposit:</p>
              <p className="font-semibold text-slate-900">${(amount / 100).toFixed(2)}</p>
            </div>
            {selectedTip > 0 && (
              <div className="flex justify-between mb-2">
                <p className="text-slate-600">Tip:</p>
                <p className="font-semibold text-slate-900">${(selectedTip / 100).toFixed(2)}</p>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <p className="font-bold text-slate-900">Total:</p>
              <p className="font-bold text-blue-600 text-lg">
                ${((amount + selectedTip) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !stripe}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white py-3 rounded-lg font-bold transition-all shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Pay with Card
              </>
            )}
          </button>
        </form>
      )}

      <p className="text-xs text-slate-500 text-center">
        Your payment is secure and encrypted. Processing powered by Stripe.
      </p>
    </div>
  )
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  )
}
