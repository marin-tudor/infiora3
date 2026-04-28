'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { toast } from 'react-toastify'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const RESOURCE_TYPES = ['room', 'equipment', 'staff_member', 'vehicle'] as const
type ResourceType = (typeof RESOURCE_TYPES)[number]

interface Resource {
  _id: string
  name: string
  type: string
  identifier?: string
  capacity: number
  isActive: boolean
}

interface AddForm {
  name: string
  type: ResourceType
  identifier: string
  capacity: number
}

interface EditForm {
  name: string
  type: string
  identifier: string
  capacity: number
  isActive: boolean
}

const defaultAddForm: AddForm = {
  name: '',
  type: 'room',
  identifier: '',
  capacity: 1,
}

export default function ResourcesTab({ hotelId }: { hotelId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(defaultAddForm)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [editResource, setEditResource] = useState<Resource | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const fetchResources = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources?includeInactive=true`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load resources')
      const data = await res.json()
      setResources(Array.isArray(data) ? data : data.results ?? [])
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId])

  const handleAddSubmit = async () => {
    if (!addForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    setAddSubmitting(true)
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          type: addForm.type,
          identifier: addForm.identifier.trim() || undefined,
          capacity: addForm.capacity,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.message ?? 'Failed to create resource')
      }
      toast.success('Resource created')
      setShowAddDialog(false)
      setAddForm(defaultAddForm)
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create resource')
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleAddDialogClose = () => {
    setShowAddDialog(false)
    setAddForm(defaultAddForm)
  }

  const handleEditOpen = (resource: Resource) => {
    setEditResource(resource)
    setEditForm({
      name: resource.name,
      type: resource.type,
      identifier: resource.identifier ?? '',
      capacity: resource.capacity,
      isActive: resource.isActive,
    })
  }

  const handleEditClose = () => {
    setEditResource(null)
    setEditForm(null)
  }

  const handleEditSubmit = async () => {
    if (!editResource || !editForm) return
    if (!editForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    setEditSubmitting(true)
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources/${editResource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          type: editForm.type,
          identifier: editForm.identifier.trim() || undefined,
          capacity: editForm.capacity,
          isActive: editForm.isActive,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.message ?? 'Failed to update resource')
      }
      toast.success('Resource updated')
      handleEditClose()
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update resource')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (resource: Resource) => {
    if (!window.confirm(`Deactivate "${resource.name}"? It will no longer be available for bookings.`)) return
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources/${resource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (!res.ok) throw new Error('Failed to deactivate resource')
      toast.success('Resource deactivated')
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to deactivate resource')
    }
  }

  const handleRestore = async (resource: Resource) => {
    try {
      const res = await fetch(`${API}/api/v1/hotels/${hotelId}/bookings/resources/${resource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) throw new Error('Failed to restore resource')
      toast.success('Resource restored')
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to restore resource')
    }
  }

  // Group resources by type
  const grouped = RESOURCE_TYPES.reduce<Record<string, Resource[]>>((acc, type) => {
    acc[type] = resources.filter(r => r.type === type)
    return acc
  }, {})

  const typeLabel: Record<string, string> = {
    room: 'Rooms',
    equipment: 'Equipment',
    staff_member: 'Staff Members',
    vehicle: 'Vehicles',
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='h6' fontWeight={600}>
          Resources
        </Typography>
        <Button
          variant='contained'
          startIcon={<i className='ri-add-line' />}
          onClick={() => setShowAddDialog(true)}
        >
          Add Resource
        </Button>
      </Stack>

      {/* List */}
      {loading ? (
        <Box display='flex' justifyContent='center' py={4}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color='text.secondary' textAlign='center' py={4}>
              No resources yet. Add your first resource to start managing availability.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <List disablePadding>
            {RESOURCE_TYPES.map((type, typeIdx) => {
              const items = grouped[type]
              if (items.length === 0) return null
              return (
                <Box key={type}>
                  {typeIdx > 0 && <Divider />}
                  <ListSubheader sx={{ bgcolor: 'action.hover', lineHeight: '36px' }}>
                    {typeLabel[type]}
                  </ListSubheader>
                  {items.map(resource => (
                    <ListItem
                      key={resource._id}
                      sx={{ opacity: resource.isActive ? 1 : 0.5 }}
                      secondaryAction={
                        <Stack direction='row' spacing={0.5}>
                          <Tooltip title='Edit resource'>
                            <IconButton size='small' onClick={() => handleEditOpen(resource)}>
                              <i className='ri-edit-line' />
                            </IconButton>
                          </Tooltip>
                          {resource.isActive ? (
                            <Tooltip title='Deactivate resource'>
                              <IconButton size='small' color='error' onClick={() => handleDelete(resource)}>
                                <i className='ri-delete-bin-line' />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title='Restore resource'>
                              <IconButton size='small' color='success' onClick={() => handleRestore(resource)}>
                                <i className='ri-refresh-line' />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
                            <Typography fontWeight={500}>{resource.name}</Typography>
                            {resource.identifier && (
                              <Chip label={resource.identifier} size='small' variant='outlined' />
                            )}
                            {!resource.isActive && (
                              <Chip label='Inactive' size='small' color='default' />
                            )}
                          </Stack>
                        }
                        secondary={`Capacity: ${resource.capacity}`}
                      />
                    </ListItem>
                  ))}
                </Box>
              )
            })}
          </List>
        </Card>
      )}

      {/* Add Resource Dialog */}
      <Dialog open={showAddDialog} onClose={handleAddDialogClose} maxWidth='sm' fullWidth>
        <DialogTitle>Add Resource</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label='Name'
              required
              fullWidth
              size='small'
              value={addForm.name}
              onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Select
              size='small'
              fullWidth
              value={addForm.type}
              onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value as ResourceType }))}
            >
              {RESOURCE_TYPES.map(t => (
                <MenuItem key={t} value={t}>
                  {typeLabel[t]}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label='Identifier (optional)'
              fullWidth
              size='small'
              value={addForm.identifier}
              onChange={e => setAddForm(prev => ({ ...prev, identifier: e.target.value }))}
              helperText='e.g. room number, license plate, staff ID'
            />
            <TextField
              label='Capacity'
              type='number'
              fullWidth
              size='small'
              inputProps={{ min: 1 }}
              value={addForm.capacity}
              onChange={e => setAddForm(prev => ({ ...prev, capacity: Math.max(1, Number(e.target.value)) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose} disabled={addSubmitting}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleAddSubmit} disabled={addSubmitting}>
            {addSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Resource Dialog */}
      {editResource && editForm && (
        <Dialog open onClose={handleEditClose} maxWidth='sm' fullWidth>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label='Name'
                required
                fullWidth
                size='small'
                value={editForm.name}
                onChange={e => setEditForm(prev => prev ? { ...prev, name: e.target.value } : prev)}
              />
              <Select
                size='small'
                fullWidth
                value={editForm.type}
                onChange={e => setEditForm(prev => prev ? { ...prev, type: e.target.value } : prev)}
              >
                {RESOURCE_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {typeLabel[t]}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label='Identifier (optional)'
                fullWidth
                size='small'
                value={editForm.identifier}
                onChange={e => setEditForm(prev => prev ? { ...prev, identifier: e.target.value } : prev)}
                helperText='e.g. room number, license plate, staff ID'
              />
              <TextField
                label='Capacity'
                type='number'
                fullWidth
                size='small'
                inputProps={{ min: 1 }}
                value={editForm.capacity}
                onChange={e =>
                  setEditForm(prev => prev ? { ...prev, capacity: Math.max(1, Number(e.target.value)) } : prev)
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.isActive}
                    onChange={e => setEditForm(prev => prev ? { ...prev, isActive: e.target.checked } : prev)}
                  />
                }
                label='Active'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button variant='contained' onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}
