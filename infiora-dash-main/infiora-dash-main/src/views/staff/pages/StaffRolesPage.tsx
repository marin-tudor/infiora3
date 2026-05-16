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
  FormControlLabel,
  Stack,
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
  useCreateStaffRoleMutation,
  useDeleteStaffRoleMutation,
  useGetStaffRolesQuery,
  useUpdateStaffRoleMutation
} from '@/redux/api/staffApi'
import type { IStaffRole, StaffPermission } from '@/types'
import FormFieldHelp from '@/views/staff/components/FormFieldHelp'

const ALL_PERMISSIONS: StaffPermission[] = [
  'orders:view',
  'orders:accept',
  'orders:complete',
  'orders:cancel',
  'bookings:view',
  'bookings:confirm',
  'bookings:cancel',
  'housekeeping:view',
  'housekeeping:manage',
  'maintenance:view',
  'maintenance:manage',
  'catalog:view',
  'catalog:manage',
  'staff:view',
  'staff:manage',
  'analytics:view',
  'settings:manage'
]

const MODULES = ['orders', 'bookings', 'housekeeping', 'maintenance', 'catalog', 'analytics']

type RoleFormState = {
  name: string
  permissions: StaffPermission[]
  visibleModules: string[]
}

const EMPTY_FORM: RoleFormState = {
  name: '',
  permissions: [],
  visibleModules: []
}

export default function StaffRolesPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features

  const { data: roles, isLoading } = useGetStaffRolesQuery(hotelId!, { skip: !hotelId })
  const [createRole, { isLoading: creating }] = useCreateStaffRoleMutation()
  const [updateRole, { isLoading: updating }] = useUpdateStaffRoleMutation()
  const [deleteRole, { isLoading: deleting }] = useDeleteStaffRoleMutation()

  const [open, setOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<IStaffRole | null>(null)
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM)

  useEffect(() => {
    if (!open) {
      setEditingRole(null)
      setForm(EMPTY_FORM)
    }
  }, [open])

  if (!authUser) return <Loader center />
  if (!hotelId) return <Loader center />
  if (hotelFeatures?.staffRbacEnabled === false) return <FeatureLocked featureName='Staff RBAC' />
  if (isLoading) return <Loader center />

  const roleList = roles ?? []
  const busy = creating || updating || deleting

  const openCreate = () => {
    setEditingRole(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (role: IStaffRole) => {
    setEditingRole(role)
    setForm({
      name: role.name,
      permissions: role.permissions || [],
      visibleModules: role.visibleModules || []
    })
    setOpen(true)
  }

  const togglePermission = (permission: StaffPermission) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(item => item !== permission)
        : [...prev.permissions, permission]
    }))
  }

  const toggleModule = (moduleName: string) => {
    setForm(prev => ({
      ...prev,
      visibleModules: prev.visibleModules.includes(moduleName)
        ? prev.visibleModules.filter(item => item !== moduleName)
        : [...prev.visibleModules, moduleName]
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Role name is required.')

      return
    }

    try {
      const body = {
        name: form.name.trim(),
        permissions: form.permissions,
        visibleModules: form.visibleModules
      }

      if (editingRole) {
        await updateRole({ hotelId, roleId: editingRole.id, body }).unwrap()
        toast.success('Role updated.')
      } else {
        await createRole({ hotelId, body }).unwrap()
        toast.success('Role created.')
      }

      setOpen(false)
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to save role.')
    }
  }

  const handleDelete = async (role: IStaffRole) => {
    if (role.isTemplate) {
      toast.info('Template roles cannot be deleted.')

      return
    }

    if (!window.confirm(`Delete ${role.name}?`)) {
      return
    }

    try {
      await deleteRole({ hotelId, roleId: role.id }).unwrap()
      toast.success('Role deleted.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete role.')
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
          Staff Roles
        </Typography>
        <Button variant='contained' startIcon={<Add />} onClick={openCreate}>
          Add Role
        </Button>
      </Stack>

      <Alert severity='info'>
        Roles define what staff can do in tablet mode. Start with order permissions, then enable only the modules each
        role actually needs.
      </Alert>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Visible Modules</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roleList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align='center' sx={{ py: 5, color: 'text.secondary' }}>
                    No roles yet.
                  </TableCell>
                </TableRow>
              ) : (
                roleList.map((role: IStaffRole) => (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Stack direction='row' gap={1} alignItems='center'>
                        <Typography fontWeight={600}>{role.name}</Typography>
                        {role.isTemplate && <Chip size='small' label='Template' color='default' />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {role.permissions?.length || 0} permission{role.permissions?.length === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {(role.visibleModules || []).map((moduleName: string) => (
                          <Chip key={moduleName} size='small' label={moduleName} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align='right'>
                      <Button size='small' startIcon={<Edit />} onClick={() => openEdit(role)}>
                        Edit
                      </Button>
                      <Button size='small' color='error' startIcon={<Delete />} onClick={() => handleDelete(role)}>
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth='md'>
        <DialogTitle>{editingRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
        <DialogContent>
          <Stack gap={3} sx={{ pt: 1 }}>
            <FormFieldHelp
              label='Role Name'
              helpText='Use an operational role name, for example Kitchen Staff, Concierge, or Night Manager.'
            />
            <TextField
              placeholder='Example: Kitchen Staff'
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              size='small'
              fullWidth
            />
            <Box>
              <FormFieldHelp
                label='Permissions'
                helpText='Select which actions this role is allowed to perform. For tablets, orders:view and orders:accept are the most common.'
              />
              <Stack direction='row' flexWrap='wrap'>
                {ALL_PERMISSIONS.map(permission => (
                  <FormControlLabel
                    key={permission}
                    control={
                      <Checkbox
                        checked={form.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                      />
                    }
                    label={permission}
                    sx={{ width: { xs: '100%', sm: '50%' }, mr: 0 }}
                  />
                ))}
              </Stack>
            </Box>
            <Box>
              <FormFieldHelp
                label='Visible Modules'
                helpText='Choose which sections should be visible for this role. Hide modules staff should not use.'
              />
              <Stack direction='row' flexWrap='wrap'>
                {MODULES.map(moduleName => (
                  <FormControlLabel
                    key={moduleName}
                    control={
                      <Checkbox
                        checked={form.visibleModules.includes(moduleName)}
                        onChange={() => toggleModule(moduleName)}
                      />
                    }
                    label={moduleName}
                    sx={{ width: { xs: '100%', sm: '33.33%' }, mr: 0 }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={busy}>
            {editingRole ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
