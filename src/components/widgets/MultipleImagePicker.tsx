import React from 'react'

import { Box, Card, IconButton, Stack, TextField, Typography, Grid } from '@mui/material'
import { styled } from '@mui/material/styles'

import Dropzone from 'react-dropzone'
import { Add, Close, FileCopy, DragIndicator } from '@mui/icons-material'
import { toast } from 'react-toastify'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { getLockMessage } from '@/utils/miscUtils'
import { useDictionary } from '@/contexts/DictionaryContext'
import { processImageFile } from '@/utils/imageUtils'
import LoadingBackdrop from './LoadingBackdrop'

const CloseIconButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 5,
  right: 5,
  height: 24,
  width: 24,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[1],
  '&:hover': {
    backgroundColor: theme.palette.background.default + ' !important',
    boxShadow: theme.shadows[4]
  }
}))

const OverlayBox = styled(Box)(() => ({
  position: 'absolute',
  zIndex: 10,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
}))

const DragIconButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 5,
  left: 5,
  height: 24,
  width: 24,
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.shadows[1],
  cursor: 'grab',
  '&:active': {
    cursor: 'grabbing'
  },
  '&:hover': {
    backgroundColor: theme.palette.background.default + ' !important',
    boxShadow: theme.shadows[4]
  }
}))

interface SortableImageItemProps {
  id: string
  image: any
  index: number
  rectangle?: boolean
  disabled?: boolean
  onRemove: (index: number, event: React.MouseEvent<HTMLButtonElement>) => void
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({
  id,
  image,
  index,
  rectangle,
  disabled,
  onRemove
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  const imgSrc = image instanceof File ? URL.createObjectURL(image) : image

  return (
    <Grid item xs={6} sm={4} md={3}>
      <Box ref={setNodeRef} style={style} sx={{ position: 'relative' }}>
        <img
          src={imgSrc}
          alt={`Selected ${index + 1}`}
          style={{
            width: '100%',
            aspectRatio: rectangle ? 2 : 1,
            borderRadius: rectangle ? '8px' : '50%',
            objectFit: 'cover',
            pointerEvents: 'none'
          }}
        />
        {!disabled && (
          <>
            <DragIconButton {...attributes} {...listeners} size="small">
              <DragIndicator fontSize="small" />
            </DragIconButton>
            <CloseIconButton onClick={e => onRemove(index, e)}>
              <Close fontSize="small" />
            </CloseIconButton>
          </>
        )}
      </Box>
    </Grid>
  )
}

interface MultipleImagePickerProps {
  id: string
  label: string
  description?: string
  images?: any[]
  setImages: (images: any[]) => void
  rectangle?: boolean
  disabled?: boolean
  lockState?: 'admin' | 'pro' | 'template'
  maxImages?: number
  maxFileSize?: number // in MB
}

const MultipleImagePicker: React.FC<MultipleImagePickerProps> = ({
  id,
  label,
  description,
  images = [],
  setImages,
  rectangle,
  disabled,
  lockState,
  maxImages = 10,
  maxFileSize = 5 // default 5MB
}) => {
  const dictionary = useDictionary()
  const [isConverting, setIsConverting] = React.useState(false)
  const [convertingCount, setConvertingCount] = React.useState(0)
  const [imageUrlInput, setImageUrlInput] = React.useState('')

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim()
    if (!trimmed) return
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`)
      return
    }
    setImages([...images, trimmed])
    setImageUrlInput('')
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor)
  )

  const handleRemoveImage = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const updatedImages = images.filter((_, i) => i !== index)

    setImages(updatedImages)
  }

  const handleOnDrop = async (acceptedFiles: File[]) => {
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`)

      return
    }

    // Validate file sizes
    const maxSizeInBytes = maxFileSize * 1024 * 1024 // Convert MB to bytes
    const validFiles: File[] = []
    const oversizedFiles: string[] = []

    acceptedFiles.forEach(file => {
      if (file.size > maxSizeInBytes) {
        oversizedFiles.push(file.name)
      } else {
        validFiles.push(file)
      }
    })

    // Show error for oversized files
    if (oversizedFiles.length > 0) {
      toast.error(
        `The following file${oversizedFiles.length > 1 ? 's are' : ' is'} too large (max ${maxFileSize}MB): ${oversizedFiles.join(', ')}`
      )
    }

    // Process valid files (convert HEIC if needed)
    if (validFiles.length > 0) {
      try {
        setIsConverting(true)
        setConvertingCount(validFiles.length)

        // Process all files (convert HEIC to JPEG if needed)
        const processedFiles = await Promise.all(
          validFiles.slice(0, maxImages - images.length).map(async file => {
            try {
              const imageUrl = await processImageFile(file)

              return imageUrl
            } catch (error) {
              console.error(`Error processing ${file.name}:`, error)
              toast.error(`Failed to process ${file.name}`)

              return null
            }
          })
        )

        // Filter out failed conversions
        const successfulFiles = processedFiles.filter(url => url !== null) as string[]

        if (successfulFiles.length > 0) {
          const newImages = [...images, ...successfulFiles]

          setImages(newImages)
        }
      } catch (error) {
        console.error('Error processing images:', error)
        toast.error('Failed to process images. Please try again.')
      } finally {
        setIsConverting(false)
        setConvertingCount(0)
      }
    }
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((_, index) => `image-${index}` === active.id)
      const newIndex = images.findIndex((_, index) => `image-${index}` === over.id)

      setImages(arrayMove(images, oldIndex, newIndex))
    }
  }

  return (
    <>
      <LoadingBackdrop
        open={isConverting}
        message={
          convertingCount > 1
            ? `Converting ${convertingCount} images...`
            : 'Converting HEIC image...'
        }
      />
      <Stack gap={2}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography variant='body2'>{label}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {images.length}/{maxImages}
          </Typography>
        </Stack>

      {description && (
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
      )}

      <Box sx={{ position: 'relative' }}>
        {lockState && <OverlayBox onClick={() => toast.info(getLockMessage(dictionary, lockState))} />}
        <Dropzone onDrop={handleOnDrop} disabled={disabled || !!lockState} multiple>
          {({ getRootProps, getInputProps, isDragActive }) => (
            <Card
              sx={{
                width: '100%',
                minHeight: 120,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                cursor: 'pointer',
                padding: 2,
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover'
                }
              }}
              {...getRootProps()}
            >
              {images.length === 0 ? (
                <Stack alignItems='center' justifyContent='center' textAlign='center'>
                  <FileCopy fontSize='large' />
                  <Typography variant='body1' margin={2}>
                    {dictionary.selectFileOrDragDrop}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Select multiple images or drag and drop
                  </Typography>
                </Stack>
              ) : (
                <Stack gap={2}>
                  <Stack alignItems='center' textAlign='center'>
                    <Typography variant='body2' color='text.secondary'>
                      Click or drag to add more images
                    </Typography>
                  </Stack>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map((_, index) => `image-${index}`)} strategy={rectSortingStrategy}>
                      <Grid container spacing={2}>
                        {images.map((image, index) => (
                          <SortableImageItem
                            key={`image-${index}`}
                            id={`image-${index}`}
                            image={image}
                            index={index}
                            rectangle={rectangle}
                            disabled={disabled}
                            onRemove={handleRemoveImage}
                          />
                        ))}
                      </Grid>
                    </SortableContext>
                  </DndContext>
                </Stack>
              )}
              <input hidden type='file' accept='image/*' multiple id={id} {...getInputProps()} />
            </Card>
          )}
        </Dropzone>
      </Box>

      {!disabled && !lockState && (
        <Stack direction='row' gap={1} alignItems='center'>
          <TextField
            fullWidth
            size='small'
            variant='standard'
            label='Add image by URL'
            value={imageUrlInput}
            onChange={e => setImageUrlInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddImageUrl()
              }
            }}
            placeholder='https://...'
            InputLabelProps={{ shrink: true }}
            disabled={images.length >= maxImages}
          />
          <IconButton
            onClick={handleAddImageUrl}
            disabled={!imageUrlInput.trim() || images.length >= maxImages}
            color='primary'
          >
            <Add />
          </IconButton>
        </Stack>
      )}
    </Stack>
    </>
  )
}

export default MultipleImagePicker
