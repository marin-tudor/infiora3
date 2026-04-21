import React from 'react'

import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

const Loader = ({ center }: any) => {
  if (center) {
    return (
      <Box position='absolute' top='50%' left='50%'>
        <CircularProgress disableShrink color='inherit' size='26px' thickness={4} />
      </Box>
    )
  }

  return <CircularProgress disableShrink color='inherit' size='26px' thickness={4} />
}

export default Loader
