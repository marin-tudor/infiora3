'use client'

import { useEffect, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
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
import { Add, Delete, Edit } from '@mui/icons-material'
import { toast } from 'react-toastify'

import FeatureLocked from '@/components/common/FeatureLocked'
import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import {
  useCreateStaffMemberMutation,
  useDeleteStaffMemberMutation,
  useGetNotificationGroupsQuery,
  useGetStaffMembersQuery,
  useGetStaffRolesQuery,
  useUpdateStaffMemberMutation
} from '@/redux/api/staffApi'
import type { INotificationGroup, IStaffMember, IStaffRole } from '@/types'
import FormFieldHelp from '@/views/staff/components/FormFieldHelp'

type MemberFormState = {
  name: string
  pin: string
  roleId: string
  groupIds: string[]
  isActive: boolean
}

const EMPTY_FORM: MemberFormState = {
  name: '',
  pin: '',
  roleId: '',
  groupIds: [],
  isActive: true
}

const normalizeRoleId = (roleId: IStaffMember['roleId']) => (typeof roleId === 'string' ? roleId : roleId?.id || '')

const normalizeGroupIds = (groupIds: IStaffMember['groupIds']) =>
  (groupIds || []).map(group => (typeof group === 'string' ? group : group.id))

const getRoleName = (roleId: IStaffMember['roleId']) =>
  typeof roleId === 'string' ? roleId : roleId?.name || 'Unknown role'

const getGroupNameMap = (groups: INotificationGroup[]) => {
  return groups.reduce<Record<string, string>>((acc, group) => {
    acc[group.id] = group.name

    return acc
  }, {})
}

export default function StaffPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features

  const { data: members, isLoading: membersLoading, isFetching } = useGetStaffMembersQuery(hotelId!, { skip: !hotelId })
  const { data: roles } = useGetStaffRolesQuery(hotelId!, { skip: !hotelId })
  const { data: groups } = useGetNotificationGroupsQuery(hotelId!, { skip: !hotelId })

  const [createMember, { isLoading: creating }] = useCreateStaffMemberMutation()
  const [updateMember, { isLoading: updating }] = useUpdateStaffMemberMutation()
  const [deleteMember, { isLoading: deleting }] = useDeleteStaffMemberMutation()

  const [open, setOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<IStaffMember | null>(null)
  const [form, setForm] = useState<MemberFormState>(EMPTY_FORM)

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setEditingMember(null)
    }
  }, [open])

  if (!authUser) return <Loader center />
  if (!hotelId) return <Loader center />
  if (hotelFeatures?.staffRbacEnabled === false) return <FeatureLocked featureName='Staff RBAC' />
  if (membersLoading) return <Loader center />

  const roleOptions: IStaffRole[] = roles ?? []
  const groupOptions: INotificationGroup[] = groups ?? []
  const groupNameMap = getGroupNameMap(groupOptions)
  const busy = creating || updating || deleting || isFetching

  const openCreate = () => {
    setEditingMember(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (member: IStaffMember) => {
    setEditingMember(member)
    setForm({
      name: member.name,
      pin: '',
      roleId: normalizeRoleId(member.roleId),
      groupIds: normalizeGroupIds(member.groupIds),
      isActive: member.isActive
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.roleId) {
      toast.error('Name and role are required.')

      return
    }

    if (!editingMember && form.pin.length !== 4) {
      toast.error('PIN must be 4 digits.')

      return
    }

    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      toast.error('PIN must be exactly 4 digits.')

      return
    }

    try {
      const body: any = {
        name: form.name.trim(),
        roleId: form.roleId,
        groupIds: form.groupIds,
        isActive: form.isActive
      }

      if (form.pin) body.pin = form.pin

      if (editingMember) {
        await updateMember({ hotelId, memberId: editingMember.id, body }).unwrap()
        toast.success('Staff member updated.')
      } else {
        await createMember({ hotelId, body }).unwrap()
        toast.success('Staff member created.')
      }

      setOpen(false)
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to save staff member.')
    }
  }

  const handleDelete = async (member: IStaffMember) => {
    if (!window.confirm(`Delete ${member.name}?`)) {
      return
    }

    try {
      await deleteMember({ hotelId, memberId: member.id }).unwrap()
      toast.success('Staff member deleted.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete staff member.')
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
          Staff Members
        </Typography>
        <Button variant='contained' startIcon={<Add />} onClick={openCreate}>
          Add Staff Member
        </Button>
      </Stack>

      <Alert severity='info'>
        Staff members log into the tablet with a 4-digit PIN. Assign a role for permissions and add one or more
        notification groups to control which orders they see.
      </Alert>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Groups</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(members ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 5, color: 'text.secondary' }}>
                    No staff members yet.
                  </TableCell>
                </TableRow>
              ) : (
                (members ?? []).map((member: IStaffMember) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{member.name}</Typography>
                    </TableCell>
                    <TableCell>{getRoleName(member.roleId)}</TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {normalizeGroupIds(member.groupIds).length === 0 ? (
                          <Typography variant='body2' color='text.secondary'>
                            No groups
                          </Typography>
                        ) : (
                          normalizeGroupIds(member.groupIds).map(groupId => (
                            <Chip key={groupId} size='small' label={groupNameMap[groupId] || groupId} />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        color={member.isActive ? 'success' : 'default'}
                        label={member.isActive ? 'Active' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Button size='small' startIcon={<Edit />} onClick={() => openEdit(member)}>
                        Edit
                      </Button>
                      <Button size='small' color='error' startIcon={<Delete />} onClick={() => handleDelete(member)}>
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
        <DialogTitle>{editingMember ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormFieldHelp
              label='Staff Name'
              helpText='Enter the name that should be shown on the tablet after PIN login.'
            />
            <TextField
              placeholder='Example: Mario'
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              size='small'
              fullWidth
            />
            <FormFieldHelp
              label={editingMember ? 'New PIN (optional)' : 'PIN'}
              helpText='Use exactly 4 digits. Staff will type this PIN on the tablet screen to sign in.'
            />
            <TextField
              type='password'
              placeholder={editingMember ? 'Example: 2580' : 'Example: 2580'}
              value={form.pin}
              onChange={e => setForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              size='small'
              fullWidth
            />
            <FormFieldHelp
              label='Role'
              helpText='Choose which permissions this staff member has, such as viewing orders or accepting them.'
            />
            <FormControl fullWidth size='small'>
              <Select
                displayEmpty
                value={form.roleId}
                onChange={e => setForm(prev => ({ ...prev, roleId: e.target.value }))}
                renderValue={selected => {
                  if (!selected) {
                    return <Typography color='text.secondary'>Choose a role</Typography>
                  }

                  return roleOptions.find(role => role.id === selected)?.name || selected
                }}
              >
                {roleOptions.map(role => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormFieldHelp
              label='Groups'
              helpText='Assign the notification groups this person should work on. They will only see orders routed to these groups.'
            />
            <FormControl fullWidth size='small'>
              <Select
                multiple
                displayEmpty
                value={form.groupIds}
                onChange={e => setForm(prev => ({ ...prev, groupIds: e.target.value as string[] }))}
                renderValue={selected =>
                  (selected as string[]).length === 0 ? (
                    <Typography color='text.secondary'>Choose one or more groups</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(selected as string[]).map(value => (
                        <Chip key={value} label={groupNameMap[value] || value} size='small' />
                      ))}
                    </Box>
                  )
                }
              >
                {groupOptions.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    <Checkbox checked={form.groupIds.includes(group.id)} />
                    <ListItemText primary={group.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <FormFieldHelp
                label='Active'
                helpText='Turn this off to block this staff member from PIN login without deleting the record.'
              />
              <Switch
                checked={form.isActive}
                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={busy}>
            {editingMember ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
