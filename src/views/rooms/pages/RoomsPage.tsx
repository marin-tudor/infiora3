'use client'
import { Stack, Typography } from '@mui/material'

import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import RoomsTable from '@/views/rooms/components/RoomsTable'

const RoomsPage = () => {
  const dictionary = useDictionary()
  const authUser = useAuthUser()

  if (!authUser?.hotel?.id) return <Loader center />

  return (
    <Stack gap={5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        gap={2}
      >
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='h4'>{dictionary.rooms}</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}></Stack>
      </Stack>
      <RoomsTable hotel={authUser?.hotel?.id} />
    </Stack>
  )
}

export default RoomsPage
