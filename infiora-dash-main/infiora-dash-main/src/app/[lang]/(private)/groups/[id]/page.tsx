'use client'
import { useParams } from 'next/navigation'

import Loader from '@/components/common/Loader'
import { useGetGroupQuery } from '@/redux/api/groupApi'
import EditGroupPage from '@/views/groups/pages/EditGroupPage'

export default function Page() {
  const { id } = useParams()

  const { data: group } = useGetGroupQuery(`${id}`, { skip: !id })

  if (group) {
    return <EditGroupPage group={group} />
  }

  return <Loader center />
}
