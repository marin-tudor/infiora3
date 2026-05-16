'use client'
import GuestMyBookingsPage from '@/views/bookings/GuestMyBookingsPage'
import { useParams } from 'next/navigation'

export default function MyBookingsPage() {
  const params = useParams()
  return <GuestMyBookingsPage roomId={params.id as string} />
}
