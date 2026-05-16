// React imports
import React from 'react';

// MUI imports
import {
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

// Custom imports
import { Close, CopyAllOutlined } from '@mui/icons-material';
import { QRCode } from 'react-qrcode-logo';

import type { ILink } from '@/types';
import { copyToClipboard } from '@/utils/miscUtils';

interface WifiDialogProps {
  link?: ILink;
  onClose: any;
}

const WifiDialog: React.FC<WifiDialogProps> = ({ link, onClose }) => {
  const url = `WIFI:T:WPA;S:${link?.data?.ssid};P:${link?.data?.password};;`;

  return (
    <Dialog
      fullWidth
      open={true}
      maxWidth="sm"
      scroll="paper"
      onClose={onClose}
    >
      <DialogContent>
        <IconButton
          sx={{ position: 'absolute', top: 0, right: 0, margin: 1 }}
          onClick={onClose}
        >
          <Close />
        </IconButton>
        <Stack gap={2} mt={5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems="center"
          >
            <Stack>
              <Typography variant="h5">Connect to Wi-Fi</Typography>
              <Typography variant="body1">
                Easily connect to Wi-Fi by scanning the QR code with
                your phone or copying the details manually.
              </Typography>
            </Stack>
            <QRCode
              value={url}
              size={150}
              qrStyle="squares"
              eyeRadius={5}
              ecLevel="H"
            />
          </Stack>
          <Divider />
          <Stack flex={1}>
            <Stack direction="row" alignItems="center">
              <Typography variant="caption">SSID</Typography>
              <CopyAllOutlined
                fontSize="small"
                onClick={() =>
                  copyToClipboard(link?.data?.ssid ?? '')
                }
              />
            </Stack>
            <Typography variant="body1">
              {link?.data?.ssid ?? ''}
            </Typography>
          </Stack>
          <Stack flex={1}>
            <Stack direction="row" alignItems="center">
              <Typography variant="caption">Password</Typography>
              <CopyAllOutlined
                fontSize="small"
                onClick={() =>
                  copyToClipboard(link?.data?.password ?? '')
                }
              />
            </Stack>
            <Typography variant="body1">
              {link?.data?.password ?? ''}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default WifiDialog;
