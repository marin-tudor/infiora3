import React, { useState } from 'react'

import { Box, Card, IconButton, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import Dropzone from 'react-dropzone'

import { Close, Edit, FileCopy } from '@mui/icons-material'

import { toast } from 'react-toastify'

import ImageCropper from './ImageCropper'
import LoadingBackdrop from './LoadingBackdrop'
import { resolveAssetUrl } from '@/utils/imageUrlUtils'
import { getLockMessage, isNullOrEmpty } from '@/utils/miscUtils'
import { useDictionary } from '@/contexts/DictionaryContext'
import { processImageFile } from '@/utils/imageUtils'

const CloseIconButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  height: 30,
  width: 30,
  backgroundColor: theme.palette.background.default, // Use the theme's background color
  boxShadow: theme.shadows[1], // Add shadow to the button
  '&:hover': {
    backgroundColor: theme.palette.background.default + ' !important', // Adjust as needed, e.g., paper for a different shade
    boxShadow: theme.shadows[4] // Increase shadow on hover for emphasis
  }
}))

const EditIconButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: 0,
  right: 0,
  height: 40,
  width: 40,
  backgroundColor: theme.palette.background.default, // Use the theme's background color
  boxShadow: theme.shadows[1], // Add shadow to the button
  '&:hover': {
    backgroundColor: theme.palette.background.default + ' !important', // Adjust as needed, e.g., paper for a different shade
    boxShadow: theme.shadows[4] // Increase shadow on hover for emphasis
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

interface ImagePickerProps {
  id: string
  label: string
  description?: string
  image?: any
  setImage: any
  placeholder?: string
  rectangle?: boolean
  disabled?: boolean
  lockState?: 'admin' | 'pro' | 'template'
  editButton?: boolean
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  id,
  label,
  description,
  placeholder,
  image,
  setImage,
  rectangle,
  disabled,
  lockState,
  editButton
}) => {
  const dictionary = useDictionary()
  const [file, setFile] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  const imgSrc = (image instanceof File ? URL.createObjectURL(image) : resolveAssetUrl(image)) || placeholder

  const handleCloseButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setFile(null)
    setImage('')
  }

  const handleOnDrop = async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]

    if (!selectedFile) return

    try {
      setIsConverting(true)
      const imageUrl = await processImageFile(selectedFile)

      setFile(imageUrl)
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Failed to process image. Please try a different format.')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <>
      <LoadingBackdrop open={isConverting} />
      <Stack alignItems={description ? 'start' : 'center'} gap={2}>
        <Typography textAlign='center' variant='body2'>
          {label}
        </Typography>
        <Stack
          direction='row'
          alignItems='center'
          gap={2}
          sx={{
            position: 'relative',
            width: '100%'
          }}
        >
          {lockState && <OverlayBox onClick={() => toast.info(getLockMessage(dictionary, lockState))} />}
          <Dropzone onDrop={handleOnDrop} disabled={disabled && !!lockState}>
            {({ getRootProps, getInputProps, isDragActive }) => (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: rectangle ? 200 : 100,
                  margin: !description ? 'auto' : ''
                }}
                {...getRootProps()}
              >
                {isDragActive || !imgSrc ? (
                  <Stack
                    alignItems='center'
                    justifyContent='center'
                    textAlign='center'
                    component={Card}
                    sx={
                      rectangle
                        ? {
                            width: '100%',
                            aspectRatio: 2,
                            borderRadius: '20px'
                          }
                        : {
                            width: '100%',
                            aspectRatio: 1,
                            borderRadius: '50%'
                          }
                    }
                  >
                    <FileCopy fontSize='medium' />
                    <Typography variant='body1' fontSize={10} margin={2} maxWidth={200}>
                      {dictionary.selectFileOrDragDrop}
                    </Typography>
                  </Stack>
                ) : (
                  <img
                    src={imgSrc}
                    alt=''
                    style={
                      rectangle
                        ? {
                            width: '100%',
                            aspectRatio: 2,
                            borderRadius: '20px'
                          }
                        : {
                            width: '100%',
                            aspectRatio: 1,
                            borderRadius: '50%'
                          }
                    }
                  />
                )}
                {editButton && (
                  <EditIconButton disabled={disabled}>
                    <Edit />
                  </EditIconButton>
                )}
                {!disabled && !isNullOrEmpty(image) && (
                  <CloseIconButton onClick={handleCloseButtonClick}>
                    <Close />
                  </CloseIconButton>
                )}
                <input hidden type='file' accept='image/*' id={id} {...getInputProps()} />
              </Box>
            )}
          </Dropzone>
          {description && (
            <Typography maxWidth={250} variant='body2'>
              {description}
            </Typography>
          )}
        </Stack>
      </Stack>
      <ImageCropper file={file} setFile={setFile} setCroppedImage={setImage} aspect={rectangle ? 1.5 : 1} />
    </>
  )
}

export default ImagePicker
