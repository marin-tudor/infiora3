'use client'
import { useParams } from 'next/navigation'

import Loader from '@/components/common/Loader'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import EditHotelPage from '@/views/hotels/pages/EditHotelPage'

export default function Page() {
  const { id } = useParams()

  const { data: hotel } = useGetHotelQuery(`${id}`, { skip: !id })

  if (hotel) {
    return <EditHotelPage hotel={hotel} />
  }

  return <Loader center />
}
