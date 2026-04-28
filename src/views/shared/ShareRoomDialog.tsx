// React imports
import React from 'react'

// MUI imports
import { Button, Card, Dialog, DialogContent, Divider, IconButton, Stack, Typography } from '@mui/material'
import { Close, ContentCopy } from '@mui/icons-material'

// Other imports
import { QRCode } from 'react-qrcode-logo'
import { toast } from 'react-toastify'

import { useDictionary } from '@/contexts/DictionaryContext'

interface ShareRoomDialogProps {
  url?: string
  onClose: any
}

const ShareRoomDialog: React.FC<ShareRoomDialogProps> = ({ url, onClose }) => {
  const dictionary = useDictionary()

  const handleCopy = () => {
    if (url) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast.success(dictionary.messages.urlCopied)
        })
        .catch(err => {
          console.error('Failed to copy: ', err)
        })
    }
  }

  return (
    <Dialog fullWidth open={true} maxWidth='sm' scroll='paper' onClose={onClose}>
      <DialogContent>
        <IconButton sx={{ position: 'absolute', top: 0, right: 0, padding: 5 }} onClick={onClose}>
          <Close />
        </IconButton>
        <Stack gap={2} mt={5}>
          <Stack direction='row' alignItems='center'>
            <Stack>
              <Typography variant='h5'>{dictionary.dialogs.shareRoom.title}</Typography>
              <Typography variant='body1'>{dictionary.dialogs.shareRoom.message}</Typography>
            </Stack>
            <QRCode value={url} size={150} qrStyle='squares' eyeRadius={5} ecLevel='H' />
          </Stack>
          <Divider />
          <Typography variant='h5'>{dictionary.copyRoomLink}</Typography>
          <Stack direction='row' alignItems='center' gap={2}>
            <Typography variant='body1' component={Card} sx={{ paddingY: 2, paddingX: 4, width: '100%' }}>
              {url}
            </Typography>
            <Button startIcon={<ContentCopy />} sx={{ width: 150 }} onClick={handleCopy}>
              {dictionary.copyLink}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default ShareRoomDialog
