'use client'

import { useMemo, useState } from 'react'

import dynamic from 'next/dynamic'

import IconPicker, { IconPickerItem } from 'react-icons-picker'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { Add, ArrowDownward, ArrowUpward, Delete, Search } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import { toast } from 'react-toastify'

import type { IHotelMapSettings, IMapCustomPreset, IMapPoint, MapMarkerIcon } from '@/types'
import ColorPicker from '@/components/widgets/ColorPicker'

const MapPointLocationPicker = dynamic(() => import('./MapPointLocationPicker').then(mod => mod.default), { ssr: false })
const MapPointsOverview = dynamic(() => import('./MapPointsOverview').then(mod => mod.default), { ssr: false })

const MARKER_ICON_OPTIONS: { label: string; value: MapMarkerIcon; iconClass?: string; suggestedColor: string }[] = [
  { label: 'Hotel', value: 'hotel', iconClass: 'ri-hotel-line', suggestedColor: '#2563eb' },
  { label: 'Food', value: 'food', iconClass: 'ri-restaurant-line', suggestedColor: '#ef4444' },
  { label: 'Drink', value: 'drink', iconClass: 'ri-goblet-line', suggestedColor: '#f97316' },
  { label: 'Beach', value: 'beach', iconClass: 'ri-umbrella-line', suggestedColor: '#eab308' },
  { label: 'Pool', value: 'pool', iconClass: 'ri-water-flash-line', suggestedColor: '#06b6d4' },
  { label: 'Spa', value: 'spa', iconClass: 'ri-heart-pulse-line', suggestedColor: '#10b981' },
  { label: 'Taxi', value: 'taxi', iconClass: 'ri-taxi-line', suggestedColor: '#f59e0b' },
  { label: 'Parking', value: 'parking', iconClass: 'ri-parking-box-line', suggestedColor: '#64748b' },
  { label: 'Activity', value: 'activity', iconClass: 'ri-run-line', suggestedColor: '#8b5cf6' },
  { label: 'Shopping', value: 'shopping', iconClass: 'ri-shopping-bag-3-line', suggestedColor: '#ec4899' },
  { label: 'Info', value: 'info', iconClass: 'ri-information-line', suggestedColor: '#0ea5e9' },
  { label: 'Viewpoint', value: 'viewpoint', iconClass: 'ri-landscape-line', suggestedColor: '#14b8a6' },
  { label: 'Transport', value: 'transport', iconClass: 'ri-bus-line', suggestedColor: '#6366f1' },
  { label: 'Coffee', value: 'coffee', iconClass: 'ri-cup-line', suggestedColor: '#92400e' },
  { label: 'Custom', value: 'custom', iconClass: 'ri-shapes-line', suggestedColor: '#0f172a' }
]

const createMarker = (): IMapPoint => ({
  id: `marker-${Math.random().toString(36).slice(2, 10)}`,
  title: '',
  description: '',
  image: '',
  address: '',
  lat: 43.5081,
  lng: 16.4402,
  color: '#0ea5e9',
  icon: 'info',
  customPresetId: '',
  customIconClass: '',
  customIconImage: '',
  isActive: true,
  sortOrder: 0
})

const inputLabelProps = { shrink: true }

interface MapSettingsSectionProps {
  map: IHotelMapSettings | undefined
  mapPoints: IMapPoint[] | undefined
  onMapChange: (map: IHotelMapSettings) => void
  onMapPointsChange: (mapPoints: IMapPoint[]) => void
}

const normalizePoint = (point: IMapPoint, index: number): IMapPoint => ({
  ...point,
  sortOrder: point.sortOrder ?? index,
  color: point.color || '#0ea5e9',
  icon: point.icon || 'info',
  address: point.address || '',
  customPresetId: point.customPresetId || '',
  customIconClass: point.customIconClass || '',
  customIconImage: point.customIconImage || ''
})

const normalizeCustomPreset = (preset: IMapCustomPreset): IMapCustomPreset => ({
  ...preset,
  id: preset.id || `custom-icon-${Math.random().toString(36).slice(2, 10)}`,
  name: preset.name || 'Custom icon',
  icon: preset.icon || 'TiStar',
  color: preset.color || '#0ea5e9',
  text: preset.text || ''
})

const MapSettingsSection = ({ map, mapPoints, onMapChange, onMapPointsChange }: MapSettingsSectionProps) => {
  const [searchingPointId, setSearchingPointId] = useState<string | null>(null)
  const [searchingHotelCenter, setSearchingHotelCenter] = useState(false)
  const [showHotelMapEditor, setShowHotelMapEditor] = useState(false)
  const [activePointMapId, setActivePointMapId] = useState<string | null>(null)
  const [showOverviewMap, setShowOverviewMap] = useState(false)
  const [customPresetDrafts, setCustomPresetDrafts] = useState<Record<string, string>>({})

  const currentMap: IHotelMapSettings = {
    enabled: false,
    defaultState: 'collapsed',
    showHotelMarker: true,
    zoom: 14,
    ...map
  }

  const points = useMemo(
    () =>
      (mapPoints || []).map((point, index) => ({
        ...normalizePoint(point, index)
      })),
    [mapPoints]
  )

  const customPresets = useMemo(
    () => (currentMap.customPresets || []).map(preset => normalizeCustomPreset(preset)),
    [currentMap.customPresets]
  )

  const updateMap = (patch: Partial<IHotelMapSettings>) => onMapChange({ ...currentMap, ...patch })

  const updatePoint = (index: number, patch: Partial<IMapPoint>) => {
    const next = [...points]

    next[index] = normalizePoint({ ...next[index], ...patch }, index)
    onMapPointsChange(next)
  }

  const addPoint = () => onMapPointsChange([...points, createMarker()].map((point, index) => normalizePoint(point, index)))

  const getPointKey = (point: IMapPoint, index: number) => point.id || `${index}`

  const updateCustomPresets = (nextPresets: IMapCustomPreset[]) =>
    onMapChange({
      ...currentMap,
      customPresets: nextPresets.map(preset => normalizeCustomPreset(preset))
    })

  const applyCustomPresetToPoint = (index: number, presetId: string) => {
    const preset = customPresets.find(item => item.id === presetId)

    if (!preset) return

    updatePoint(index, {
      icon: 'custom',
      customPresetId: preset.id,
      customIconClass: preset.icon,
      color: preset.color || '#0ea5e9'
    })
  }

  const savePointAsCustomPreset = (index: number) => {
    const point = points[index]
    const pointKey = getPointKey(point, index)
    const presetName = (customPresetDrafts[pointKey] || point.title || `Custom icon ${customPresets.length + 1}`).trim()

    if (!point.customIconClass) {
      toast.info('Choose an icon before saving a custom icon.')

      return
    }

    const preset = normalizeCustomPreset({
      id: `custom-icon-${Math.random().toString(36).slice(2, 10)}`,
      name: presetName,
      icon: point.customIconClass,
      color: point.color || '#0ea5e9',
      text: point.description || ''
    })

    updateCustomPresets([...customPresets, preset])
    updatePoint(index, {
      icon: 'custom',
      customPresetId: preset.id
    })
    setCustomPresetDrafts(prev => ({ ...prev, [pointKey]: preset.name }))
    toast.success('Custom icon saved. You can now reuse it on other points.')
  }

  const removeCustomPreset = (presetId: string) => {
    updateCustomPresets(customPresets.filter(preset => preset.id !== presetId))

    onMapPointsChange(
      points.map((point, index) =>
        point.customPresetId === presetId
          ? normalizePoint({ ...point, customPresetId: '' }, index)
          : normalizePoint(point, index)
      )
    )
  }

  const removePoint = (index: number) => {
    const next = [...points]

    next.splice(index, 1)
    onMapPointsChange(next.map((point, pointIndex) => normalizePoint(point, pointIndex)))
  }

  const movePoint = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1

    if (nextIndex < 0 || nextIndex >= points.length) return

    const next = [...points]

    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]

    onMapPointsChange(next.map((point, pointIndex) => normalizePoint(point, pointIndex)))
  }

  const handleSearchAddress = async (index: number) => {
    const point = points[index]

    if (!point.address?.trim()) {
      toast.info('Upisi adresu prije pretrage.')

      return
    }

    setSearchingPointId(point.id || `${index}`)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(point.address)}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Address lookup failed')
      }

      const results = await response.json()

      if (!Array.isArray(results) || results.length === 0) {
        toast.info('Adresa nije pronađena. Probaj precizniji unos ili ručno pomakni pin.')

        return
      }

      const match = results[0]

      updatePoint(index, {
        address: match.display_name || point.address,
        lat: Number(match.lat),
        lng: Number(match.lon)
      })
      toast.success('Lokacija pronađena. Ako nije točna, povuci pin ili ručno upiši koordinate.')
    } catch (error) {
      toast.error('Pretraga adrese nije uspjela.')
    } finally {
      setSearchingPointId(null)
    }
  }

  const handleSearchHotelAddress = async () => {
    if (!currentMap.centerAddress?.trim()) {
      toast.info('Upisi adresu hotela prije pretrage.')

      return
    }

    setSearchingHotelCenter(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(currentMap.centerAddress)}`,
        {
          headers: {
            Accept: 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Hotel address lookup failed')
      }

      const results = await response.json()

      if (!Array.isArray(results) || results.length === 0) {
        toast.info('Hotel adresa nije pronađena. Probaj precizniji unos ili ručno namjesti marker.')

        return
      }

      const match = results[0]

      updateMap({
        centerAddress: match.display_name || currentMap.centerAddress,
        centerLat: Number(match.lat),
        centerLng: Number(match.lon)
      })
      toast.success('Hotel lokacija pronađena. Ako nije točna, ručno pomakni marker ili upiši koordinate.')
    } catch (error) {
      toast.error('Pretraga hotel adrese nije uspjela.')
    } finally {
      setSearchingHotelCenter(false)
    }
  }

  return (
    <Stack gap={3}>
      <Divider />
      <Stack gap={1}>
        <Typography variant='h5'>Guest Map</Typography>
        <Typography variant='body2' color='text.secondary'>
          Control the expandable map shown under the room buttons and manage the points shown on it.
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            variant='standard'
            label='Map visibility'
            InputLabelProps={inputLabelProps}
            value={currentMap.enabled ? currentMap.defaultState || 'collapsed' : 'hidden'}
            onChange={event => {
              const value = event.target.value

              if (value === 'hidden') {
                updateMap({ enabled: false })

                return
              }

              updateMap({ enabled: true, defaultState: value as 'collapsed' | 'expanded' })
            }}
          >
            <MenuItem value='hidden'>Hidden</MenuItem>
            <MenuItem value='collapsed'>Collapsed by default</MenuItem>
            <MenuItem value='expanded'>Expanded by default</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            variant='standard'
            label='Hotel marker'
            InputLabelProps={inputLabelProps}
            value={currentMap.showHotelMarker ? 'shown' : 'hidden'}
            onChange={event => updateMap({ showHotelMarker: event.target.value === 'shown' })}
          >
            <MenuItem value='shown'>Show hotel/home marker</MenuItem>
            <MenuItem value='hidden'>Hide hotel/home marker</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            variant='standard'
            label='Hotel address'
            InputLabelProps={inputLabelProps}
            placeholder='Upiši adresu hotela'
            value={currentMap.centerAddress ?? ''}
            onChange={event =>
              updateMap({
                centerAddress: event.target.value
              })
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <LoadingButton
            fullWidth
            variant='outlined'
            startIcon={<Search />}
            loading={searchingHotelCenter}
            onClick={handleSearchHotelAddress}
            sx={{ height: '100%' }}
          >
            Search hotel address
          </LoadingButton>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            variant='standard'
            label='Center latitude'
            InputLabelProps={inputLabelProps}
            type='number'
            value={currentMap.centerLat ?? ''}
            onChange={event =>
              updateMap({
                centerLat: event.target.value === '' ? undefined : Number(event.target.value)
              })
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            variant='standard'
            label='Center longitude'
            InputLabelProps={inputLabelProps}
            type='number'
            value={currentMap.centerLng ?? ''}
            onChange={event =>
              updateMap({
                centerLng: event.target.value === '' ? undefined : Number(event.target.value)
              })
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            variant='standard'
            label='Zoom'
            InputLabelProps={inputLabelProps}
            type='number'
            value={currentMap.zoom ?? 14}
            onChange={event =>
              updateMap({
                zoom: event.target.value === '' ? undefined : Number(event.target.value)
              })
            }
          />
        </Grid>
        <Grid item xs={12}>
          <Stack gap={1}>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <Typography variant='body2' color='text.secondary'>
                This sets the hotel home marker and default guest map center.
              </Typography>
              <Button variant='outlined' size='small' onClick={() => setShowHotelMapEditor(prev => !prev)}>
                {showHotelMapEditor ? 'Hide hotel map' : 'Edit hotel on map'}
              </Button>
            </Stack>
            {showHotelMapEditor && (
              <MapPointLocationPicker
                lat={Number(currentMap.centerLat) || 43.5081}
                lng={Number(currentMap.centerLng) || 16.4402}
                color='#1d4ed8'
                onChange={coords =>
                  updateMap({
                    centerLat: coords.lat,
                    centerLng: coords.lng
                  })
                }
              />
            )}
          </Stack>
        </Grid>
      </Grid>

      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Typography variant='h6'>Manual Map Points</Typography>
        <Button variant='outlined' startIcon={<Add />} onClick={addPoint}>
          Add Point
        </Button>
      </Stack>

      <Alert severity='info'>
        Hotels prvo dodaju map pointe ovdje, a onda ih blog sekcije mogu linkati na postojeći point. Adresu možeš pretražiti,
        a zatim po potrebi fino namjestiti pin povlačenjem ili ručnim koordinatama.
      </Alert>

      <Stack gap={2}>
        {points.length === 0 ? (
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='body2' color='text.secondary'>
                No manual map points added yet.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          points.map((point, index) => (
            <Card key={point.id || index} variant='outlined'>
              <CardContent>
                <Stack gap={2.5}>
                  <Stack direction='row' alignItems='center' justifyContent='space-between'>
                    <Typography variant='subtitle1'>Point {index + 1}</Typography>
                    <Stack direction='row'>
                      <IconButton onClick={() => movePoint(index, 'up')} disabled={index === 0}>
                        <ArrowUpward />
                      </IconButton>
                      <IconButton onClick={() => movePoint(index, 'down')} disabled={index === points.length - 1}>
                        <ArrowDownward />
                      </IconButton>
                      <IconButton color='error' onClick={() => removePoint(index)}>
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        variant='standard'
                        label='Point title'
                        InputLabelProps={inputLabelProps}
                        value={point.title || ''}
                        onChange={event => updatePoint(index, { title: event.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      {(() => {
                        const selectedIconValue =
                          point.icon === 'custom' && point.customPresetId ? `preset:${point.customPresetId}` : point.icon || 'info'

                        return (
                      <TextField
                        select
                        fullWidth
                        variant='standard'
                        label='Icon'
                        InputLabelProps={inputLabelProps}
                        value={selectedIconValue}
                        onChange={event => {
                          const nextValue = event.target.value

                          if (typeof nextValue === 'string' && nextValue.startsWith('preset:')) {
                            applyCustomPresetToPoint(index, nextValue.replace('preset:', ''))

                            return
                          }

                          const nextIcon = nextValue as MapMarkerIcon
                          const option = MARKER_ICON_OPTIONS.find(item => item.value === nextIcon)

                          updatePoint(index, {
                            icon: nextIcon,
                            ...(nextIcon !== 'custom'
                              ? {
                                  customPresetId: '',
                                  customIconClass: '',
                                  customIconImage: '',
                                  color: option?.suggestedColor || point.color || '#0ea5e9'
                                }
                              : {
                                  customIconClass: point.customIconClass || 'TiStar'
                                })
                          })
                        }}
                      >
                        {MARKER_ICON_OPTIONS.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            <Stack direction='row' alignItems='center' gap={1}>
                              {option.iconClass ? <i className={option.iconClass} style={{ fontSize: 18 }} /> : null}
                              <span>{option.label}</span>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: option.suggestedColor,
                                  border: '1px solid rgba(15, 23, 42, 0.12)'
                                }}
                              />
                            </Stack>
                          </MenuItem>
                        ))}
                        {customPresets.length > 0 && (
                          <MenuItem disabled sx={{ opacity: 1 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Saved custom icons
                            </Typography>
                          </MenuItem>
                        )}
                        {customPresets.map(preset => (
                          <MenuItem key={preset.id} value={`preset:${preset.id}`}>
                            <Stack direction='row' alignItems='center' gap={1}>
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  display: 'grid',
                                  placeItems: 'center',
                                  backgroundColor: preset.color || '#0ea5e9',
                                  color: 'white'
                                }}
                              >
                                <IconPickerItem value={preset.icon || 'TiStar'} size={12} />
                              </Box>
                              <span>{preset.name}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </TextField>
                        )
                      })()}
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        variant='standard'
                        label='Short info text'
                        InputLabelProps={inputLabelProps}
                        value={point.description || ''}
                        onChange={event => updatePoint(index, { description: event.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        variant='standard'
                        label='Image URL (optional)'
                        InputLabelProps={inputLabelProps}
                        value={point.image || ''}
                        onChange={event => updatePoint(index, { image: event.target.value })}
                      />
                    </Grid>

                    <Grid item xs={12} md={9}>
                      <TextField
                        fullWidth
                        variant='standard'
                        label='Address'
                        InputLabelProps={inputLabelProps}
                        placeholder='Upiši adresu ili naziv mjesta'
                        value={point.address || ''}
                        onChange={event => updatePoint(index, { address: event.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <LoadingButton
                        fullWidth
                        variant='outlined'
                        startIcon={<Search />}
                        loading={searchingPointId === (point.id || `${index}`)}
                        onClick={() => handleSearchAddress(index)}
                        sx={{ height: '100%' }}
                      >
                        Search address
                      </LoadingButton>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        variant='standard'
                        label='Latitude'
                        InputLabelProps={inputLabelProps}
                        type='number'
                        value={point.lat ?? ''}
                        onChange={event => updatePoint(index, { lat: Number(event.target.value) })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        variant='standard'
                        label='Longitude'
                        InputLabelProps={inputLabelProps}
                        type='number'
                        value={point.lng ?? ''}
                        onChange={event => updatePoint(index, { lng: Number(event.target.value) })}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Stack gap={1.5}>
                        <Stack direction='row' justifyContent='space-between' alignItems='center' flexWrap='wrap' gap={1}>
                          <Typography variant='body2'>Marker color</Typography>
                          <Stack direction='row' alignItems='center' gap={1}>
                            <Typography variant='caption' color='text.secondary'>
                              Selected
                            </Typography>
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                backgroundColor: point.color || '#0ea5e9',
                                border: '1px solid rgba(15, 23, 42, 0.12)'
                              }}
                            />
                          </Stack>
                        </Stack>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {MARKER_ICON_OPTIONS.filter(option => option.value !== 'custom').map(option => (
                            <Button
                              key={option.value}
                              size='small'
                              variant={point.color === option.suggestedColor ? 'contained' : 'outlined'}
                              onClick={() => updatePoint(index, { color: option.suggestedColor })}
                              startIcon={
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: option.suggestedColor,
                                    border: '1px solid rgba(255,255,255,0.45)'
                                  }}
                                />
                              }
                            >
                              {option.label}
                            </Button>
                          ))}
                        </Stack>
                        <ColorPicker
                          label='Custom color'
                          value={point.color || '#0ea5e9'}
                          setValue={(value: string) => updatePoint(index, { color: value })}
                        />
                      </Stack>
                    </Grid>

                    {point.icon === 'custom' && (
                      <>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            variant='standard'
                            label='Reusable icon name'
                            InputLabelProps={inputLabelProps}
                            placeholder='e.g. Kids area, Gym, Pet zone'
                            value={customPresetDrafts[getPointKey(point, index)] || ''}
                            onChange={event =>
                              setCustomPresetDrafts(prev => ({
                                ...prev,
                                [getPointKey(point, index)]: event.target.value
                              }))
                            }
                            helperText='Save this icon under a reusable name so it appears in the icon dropdown.'
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Stack gap={1}>
                            <Typography variant='body2'>Custom icon</Typography>
                            <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap'>
                              <IconPicker
                                value={point.customIconClass || 'TiStar'}
                                onChange={(value: any) => updatePoint(index, { customIconClass: value })}
                              />
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  display: 'grid',
                                  placeItems: 'center',
                                  backgroundColor: point.color || '#0ea5e9',
                                  color: 'white'
                                }}
                              >
                                <IconPickerItem value={point.customIconClass || 'TiStar'} size={16} />
                              </Box>
                            </Stack>
                          </Stack>
                        </Grid>
                        <Grid item xs={12}>
                          <Stack direction='row' gap={1} flexWrap='wrap' alignItems='center'>
                            <Button variant='contained' onClick={() => savePointAsCustomPreset(index)}>
                              Save custom icon
                            </Button>
                            <Typography variant='caption' color='text.secondary'>
                              This adds it to the normal icon choices so you can reuse it on multiple points.
                            </Typography>
                          </Stack>
                        </Grid>
                      </>
                    )}

                    {customPresets.length > 0 && (
                      <Grid item xs={12}>
                        <Stack gap={1}>
                          <Typography variant='body2'>Saved custom icons</Typography>
                          <Stack direction='row' gap={1} flexWrap='wrap'>
                            {customPresets.map(preset => (
                              <Button
                                key={preset.id}
                                size='small'
                                variant={point.customPresetId === preset.id ? 'contained' : 'outlined'}
                                startIcon={
                                  <Box
                                    sx={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      display: 'grid',
                                      placeItems: 'center',
                                      backgroundColor: preset.color || '#0ea5e9',
                                      color: 'white'
                                    }}
                                  >
                                    <IconPickerItem value={preset.icon || 'TiStar'} size={10} />
                                  </Box>
                                }
                                onClick={() => applyCustomPresetToPoint(index, preset.id)}
                              >
                                {preset.name}
                              </Button>
                            ))}
                          </Stack>
                          <Stack direction='row' gap={1} flexWrap='wrap'>
                            {customPresets.map(preset => (
                              <Button key={`${preset.id}-remove`} color='error' size='small' onClick={() => removeCustomPreset(preset.id)}>
                                Delete {preset.name}
                              </Button>
                            ))}
                          </Stack>
                        </Stack>
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Stack gap={1}>
                        <Stack direction='row' alignItems='center' justifyContent='space-between'>
                          <Typography variant='body2' color='text.secondary'>
                            Fine-tune this point on the map only when needed.
                          </Typography>
                          <Button
                            variant='outlined'
                            size='small'
                            onClick={() => setActivePointMapId(prev => (prev === (point.id || `${index}`) ? null : point.id || `${index}`))}
                          >
                            {activePointMapId === (point.id || `${index}`) ? 'Hide point map' : 'Set point on map'}
                          </Button>
                        </Stack>
                        {activePointMapId === (point.id || `${index}`) && (
                          <MapPointLocationPicker
                            lat={Number(point.lat) || 43.5081}
                            lng={Number(point.lng) || 16.4402}
                            color={point.color}
                            onChange={coords => updatePoint(index, coords)}
                          />
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      <Stack gap={1}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <div>
            <Typography variant='h6'>Map Preview</Typography>
            <Typography variant='body2' color='text.secondary'>
              Quick overview of the hotel marker and all active points together.
            </Typography>
          </div>
          <Button variant='outlined' size='small' onClick={() => setShowOverviewMap(prev => !prev)}>
            {showOverviewMap ? 'Hide all points' : 'Show all points'}
          </Button>
        </Stack>
        {showOverviewMap && (
          <MapPointsOverview
            hotelCenter={{ lat: currentMap.centerLat, lng: currentMap.centerLng }}
            points={points.filter(point => point.isActive !== false)}
            showHotelMarker={currentMap.showHotelMarker}
          />
        )}
      </Stack>
    </Stack>
  )
}

export default MapSettingsSection
