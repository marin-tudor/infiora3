// React imports
import React from 'react'

// MUI imports
import { Dialog, DialogContent, Divider, IconButton, Stack, Typography } from '@mui/material'

// Custom imports
import { Close, CopyAllOutlined } from '@mui/icons-material'
import { QRCode } from 'react-qrcode-logo'

import type { ILink } from '@/types'
import { useDictionary } from '@/contexts/DictionaryContext'
import { copyToClipboard } from '@/utils/miscUtils'

interface WifiDialogProps {
  link?: ILink
  onClose: any
}

const WifiDialog: React.FC<WifiDialogProps> = ({ link, onClose }) => {
  const dictionary = useDictionary()

  const url = `WIFI:T:WPA;S:${link?.data?.ssid};P:${link?.data?.password};;`

  return (
    <Dialog fullWidth open={true} maxWidth='sm' scroll='paper' onClose={onClose}>
      <DialogContent>
        <IconButton sx={{ position: 'absolute', top: 0, right: 0, padding: 5 }} onClick={onClose}>
          <Close />
        </IconButton>
        <Stack gap={2} mt={5}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems='center'>
            <Stack>
              <Typography variant='h5'>{dictionary.dialogs.wifi.title}</Typography>
              <Typography variant='body1'>{dictionary.dialogs.wifi.message}</Typography>
            </Stack>
            <QRCode value={url} size={150} qrStyle='squares' eyeRadius={5} ecLevel='H' />
          </Stack>
          <Divider />
          <Stack flex={1}>
            <Stack direction='row' alignItems='center'>
              <Typography variant='caption'>{dictionary.ssid}</Typography>
              <CopyAllOutlined fontSize='small' onClick={() => copyToClipboard(link?.data?.ssid ?? '')} />
            </Stack>
            <Typography variant='body1'>{link?.data?.ssid ?? ''}</Typography>
          </Stack>
          <Stack flex={1}>
            <Stack direction='row' alignItems='center'>
              <Typography variant='caption'>{dictionary.password}</Typography>
              <CopyAllOutlined fontSize='small' onClick={() => copyToClipboard(link?.data?.password ?? '')} />
            </Stack>
            <Typography variant='body1'>{link?.data?.password ?? ''}</Typography>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default WifiDialog
