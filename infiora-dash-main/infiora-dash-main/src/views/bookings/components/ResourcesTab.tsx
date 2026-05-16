'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
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

import { createCsrfHeaders } from '@/libs/csrf'
import {
  useGenerateSlotsMutation,
  useGetBookingSettingsQuery,
  useUpdateBookingSettingsMutation
} from '@/redux/api/bookingApi'
import { useGetCatalogItemsQuery, useUpdateCatalogItemMutation } from '@/redux/api/ordersApi'
import type { ICatalogItem } from '@/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''
const RESOURCE_TYPES = ['room', 'equipment', 'staff_member', 'vehicle'] as const

type ResourceType = (typeof RESOURCE_TYPES)[number]

interface Resource {
  _id: string
  id?: string
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

interface ActivitySettingsForm {
  duration: number
  startInterval: number
  bufferMinutes: number
  advanceMinHours: number
  advanceMaxDays: number
  totalInventory: number
  capacityPerUnit: number
  minPersons: number
  maxPersons: number
  slotType: 'private' | 'shared'
  confirmationType: 'instant' | 'request'
  requiresApproval: boolean
  pricePerPerson: boolean
  resourceIds: string[]
}

interface FieldProps {
  label: string
  helperText?: string
  children: React.ReactNode
}

const defaultAddForm: AddForm = {
  name: '',
  type: 'room',
  identifier: '',
  capacity: 1
}

const typeLabel: Record<string, string> = {
  room: 'Rooms',
  equipment: 'Equipment',
  staff_member: 'Staff Members',
  vehicle: 'Vehicles'
}

const getCatalogItemsList = (data: unknown): ICatalogItem[] =>
  Array.isArray(data) ? data : (((data as any)?.results ?? (data as any)?.items ?? []) as ICatalogItem[])

const getActivityForm = (item: ICatalogItem): ActivitySettingsForm => {
  const bc = item.bookingConfig ?? {}

  return {
    duration: bc.duration ?? 60,
    startInterval: bc.startInterval ?? bc.duration ?? 60,
    bufferMinutes: bc.bufferMinutes ?? 0,
    advanceMinHours: bc.advanceMinHours ?? 0,
    advanceMaxDays: bc.advanceMaxDays ?? 60,
    totalInventory: bc.totalInventory ?? 1,
    capacityPerUnit: bc.capacityPerUnit ?? 1,
    minPersons: bc.minPersons ?? 1,
    maxPersons: bc.maxPersons ?? 1,
    slotType: (bc.slotType as 'private' | 'shared') ?? 'private',
    confirmationType: (bc.confirmationType as 'instant' | 'request') ?? 'instant',
    requiresApproval: bc.requiresApproval ?? false,
    pricePerPerson: bc.pricePerPerson ?? false,
    resourceIds: bc.resourceIds ?? []
  }
}

const buildBookingConfigPayload = (item: ICatalogItem, form: ActivitySettingsForm) => {
  const bc = item.bookingConfig ?? {}

  return {
    bookableCategory: bc.bookableCategory ?? 'service',
    bookingModel: form.slotType === 'shared' ? 'shared' : 'exclusive',
    totalInventory: form.totalInventory,
    capacityPerUnit: form.capacityPerUnit,
    minPersons: form.minPersons,
    maxPersons: form.maxPersons,
    duration: form.duration,
    bufferMinutes: form.bufferMinutes,
    startInterval: form.startInterval,
    advanceMinHours: form.advanceMinHours,
    advanceMaxDays: form.advanceMaxDays,
    confirmationType: form.confirmationType,
    pricePerPerson: form.pricePerPerson,
    cancellationPolicy: bc.cancellationPolicy ?? 'free_24h',
    cancellationPolicyHours: bc.cancellationPolicyHours ?? bc.cancelPolicyHours ?? 24,
    slotType: form.slotType,
    requiresApproval: form.confirmationType === 'request' ? form.requiresApproval : false,
    resourceIds: form.resourceIds,
    addons: (bc.addons ?? []).map(addon => ({
      name: addon.name,
      price: addon.price,
      description: addon.description
    })),
    simpleAvailability: bc.simpleAvailability ?? { enabled: false, from: '08:00', to: '20:00' },
    weeklySchedule: bc.weeklySchedule
  }
}

function FieldBlock({ label, helperText, children }: FieldProps) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant='body2' fontWeight={600} mb={0.75}>
        {label}
      </Typography>
      {children}
      {helperText && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  )
}

const getResourceKey = (resource: Resource, type: string, index: number) =>
  resource._id || resource.id || resource.identifier || `${type}-${resource.name}-${index}`

export default function ResourcesTab({ hotelId }: { hotelId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(defaultAddForm)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [editResource, setEditResource] = useState<Resource | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [activityItem, setActivityItem] = useState<ICatalogItem | null>(null)
  const [activityForm, setActivityForm] = useState<ActivitySettingsForm | null>(null)
  const [bookingEmails, setBookingEmails] = useState<string[]>([])
  const [bookingEmailInput, setBookingEmailInput] = useState('')

  const {
    data: rawItems,
    isLoading: loadingItems,
    refetch: refetchItems
  } = useGetCatalogItemsQuery({ hotelId }, { skip: !hotelId })

  const { data: bookingSettings } = useGetBookingSettingsQuery(hotelId, { skip: !hotelId })
  const [updateCatalogItem, { isLoading: savingActivity }] = useUpdateCatalogItemMutation()
  const [updateBookingSettings, { isLoading: savingBookingSettings }] = useUpdateBookingSettingsMutation()
  const [generateSlots] = useGenerateSlotsMutation()

  const bookableItems = useMemo(
    () => getCatalogItemsList(rawItems).filter(item => item.type === 'bookable'),
    [rawItems]
  )

  const fetchResources = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/resources?includeInactive=true`, {
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Failed to load resources')
      }

      const data = await res.json()

      setResources(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load resources')
    } finally {
      setLoading(false)
    }
  }, [hotelId])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const grouped = RESOURCE_TYPES.reduce<Record<string, Resource[]>>((acc, type) => {
    acc[type] = resources.filter(resource => resource.type === type)

    return acc
  }, {})

  const activeResources = resources.filter(resource => resource.isActive)
  const activeBookableItems = bookableItems.filter(item => item.available)

  useEffect(() => {
    setBookingEmails(bookingSettings?.emails ?? [])
  }, [bookingSettings])

  const approvalRequiredCount = bookableItems.filter(item => {
    const bc = item.bookingConfig ?? {}

    return bc.confirmationType === 'request' || (!bc.confirmationType && bc.requiresApproval)
  }).length

  const handleAddSubmit = async () => {
    if (!addForm.name.trim()) {
      toast.error('Name is required')

      return
    }

    setAddSubmitting(true)

    try {
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/resources`, {
        method: 'POST',
        credentials: 'include',
        headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: addForm.name.trim(),
          type: addForm.type,
          identifier: addForm.identifier.trim() || undefined,
          capacity: addForm.capacity
        })
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
      isActive: resource.isActive
    })
  }

  const handleEditClose = () => {
    setEditResource(null)
    setEditForm(null)
  }

  const handleEditSubmit = async () => {
    if (!editResource || !editForm) {
      return
    }

    if (!editForm.name.trim()) {
      toast.error('Name is required')

      return
    }

    setEditSubmitting(true)

    try {
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/resources/${editResource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: editForm.name.trim(),
          type: editForm.type,
          identifier: editForm.identifier.trim() || undefined,
          capacity: editForm.capacity,
          isActive: editForm.isActive
        })
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
    if (!window.confirm(`Deactivate "${resource.name}"? It will no longer be available for bookings.`)) {
      return
    }

    try {
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/resources/${resource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ isActive: false })
      })

      if (!res.ok) {
        throw new Error('Failed to deactivate resource')
      }

      toast.success('Resource deactivated')
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to deactivate resource')
    }
  }

  const handleRestore = async (resource: Resource) => {
    try {
      const res = await fetch(`${API}/v1/hotels/${hotelId}/bookings/resources/${resource._id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: createCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ isActive: true })
      })

      if (!res.ok) {
        throw new Error('Failed to restore resource')
      }

      toast.success('Resource restored')
      await fetchResources()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to restore resource')
    }
  }

  const handleActivityOpen = (item: ICatalogItem) => {
    setActivityItem(item)
    setActivityForm(getActivityForm(item))
  }

  const handleActivityClose = () => {
    setActivityItem(null)
    setActivityForm(null)
  }

  const handleActivitySave = async () => {
    if (!activityItem || !activityForm) {
      return
    }

    try {
      await updateCatalogItem({
        hotelId,
        itemId: activityItem.id,
        bookingConfig: buildBookingConfigPayload(activityItem, activityForm)
      }).unwrap()

      await generateSlots({ hotelId }).unwrap()
      toast.success('Activity settings updated')
      handleActivityClose()
      refetchItems()
    } catch {
      toast.error('Failed to save activity settings')
    }
  }

  const handleAddBookingEmail = () => {
    const email = bookingEmailInput.trim()

    if (!email || bookingEmails.includes(email)) {
      return
    }

    setBookingEmails(prev => [...prev, email])
    setBookingEmailInput('')
  }

  const handleSaveBookingSettings = async () => {
    try {
      await updateBookingSettings({ hotelId, emails: bookingEmails }).unwrap()
      toast.success('Booking notification settings saved')
    } catch {
      toast.error('Failed to save booking notification settings')
    }
  }

  return (
    <Stack spacing={3}>
      <Alert severity='info'>
        Use this page in two steps: first manage your real resources like rooms, vehicles, therapists, or equipment.
        Then use the activity settings below to control how each bookable service generates slots, how many guests fit,
        how often slots start, and whether bookings need manual approval.
      </Alert>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant='overline' color='text.secondary'>
              Active Resources
            </Typography>
            <Typography variant='h4'>{activeResources.length}</Typography>
            <Typography variant='body2' color='text.secondary'>
              People and assets available for assignment.
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant='overline' color='text.secondary'>
              Bookable Activities
            </Typography>
            <Typography variant='h4'>{activeBookableItems.length}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Services currently visible for guest booking.
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant='overline' color='text.secondary'>
              Approval Needed
            </Typography>
            <Typography variant='h4'>{approvalRequiredCount}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Activities that create pending booking requests.
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant='h6' fontWeight={600}>
                Booking Notifications
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Add email addresses that should receive a message every time a new booking arrives.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size='small'
                type='email'
                value={bookingEmailInput}
                onChange={e => setBookingEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBookingEmail()}
                placeholder='email@example.com'
              />
              <Button variant='outlined' onClick={handleAddBookingEmail} disabled={!bookingEmailInput.trim()}>
                Add
              </Button>
            </Stack>

            {bookingEmails.length > 0 && (
              <Stack direction='row' gap={1} flexWrap='wrap'>
                {bookingEmails.map(email => (
                  <Chip
                    key={email}
                    label={email}
                    onDelete={() => setBookingEmails(prev => prev.filter(entry => entry !== email))}
                    size='small'
                  />
                ))}
              </Stack>
            )}

            <Stack direction='row' justifyContent='flex-end'>
              <Button variant='contained' onClick={handleSaveBookingSettings} disabled={savingBookingSettings}>
                {savingBookingSettings ? 'Saving...' : 'Save Notification Emails'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2} flexWrap='wrap' gap={1}>
            <Box>
              <Typography variant='h6' fontWeight={600}>
                Bookable Activity Settings
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Edit all core slot rules for each activity without going back to catalog management.
              </Typography>
            </Box>
          </Stack>

          {loadingItems ? (
            <Box display='flex' justifyContent='center' py={4}>
              <CircularProgress />
            </Box>
          ) : bookableItems.length === 0 ? (
            <Typography color='text.secondary' py={2}>
              No bookable activities found yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {bookableItems.map(item => {
                const bc = item.bookingConfig ?? {}
                const totalCapacity = (bc.totalInventory ?? 1) * (bc.capacityPerUnit ?? 1)

                return (
                  <Card key={item.id} variant='outlined'>
                    <CardContent>
                      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                        <Box>
                          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                            <Typography fontWeight={700}>{item.name}</Typography>
                            <Chip
                              label={item.available ? 'Active' : 'Hidden'}
                              color={item.available ? 'success' : 'default'}
                              size='small'
                            />
                            <Chip
                              label={
                                bc.confirmationType === 'request' || (!bc.confirmationType && bc.requiresApproval)
                                  ? 'Approval required'
                                  : 'Instant confirm'
                              }
                              color={
                                bc.confirmationType === 'request' || (!bc.confirmationType && bc.requiresApproval)
                                  ? 'warning'
                                  : 'primary'
                              }
                              size='small'
                            />
                          </Stack>
                          <Stack direction='row' spacing={1} flexWrap='wrap' mt={1}>
                            <Chip label={`${bc.duration ?? 60} min duration`} size='small' variant='outlined' />
                            <Chip
                              label={`Every ${bc.startInterval ?? bc.duration ?? 60} min`}
                              size='small'
                              variant='outlined'
                            />
                            <Chip label={`${bc.totalInventory ?? 1} units`} size='small' variant='outlined' />
                            <Chip label={`${totalCapacity} total capacity`} size='small' variant='outlined' />
                            <Chip label={`${bc.advanceMaxDays ?? 60} days ahead`} size='small' variant='outlined' />
                            <Chip
                              label={`${(bc.resourceIds ?? []).length} linked resources`}
                              size='small'
                              variant='outlined'
                            />
                          </Stack>
                        </Box>
                        <Stack alignItems={{ xs: 'stretch', md: 'flex-end' }} spacing={1}>
                          <Button variant='contained' onClick={() => handleActivityOpen(item)}>
                            Edit Activity
                          </Button>
                          <Typography variant='caption' color='text.secondary'>
                            General edit for slots, timing, inventory, and confirmation rules.
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction='row' justifyContent='space-between' alignItems='center' mb={2} flexWrap='wrap' gap={1}>
            <Box>
              <Typography variant='h6' fontWeight={600}>
                Resources Inventory
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                This is the list of real things your team assigns to bookings: treatment rooms, drivers, vans, boats,
                bikes, equipment, or staff members.
              </Typography>
            </Box>
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => setShowAddDialog(true)}
            >
              Add Resource
            </Button>
          </Stack>

          <Alert severity='info' sx={{ mb: 2 }}>
            <strong>Add Resource</strong> creates one assignable real-world unit. Example: Spa Room 1, Van A, Therapist
            Ana, or Bike #12. Later, activities can link to these resources and staff can assign bookings inside the
            calendar.
          </Alert>

          {loading ? (
            <Box display='flex' justifyContent='center' py={4}>
              <CircularProgress />
            </Box>
          ) : resources.length === 0 ? (
            <Typography color='text.secondary' textAlign='center' py={4}>
              No resources yet. Add your first resource to start managing availability.
            </Typography>
          ) : (
            <List disablePadding>
              {RESOURCE_TYPES.map((type, typeIdx) => {
                const items = grouped[type]

                if (items.length === 0) {
                  return null
                }

                return (
                  <Box key={type}>
                    {typeIdx > 0 && <Divider />}
                    <ListSubheader sx={{ bgcolor: 'action.hover', lineHeight: '36px' }}>
                      {typeLabel[type]}
                    </ListSubheader>
                    {items.map((resource, index) => (
                      <ListItem
                        key={getResourceKey(resource, type, index)}
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
                              <Chip label={`Capacity ${resource.capacity}`} size='small' variant='outlined' />
                              {!resource.isActive && <Chip label='Inactive' size='small' color='default' />}
                            </Stack>
                          }
                          secondary={`Type: ${typeLabel[resource.type] ?? resource.type}`}
                        />
                      </ListItem>
                    ))}
                  </Box>
                )
              })}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onClose={handleAddDialogClose} maxWidth='sm' fullWidth>
        <DialogTitle>Add Resource</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label='Name'
              required
              fullWidth
              size='small'
              InputLabelProps={{ shrink: true }}
              value={addForm.name}
              onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Select
              size='small'
              fullWidth
              value={addForm.type}
              onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value as ResourceType }))}
            >
              {RESOURCE_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {typeLabel[type]}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label='Identifier (optional)'
              fullWidth
              size='small'
              InputLabelProps={{ shrink: true }}
              value={addForm.identifier}
              onChange={e => setAddForm(prev => ({ ...prev, identifier: e.target.value }))}
              helperText='For example room number, vehicle plate, therapist code, or equipment tag.'
            />
            <TextField
              label='Capacity'
              type='number'
              fullWidth
              size='small'
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 1 }}
              value={addForm.capacity}
              onChange={e => setAddForm(prev => ({ ...prev, capacity: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose} disabled={addSubmitting}>
            Cancel
          </Button>
          <Button variant='contained' onClick={handleAddSubmit} disabled={addSubmitting}>
            {addSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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
                InputLabelProps={{ shrink: true }}
                value={editForm.name}
                onChange={e => setEditForm(prev => (prev ? { ...prev, name: e.target.value } : prev))}
              />
              <Select
                size='small'
                fullWidth
                value={editForm.type}
                onChange={e => setEditForm(prev => (prev ? { ...prev, type: e.target.value } : prev))}
              >
                {RESOURCE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {typeLabel[type]}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label='Identifier (optional)'
                fullWidth
                size='small'
                InputLabelProps={{ shrink: true }}
                value={editForm.identifier}
                onChange={e => setEditForm(prev => (prev ? { ...prev, identifier: e.target.value } : prev))}
              />
              <TextField
                label='Capacity'
                type='number'
                fullWidth
                size='small'
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 1 }}
                value={editForm.capacity}
                onChange={e =>
                  setEditForm(prev => (prev ? { ...prev, capacity: Math.max(1, Number(e.target.value) || 1) } : prev))
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.isActive}
                    onChange={e => setEditForm(prev => (prev ? { ...prev, isActive: e.target.checked } : prev))}
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
              {editSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {activityItem && activityForm && (
        <Dialog open onClose={handleActivityClose} maxWidth='md' fullWidth>
          <DialogTitle>Edit Activity Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} mt={1}>
              <Alert severity='info'>
                These settings control how slots are generated for <strong>{activityItem.name}</strong>, how much
                capacity each slot has, and whether guests are auto-confirmed or sent as requests.
              </Alert>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FieldBlock label='Duration (minutes)'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.duration}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, duration: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Start every (minutes)'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.startInterval}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, startInterval: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Buffer (minutes)'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 0 }}
                    value={activityForm.bufferMinutes}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, bufferMinutes: Math.max(0, Number(e.target.value) || 0) } : prev
                      )
                    }
                  />
                </FieldBlock>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FieldBlock
                  label='Units / resources in parallel'
                  helperText='How many simultaneous units this activity has.'
                >
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.totalInventory}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, totalInventory: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Capacity per unit' helperText='Guests each unit can take in one slot.'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.capacityPerUnit}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, capacityPerUnit: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Max persons per booking'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.maxPersons}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, maxPersons: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FieldBlock label='Min hours before booking'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 0 }}
                    value={activityForm.advanceMinHours}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, advanceMinHours: Math.max(0, Number(e.target.value) || 0) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Max days ahead'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.advanceMaxDays}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, advanceMaxDays: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
                <FieldBlock label='Min persons'>
                  <TextField
                    type='number'
                    fullWidth
                    size='small'
                    inputProps={{ min: 1 }}
                    value={activityForm.minPersons}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, minPersons: Math.max(1, Number(e.target.value) || 1) } : prev
                      )
                    }
                  />
                </FieldBlock>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FieldBlock label='Slot type'>
                  <Select
                    size='small'
                    fullWidth
                    value={activityForm.slotType}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev ? { ...prev, slotType: e.target.value as 'private' | 'shared' } : prev
                      )
                    }
                  >
                    <MenuItem value='private'>Private slot</MenuItem>
                    <MenuItem value='shared'>Shared slot</MenuItem>
                  </Select>
                </FieldBlock>
                <FieldBlock label='Confirmation flow'>
                  <Select
                    size='small'
                    fullWidth
                    value={activityForm.confirmationType}
                    onChange={e =>
                      setActivityForm(prev =>
                        prev
                          ? {
                              ...prev,
                              confirmationType: e.target.value as 'instant' | 'request',
                              requiresApproval: e.target.value === 'request' ? prev.requiresApproval : false
                            }
                          : prev
                      )
                    }
                  >
                    <MenuItem value='instant'>Instant confirmation</MenuItem>
                    <MenuItem value='request'>Manual request approval</MenuItem>
                  </Select>
                </FieldBlock>
              </Stack>

              <FieldBlock
                label='Linked resources'
                helperText='Optional: link this activity to actual rooms, vehicles, staff, or equipment that can later be assigned in the calendar.'
              >
                <Select
                  multiple
                  fullWidth
                  size='small'
                  value={activityForm.resourceIds}
                  onChange={e =>
                    setActivityForm(prev => (prev ? { ...prev, resourceIds: e.target.value as string[] } : prev))
                  }
                  renderValue={selected => {
                    const labels = resources
                      .filter(resource => (selected as string[]).includes(resource._id))
                      .map(resource => resource.name)

                    return labels.length > 0 ? labels.join(', ') : 'No linked resources'
                  }}
                >
                  {activeResources.map((resource, index) => (
                    <MenuItem key={getResourceKey(resource, resource.type, index)} value={resource._id}>
                      {resource.name}
                      {resource.identifier ? ` (${resource.identifier})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FieldBlock>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={activityForm.requiresApproval}
                      onChange={e =>
                        setActivityForm(prev => (prev ? { ...prev, requiresApproval: e.target.checked } : prev))
                      }
                      disabled={activityForm.confirmationType !== 'request'}
                    />
                  }
                  label='Needs manual staff approval'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={activityForm.pricePerPerson}
                      onChange={e =>
                        setActivityForm(prev => (prev ? { ...prev, pricePerPerson: e.target.checked } : prev))
                      }
                    />
                  }
                  label='Price per person'
                />
              </Stack>

              <Alert severity='success'>
                Current effective slot capacity:{' '}
                <strong>{activityForm.totalInventory * activityForm.capacityPerUnit}</strong> guests per start time
                across all parallel units.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleActivityClose} disabled={savingActivity}>
              Cancel
            </Button>
            <Button variant='contained' onClick={handleActivitySave} disabled={savingActivity}>
              {savingActivity ? 'Saving...' : 'Save Activity'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  )
}
