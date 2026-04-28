// React imports
import React from 'react'

// MUI imports
import { Button, Divider, Stack, Typography } from '@mui/material'
import { Add } from '@mui/icons-material'

// Third-party imports
import { toast } from 'react-toastify'

// Custom imports
import type { ILink, IRoom, IGroup } from '@/types'
import RoomPreview from '@/views/shared/RoomPreview'
import useDialog from '@/@core/hooks/useDialog'
import { useReorderLinksMutation } from '@/redux/api/linkApi'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import LinksList from './LinksList'
import LinkDialog from './LinkDialog'
import { useUpdateRoomMutation } from '@/redux/api/roomApi'

interface LinksTabProps {
  room?: IRoom
  group?: IGroup
  links: ILink[]
}

const LinksTab: React.FC<LinksTabProps> = ({ room, group, links }) => {
  const dictionary = useDictionary()
  const linkDialog = useDialog<ILink>()

  const [reorderLinks, { isLoading }] = useReorderLinksMutation()
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation()

  const id = room?.id || group?.id

  const hotelId =
    (room?.hotel as any)?.id ||
    (room?.hotel as any)?._id ||
    (typeof room?.hotel === 'string' ? room.hotel : undefined) ||
    (group?.hotel as any)?.id ||
    (group?.hotel as any)?._id ||
    (typeof group?.hotel === 'string' ? group.hotel : undefined)

  const { data: hotelData } = useGetHotelQuery(hotelId, { skip: !hotelId })

  const previewTarget = {
    ...(room || group),
    hotel: hotelData || (room || group)?.hotel
  }

  const handleLinkClick = (link: ILink) => {
    linkDialog.open({ data: link })
  }

  const handleReorderLinks = async (orderedLinks: string[]) => {
    try {
      if (room) {
        await updateRoom({ id, room: { orderedLinks } }).unwrap()
      } else {
        await reorderLinks({ id, body: { orderedLinks } }).unwrap()
      }
    } catch (error: any) {
      toast.error(error.data?.message || error.message)
    }
  }

  const handleAddLinkClick = () => {
    linkDialog.open()
  }

  return (
    <>
      {(isLoading || isUpdating) && <Loader center />}
      <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
        <Stack gap={0} flex={1} height={{ md: 550 }} sx={{ position: 'relative' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent='space-between'
            alignItems={{ sm: 'center' }}
            gap={2}
          >
            <Typography variant='h5'>{dictionary.links}</Typography>
            <Button variant='contained' onClick={handleAddLinkClick} startIcon={<Add />}>
              {dictionary.addLink}
            </Button>
          </Stack>
          <Stack
            sx={{
              overflowY: { md: 'auto' },
              scrollbarWidth: 'none',
              mt: 2,
              pb: 20,
              maxHeight: { md: 520 }
            }}
          >
            <LinksList
              isGroup={!!group}
              links={links}
              handleClick={handleLinkClick}
              handleReorderLinks={handleReorderLinks}
            />
          </Stack>
        </Stack>
        <Divider orientation='vertical' flexItem />
        <RoomPreview room={previewTarget} links={links} />
      </Stack>
      {linkDialog.isOpen && (
        <LinkDialog link={linkDialog.content?.data} room={room?.id} group={group?.id} onClose={linkDialog.close} />
      )}
    </>
  )
}

export default LinksTab
