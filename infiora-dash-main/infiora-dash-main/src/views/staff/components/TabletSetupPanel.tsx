'use client'

import { useMemo, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { Close, ContentCopy, Download, OpenInNew, PhonelinkSetup } from '@mui/icons-material'
import { QRCode } from 'react-qrcode-logo'
import { toast } from 'react-toastify'

import { useGenerateDeviceTokenMutation } from '@/redux/api/hotelApi'
import { useGetNotificationGroupsQuery } from '@/redux/api/staffApi'
import type { INotificationGroup } from '@/types'

type Props = {
  hotelId: string
  lang: string
}

type TabletSetupConfig = {
  version: 1
  hotelId: string
  groupId: string
  groupName: string
  deviceToken: string
  createdAt: string
}

export default function TabletSetupPanel({ hotelId, lang }: Props) {
  const { data: groups } = useGetNotificationGroupsQuery(hotelId, { skip: !hotelId })
  const [generateDeviceToken, { isLoading }] = useGenerateDeviceTokenMutation()
  const [token, setToken] = useState('')
  const [fullscreenQr, setFullscreenQr] = useState<string | null>(null)

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/${lang}/tablet`
    }

    return `${window.location.origin}/${lang}/tablet`
  }, [lang])

  const buildSetupConfig = (group: INotificationGroup): TabletSetupConfig => ({
    version: 1,
    hotelId,
    groupId: group.id,
    groupName: group.name,
    deviceToken: token,
    createdAt: new Date().toISOString()
  })

  const getInstallParams = (group: INotificationGroup) => {
    const params = new URLSearchParams()

    params.set('token', token)
    params.set('group', group.name)

    return params.toString()
  }

  const getInstallUrl = (group: INotificationGroup) =>
    `${baseUrl}/${group.id}?${getInstallParams(group)}`

  const downloadSetupFile = (group: INotificationGroup) => {
    if (!token) {
      toast.error('Generate a device token first.')

      return
    }

    const config = buildSetupConfig(group)
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = objectUrl
    anchor.download = `infiora-tablet-${group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'group'}.json`
    anchor.click()
    window.URL.revokeObjectURL(objectUrl)
    toast.success('Tablet setup file downloaded.')
  }

  const handleGenerateToken = async () => {
    try {
      const response = await generateDeviceToken(hotelId).unwrap()

      setToken(response.token)
      toast.success('Device token generated.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to generate device token.')
    }
  }

  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error('Failed to copy.')
    }
  }

  const handleSaveToBrowser = () => {
    if (!token) {
      toast.error('Generate a device token first.')

      return
    }

    window.localStorage.setItem('deviceToken', token)
    toast.success('Device token saved to this browser.')
  }

  return (
    <Stack gap={3}>
      <Alert severity='info'>
        1. Generate a device token. 2. For each tablet, open the install link or send the setup file to that device. 3.
        The tablet will save the token automatically and open the correct queue.
      </Alert>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent='space-between'
              alignItems={{ sm: 'center' }}
              gap={2}
            >
              <div>
                <Typography variant='h5' fontWeight={700}>
                  Device Token
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  This token proves the tablet device is allowed to connect to this hotel. Hotels only need to generate
                  it once, then use the install link or setup file below.
                </Typography>
              </div>
              <Button
                variant='contained'
                startIcon={<PhonelinkSetup />}
                onClick={() => void handleGenerateToken()}
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Device Token'}
              </Button>
            </Stack>

            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.5 }}>
                Current Device Token
              </Typography>
              <TextField
                value={token}
                placeholder='Generate a token first'
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                InputProps={{
                  readOnly: true,
                  sx: {
                    alignItems: 'flex-start',
                    '& textarea': {
                      fontFamily: 'monospace',
                      fontSize: '0.825rem',
                      overflowWrap: 'anywhere'
                    }
                  },
                  endAdornment: token ? (
                    <InputAdornment position='end'>
                      <IconButton size='small' onClick={() => void handleCopy(token, 'Device token copied.')}>
                        <ContentCopy fontSize='small' />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Button variant='outlined' onClick={handleSaveToBrowser} disabled={!token}>
                Save Token To This Browser
              </Button>
              {token && (
                <Button
                  variant='outlined'
                  onClick={() =>
                    void handleCopy(
                      `localStorage.setItem('deviceToken', '${token}'); location.reload();`,
                      'Browser setup command copied.'
                    )
                  }
                >
                  Copy Browser Setup Command
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <div>
              <Typography variant='h5' fontWeight={700}>
                Tablet Pages
              </Typography>
                <Typography variant='body2' color='text.secondary'>
                Open one page per notification group. Staff on that tablet will only see orders routed to that group.
                The install link auto-configures the device token for that queue.
              </Typography>
            </div>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Notification Group</TableCell>
                  <TableCell>Tablet URL</TableCell>
                  <TableCell align='right'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(groups ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align='center' sx={{ color: 'text.secondary', py: 4 }}>
                      Create a notification group first.
                    </TableCell>
                  </TableRow>
                ) : (
                  (groups ?? []).map((group: INotificationGroup) => {
                    const tabletUrl = `${baseUrl}/${group.id}`
                    const installUrl = token ? getInstallUrl(group) : ''

                    return (
                      <TableRow key={group.id}>
                        <TableCell>{group.name}</TableCell>
                        <TableCell sx={{ minWidth: 320 }}>
                          <Stack gap={1.5}>
                            <Stack gap={0.5}>
                              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.25 }}>
                                Tablet page
                              </Typography>
                              <TextField
                                value={tabletUrl}
                                size='small'
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={3}
                                InputProps={{
                                  readOnly: true,
                                  sx: {
                                    alignItems: 'flex-start',
                                    '& textarea': {
                                      fontFamily: 'monospace',
                                      fontSize: '0.8rem',
                                      overflowWrap: 'anywhere'
                                    }
                                  }
                                }}
                              />
                            </Stack>
                            <Stack gap={0.5}>
                              <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ pl: 0.25 }}>
                                Install link
                              </Typography>
                              <TextField
                                value={installUrl}
                                size='small'
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={4}
                                disabled={!token}
                                placeholder='Generate device token first'
                                InputProps={{
                                  readOnly: true,
                                  sx: {
                                    alignItems: 'flex-start',
                                    '& textarea': {
                                      fontFamily: 'monospace',
                                      fontSize: '0.8rem',
                                      overflowWrap: 'anywhere'
                                    }
                                  }
                                }}
                              />
                            </Stack>
                            {token && (
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                gap={2}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  border: theme => `1px solid ${theme.palette.divider}`,
                                  backgroundColor: 'background.default'
                                }}
                              >
                                <Tooltip title='Click to enlarge'>
                                  <Box
                                    onClick={() => setFullscreenQr(installUrl)}
                                    sx={{ cursor: 'pointer', display: 'inline-flex', '&:hover': { opacity: 0.8 } }}
                                  >
                                    <QRCode
                                      value={installUrl}
                                      size={160}
                                      quietZone={10}
                                      qrStyle='squares'
                                      eyeRadius={5}
                                      ecLevel='H'
                                    />
                                  </Box>
                                </Tooltip>
                                <Stack gap={0.5}>
                                  <Typography variant='subtitle2' fontWeight={700}>
                                    Scan on the tablet
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    The QR code opens the install link, saves the device token, and opens this tablet
                                    queue automatically.
                                  </Typography>
                                </Stack>
                              </Stack>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Stack direction='row' justifyContent='flex-end' flexWrap='wrap'>
                            <IconButton
                              size='small'
                              onClick={() => void handleCopy(tabletUrl, 'Tablet page link copied.')}
                            >
                              <ContentCopy fontSize='small' />
                            </IconButton>
                            <IconButton size='small' component='a' href={tabletUrl} target='_blank' rel='noreferrer'>
                              <OpenInNew fontSize='small' />
                            </IconButton>
                            <Button
                              size='small'
                              variant='outlined'
                              onClick={() => void handleCopy(installUrl, 'Install link copied.')}
                              disabled={!token}
                            >
                              Copy Install Link
                            </Button>
                            <Button
                              size='small'
                              variant='contained'
                              component='a'
                              href={installUrl || undefined}
                              target='_blank'
                              rel='noreferrer'
                              disabled={!token}
                            >
                              Open Install
                            </Button>
                            <Button
                              size='small'
                              variant='text'
                              startIcon={<Download />}
                              onClick={() => downloadSetupFile(group)}
                              disabled={!token}
                            >
                              Setup File
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={!!fullscreenQr} onClose={() => setFullscreenQr(null)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          QR Code — Install Link
          <IconButton
            onClick={() => setFullscreenQr(null)}
            size='small'
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', pb: 4 }}>
          {fullscreenQr && (
            <QRCode
              value={fullscreenQr}
              size={320}
              quietZone={20}
              qrStyle='squares'
              eyeRadius={6}
              ecLevel='H'
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  )
}
