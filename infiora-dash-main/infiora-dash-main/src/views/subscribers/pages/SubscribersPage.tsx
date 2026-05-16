'use client'

import { useParams, useRouter } from 'next/navigation'

import { Stack, Typography } from '@mui/material'

import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import SubscribersTable from '@/views/subscribers/components/SubscribersTable'
import RangePicker from '@/components/common/RangePicker'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import { toSearchParams } from '@/utils/miscUtils'

const SubscribersPage = () => {
  const dictionary = useDictionary()
  const authUser = useAuthUser()
  const router = useRouter()
  const { lang: locale } = useParams()
  const searchParams: any = useSearchQuery(['startDate', 'endDate'])

  if (!authUser?.id) return <Loader center />

  return (
    <Stack gap={5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        gap={2}
      >
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='h4'>{dictionary.subscribers}</Typography>
        </Stack>
        <RangePicker
          range={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
          setRange={({ startDate, endDate }) => {
            router.push(
              `/${locale}/subscribers?` +
                toSearchParams({
                  ...searchParams,
                  startDate,
                  endDate
                })
            )
          }}
        />
      </Stack>
      <SubscribersTable user={authUser?.id} />
    </Stack>
  )
}

export default SubscribersPage
