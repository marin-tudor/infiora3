'use client'
import { useParams } from 'next/navigation'

import Loader from '@/components/common/Loader'
import { useGetRoomQuery } from '@/redux/api/roomApi'
import EditRoomPage from '@/views/rooms/pages/EditRoomPage'

export default function Page() {
  const { id } = useParams()

  const { data: room } = useGetRoomQuery(`${id}`, { skip: !id })

  if (room) {
    return <EditRoomPage room={room} />
  }

  return <Loader center />
}
