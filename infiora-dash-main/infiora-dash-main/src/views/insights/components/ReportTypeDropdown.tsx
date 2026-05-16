import React, { Fragment, useState } from 'react'

import { ExpandMore, Insights } from '@mui/icons-material'
import { Button, Menu, MenuItem } from '@mui/material'

const ReportTypeDropdown = ({ type, setType }: any) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSelectChange = (option: string) => {
    setAnchorEl(null)
    setType(option)
  }

  return (
    <Fragment>
      <Button startIcon={<Insights />} endIcon={<ExpandMore />} variant='outlined' onClick={handleButtonClick}>
        {type}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
      >
        <MenuItem onClick={() => handleSelectChange('Rooms')}>Rooms</MenuItem>
        <MenuItem onClick={() => handleSelectChange('Buttons')}>Buttons</MenuItem>
      </Menu>
    </Fragment>
  )
}

export default ReportTypeDropdown
