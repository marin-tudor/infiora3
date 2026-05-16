'use client'
import GuestBookingConfirmPage from '@/views/bookings/GuestBookingConfirmPage'
import { useParams } from 'next/navigation'

export default function BookingConfirmPage() {
  const params = useParams()
  return <GuestBookingConfirmPage roomId={params.id as string} />
}
