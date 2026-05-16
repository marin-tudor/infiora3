'use client'
import GuestBookingsBrowsePage from '@/views/bookings/GuestBookingsBrowsePage'
import { useParams } from 'next/navigation'

export default function BookingsPage() {
  const params = useParams()
  return <GuestBookingsBrowsePage roomId={params.id as string} />
}
