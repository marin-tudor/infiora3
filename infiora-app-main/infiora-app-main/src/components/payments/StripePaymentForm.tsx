'use client'
import { useState } from 'react'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

interface Props {
  disabled?: boolean
  onSuccess: (paymentIntentId: string) => void
}

export default function StripePaymentForm({ disabled, onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    if (!stripe || !elements || disabled) return
    setLoading(true)
    setError('')

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Payment failed')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment was not completed')
    }

    setLoading(false)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <PaymentElement />
      {error && <p style={{ color: '#c05050', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading || !stripe || disabled}
        style={{
          marginTop: 12,
          width: '100%',
          padding: 14,
          background: '#b8935c',
          color: '#0f0f0f',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          opacity: loading || !stripe || disabled ? 0.45 : 1,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {loading ? 'Processing...' : 'Pay now'}
      </button>
    </div>
  )
}
