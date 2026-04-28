import React, { useRef, useState } from 'react'

import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography
} from '@mui/material'

import { toast } from 'react-toastify'

import { RestartAlt } from '@mui/icons-material'

import ColorPicker from '@/components/widgets/ColorPicker'
import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'

const FIT_OPTIONS = [
  { value: 'cover', label: 'Stretch (Cover)', desc: 'Fills the entire background, cropping if needed' },
  { value: 'contain', label: 'Fit (Contain)', desc: 'Shows the full image with letterboxing' },
  { value: 'repeat', label: 'Tile', desc: 'Repeats the image in a grid pattern' },
  { value: 'natural', label: 'Natural size', desc: 'Original size, centered, no repeat' },
]

const POSITION_OPTIONS = [
  { value: 'left top', label: 'Top left' },
  { value: 'center top', label: 'Top' },
  { value: 'right top', label: 'Top right' },
  { value: 'left center', label: 'Left' },
  { value: 'center center', label: 'Center' },
  { value: 'right center', label: 'Right' },
  { value: 'left bottom', label: 'Bottom left' },
  { value: 'center bottom', label: 'Bottom' },
  { value: 'right bottom', label: 'Bottom right' },
]

const BackgroundSettings = ({ background, setBackground, lockState }: any) => {
  const dictionary = useDictionary()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fitDialogOpen, setFitDialogOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFit, setPendingFit] = useState<string>('cover')
  const [pendingPosition, setPendingPosition] = useState<string>('center center')
  const [pendingTileSize, setPendingTileSize] = useState<number>(120)

  const previewImage =
    pendingFile instanceof File
      ? URL.createObjectURL(pendingFile)
      : typeof background?.image === 'string'
        ? background.image
        : undefined

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return
    setPendingFile(file)
    setPendingFit(background?.backgroundFit || 'cover')
    setPendingPosition(background?.backgroundPosition || 'center center')
    setPendingTileSize(background?.tileSize || 120)
    setFitDialogOpen(true)

    // Reset file input so same file can be reselected
    e.target.value = ''
  }

  const handleFitConfirm = () => {
    if (pendingFile) {
      setBackground((prev: any) => ({
        ...prev,
        type: 'image',
        image: pendingFile,
        backgroundFit: pendingFit,
        backgroundPosition: pendingPosition,
        tileSize: pendingTileSize,
      }))
    }

    setFitDialogOpen(false)
    setPendingFile(null)
  }

  const handleFitDialogClose = () => {
    setFitDialogOpen(false)
    setPendingFile(null)
  }

  const handleChangeFitOnly = () => {
    setPendingFit(background?.backgroundFit || 'cover')
    setPendingPosition(background?.backgroundPosition || 'center center')
    setPendingTileSize(background?.tileSize || 120)
    setPendingFile(null)
    setFitDialogOpen(true)
  }

  const handleFitOnlyConfirm = () => {
    setBackground((prev: any) => ({
      ...prev,
      backgroundFit: pendingFit,
      backgroundPosition: pendingPosition,
      tileSize: pendingTileSize,
    }))
    setFitDialogOpen(false)
  }

  const handlePreviewPosition = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.round(((event.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((event.clientY - rect.top) / rect.height) * 100)

    setPendingPosition(`${x}% ${y}%`)
  }

  return (
    <Stack position='relative'>
      <Stack direction='row' alignItems='center'>
        <Typography variant='body2'>{dictionary.backgrounds}</Typography>{' '}
        <IconButton onClick={() => setBackground(null)} size='small'>
          <RestartAlt />
        </IconButton>
      </Stack>
      <Card>
        <CardContent>
          <Stack gap={2}>
            <Stack direction='row' gap={2} flexWrap='wrap'>
              {['flat', 'gradient', 'image'].map(type => (
                <Stack
                  key={type}
                  alignItems='center'
                  onClick={() => setBackground((prev: any) => ({ ...prev, type }))}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box
                    sx={{
                      border: background?.type === type ? '1px solid grey' : '1px solid transparent',
                      padding: 1,
                      borderRadius: 1
                    }}
                  >
                    <Box
                      sx={{
                        background:
                          type === 'gradient'
                            ? 'linear-gradient(0deg, rgb(61, 68, 75) 0%, rgb(104, 109, 115) 100%)'
                            : type === 'image'
                              ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'150\'%3E%3Crect width=\'100\' height=\'150\' fill=\'%23555\'/%3E%3Ctext x=\'50\' y=\'80\' text-anchor=\'middle\' fill=\'white\' font-size=\'28\'%3E🖼️%3C/text%3E%3C/svg%3E")'
                              : 'rgb(61, 68, 75)',
                        borderRadius: 1,
                        width: 100,
                        height: 150,
                        backgroundSize: 'cover'
                      }}
                    />
                  </Box>
                  <Typography variant='body2'>{type.charAt(0).toUpperCase() + type.slice(1)}</Typography>
                </Stack>
              ))}
            </Stack>

            {background?.type === 'gradient' && (
              <Stack gap={1}>
                <Typography variant='body2'>{dictionary.gradientDirection}</Typography>
                <RadioGroup
                  row
                  value={background?.direction}
                  onChange={e => setBackground((prev: any) => ({ ...prev, direction: e.target.value }))}
                >
                  <FormControlLabel value='up' control={<Radio />} label='Up' />
                  <FormControlLabel value='down' control={<Radio />} label='Down' />
                </RadioGroup>
              </Stack>
            )}

            {background?.type === 'image' && (
              <Stack gap={1}>
                <input
                  ref={fileRef}
                  type='file'
                  accept='image/*'
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {background?.image && typeof background.image === 'string' && (
                  <Box
                    component='img'
                    src={background.image}
                    alt='background preview'
                    sx={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 1 }}
                  />
                )}
                {background?.image instanceof File && (
                  <Typography variant='caption' color='text.secondary'>
                    Selected: {background.image.name}
                  </Typography>
                )}
                <Stack direction='row' gap={1} flexWrap='wrap'>
                  <Button variant='outlined' size='small' onClick={() => fileRef.current?.click()}>
                    {background?.image ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {background?.image && (
                    <Button variant='outlined' size='small' onClick={handleChangeFitOnly}>
                      Display options
                    </Button>
                  )}
                </Stack>
                {background?.backgroundFit && (
                  <Typography variant='caption' color='text.secondary'>
                    Mode: {FIT_OPTIONS.find(f => f.value === background.backgroundFit)?.label || background.backgroundFit}
                    {background?.backgroundPosition ? ` · Position: ${POSITION_OPTIONS.find(p => p.value === background.backgroundPosition)?.label || background.backgroundPosition}` : ''}
                  </Typography>
                )}
                <Stack gap={0.5}>
                  <Typography variant='body2'>Overlay darkness: {Math.round((1 - (background?.imageOpacity ?? 1)) * 100)}%</Typography>
                  <Slider
                    value={1 - (background?.imageOpacity ?? 1)}
                    min={0}
                    max={0.7}
                    step={0.05}
                    onChange={(_, val) =>
                      setBackground((prev: any) => ({ ...prev, imageOpacity: 1 - (val as number) }))
                    }
                  />
                </Stack>
              </Stack>
            )}

            {background?.type !== 'image' && (
              <Stack gap={1}>
                <Typography variant='body2'>{dictionary.color}</Typography>
                <ColorPicker
                  setValue={(value: any) => setBackground((prev: any) => ({ ...prev, color: value }))}
                  value={background?.color}
                />
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Image display mode dialog */}
      <Dialog open={fitDialogOpen} onClose={handleFitDialogClose} maxWidth='sm' fullWidth>
        <DialogTitle>Image placement</DialogTitle>
        <DialogContent>
          {pendingFile && (
            <Typography variant='caption' color='text.secondary' display='block' mb={1}>
              File: {pendingFile.name}
            </Typography>
          )}
          {previewImage && (
            <Box
              onClick={handlePreviewPosition}
              sx={{
                height: 190,
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                mb: 2,
                cursor: 'crosshair',
                backgroundImage: `url(${previewImage})`,
                backgroundSize: pendingFit === 'contain' ? 'contain' : pendingFit === 'repeat' ? `${pendingTileSize}px auto` : pendingFit === 'natural' ? 'auto' : 'cover',
                backgroundRepeat: pendingFit === 'repeat' ? 'repeat' : 'no-repeat',
                backgroundPosition: pendingPosition,
              }}
            />
          )}
          <Typography variant='caption' color='text.secondary' display='block' mb={2}>
            Click the preview to choose the most important part of the image.
          </Typography>
          <RadioGroup value={pendingFit} onChange={e => setPendingFit(e.target.value)}>
            {FIT_OPTIONS.map(opt => (
              <Box key={opt.value} sx={{ mb: 1 }}>
                <FormControlLabel
                  value={opt.value}
                  control={<Radio />}
                  label={
                    <Stack>
                      <Typography variant='body2'>{opt.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>{opt.desc}</Typography>
                    </Stack>
                  }
                />
              </Box>
            ))}
          </RadioGroup>
          <Stack gap={1.5} mt={2}>
            <Typography variant='body2'>Focus position</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {POSITION_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={pendingPosition === option.value ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => setPendingPosition(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
          </Stack>
          {pendingFit === 'repeat' && (
            <Stack gap={1} mt={2}>
              <Typography variant='body2'>Tile size: {pendingTileSize}px</Typography>
              <Slider
                value={pendingTileSize}
                min={40}
                max={220}
                step={10}
                onChange={(_, value) => setPendingTileSize(value as number)}
              />
              <Typography variant='caption' color='text.secondary'>
                Smaller values create more repeated tiles, larger values create fewer tiles.
              </Typography>
              {previewImage && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
                  {Array.from({ length: 25 }).map((_, index) => (
                    <Box
                      key={index}
                      sx={{
                        aspectRatio: '1 / 1',
                        borderRadius: 0.5,
                        backgroundImage: `url(${previewImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: pendingPosition,
                        border: theme => `1px solid ${theme.palette.divider}`,
                      }}
                    />
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFitDialogClose}>Cancel</Button>
          <Button variant='contained' onClick={pendingFile ? handleFitConfirm : handleFitOnlyConfirm}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {!!lockState && (
        <Box
          onClick={() => toast.info(getLockMessage(dictionary, lockState))}
          sx={{ position: 'absolute', zIndex: 10, top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}
    </Stack>
  )
}

export default BackgroundSettings
