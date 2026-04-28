'use client'
import React from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Stack,
  Chip
} from '@mui/material'
import { useSession } from 'next-auth/react'

import { useAuthUser } from '@/hooks/useAuthUser'
import Loader from '@/components/common/Loader'
import { useGetHotelsQuery } from '@/redux/api/hotelApi'
import type { IHotel } from '@/types'
import { useDictionary } from '@/contexts/DictionaryContext'

interface HotelListDialogProps {
  open: boolean
  handleSelect: (hotel: IHotel) => void
}

const HotelListDialog: React.FC<HotelListDialogProps> = ({ open, handleSelect }) => {
  const dictionary = useDictionary()
  const authUser = useAuthUser()
  const { status } = useSession()

  const { data, isLoading } = useGetHotelsQuery({ user: authUser?.id, limit: 100 }, { skip: !authUser?.id })

  // Don't show dialog if session is still loading
  if (status === 'loading') {
    return null
  }

  // Don't show dialog if user is not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  // Don't show dialog if not explicitly opened and user already has a hotel
  if (!open && authUser?.hotel) {
    return null
  }

  // Show dialog if explicitly opened OR user has no hotel selected
  const shouldShowDialog = open || (authUser && !authUser.hotel)

  return (
    <Dialog open={shouldShowDialog} fullWidth maxWidth='xs'>
      <DialogTitle>
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography variant='h5'>{dictionary.selectHotel}</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {isLoading ? (
            <Loader />
          ) : (
            <List
              sx={{
                maxHeight: 200,
                overflowY: 'auto',
                '& .MuiListItemButton-root': { mb: 1 }
              }}
            >
              {data?.results.length ? (
                data.results.map((s: IHotel) => (
                  <ListItemButton
                    key={s.id}
                    selected={authUser?.hotel?.id === s.id}
                    disabled={!s.isActive}
                    onClick={() => handleSelect(s)}
                    sx={{
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <ListItemText primary={<Typography>{s.name}</Typography>} />
                    <Chip
                      label={s.isActive ? dictionary.active : dictionary.inactive}
                      size='small'
                      color={s.isActive ? 'success' : 'default'}
                    />
                  </ListItemButton>
                ))
              ) : (
                <Typography align='center' sx={{ mt: 2 }}>
                  {dictionary.noHotelsFound}
                </Typography>
              )}
            </List>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default HotelListDialog
