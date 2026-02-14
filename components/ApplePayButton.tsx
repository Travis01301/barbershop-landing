'use client'

import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

const componentLogger = logger.createChild('apple-pay-button')

interface ApplePayButtonProps {
  appointmentId: string
  amount: number
  shopName: string
  onSuccess: (paymentIntentId: string) => void
  onError: (error: string) => void
}

export function ApplePayButton({
  appointmentId,
  amount,
  shopName,
  onSuccess,
  onError,
}: ApplePayButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    checkApplePayAvailability()
  }, [])

  /**
   * Check if Apple Pay is available
   */
  const checkApplePayAvailability = async () => {
    try {
      // Check if Apple Pay is supported on this device
      if (!window.ApplePaySession) {
        componentLogger.debug('Apple Pay not supported on this device')
        setIsAvailable(false)
        return
      }

      // Check with backend if merchant is configured
      const response = await fetch('/api/payments/apple-pay')
      const data = await response.json()

      if (data.available) {
        setIsAvailable(true)
        createApplePayButton()
      } else {
        componentLogger.warn('Apple Pay not available for merchant')
        setIsAvailable(false)
      }
    } catch (error) {
      componentLogger.error('Error checking Apple Pay availability', error)
      setIsAvailable(false)
    }
  }

  /**
   * Create Apple Pay session and request
   */
  const createApplePayButton = () => {
    if (!window.ApplePaySession || !buttonRef.current) {
      return
    }

    const button = document.createElement('apple-pay-button')
    button.setAttribute('buttonstyle', 'black')
    button.setAttribute('type', 'plain')

    button.addEventListener('click', handleApplePayClick)

    if (buttonRef.current) {
      buttonRef.current.appendChild(button)
    }
  }

  /**
   * Handle Apple Pay button click
   */
  const handleApplePayClick = async () => {
    try {
      setIsProcessing(true)
      componentLogger.debug('Apple Pay button clicked')

      // Create payment request
      const paymentRequest: ApplePayJS.ApplePayPaymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: shopName,
          amount: amount.toFixed(2),
        },
        lineItems: [
          {
            label: 'Appointment',
            amount: amount.toFixed(2),
          },
        ],
      }

      // Create Apple Pay session
      const session = new window.ApplePaySession(3, paymentRequest)

      // Handle validation
      session.onvalidatemerchant = async (event) => {
        componentLogger.debug('Validating merchant')
        // In production, validate with your server
        // For now, Apple handles merchant validation
        session.completeMerchantValidation({} as ApplePayJS.ApplePayValidateMerchantEvent)
      }

      // Handle payment method selection
      session.onpaymentmethodselected = (event) => {
        componentLogger.debug('Payment method selected')
        session.completePaymentMethodSelection({
          newTotal: {
            label: shopName,
            amount: amount.toFixed(2),
          },
        })
      }

      // Handle payment authorization
      session.onpaymentauthorized = async (event) => {
        componentLogger.info('Apple Pay authorized')

        try {
          // Step 1: Create payment intent
          const paymentResponse = await fetch('/api/payments/apple-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appointmentId,
              amount,
              currency: 'USD',
              displayName: shopName,
              token: event.payment.token,
            }),
          })

          if (!paymentResponse.ok) {
            throw new Error('Payment creation failed')
          }

          const paymentData = await paymentResponse.json()
          const { paymentIntentId } = paymentData

          // Step 2: Confirm payment
          const confirmResponse = await fetch('/api/payments/apple-pay/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId,
              applePayToken: event.payment.token,
            }),
          })

          if (!confirmResponse.ok) {
            throw new Error('Payment confirmation failed')
          }

          const confirmData = await confirmResponse.json()

          if (confirmData.success) {
            session.completePayment({
              status: window.ApplePaySession.STATUS_SUCCESS,
            })

            componentLogger.info('Apple Pay payment successful', {
              paymentIntentId,
            })

            onSuccess(paymentIntentId)
          } else {
            session.completePayment({
              status: window.ApplePaySession.STATUS_FAILURE,
            })

            componentLogger.warn('Apple Pay payment failed', {
              status: confirmData.status,
            })

            onError('Payment confirmation failed')
          }
        } catch (error) {
          session.completePayment({
            status: window.ApplePaySession.STATUS_FAILURE,
          })

          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          componentLogger.error('Apple Pay authorization error', error)
          onError(errorMessage)
        }
      }

      // Handle errors
      session.oncancel = () => {
        componentLogger.info('Apple Pay cancelled by user')
        onError('Payment cancelled')
      }

      // Begin Apple Pay session
      session.begin()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      componentLogger.error('Apple Pay button error', error)
      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Only render if Apple Pay is available
  if (!isAvailable) {
    return null
  }

  return (
    <div
      ref={buttonRef}
      className="apple-pay-button-container"
      style={{
        width: '100%',
        height: '44px',
        marginBottom: '16px',
      }}
    />
  )
}

// Type definitions for Apple Pay
declare global {
  interface Window {
    ApplePaySession: typeof ApplePaySession
  }
}

namespace ApplePayJS {
  interface ApplePayPaymentRequest {
    countryCode: string
    currencyCode: string
    supportedNetworks: string[]
    merchantCapabilities: string[]
    total: ApplePayLineItem
    lineItems?: ApplePayLineItem[]
  }

  interface ApplePayLineItem {
    label: string
    amount: string
  }

  interface ApplePayValidateMerchantEvent {
    validationURL: string
  }
}
