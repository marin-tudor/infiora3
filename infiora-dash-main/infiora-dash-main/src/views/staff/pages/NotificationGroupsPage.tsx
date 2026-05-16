'use client'

import { useEffect, useState } from 'react'

import { useParams } from 'next/navigation'

import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { Add, ContentCopy, Delete, Edit, OpenInNew } from '@mui/icons-material'

import { toast } from 'react-toastify'

import FeatureLocked from '@/components/common/FeatureLocked'
import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  useCreateNotificationGroupMutation,
  useDeleteNotificationGroupMutation,
  useGetNotificationGroupsQuery,
  useUpdateNotificationGroupMutation
} from '@/redux/api/staffApi'
import type { INotificationGroup } from '@/types'
import FormFieldHelp from '@/views/staff/components/FormFieldHelp'

type GroupFormState = {
  name: string
  emailAddresses: string
  sseEnabled: boolean
}

const EMPTY_FORM: GroupFormState = {
  name: '',
  emailAddresses: '',
  sseEnabled: true
}

const parseEmails = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

export default function NotificationGroupsPage() {
  const params = useParams()
  const lang = (params['lang'] as string) || 'en'
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features

  const { data: groups, isLoading } = useGetNotificationGroupsQuery(hotelId!, { skip: !hotelId })
  const [createGroup, { isLoading: creating }] = useCreateNotificationGroupMutation()
  const [updateGroup, { isLoading: updating }] = useUpdateNotificationGroupMutation()
  const [deleteGroup, { isLoading: deleting }] = useDeleteNotificationGroupMutation()

  const [open, setOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<INotificationGroup | null>(null)
  const [form, setForm] = useState<GroupFormState>(EMPTY_FORM)

  useEffect(() => {
    if (!open) {
      setEditingGroup(null)
      setForm(EMPTY_FORM)
    }
  }, [open])

  if (!authUser) return <Loader center />
  if (!hotelId) return <Loader center />
  if (hotelFeatures?.staffRbacEnabled === false) return <FeatureLocked featureName='Staff RBAC' />
  if (hotelFeatures?.smartDispatchingEnabled === false) return <FeatureLocked featureName='Smart Dispatching' />
  if (isLoading) return <Loader center />

  const groupList = groups ?? []
  const busy = creating || updating || deleting
  const tabletBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/${lang}/tablet` : `/${lang}/tablet`

  const getTabletUrl = (groupId: string) => `${tabletBaseUrl}/${groupId}`

  const openCreate = () => {
    setEditingGroup(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (group: INotificationGroup) => {
    setEditingGroup(group)
    setForm({
      name: group.name,
      emailAddresses: (group.emailAddresses || []).join(', '),
      sseEnabled: group.sseEnabled
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Group name is required.')

      return
    }

    try {
      const body = {
        name: form.name.trim(),
        emailAddresses: parseEmails(form.emailAddresses),
        sseEnabled: form.sseEnabled
      }

      if (editingGroup) {
        await updateGroup({ hotelId, groupId: editingGroup.id, body }).unwrap()
        toast.success('Notification group updated.')
      } else {
        await createGroup({ hotelId, body }).unwrap()
        toast.success('Notification group created.')
      }

      setOpen(false)
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to save notification group.')
    }
  }

  const handleDelete = async (group: INotificationGroup) => {
    if (!window.confirm(`Delete ${group.name}?`)) {
      return
    }

    try {
      await deleteGroup({ hotelId, groupId: group.id }).unwrap()
      toast.success('Notification group deleted.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete notification group.')
    }
  }

  const handleCopyTabletUrl = async (groupId: string) => {
    try {
      await navigator.clipboard.writeText(getTabletUrl(groupId))
      toast.success('Tablet link copied.')
    } catch {
      toast.error('Failed to copy tablet link.')
    }
  }

  return (
    <Stack gap={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        gap={2}
      >
        <Typography variant='h4' fontWeight={700}>
          Notification Groups
        </Typography>
        <Button variant='contained' startIcon={<Add />} onClick={openCreate}>
          Add Group
        </Button>
      </Stack>

      <Alert severity='info'>
        Create one group for each tablet screen. After saving a group, copy its tablet page link and open it on the
        tablet device.
      </Alert>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email Addresses</TableCell>
                <TableCell>SSE</TableCell>
                <TableCell>Tablet Page</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 5, color: 'text.secondary' }}>
                    No notification groups yet.
                  </TableCell>
                </TableRow>
              ) : (
                groupList.map((group: INotificationGroup) => (
                  <TableRow key={group.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{group.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {(group.emailAddresses || []).length === 0 ? (
                          <Typography variant='body2' color='text.secondary'>
                            No emails
                          </Typography>
                        ) : (
                          (group.emailAddresses || []).map((email: string) => (
                            <Chip key={email} size='small' label={email} />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        color={group.sseEnabled ? 'success' : 'default'}
                        label={group.sseEnabled ? 'Enabled' : 'Disabled'}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 280 }}>
                      <TextField
                        value={getTabletUrl(group.id)}
                        size='small'
                        fullWidth
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton size='small' onClick={() => void handleCopyTabletUrl(group.id)}>
                                <ContentCopy fontSize='small' />
                              </IconButton>
                              <IconButton
                                size='small'
                                component='a'
                                href={getTabletUrl(group.id)}
                                target='_blank'
                                rel='noreferrer'
                              >
                                <OpenInNew fontSize='small' />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Button size='small' startIcon={<Edit />} onClick={() => openEdit(group)}>
                        Edit
                      </Button>
                      <Button size='small' color='error' startIcon={<Delete />} onClick={() => handleDelete(group)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{editingGroup ? 'Edit Notification Group' : 'Add Notification Group'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormFieldHelp
              label='Group Name'
              helpText='Use a clear operational name, for example Kitchen Tablet, Bar Tablet, or Concierge Desk.'
            />
            <TextField
              placeholder='Example: Kitchen Tablet'
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              size='small'
              fullWidth
            />
            <FormFieldHelp
              label='Email Addresses'
              helpText='Optional fallback emails for this group. Separate multiple addresses with commas.'
            />
            <TextField
              placeholder='Example: kitchen@hotel.com, chef@hotel.com'
              helperText='Separate addresses with commas'
              value={form.emailAddresses}
              onChange={e => setForm(prev => ({ ...prev, emailAddresses: e.target.value }))}
              size='small'
              fullWidth
            />
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <FormFieldHelp
                label='Enable SSE'
                helpText='Turn this on if this group should receive live tablet updates in real time.'
              />
              <Switch
                checked={form.sseEnabled}
                onChange={e => setForm(prev => ({ ...prev, sseEnabled: e.target.checked }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={busy}>
            {editingGroup ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
