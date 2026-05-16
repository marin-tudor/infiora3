// React Imports
import type { MouseEvent } from 'react'
import { useRef, useState } from 'react'

// MUI Imports
import { Popper, Fade, Button, Paper, ClickAwayListener, MenuList, MenuItem, Typography } from '@mui/material'
import { Delete, SwitchAccountOutlined } from '@mui/icons-material'

// Custom imports
import { useSettings } from '@core/hooks/useSettings'
import { useDictionary } from '@/contexts/DictionaryContext'

interface GroupOptionsDropdownProps {
  handleClick: (id: string) => void
}

const GroupOptionsDropdown = ({ handleClick }: GroupOptionsDropdownProps) => {
  const dictionary = useDictionary()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { settings } = useSettings()

  const handleDropdownToggle = () => setOpen(prevOpen => !prevOpen)

  const handleMenuItemClick = (event: MouseEvent<HTMLElement>) => {
    const id = (event.currentTarget as HTMLElement).dataset.id

    if (id) {
      handleClick(id)
    }

    setOpen(false)
  }

  const menuItems = [
    { id: '1', icon: <SwitchAccountOutlined />, label: dictionary.duplicateGroup },
    { id: '2', icon: <SwitchAccountOutlined />, label: dictionary.duplicateGroupToHotel },
    { id: '3', icon: <Delete sx={{ color: 'red' }} />, label: dictionary.deleteGroup, color: 'red' }
  ]

  return (
    <>
      <Button
        ref={anchorRef}
        variant='outlined'
        onClick={handleDropdownToggle}
        aria-haspopup='true'
        aria-expanded={open ? 'true' : undefined}
      >
        ...
      </Button>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-4 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper
              elevation={settings.skin === 'bordered' ? 0 : 8}
              className={settings.skin === 'bordered' ? 'border' : ''}
            >
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <MenuList>
                  {menuItems.map(item => (
                    <MenuItem
                      key={item.id}
                      className='gap-3 pli-4'
                      data-id={item.id}
                      onClick={handleMenuItemClick}
                      color={item.color}
                    >
                      {item.icon}
                      <Typography color={item.color}>{item.label}</Typography>
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

export default GroupOptionsDropdown
