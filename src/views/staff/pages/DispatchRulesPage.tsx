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
  useCreateDispatchRuleMutation,
  useDeleteDispatchRuleMutation,
  useGetDispatchCategoriesQuery,
  useGetDispatchItemsQuery,
  useGetDispatchRulesQuery,
  useGetNotificationGroupsQuery,
  useUpdateDispatchRuleMutation
} from '@/redux/api/staffApi'
import type { ICatalogItem, IDispatchRule, INotificationGroup, IOrderCategory } from '@/types'
import FormFieldHelp from '@/views/staff/components/FormFieldHelp'

const EVENT_TYPES = ['order', 'booking', 'housekeeping', 'maintenance'] as const

type RuleFormState = {
  name: string
  priority: number
  eventTypes: string[]
  categoryIds: string[]
  itemIds: string[]
  targetGroupId: string
  escalationSeconds: number
  active: boolean
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  priority: 0,
  eventTypes: ['order'],
  categoryIds: [],
  itemIds: [],
  targetGroupId: '',
  escalationSeconds: 30,
  active: true
}

const normalizeTargetGroupId = (group: IDispatchRule['targetGroupId']) => (typeof group === 'string' ? group : group?.id || '')

const groupNameMap = (groups: INotificationGroup[]) => {
  return groups.reduce<Record<string, string>>((acc, group) => {
    acc[group.id] = group.name

    return acc
  }, {})
}

export default function DispatchRulesPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features

  const { data: rules, isLoading } = useGetDispatchRulesQuery(hotelId!, { skip: !hotelId })
  const { data: groups } = useGetNotificationGroupsQuery(hotelId!, { skip: !hotelId })
  const { data: categories } = useGetDispatchCategoriesQuery(hotelId!, { skip: !hotelId })
  const { data: items } = useGetDispatchItemsQuery(hotelId!, { skip: !hotelId })

  const [createRule, { isLoading: creating }] = useCreateDispatchRuleMutation()
  const [updateRule, { isLoading: updating }] = useUpdateDispatchRuleMutation()
  const [deleteRule, { isLoading: deleting }] = useDeleteDispatchRuleMutation()

  const [open, setOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<IDispatchRule | null>(null)
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM)
  const [localRules, setLocalRules] = useState<IDispatchRule[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalRules([...(rules ?? [])].sort((a, b) => a.priority - b.priority))
  }, [rules])

  useEffect(() => {
    if (!open) {
      setEditingRule(null)
      setForm(EMPTY_FORM)
    }
  }, [open])

  const groupsList = groups ?? []
  const categoriesList: IOrderCategory[] = categories ?? []
  const itemsList: ICatalogItem[] = Array.isArray(items) ? items : (items as any)?.results ?? []
  const groupNames = groupNameMap(groupsList)

  if (!authUser) return <Loader center />
  if (!hotelId) return <Loader center />
  if (hotelFeatures?.staffRbacEnabled === false) return <FeatureLocked featureName='Staff RBAC' />
  if (hotelFeatures?.smartDispatchingEnabled === false) return <FeatureLocked featureName='Smart Dispatching' />
  if (isLoading) return <Loader center />

  const busy = creating || updating || deleting

  const openCreate = () => {
    setEditingRule(null)
    setForm({
      ...EMPTY_FORM,
      priority: localRules.length
    })
    setOpen(true)
  }

  const openEdit = (rule: IDispatchRule) => {
    setEditingRule(rule)
    setForm({
      name: rule.name,
      priority: rule.priority,
      eventTypes: rule.conditions?.eventTypes || ['order'],
      categoryIds: rule.conditions?.categoryIds || [],
      itemIds: rule.conditions?.itemIds || [],
      targetGroupId: normalizeTargetGroupId(rule.targetGroupId),
      escalationSeconds: rule.escalationSeconds,
      active: rule.active
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.targetGroupId || form.eventTypes.length === 0) {
      toast.error('Name, target group, and at least one event type are required.')

      return
    }

    try {
      const body = {
        name: form.name.trim(),
        priority: Number(form.priority),
        conditions: {
          eventTypes: form.eventTypes,
          categoryIds: form.categoryIds,
          itemIds: form.itemIds
        },
        targetGroupId: form.targetGroupId,
        escalationSeconds: Number(form.escalationSeconds),
        active: form.active
      }

      if (editingRule) {
        await updateRule({ hotelId, ruleId: editingRule.id, body }).unwrap()
        toast.success('Dispatch rule updated.')
      } else {
        await createRule({ hotelId, body }).unwrap()
        toast.success('Dispatch rule created.')
      }

      setOpen(false)
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to save dispatch rule.')
    }
  }

  const handleDelete = async (rule: IDispatchRule) => {
    if (!window.confirm(`Delete ${rule.name}?`)) {
      return
    }

    try {
      await deleteRule({ hotelId, ruleId: rule.id }).unwrap()
      toast.success('Dispatch rule deleted.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete dispatch rule.')
    }
  }

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return

    const current = [...localRules]
    const fromIndex = current.findIndex(rule => rule.id === draggingId)
    const toIndex = current.findIndex(rule => rule.id === targetId)

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null)

      return
    }

    const [moved] = current.splice(fromIndex, 1)

    current.splice(toIndex, 0, moved)

    const updatedRules = current.map((rule, index) => ({ ...rule, priority: index }))

    setLocalRules(updatedRules)
    setDraggingId(null)

    try {
      await Promise.all(
        updatedRules.map(rule =>
          updateRule({
            hotelId,
            ruleId: rule.id,
            body: { priority: rule.priority }
          }).unwrap()
        )
      )
      toast.success('Rule priorities updated.')
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update rule priorities.')
    }
  }

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} gap={2}>
        <Typography variant='h4' fontWeight={700}>
          Dispatch Rules
        </Typography>
        <Button variant='contained' startIcon={<Add />} onClick={openCreate}>
          Add Rule
        </Button>
      </Stack>

      <Alert severity='info'>
        Dispatch rules decide which tablet group receives a new order. Lower priority runs first, so put your most specific rules at the top.
      </Alert>

      <Typography variant='body2' color='text.secondary'>
        Drag rows to reorder priority. Lower numbers run first.
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Priority</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Event Types</TableCell>
                <TableCell>Target Group</TableCell>
                <TableCell>Escalation</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {localRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 5, color: 'text.secondary' }}>
                    No dispatch rules yet.
                  </TableCell>
                </TableRow>
              ) : (
                localRules.map(rule => (
                  <TableRow
                    key={rule.id}
                    hover
                    draggable
                    onDragStart={() => setDraggingId(rule.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(rule.id)}
                    sx={{ cursor: 'grab' }}
                  >
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{rule.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        {(rule.conditions?.eventTypes || []).map(eventType => (
                          <Chip key={eventType} size='small' label={eventType} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{groupNames[normalizeTargetGroupId(rule.targetGroupId)] || normalizeTargetGroupId(rule.targetGroupId)}</TableCell>
                    <TableCell>{rule.escalationSeconds}s</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        color={rule.active ? 'success' : 'default'}
                        label={rule.active ? 'Active' : 'Inactive'}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <Button size='small' startIcon={<Edit />} onClick={() => openEdit(rule)}>
                        Edit
                      </Button>
                      <Button size='small' color='error' startIcon={<Delete />} onClick={() => handleDelete(rule)}>
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
        <DialogTitle>{editingRule ? 'Edit Dispatch Rule' : 'Add Dispatch Rule'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormFieldHelp
              label='Rule Name'
              helpText='Give this rule a name that explains its purpose, for example Breakfast Orders to Kitchen.'
            />
            <TextField
              placeholder='Example: Breakfast Orders to Kitchen'
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              size='small'
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <Stack flex={1} gap={1}>
                <FormFieldHelp
                  label='Priority'
                  helpText='Smaller numbers run first. Use 0 or 1 for the most important and specific rules.'
                />
                <TextField
                  placeholder='Example: 0'
                  type='number'
                  value={form.priority}
                  onChange={e => setForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                  size='small'
                  fullWidth
                />
              </Stack>
              <Stack flex={1} gap={1}>
                <FormFieldHelp
                  label='Escalation Seconds'
                  helpText='If nobody accepts the order in this time, the escalation flow will trigger.'
                />
                <TextField
                  placeholder='Example: 30'
                  type='number'
                  value={form.escalationSeconds}
                  onChange={e => setForm(prev => ({ ...prev, escalationSeconds: Number(e.target.value) }))}
                  size='small'
                  fullWidth
                />
              </Stack>
            </Stack>
            <FormFieldHelp
              label='Event Types'
              helpText='Choose which kind of event this rule should match. For tablet order routing, keep order selected.'
            />
            <FormControl fullWidth size='small'>
              <Select
                multiple
                displayEmpty
                value={form.eventTypes}
                onChange={e => setForm(prev => ({ ...prev, eventTypes: e.target.value as string[] }))}
                renderValue={selected => (
                  (selected as string[]).length === 0 ? (
                    <Typography color='text.secondary'>Choose one or more event types</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(selected as string[]).map(value => (
                        <Chip key={value} label={value} size='small' />
                      ))}
                    </Box>
                  )
                )}
              >
                {EVENT_TYPES.map(eventType => (
                  <MenuItem key={eventType} value={eventType}>
                    <Checkbox checked={form.eventTypes.includes(eventType)} />
                    <ListItemText primary={eventType} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormFieldHelp
              label='Categories'
              helpText='Optional filter. Use this if only orders from certain menu categories should go to this group.'
            />
            <FormControl fullWidth size='small'>
              <Select
                multiple
                displayEmpty
                value={form.categoryIds}
                onChange={e => setForm(prev => ({ ...prev, categoryIds: e.target.value as string[] }))}
                renderValue={selected => (
                  (selected as string[]).length === 0 ? (
                    <Typography color='text.secondary'>Optional: choose categories</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(selected as string[]).map(value => (
                        <Chip
                          key={value}
                          label={categoriesList.find(category => category.id === value)?.name || value}
                          size='small'
                        />
                      ))}
                    </Box>
                  )
                )}
              >
                {categoriesList.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    <Checkbox checked={form.categoryIds.includes(category.id)} />
                    <ListItemText primary={category.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormFieldHelp
              label='Items'
              helpText='Optional filter. Use this only if specific menu items should bypass the broader category rules.'
            />
            <FormControl fullWidth size='small'>
              <Select
                multiple
                displayEmpty
                value={form.itemIds}
                onChange={e => setForm(prev => ({ ...prev, itemIds: e.target.value as string[] }))}
                renderValue={selected => (
                  (selected as string[]).length === 0 ? (
                    <Typography color='text.secondary'>Optional: choose items</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(selected as string[]).map(value => (
                        <Chip key={value} label={itemsList.find(item => item.id === value)?.name || value} size='small' />
                      ))}
                    </Box>
                  )
                )}
              >
                {itemsList.map(item => (
                  <MenuItem key={item.id} value={item.id}>
                    <Checkbox checked={form.itemIds.includes(item.id)} />
                    <ListItemText primary={item.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormFieldHelp
              label='Target Group'
              helpText='Choose which notification group and tablet should receive matching orders.'
            />
            <FormControl fullWidth size='small'>
              <Select
                displayEmpty
                value={form.targetGroupId}
                onChange={e => setForm(prev => ({ ...prev, targetGroupId: e.target.value }))}
                renderValue={selected => {
                  if (!selected) {
                    return <Typography color='text.secondary'>Choose a target group</Typography>
                  }

                  return groupNames[selected] || selected
                }}
              >
                {groupsList.map((group: INotificationGroup) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <FormFieldHelp
                label='Active'
                helpText='Turn this off to keep the rule saved but excluded from live dispatch matching.'
              />
              <Switch
                checked={form.active}
                onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={busy}>
            {editingRule ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
