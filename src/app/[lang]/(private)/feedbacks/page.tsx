'use client'
import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetRoomsQuery } from '@/redux/api/roomApi'
import FeedbacksPage from '@/views/feedbacks/pages/FeedbacksPage'

export default function Page() {
  const authUser = useAuthUser()

  const { data, isLoading } = useGetRoomsQuery(
    {
      hotel: authUser?.hotel?.id,
      limit: 100
    },
    { skip: !authUser.hotel }
  )

  if (isLoading) return <Loader center />

  if (!data || data?.results?.length < 1) return <></>

  return <FeedbacksPage rooms={data.results} />
}
