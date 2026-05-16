'use client'
import { useParams, useRouter } from 'next/navigation'

import { Button, Stack, Typography } from '@mui/material'

import { Add } from '@mui/icons-material'

import { toast } from 'react-toastify'

import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useAuthUser } from '@/hooks/useAuthUser'
import GroupsTable from '@/views/groups/components/GroupsTable'
import { useCreateGroupMutation } from '@/redux/api/groupApi'

const GroupsPage = () => {
  const dictionary = useDictionary()
  const router = useRouter()
  const params = useParams()
  const { lang: locale } = params
  const authUser = useAuthUser()

  const [createGroup, { isLoading: createLoading }] = useCreateGroupMutation()

  if (!authUser?.hotel?.id) return <Loader center />

  const handleCreateGroup = async () => {
    try {
      const group = await createGroup({ hotel: authUser?.hotel?.id }).unwrap()

      router.push(`/${locale}/groups/${group.id}`)
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  return (
    <Stack gap={5}>
      {createLoading && <Loader center />}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        gap={2}
      >
        <Stack direction='row' alignItems='center' gap={1}>
          <Typography variant='h4'>{dictionary.groups}</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Button variant='outlined' startIcon={<Add />} onClick={handleCreateGroup}>
            {dictionary.addGroup}
          </Button>
        </Stack>
      </Stack>
      <GroupsTable hotel={authUser?.hotel?.id} />
    </Stack>
  )
}

export default GroupsPage
