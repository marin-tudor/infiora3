// React imports
import React, { useState } from 'react'

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material'

interface CustomDialogProps {
  data: any
  onClose: () => void
  onContinue: (text: string) => void
}

const CustomDialog: React.FC<CustomDialogProps> = ({ data, onClose, onContinue }) => {
  const [text, setText] = useState('')

  return (
    <Dialog fullWidth open={true} maxWidth='sm' scroll='paper' onClose={onClose}>
      <DialogTitle>{data.title}</DialogTitle>
      <DialogContent>
        <Typography variant='subtitle1' gutterBottom>
          {data.message}
        </Typography>
        <TextField fullWidth variant='standard' margin='normal' value={text} onChange={e => setText(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onContinue(text)
          }}
          color='primary'
          variant='contained'
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CustomDialog
