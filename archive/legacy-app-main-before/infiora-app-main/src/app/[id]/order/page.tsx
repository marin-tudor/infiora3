'use client'
import GuestOrderPage from '@/views/orders/GuestOrderPage'
import { useParams } from 'next/navigation'

export default function OrderPage() {
  const params = useParams()
  return <GuestOrderPage roomId={params.id as string} />
}
