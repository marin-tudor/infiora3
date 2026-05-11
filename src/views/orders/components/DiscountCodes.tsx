'use client'
import { useState } from 'react'
import {
  Box, Stack, Typography, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Table, TableHead, TableRow,
  TableCell, TableBody
} from '@mui/material'
import { toast } from 'react-toastify'
import { format, isAfter, isBefore, parseISO } from 'date-fns'
import {
  useGetDiscountCodesQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
  useGetCategoriesQuery,
} from '@/redux/api/ordersApi'
import type { IDiscountCode, DiscountType } from '@/types'

const getCodeStatus = (code: IDiscountCode): { label: string; color: 'success' | 'error' | 'warning' | 'default' } => {
  if (!code.isActive) return { label: 'Inactive', color: 'default' }
  const now = new Date()
  if (code.validTo && isBefore(parseISO(code.validTo), now)) return { label: 'Expired', color: 'error' }
  if (code.maxUses != null && code.usedCount >= code.maxUses) return { label: 'Used up', color: 'warning' }
  if (code.validFrom && isAfter(parseISO(code.validFrom), now)) return { label: 'Scheduled', color: 'default' }
  return { label: 'Active', color: 'success' }
}

const EMPTY_FORM = {
  code: '', description: '', discountType: 'percentage' as DiscountType,
  discountValue: 10, applicableCategories: [] as string[],
  validFrom: '', validTo: '', maxUses: '', minOrderAmount: '', isActive: true,
}

interface CodeDialogProps {
  open: boolean; onClose: () => void; hotelId: string; editing?: IDiscountCode | null
}

function CodeDialog({ open, onClose, hotelId, editing }: CodeDialogProps) {
  const [form, setForm] = useState(() => editing ? {
    code: editing.code, description: editing.description || '',
    discountType: editing.discountType, discountValue: editing.discountValue,
    applicableCategories: editing.applicableCategories,
    validFrom: editing.validFrom ? editing.validFrom.split('T')[0] : '',
    validTo: editing.validTo ? editing.validTo.split('T')[0] : '',
    maxUses: editing.maxUses != null ? String(editing.maxUses) : '',
    minOrderAmount: editing.minOrderAmount != null ? String(editing.minOrderAmount) : '',
    isActive: editing.isActive,
  } : { ...EMPTY_FORM })

  const { data: categories = [] } = useGetCategoriesQuery(hotelId)
  const [create, { isLoading: creating }] = useCreateDiscountCodeMutation()
  const [update, { isLoading: updating }] = useUpdateDiscountCodeMutation()
  const loading = creating || updating

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return }
    if (!form.discountValue || Number(form.discountValue) <= 0) { toast.error('Discount value must be > 0'); return }
    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      applicableCategories: form.applicableCategories,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await update({ hotelId, codeId: editing.id, ...payload }).unwrap()
        toast.success('Discount code updated')
      } else {
        await create({ hotelId, ...payload } as any).unwrap()
        toast.success('Discount code created')
      }
      onClose()
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{editing ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label='Code' value={form.code} fullWidth
            onChange={e => set('code', e.target.value.toUpperCase())}
            disabled={!!editing}
            helperText='Guests will enter this code at checkout'
          />
          <TextField label='Description (internal)' value={form.description} fullWidth onChange={e => set('description', e.target.value)} />
          <Stack direction='row' spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Discount type</InputLabel>
              <Select value={form.discountType} label='Discount type' onChange={e => set('discountType', e.target.value)}>
                <MenuItem value='percentage'>Percentage (%)</MenuItem>
                <MenuItem value='fixed'>Fixed amount</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={form.discountType === 'percentage' ? 'Value (%)' : 'Value (amount)'}
              type='number' value={form.discountValue} fullWidth
              onChange={e => set('discountValue', e.target.value)}
            />
          </Stack>
          <FormControl fullWidth>
            <InputLabel>Applies to categories</InputLabel>
            <Select
              multiple value={form.applicableCategories} label='Applies to categories'
              onChange={e => set('applicableCategories', e.target.value)}
              renderValue={selected => (selected as string[]).map(id => categories.find((c: any) => c.id === id)?.name).join(', ') || 'All categories'}
            >
              {categories.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Stack direction='row' spacing={2}>
            <TextField label='Valid from' type='date' value={form.validFrom} fullWidth onChange={e => set('validFrom', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label='Valid to' type='date' value={form.validTo} fullWidth onChange={e => set('validTo', e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          <Stack direction='row' spacing={2}>
            <TextField label='Max uses (blank = unlimited)' type='number' value={form.maxUses} fullWidth onChange={e => set('maxUses', e.target.value)} />
            <TextField label='Min order amount (optional)' type='number' value={form.minOrderAmount} fullWidth onChange={e => set('minOrderAmount', e.target.value)} />
          </Stack>
          <FormControlLabel control={<Switch checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />} label='Active' />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={loading}>
          {editing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface Props { hotelId: string }

export default function DiscountCodes({ hotelId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<IDiscountCode | null>(null)
  const { data: codes = [], isLoading } = useGetDiscountCodesQuery(hotelId)
  const [deleteCode] = useDeleteDiscountCodeMutation()

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (code: IDiscountCode) => { setEditing(code); setDialogOpen(true) }
  const handleDelete = async (codeId: string) => {
    if (!confirm('Delete this discount code?')) return
    try {
      await deleteCode({ hotelId, codeId }).unwrap()
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  if (isLoading) return null

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h6'>Discount Codes</Typography>
        <Button variant='contained' onClick={openCreate}>Create code</Button>
      </Stack>

      {codes.length === 0 ? (
        <Typography color='text.secondary'>No discount codes yet. Create one to allow guests to apply discounts at checkout.</Typography>
      ) : (
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Applies to</TableCell>
              <TableCell>Valid</TableCell>
              <TableCell>Uses</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {codes.map((code: IDiscountCode) => {
              const status = getCodeStatus(code)
              return (
                <TableRow key={code.id} hover>
                  <TableCell><Typography fontWeight={600}>{code.code}</Typography></TableCell>
                  <TableCell>
                    {code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.discountValue} (fixed)`}
                  </TableCell>
                  <TableCell>{code.applicableCategories.length === 0 ? 'All categories' : `${code.applicableCategories.length} categories`}</TableCell>
                  <TableCell>
                    {code.validFrom || code.validTo
                      ? `${code.validFrom ? format(parseISO(code.validFrom), 'dd.MM.yy') : '∞'} → ${code.validTo ? format(parseISO(code.validTo), 'dd.MM.yy') : '∞'}`
                      : 'Always'}
                  </TableCell>
                  <TableCell>{code.usedCount}{code.maxUses != null ? ` / ${code.maxUses}` : ''}</TableCell>
                  <TableCell><Chip size='small' label={status.label} color={status.color} /></TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.5}>
                      <IconButton size='small' onClick={() => openEdit(code)}>✏</IconButton>
                      <IconButton size='small' color='error' onClick={() => handleDelete(code.id)}>✕</IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <CodeDialog open={dialogOpen} onClose={() => setDialogOpen(false)} hotelId={hotelId} editing={editing} />
    </Box>
  )
}
