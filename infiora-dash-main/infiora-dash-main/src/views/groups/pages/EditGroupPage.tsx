// React imports
import React from 'react'

// Next.js imports
import { useRouter } from 'next/navigation'

// MUI imports
import { Divider, IconButton, Stack, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

// Other imports
import { toast } from 'react-toastify'

// Custom imports
import type { IGroup, IHotel } from '@/types'
import Loader from '@/components/common/Loader'
import GroupOptionsDropdown from '../components/GroupOptionsDropdown'
import EditGroupTabs from '../components/EditGroupTabs'
import { reorderItems } from '@/utils/arrayUtils'
import { useDeleteGroupMutation, useDuplicateGroupMutation } from '@/redux/api/groupApi'
import { useGetLinksQuery } from '@/redux/api/linkApi'
import { useAuthUser } from '@/hooks/useAuthUser'
import HotelListDialog from '@/views/hotels/components/HotelListDialog'
import useDialog from '@/@core/hooks/useDialog'
import { useDictionary } from '@/contexts/DictionaryContext'

interface EditGroupPageProps {
  group: IGroup
}

const EditGroupPage: React.FC<EditGroupPageProps> = ({ group }) => {
  const router = useRouter()
  const dictionary = useDictionary()
  const authUser = useAuthUser()
  const hotelsDialog = useDialog()

  const { data: linksData } = useGetLinksQuery({ group: group?.id, limit: 100 })

  const [duplicateGroup, { isLoading: isDuplicating }] = useDuplicateGroupMutation()
  const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation()

  const handleClick = (id: string) => {
    switch (id) {
      case '1':
        handleDuplicateGroup(authUser.hotel!.id)
        break
      case '2':
        handleDuplicateGroupToHotel()
        break
      case '3':
        handleDeleteGroup()
        break
      default:
        break
    }
  }

  const handleDuplicateGroup = async (hotel: string) => {
    try {
      hotelsDialog.close()
      await duplicateGroup({ id: group.id, hotel }).unwrap()

      toast.success(dictionary.messages.duplicateGroupSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  const handleDuplicateGroupToHotel = async () => {
    hotelsDialog.open()
  }

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(group.id).unwrap()

      router.back()
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  return (
    <>
      <Stack gap={5}>
        {(isDuplicating || isDeleting) && <Loader center />}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ sm: 'center' }}
          gap={2}
        >
          <Stack direction='row' alignItems='center'>
            <IconButton onClick={() => router.back()}>
              <ChevronLeftIcon style={{ fontSize: 30 }} />
            </IconButton>
            <Divider orientation='vertical' flexItem sx={{ height: '25px', my: 'auto', mr: '15px' }} />
            <Stack direction='row' alignItems='center' gap={1}>
              <Typography variant='h5' component='h1' maxWidth={150} noWrap>
                {group?.title}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
            <GroupOptionsDropdown handleClick={handleClick} />
          </Stack>
        </Stack>
        <EditGroupTabs group={group} links={reorderItems(linksData?.results)} />
      </Stack>
      <HotelListDialog
        open={hotelsDialog.isOpen}
        handleSelect={(hotel: IHotel) => {
          handleDuplicateGroup(hotel.id)
        }}
      />
    </>
  )
}

export default EditGroupPage
