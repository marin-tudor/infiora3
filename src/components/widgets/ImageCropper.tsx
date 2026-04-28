import React, { useCallback, useState } from 'react'

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Typography
} from '@mui/material'
import {
  Add as ZoomInIcon,
  Remove as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon
} from '@mui/icons-material'
import Cropper from 'react-easy-crop'
import { toast } from 'react-toastify'

import { compressImage, getCroppedImage } from '@/utils/imageUtils'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropperProps {
  file: string | null
  setFile: (file: string | null) => void
  setCroppedImage: (image: File) => void
  aspect?: number
}

const ImageCropper: React.FC<ImageCropperProps> = ({ file, setFile, setCroppedImage, aspect = 1 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleClose = useCallback(() => {
    setFile(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
  }, [setFile])

  const cropImage = useCallback(async () => {
    if (!croppedAreaPixels || !file) return

    setIsProcessing(true)

    try {
      const croppedImage = await getCroppedImage(file, croppedAreaPixels, rotation)

      if (croppedImage) {
        const compressedFile = await compressImage(croppedImage)

        setCroppedImage(compressedFile as File)
        handleClose()
        toast.success('Image cropped successfully!')
      }
    } catch (e) {
      console.error('Error cropping image:', e)
      toast.error('Failed to crop image. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [file, croppedAreaPixels, rotation, setCroppedImage, handleClose])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 1))
  const handleRotateLeft = () => setRotation(prev => prev - 90)
  const handleRotateRight = () => setRotation(prev => prev + 90)

  return (
    <Dialog open={file !== null} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Crop Image</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Cropper Container */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: 400,
              backgroundColor: '#f5f5f5',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Cropper
              image={file || ''}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
            />
          </Box>

          {/* Zoom Controls */}
          <Box>
            <Typography variant='body2' gutterBottom sx={{ fontWeight: 500 }}>
              Zoom
            </Typography>
            <Stack direction='row' spacing={2} alignItems='center'>
              <IconButton size='small' onClick={handleZoomOut} disabled={zoom <= 1}>
                <ZoomOutIcon />
              </IconButton>
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, value) => setZoom(value as number)}
                sx={{ flex: 1 }}
              />
              <IconButton size='small' onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomInIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Rotation Controls */}
          <Box>
            <Typography variant='body2' gutterBottom sx={{ fontWeight: 500 }}>
              Rotation
            </Typography>
            <Stack direction='row' spacing={2} alignItems='center'>
              <IconButton size='small' onClick={handleRotateLeft}>
                <RotateLeftIcon />
              </IconButton>
              <Slider
                value={rotation}
                min={0}
                max={360}
                step={1}
                onChange={(_, value) => setRotation(value as number)}
                valueLabelDisplay='auto'
                sx={{ flex: 1 }}
              />
              <IconButton size='small' onClick={handleRotateRight}>
                <RotateRightIcon />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={cropImage} variant='contained' disabled={isProcessing || !croppedAreaPixels}>
          {isProcessing ? <CircularProgress size={24} /> : 'Crop & Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImageCropper
