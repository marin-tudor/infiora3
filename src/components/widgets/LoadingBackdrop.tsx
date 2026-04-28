import React from 'react'

import { Backdrop, CircularProgress, Typography } from '@mui/material'

interface LoadingBackdropProps {
  open: boolean
  message?: string
  spinnerSize?: number
}

const LoadingBackdrop: React.FC<LoadingBackdropProps> = ({ open, message, spinnerSize = 60 }) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: theme => theme.zIndex.drawer + 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={spinnerSize} />
      {message && <Typography variant="h6">{message}</Typography>}
    </Backdrop>
  )
}

export default LoadingBackdrop
