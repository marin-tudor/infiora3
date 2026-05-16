import React from 'react'

import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

const Loader = ({ center }: any) => {
  if (center) {
    return (
      <Box position='absolute' top='45%' left='45%' zIndex={1}>
        <CircularProgress disableShrink color='inherit' size='50px' thickness={4} />
      </Box>
    )
  }

  return <CircularProgress disableShrink color='inherit' size='26px' thickness={4} />
}

export default Loader
