'use client'

import { useMemo, useState } from 'react'

import {
  Alert,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { ContentCopy, OpenInNew, PhonelinkSetup } from '@mui/icons-material'
import { toast } from 'react-toastify'

import { useGenerateDeviceTokenMutation } from '@/redux/api/hotelApi'
import { useGetNotificationGroupsQuery } from '@/redux/api/staffApi'
import type { INotificationGroup } from '@/types'

type Props = {
  hotelId: string
  lang: string
}

export default function TabletSetupPanel({ hotelId, lang }: Props) {
  const { data: groups } = useGetNotificationGroupsQuery(hotelId, { skip: !hotelId })
  const [generateDeviceToken, { isLoading }] = useGenerateDeviceTokenMutation()
  const [token, setToken] = useState('')

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/${lang}/tablet`
    }

    return `${window.location.origin}/${lang}/tablet`
  }, [lang])

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
        1. Generate a device token. 2. Open the tablet page for a notification group. 3. Save the token into the tablet browser.
      </Alert>

      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} gap={2}>
              <div>
                <Typography variant='h5' fontWeight={700}>
                  Device Token
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  This token proves the tablet device is allowed to connect to this hotel.
                </Typography>
              </div>
              <Button variant='contained' startIcon={<PhonelinkSetup />} onClick={() => void handleGenerateToken()} disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Device Token'}
              </Button>
            </Stack>

            <TextField
              label='Current Device Token'
              value={token}
              placeholder='Generate a token first'
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: token ? (
                  <InputAdornment position='end'>
                    <IconButton size='small' onClick={() => void handleCopy(token, 'Device token copied.')}>
                      <ContentCopy fontSize='small' />
                    </IconButton>
                  </InputAdornment>
                ) : undefined
              }}
            />

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

                    return (
                      <TableRow key={group.id}>
                        <TableCell>{group.name}</TableCell>
                        <TableCell sx={{ minWidth: 320 }}>
                          <TextField value={tabletUrl} size='small' fullWidth InputProps={{ readOnly: true }} />
                        </TableCell>
                        <TableCell align='right'>
                          <Stack direction='row' justifyContent='flex-end'>
                            <IconButton size='small' onClick={() => void handleCopy(tabletUrl, 'Tablet page link copied.')}>
                              <ContentCopy fontSize='small' />
                            </IconButton>
                            <IconButton size='small' component='a' href={tabletUrl} target='_blank' rel='noreferrer'>
                              <OpenInNew fontSize='small' />
                            </IconButton>
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
    </Stack>
  )
}
