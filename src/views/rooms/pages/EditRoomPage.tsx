// React imports
import React from 'react'

// Next.js imports
import { useParams, useRouter } from 'next/navigation'

// MUI imports
import { Button, Divider, IconButton, Stack, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import SendIcon from '@mui/icons-material/Send'

// Other imports
import { toast } from 'react-toastify'

// Custom imports
import type { IRoom } from '@/types'
import { useDictionary } from '@/contexts/DictionaryContext'
import useDialog from '@/@core/hooks/useDialog'
import Loader from '@/components/common/Loader'
import RoomOptionsDropdown from '../components/RoomOptionsDropdown'
import EditRoomTabs from '../components/EditRoomTabs'
import { reorderLinks } from '@/utils/arrayUtils'
import ShareRoomDialog from '@/views/shared/ShareRoomDialog'
import { useDeleteRoomMutation, useDuplicateRoomMutation } from '@/redux/api/roomApi'
import { useGetLinksQuery } from '@/redux/api/linkApi'

interface EditRoomPageProps {
  room: IRoom
}

const EditRoomPage: React.FC<EditRoomPageProps> = ({ room }) => {
  const dictionary = useDictionary()
  const params = useParams()
  const { lang: locale } = params
  const router = useRouter()
  const roomLink = `${process.env.NEXT_PUBLIC_APP_URL}/${room.id}`
  const shareRoomDialog = useDialog<string>()

  const { data: linksData } = useGetLinksQuery({ room: room?.id, group: room?.group?.id, limit: 100 })

  const [duplicateRoom, { isLoading: isDuplicating }] = useDuplicateRoomMutation()
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation()

  const handleClick = (id: string) => {
    switch (id) {
      case '1':
        window?.open(roomLink, '_blank')
        break
      case '2':
        shareRoomDialog.open()
        break
      case '3':
        handleDuplicateRoom()
        break
      case '4':
        handleDeleteRoom()
        break
      default:
        break
    }
  }

  const handleDuplicateRoom = async () => {
    try {
      const data = await duplicateRoom(room.id).unwrap()

      router.push(`/${locale}/rooms/${data.id}`)
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  const handleDeleteRoom = async () => {
    try {
      await deleteRoom(room.id).unwrap()

      router.back()
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  return (
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
              Room #{room?.number}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Button
            variant='contained'
            endIcon={<SendIcon />}
            onClick={() => {
              shareRoomDialog.open()
            }}
          >
            {dictionary.shareRoom}
          </Button>
          <RoomOptionsDropdown handleClick={handleClick} />
        </Stack>
      </Stack>
      <EditRoomTabs room={room} links={reorderLinks(room, linksData?.results)} />
      {shareRoomDialog.isOpen && <ShareRoomDialog url={roomLink} onClose={shareRoomDialog.close} />}
    </Stack>
  )
}

export default EditRoomPage
