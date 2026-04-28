'use client'
import { useEffect, useState } from 'react'

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, MenuItem, Select,
  InputAdornment, Typography, Switch, FormControlLabel,
  ButtonGroup, Box, ToggleButtonGroup, ToggleButton,
  Accordion, AccordionSummary, AccordionDetails,
  RadioGroup, Radio, Checkbox
} from '@mui/material'

import { toast } from 'react-toastify'

import { useCreateCatalogItemMutation, useUpdateCatalogItemMutation } from '@/redux/api/ordersApi'

import type { ICatalogItem, IOrderCategory } from '@/types'
import ImagePicker from '@/components/widgets/ImagePicker'
import { useDictionary } from '@/contexts/DictionaryContext'

const EMOJI_PRESETS = ['🍔', '🍕', '🍣', '🥗', '🍷', '☕', '🍰', '🥩', '🌮', '✈️', '🏖️', '💆', '🛎️', '🎭', '🚗', '🎁', '🧴', '🌿', '🎵', '🏋️']
const BADGE_OPTIONS = [{ value: '', label: 'None' }, { value: 'new', label: 'New' }, { value: 'hit', label: 'Hit' }, { value: 'sale', label: 'Sale' }]
const IMAGE_TYPES = ['emoji', 'url', 'upload'] as const

const WEEKLY_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type WeekDay = typeof WEEKLY_DAYS[number]

interface TimeWindow { from: string; to: string }
interface BookingConfig {
  bookableCategory: string
  bookingModel: string
  totalInventory: number
  capacityPerUnit: number
  minPersons: number
  duration: number
  bufferMinutes: number
  startInterval: number
  advanceMinHours: number
  advanceMaxDays: number
  simpleAvailabilityEnabled: boolean
  simpleFrom: string
  simpleTo: string
  weeklySchedule: Record<WeekDay, TimeWindow[]>
  pricePerPerson: boolean
  cancellationPolicy: string
  cancellationPolicyHours: number
  confirmationType: string
  addons: { _id: string; name: string; price: number; description: string }[]
}

const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  bookableCategory: 'service',
  bookingModel: 'exclusive',
  totalInventory: 1,
  capacityPerUnit: 1,
  minPersons: 1,
  duration: 60,
  bufferMinutes: 15,
  startInterval: 60,
  advanceMinHours: 1,
  advanceMaxDays: 60,
  simpleAvailabilityEnabled: true,
  simpleFrom: '08:00',
  simpleTo: '22:00',
  weeklySchedule: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  pricePerPerson: false,
  cancellationPolicy: 'free_24h',
  cancellationPolicyHours: 24,
  confirmationType: 'instant',
  addons: [],
}

interface Props {
  open: boolean
  onClose: () => void
  hotelId: string
  categories: IOrderCategory[]
  item?: ICatalogItem | null
  defaultCategoryId?: string
  currency?: string
}

export default function ItemDialog({ open, onClose, hotelId, categories, item, defaultCategoryId, currency = '€' }: Props) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.itemDialog || {}

  // Basic fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [discount, setDiscount] = useState('0')
  const [imageType, setImageType] = useState<'emoji' | 'url' | 'upload'>('emoji')
  const [image, setImage] = useState<any>('🍔')
  const [badge, setBadge] = useState('')
  const [available, setAvailable] = useState(true)

  // Type toggle
  const [itemType, setItemType] = useState<'instant' | 'bookable'>('instant')

  // Booking config
  const [bookingConfig, setBookingConfig] = useState<BookingConfig>(DEFAULT_BOOKING_CONFIG)

  // Addon inline form state
  const [addonName, setAddonName] = useState('')
  const [addonPrice, setAddonPrice] = useState('')
  const [addonDescription, setAddonDescription] = useState('')

  const setBC = (partial: Partial<BookingConfig>) => setBookingConfig(prev => ({ ...prev, ...partial }))
  const bc = bookingConfig

  const [createItem, { isLoading: creating }] = useCreateCatalogItemMutation()
  const [updateItem, { isLoading: updating }] = useUpdateCatalogItemMutation()
  const loading = creating || updating

  useEffect(() => {
    if (open) {
      setName(item?.name || '')
      setDescription(item?.description || '')
      setCategoryId(item?.categoryId || defaultCategoryId || categories[0]?.id || '')
      setPrice(item ? String(item.price) : '')
      setDiscount(item ? String(item.discount || 0) : '0')
      setImageType(item?.imageType || 'emoji')
      setImage(item?.image || '🍔')
      setBadge(item?.badge || '')
      setAvailable(item?.available ?? true)
      setItemType((item?.type as 'instant' | 'bookable') || 'instant')
      setBookingConfig(
        item?.bookingConfig
          ? { ...DEFAULT_BOOKING_CONFIG, ...item.bookingConfig }
          : DEFAULT_BOOKING_CONFIG
      )
      setAddonName('')
      setAddonPrice('')
      setAddonDescription('')
    }
  }, [item, open, defaultCategoryId, categories])

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleSave = async () => {
    if (!name.trim() || !price) return
    let imageVal: string

    if (imageType === 'upload' && image instanceof File) {
      imageVal = await toBase64(image)
    } else {
      imageVal = typeof image === 'string' ? image : ''
    }

    const basicFields = {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      price: parseFloat(price),
      discount: parseInt(discount) || 0,
      image: imageVal,
      imageType,
      badge,
      available,
    }

    let body: any

    if (itemType === 'bookable') {
      const bookingConfigPayload = {
        bookableCategory: bc.bookableCategory,
        bookingModel: bc.bookingModel,
        totalInventory: bc.totalInventory,
        capacityPerUnit: bc.capacityPerUnit,
        minPersons: bc.minPersons,
        duration: bc.duration,
        bufferMinutes: bc.bufferMinutes,
        startInterval: bc.startInterval,
        advanceMinHours: bc.advanceMinHours,
        advanceMaxDays: bc.advanceMaxDays,
        confirmationType: bc.confirmationType,
        pricePerPerson: bc.pricePerPerson,
        cancellationPolicy: bc.cancellationPolicy,
        cancellationPolicyHours: bc.cancellationPolicyHours,
        addons: bc.addons.map(a => ({ name: a.name, price: a.price, description: a.description })),
        simpleAvailability: {
          enabled: bc.simpleAvailabilityEnabled,
          from: bc.simpleFrom,
          to: bc.simpleTo,
        },
        ...(bc.simpleAvailabilityEnabled ? {} : { weeklySchedule: bc.weeklySchedule }),
      }

      body = { ...basicFields, type: itemType, bookingConfig: bookingConfigPayload }
    } else {
      body = { ...basicFields, type: 'instant' }
    }

    try {
      if (item) {
        await updateItem({ hotelId, itemId: item.id, ...body }).unwrap()
        toast.success(t.itemUpdated || 'Item updated')
      } else {
        await createItem({ hotelId, ...body }).unwrap()
        toast.success(t.itemCreated || 'Item created')
      }

      onClose()
    } catch {
      toast.error(t.saveItemFailed || 'Failed to save item')
    }
  }

  const handleAddAddon = () => {
    if (!addonName.trim()) return
    setBC({
      addons: [
        ...bc.addons,
        { _id: crypto.randomUUID(), name: addonName.trim(), price: parseFloat(addonPrice) || 0, description: addonDescription.trim() },
      ],
    })
    setAddonName('')
    setAddonPrice('')
    setAddonDescription('')
  }

  const handleRemoveAddon = (id: string) => {
    setBC({ addons: bc.addons.filter(a => a._id !== id) })
  }

  const handleWeekdayToggle = (day: WeekDay, checked: boolean) => {
    setBC({
      weeklySchedule: {
        ...bc.weeklySchedule,
        [day]: checked ? [{ from: '08:00', to: '22:00' }] : [],
      },
    })
  }

  const handleWeekdayTime = (day: WeekDay, field: 'from' | 'to', value: string) => {
    const existing = bc.weeklySchedule[day]

    setBC({
      weeklySchedule: {
        ...bc.weeklySchedule,
        [day]: existing.length > 0 ? [{ ...existing[0], [field]: value }] : [{ from: '08:00', to: '22:00', [field]: value }],
      },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{item ? (t.editItem || 'Edit Item') : (t.newItem || 'New Item')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>

          {/* Name + Category */}
          <Stack direction='row' gap={2}>
            <Stack gap={0.5} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{dictionary.name}</Typography>
              <TextField value={name} onChange={e => setName(e.target.value)} fullWidth autoFocus size='small' />
            </Stack>
            <Stack gap={0.5} sx={{ minWidth: 150 }}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.category || 'Category'}</Typography>
              <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} size='small' fullWidth>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>

          {/* Type toggle */}
          <ToggleButtonGroup
            value={itemType}
            exclusive
            onChange={(_, v) => v && setItemType(v)}
            size='small'
            fullWidth
          >
            <ToggleButton value='instant'>⚡ Instant Order</ToggleButton>
            <ToggleButton value='bookable'>📅 Bookable Service</ToggleButton>
          </ToggleButtonGroup>

          {/* Description */}
          <Stack gap={0.5}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>{dictionary.description}</Typography>
            <TextField value={description} onChange={e => setDescription(e.target.value)} fullWidth multiline rows={2} size='small' />
          </Stack>

          {/* Price / Discount / Badge */}
          <Stack direction='row' gap={2}>
            <Stack gap={0.5} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{dictionary.price}</Typography>
              <TextField
                value={price} onChange={e => setPrice(e.target.value)} type='number' size='small'
                InputProps={{ startAdornment: <InputAdornment position='start'>{currency}</InputAdornment> }}
                fullWidth
              />
            </Stack>
            <Stack gap={0.5} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.discount || 'Discount'}</Typography>
              <TextField
                value={discount} onChange={e => setDiscount(e.target.value)} type='number' size='small'
                InputProps={{ endAdornment: <InputAdornment position='end'>%</InputAdornment> }}
                fullWidth
              />
            </Stack>
            <Stack gap={0.5} flex={1}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.badge || 'Badge'}</Typography>
              <Select value={badge} onChange={e => setBadge(e.target.value)} size='small' fullWidth>
                {BADGE_OPTIONS.map(b => <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>)}
              </Select>
            </Stack>
          </Stack>

          {/* Image / Icon */}
          <Stack gap={1}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.imageIcon || 'Image / Icon'}</Typography>
            <ButtonGroup size='small' fullWidth>
              {IMAGE_TYPES.map(type => (
                <Button key={type} variant={imageType === type ? 'contained' : 'outlined'} onClick={() => setImageType(type)}>
                  {type === 'emoji' ? (t.emojiTab || 'Emoji') : type === 'url' ? 'URL' : (t.uploadTab || 'Upload')}
                </Button>
              ))}
            </ButtonGroup>

            {imageType === 'emoji' && (
              <Stack gap={1}>
                <Stack direction='row' gap={0.5} flexWrap='wrap'>
                  {EMOJI_PRESETS.map(emoji => (
                    <Button
                      key={emoji}
                      variant={image === emoji ? 'contained' : 'outlined'}
                      size='small'
                      onClick={() => setImage(emoji)}
                      sx={{ minWidth: 42, px: 0.5, fontSize: 20 }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </Stack>
                <TextField
                  label={t.customEmoji || 'Custom emoji'}
                  value={typeof image === 'string' ? image : ''}
                  onChange={e => setImage(e.target.value)}
                  size='small' fullWidth
                />
              </Stack>
            )}

            {imageType === 'url' && (
              <Stack gap={1}>
                <TextField
                  value={typeof image === 'string' ? image : ''}
                  onChange={e => setImage(e.target.value)} fullWidth placeholder='https://...'
                  size='small'
                />
                {typeof image === 'string' && image.startsWith('http') && (
                  <Box sx={{ width: 80, height: 80, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100' }}>
                    <img src={image} alt='preview' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}
              </Stack>
            )}

            {imageType === 'upload' && (
              <Stack gap={1}>
                <Box sx={{ maxWidth: 120 }}>
                  <ImagePicker id='item-image' label={t.itemImage || 'Item image'} image={image} setImage={setImage} />
                </Box>
                {(image instanceof File || (typeof image === 'string' && image.startsWith('data:'))) && (
                  <Box sx={{ width: 80, height: 80, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100' }}>
                    <img src={image instanceof File ? URL.createObjectURL(image) : image} alt='preview' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                )}
              </Stack>
            )}
          </Stack>

          {/* Available switch */}
          <FormControlLabel
            control={<Switch checked={available} onChange={e => setAvailable(e.target.checked)} />}
            label={t.available || 'Available'}
          />

          {/* ===== BOOKABLE SECTIONS ===== */}
          {itemType === 'bookable' && (
            <Stack gap={0}>

              {/* Section A — Service Identity */}
              <Accordion disableGutters defaultExpanded>
                <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                  <Typography variant='body2' fontWeight={600}>Service Identity</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack gap={1.5}>
                    <Stack gap={0.5}>
                      <Typography variant='caption' color='text.secondary' fontWeight={600}>Service category</Typography>
                      <Select value={bc.bookableCategory} onChange={e => setBC({ bookableCategory: e.target.value })} size='small' fullWidth>
                        <MenuItem value='transfer'>Transfer / Transport</MenuItem>
                        <MenuItem value='tour'>Tour / Activity</MenuItem>
                        <MenuItem value='service'>Service (Spa, Massage…)</MenuItem>
                        <MenuItem value='rental'>Equipment Rental</MenuItem>
                        <MenuItem value='other'>Other</MenuItem>
                      </Select>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section B — Capacity & Booking Model */}
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                  <Typography variant='body2' fontWeight={600}>Capacity & Booking Model</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack gap={1.5}>
                    <Stack gap={0.5}>
                      <Typography variant='caption' color='text.secondary' fontWeight={600}>Booking model</Typography>
                      <RadioGroup row value={bc.bookingModel} onChange={e => setBC({ bookingModel: e.target.value })}>
                        <FormControlLabel value='exclusive' control={<Radio size='small' />} label='Per Unit (Exclusive)' />
                        <FormControlLabel value='shared' control={<Radio size='small' />} label='Per Seat (Shared)' />
                      </RadioGroup>
                    </Stack>
                    <Stack direction='row' gap={2}>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Total units</Typography>
                        <TextField
                          value={bc.totalInventory}
                          onChange={e => setBC({ totalInventory: parseInt(e.target.value) || 1 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Capacity / unit</Typography>
                        <TextField
                          value={bc.capacityPerUnit}
                          onChange={e => setBC({ capacityPerUnit: parseInt(e.target.value) || 1 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Min persons</Typography>
                        <TextField
                          value={bc.minPersons}
                          onChange={e => setBC({ minPersons: parseInt(e.target.value) || 1 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      Up to {bc.totalInventory * bc.capacityPerUnit} total guests per slot
                    </Typography>
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section C — Schedule & Duration */}
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                  <Typography variant='body2' fontWeight={600}>Schedule & Duration</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack gap={1.5}>
                    <Stack direction='row' gap={2}>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Duration (min)</Typography>
                        <TextField
                          value={bc.duration}
                          onChange={e => setBC({ duration: parseInt(e.target.value) || 0 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Buffer (min)</Typography>
                        <TextField
                          value={bc.bufferMinutes}
                          onChange={e => setBC({ bufferMinutes: parseInt(e.target.value) || 0 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 0 }}
                        />
                      </Stack>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Slot interval</Typography>
                        <Select value={bc.startInterval} onChange={e => setBC({ startInterval: Number(e.target.value) })} size='small' fullWidth>
                          <MenuItem value={15}>15 min</MenuItem>
                          <MenuItem value={30}>30 min</MenuItem>
                          <MenuItem value={60}>60 min</MenuItem>
                          <MenuItem value={120}>120 min</MenuItem>
                        </Select>
                      </Stack>
                    </Stack>

                    <Stack direction='row' gap={2}>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Advance min (h)</Typography>
                        <TextField
                          value={bc.advanceMinHours}
                          onChange={e => setBC({ advanceMinHours: parseInt(e.target.value) || 0 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 0 }}
                        />
                      </Stack>
                      <Stack gap={0.5} flex={1}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Advance max (days)</Typography>
                        <TextField
                          value={bc.advanceMaxDays}
                          onChange={e => setBC({ advanceMaxDays: parseInt(e.target.value) || 0 })}
                          type='number' size='small' fullWidth
                          inputProps={{ min: 1 }}
                        />
                      </Stack>
                    </Stack>

                    {/* Availability pattern */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bc.simpleAvailabilityEnabled}
                          onChange={e => setBC({ simpleAvailabilityEnabled: e.target.checked })}
                          size='small'
                        />
                      }
                      label={<Typography variant='caption' fontWeight={600}>Simple availability (same every day)</Typography>}
                    />

                    {bc.simpleAvailabilityEnabled ? (
                      <Stack direction='row' gap={2}>
                        <Stack gap={0.5} flex={1}>
                          <Typography variant='caption' color='text.secondary' fontWeight={600}>From</Typography>
                          <TextField
                            value={bc.simpleFrom}
                            onChange={e => setBC({ simpleFrom: e.target.value })}
                            type='time' size='small' fullWidth
                          />
                        </Stack>
                        <Stack gap={0.5} flex={1}>
                          <Typography variant='caption' color='text.secondary' fontWeight={600}>To</Typography>
                          <TextField
                            value={bc.simpleTo}
                            onChange={e => setBC({ simpleTo: e.target.value })}
                            type='time' size='small' fullWidth
                          />
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack gap={0.5}>
                        <Typography variant='caption' color='text.secondary' fontWeight={600}>Weekly schedule</Typography>
                        {WEEKLY_DAYS.map(day => {
                          const windows = bc.weeklySchedule[day]
                          const isActive = windows.length > 0
                          const window0 = windows[0] || { from: '08:00', to: '22:00' }

                          return (
                            <Stack key={day} direction='row' gap={1} alignItems='center'>
                              <Checkbox
                                checked={isActive}
                                onChange={e => handleWeekdayToggle(day, e.target.checked)}
                                size='small'
                                sx={{ p: 0.5 }}
                              />
                              <Typography variant='caption' sx={{ width: 32, textTransform: 'capitalize' }}>{day}</Typography>
                              <TextField
                                value={window0.from}
                                onChange={e => handleWeekdayTime(day, 'from', e.target.value)}
                                type='time' size='small' disabled={!isActive}
                                sx={{ flex: 1 }}
                                inputProps={{ style: { fontSize: 12 } }}
                              />
                              <Typography variant='caption'>–</Typography>
                              <TextField
                                value={window0.to}
                                onChange={e => handleWeekdayTime(day, 'to', e.target.value)}
                                type='time' size='small' disabled={!isActive}
                                sx={{ flex: 1 }}
                                inputProps={{ style: { fontSize: 12 } }}
                              />
                            </Stack>
                          )
                        })}
                      </Stack>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Section D — Pricing & Policies */}
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                  <Typography variant='body2' fontWeight={600}>Pricing & Policies</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack gap={1.5}>
                    {/* Price per person */}
                    <Stack gap={0.5}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={bc.pricePerPerson}
                            onChange={e => setBC({ pricePerPerson: e.target.checked })}
                            size='small'
                          />
                        }
                        label={<Typography variant='caption' fontWeight={600}>Price per person</Typography>}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {bc.pricePerPerson
                          ? 'Price is multiplied by number of guests'
                          : 'Flat price per booking, regardless of guests'}
                      </Typography>
                    </Stack>

                    {/* Cancellation policy */}
                    <Stack gap={0.5}>
                      <Typography variant='caption' color='text.secondary' fontWeight={600}>Cancellation policy</Typography>
                      <Select
                        value={bc.cancellationPolicy}
                        onChange={e => setBC({ cancellationPolicy: e.target.value })}
                        size='small' fullWidth
                      >
                        <MenuItem value='free_24h'>Free cancellation up to 24h</MenuItem>
                        <MenuItem value='free_48h'>Free cancellation up to 48h</MenuItem>
                        <MenuItem value='non_refundable'>Non-refundable</MenuItem>
                        <MenuItem value='custom'>Custom</MenuItem>
                      </Select>
                      {bc.cancellationPolicy === 'custom' && (
                        <TextField
                          label='Cancellation hours'
                          value={bc.cancellationPolicyHours}
                          onChange={e => setBC({ cancellationPolicyHours: parseInt(e.target.value) || 0 })}
                          type='number' size='small' fullWidth
                          InputProps={{ endAdornment: <InputAdornment position='end'>h</InputAdornment> }}
                        />
                      )}
                    </Stack>

                    {/* Confirmation type */}
                    <Stack gap={0.5}>
                      <Typography variant='caption' color='text.secondary' fontWeight={600}>Confirmation type</Typography>
                      <RadioGroup row value={bc.confirmationType} onChange={e => setBC({ confirmationType: e.target.value })}>
                        <FormControlLabel value='instant' control={<Radio size='small' />} label='Instant' />
                        <FormControlLabel value='request' control={<Radio size='small' />} label='Request (manual approval)' />
                      </RadioGroup>
                    </Stack>

                    {/* Add-ons */}
                    <Stack gap={0.5}>
                      <Typography variant='caption' color='text.secondary' fontWeight={600}>Add-ons / Options</Typography>
                      {bc.addons.length > 0 && (
                        <Stack gap={0.5}>
                          {bc.addons.map(addon => (
                            <Stack key={addon._id} direction='row' gap={1} alignItems='center'>
                              <Typography variant='caption' flex={1}>{addon.name}</Typography>
                              <Typography variant='caption' color='text.secondary'>{currency}{addon.price}</Typography>
                              {addon.description && (
                                <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {addon.description}
                                </Typography>
                              )}
                              <Button size='small' color='error' onClick={() => handleRemoveAddon(addon._id)} sx={{ minWidth: 'auto', px: 0.5 }}>
                                <i className='ri-delete-bin-line' style={{ fontSize: 14 }} />
                              </Button>
                            </Stack>
                          ))}
                        </Stack>
                      )}
                      <Stack direction='row' gap={1} alignItems='flex-end'>
                        <TextField
                          placeholder='Name' value={addonName} onChange={e => setAddonName(e.target.value)}
                          size='small' sx={{ flex: 2 }}
                        />
                        <TextField
                          placeholder='Price' value={addonPrice} onChange={e => setAddonPrice(e.target.value)}
                          type='number' size='small' sx={{ flex: 1 }}
                          InputProps={{ startAdornment: <InputAdornment position='start'>{currency}</InputAdornment> }}
                        />
                        <TextField
                          placeholder='Description (optional)' value={addonDescription} onChange={e => setAddonDescription(e.target.value)}
                          size='small' sx={{ flex: 2 }}
                        />
                        <Button
                          variant='outlined' size='small' onClick={handleAddAddon}
                          disabled={!addonName.trim()}
                          sx={{ whiteSpace: 'nowrap', height: 40 }}
                        >
                          Add
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>

            </Stack>
          )}

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{dictionary.cancel}</Button>
        <Button variant='contained' onClick={handleSave} disabled={loading || !name.trim() || !price}>
          {loading ? (t.saving || 'Saving...') : dictionary.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
