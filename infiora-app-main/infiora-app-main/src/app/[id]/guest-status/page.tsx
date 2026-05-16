'use client'
import GuestStatusLookupPage from '@/views/status/GuestStatusLookupPage'
import { useParams } from 'next/navigation'

export default function GuestStatusPage() {
  const params = useParams()
  return <GuestStatusLookupPage roomId={params.id as string} />
}
