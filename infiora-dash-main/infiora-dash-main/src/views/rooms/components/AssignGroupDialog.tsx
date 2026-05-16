// React imports
import React, { useState } from 'react'

// MUI imports
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Typography
} from '@mui/material'

// Custom imports
import { Close } from '@mui/icons-material'

import { toast } from 'react-toastify'

import { LoadingButton } from '@mui/lab'

import { useGetLinksQuery } from '@/redux/api/linkApi'
import { reorderItems } from '@/utils/arrayUtils'
import type { IGroup, ILink, IRoom } from '@/types'
import { useGetGroupsQuery } from '@/redux/api/groupApi'
import { useUpdateRoomMutation } from '@/redux/api/roomApi'
import RoomPreview from '@/views/shared/RoomPreview'
import { useDictionary } from '@/contexts/DictionaryContext'

interface AssignGroupDialogProps {
  room: IRoom
  onClose: any
}

const AssignGroupDialog: React.FC<AssignGroupDialogProps> = ({ room, onClose }) => {
  const dictionary = useDictionary()
  const [group, setGroup] = useState<IGroup | null>(null)

  const { data: groupsData, isLoading } = useGetGroupsQuery({ hotel: room.hotel.id, limit: 100 })

  const { data: linksData } = useGetLinksQuery({
    room: room?.id,
    group: group?.id,
    limit: 100
  })

  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation()

  const handleClose = () => {
    onClose()
  }

  const handleAssignGroup = async () => {
    try {
      await updateRoom({ id: room.id, room: { group: group?.id || null } }).unwrap()
      onClose()
    } catch (error: any) {
      toast.error(error.data?.message || error.message)
    }
  }

  return (
    <Dialog fullWidth open={true} maxWidth='md' scroll='paper' onClose={handleClose}>
      <DialogContent>
        <IconButton sx={{ position: 'absolute', top: 0, right: 0, padding: 5 }} onClick={handleClose}>
          <Close />
        </IconButton>
        <Stack gap={2}>
          <Typography variant='h5'>{dictionary.chooseGroup}</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={5}>
            <Stack gap={2} flex={1}>
              <Card onClick={() => setGroup(null)} sx={{ borderColor: group === null ? 'green' : '' }}>
                <CardContent>
                  <Stack direction='row' alignItems='center' gap={2}>
                    <Close />
                    <Typography>{dictionary.noGroup}</Typography>
                  </Stack>
                </CardContent>
              </Card>
              {groupsData?.results.map((t: IGroup) => {
                return (
                  <Card key={t.id} onClick={() => setGroup(t)} sx={{ borderColor: group?.id === t.id ? 'green' : '' }}>
                    <CardContent>
                      <Stack direction='row' alignItems='center' gap={2}>
                        <Typography>{t.title}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
            <Divider orientation='vertical' flexItem />
            <Stack flex={1}>
              <RoomPreview
                room={{ ...room, ...group }}
                links={reorderItems(linksData?.results?.filter((l: ILink) => (group == null ? !l.group : true)))}
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' onClick={handleClose}>
          {dictionary.cancel}
        </Button>
        <LoadingButton
          loading={isUpdating}
          variant='contained'
          autoFocus
          disabled={isLoading || isUpdating}
          onClick={handleAssignGroup}
        >
          {dictionary.assignToRoom}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}

export default AssignGroupDialog
