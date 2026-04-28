import React, { useEffect, useRef, useState } from 'react'

import { Box, FormControl, Stack, Typography } from '@mui/material'
import { CirclePicker, SketchPicker } from 'react-color'
import { Edit } from '@mui/icons-material'
import { toast } from 'react-toastify'

import { useDictionary } from '@/contexts/DictionaryContext'
import { getLockMessage } from '@/utils/miscUtils'

interface ColorPickerProps {
  lockState?: 'group'
  label?: string
  value: any
  setValue: any
}

function ColorPicker({ lockState, label, setValue, value }: ColorPickerProps) {
  const dictionary = useDictionary()
  const [showCustom, setShowCustom] = useState(false)

  const pickerRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = (event: any) => {
    if (pickerRef.current && !pickerRef.current.contains(event.target)) {
      setShowCustom(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const updateColor = (v: string) => {
    if (lockState) {
      toast.info(getLockMessage(dictionary, lockState))
    } else {
      setValue(v)
    }
  }

  return (
    <FormControl fullWidth ref={pickerRef}>
      {label && (
        <Typography variant='body1' marginBottom={1}>
          {label}
        </Typography>
      )}

      <Stack direction='row' alignItems='top' gap={1}>
        <Stack
          style={{
            color: 'grey',
            height: '20px',
            width: '20px',
            padding: 0,
            borderRadius: '50%',
            border: '1px solid grey',
            fontSize: '13px'
          }}
          alignItems='center'
          onClick={() => {
            updateColor('')
          }}
        >
          /
        </Stack>
        <CirclePicker
          width='auto'
          circleSize={20}
          circleSpacing={5}
          color={value}
          colors={['#000000', 'rgb(235, 87, 87)', 'rgb(255, 140, 0)', 'rgb(33, 150, 83)', 'rgb(47, 128, 237)']}
          onChangeComplete={(color: any) => {
            const { hex } = color

            updateColor(hex)
          }}
        />
        <Box style={{ position: 'relative', display: 'inline-block' }}>
          <Edit
            style={{
              fontSize: '20px',
              padding: 2,
              borderRadius: '50%',
              border: '1px solid grey'
            }}
            onClick={() => {
              setShowCustom(v => !v)
            }}
          />
          {showCustom && (
            <>
              {/* Backdrop to cover the screen */}
              <Box
                sx={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent backdrop
                  zIndex: 9999
                }}
                onClick={() => setShowCustom(false)} // Close picker when clicking outside
              />

              {/* Color Picker */}
              <Box
                sx={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 99999
                }}
              >
                <SketchPicker
                  color={value}
                  onChangeComplete={color => {
                    const { hex } = color

                    updateColor(hex)
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      </Stack>
    </FormControl>
  )
}

export default ColorPicker
