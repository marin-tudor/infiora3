'use client'

// React Imports
import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

// MUI Imports
import { ExpandMore } from '@mui/icons-material'
import {
  Button,
  Card,
  ClickAwayListener,
  Fade,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Stack,
  Typography
} from '@mui/material'

// Custom Imports

import { useSettings } from '@core/hooks/useSettings'
import type { IRoom } from '@/types'

const RoomsDropdown = ({
  rooms,
  selectedRoom,
  setSelectedRoom
}: {
  rooms: IRoom[]
  selectedRoom?: IRoom
  setSelectedRoom: any
}) => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { settings } = useSettings()

  const toggleDropdown = () => setOpen(prev => !prev)

  const handleDropdownClose = (event: MouseEvent | TouchEvent) => {
    if (anchorRef.current?.contains(event?.target as HTMLElement)) return
    setOpen(false)
  }

  return (
    <>
      <Button ref={anchorRef} variant='outlined' onClick={toggleDropdown} endIcon={<ExpandMore />}>
        <Typography maxWidth={100} noWrap>
          {selectedRoom ? `Room ${selectedRoom?.number}` : 'All Rooms'}
        </Typography>
      </Button>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4'
        style={{ zIndex: 2 }}
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper
              elevation={settings.skin === 'bordered' ? 0 : 8}
              {...(settings.skin === 'bordered' && { className: 'border' })}
            >
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList
                  sx={{
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                >
                  {rooms.map((room: IRoom) => (
                    <MenuItem
                      key={room.id}
                      className='gap-3 pli-4'
                      sx={{
                        '&:hover': {
                          backgroundColor: 'transparent'
                        }
                      }}
                    >
                      <Card sx={{ width: '100%' }}>
                        <Stack direction='row' alignItems='center' className='p-2 gap-2' sx={{ height: 60 }}>
                          <Typography
                            color='text.primary'
                            maxWidth={150}
                            flex={1}
                            noWrap
                            onClick={() => {
                              setSelectedRoom(room)
                              setOpen(false)
                            }}
                          >
                            {`Room ${room.number}`}
                          </Typography>
                        </Stack>
                      </Card>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default RoomsDropdown
