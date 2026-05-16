import React, { useState, useCallback, useRef } from 'react'

import type { StandardTextFieldProps } from '@mui/material'
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
  Autocomplete,
  Chip,
  Box
} from '@mui/material'
import type { Control, FieldErrors } from 'react-hook-form'
import { useController } from 'react-hook-form'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

import { compressImage } from '@/utils/imageUtils'

import ImageCropper from '../widgets/ImageCropper'
import { getErrorMessage } from '@/utils/miscUtils'
import { useDictionary } from '@/contexts/DictionaryContext'

interface Option {
  label: string
  value: any
}

interface InputFieldProps extends Omit<StandardTextFieldProps, 'variant'> {
  name: string
  control: Control<any>
  errors: FieldErrors
  options?: Option[]
  multiple?: boolean
  getValues?: any
  setValue?: any
  lockState?: 'admin' | 'group'
  variables?: string[]
  variant?: 'standard' | 'outlined' | 'filled'
}

const InputField: React.FC<InputFieldProps> = ({
  name,
  control,
  errors,
  type,
  options = [],
  multiple = false,
  getValues,
  setValue,
  lockState,
  variables,
  ...props
}) => {
  const dictionary = useDictionary()
  const theme = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [file, setFile] = useState<any>(null)
  const [inputValue, setInputValue] = useState('')
  const textFieldRef = useRef(null)

  const {
    field,
    fieldState: { invalid }
  } = useController({
    name,
    control
  })

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!setValue) return

      const selectedFile = event.target.files?.[0]

      if (!selectedFile) return

      if (selectedFile.type.startsWith('image/')) {
        const compressedFile: any = await compressImage(selectedFile)

        setFile(URL.createObjectURL(compressedFile))
      } else {
        setValue(name, selectedFile)
      }
    },
    [setValue, name]
  )

  const handleInsertVariable = (value: string) => {
    if (!textFieldRef.current) return

    const input: any = textFieldRef.current
    const { selectionStart, selectionEnd } = input
    const text = getValues(name) // Get current value from form

    // Insert variable at cursor position
    const newText = text.substring(0, selectionStart) + value + text.substring(selectionEnd)

    // Update React Hook Form state
    setValue(name, newText, { shouldValidate: true })

    // Restore cursor position
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = selectionStart + value.length
    }, 0)
  }

  const renderInputField = () => {
    switch (type) {
      case 'switch': {
        const { value, ...fieldWithoutValue } = field

        return (
          <FormControlLabel
            control={
              <Switch
                {...fieldWithoutValue}
                checked={Boolean(value)}
                onChange={e => field.onChange(e.target.checked)}
              />
            }
            label={props.label}
            labelPlacement='start'
            sx={{
              marginLeft: 0,
              marginRight: 0,
              justifyContent: 'space-between',
              width: '100%'
            }}
          />
        )
      }

      case 'toggle':
        return (
          <Stack gap={0}>
            <Typography variant='body2' color='text.secondary'>
              {props.label}
            </Typography>
            <ToggleButtonGroup
              {...field}
              value={field.value || 'none'}
              exclusive
              onChange={(_, value) => {
                if (value !== null) {
                  field.onChange(value)
                }
              }}
              size='small'
              fullWidth
            >
              {options.map(option => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {invalid && <FormHelperText error>{getErrorMessage(errors, name, dictionary)}</FormHelperText>}
          </Stack>
        )

      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox {...field} checked={Boolean(field.value)} onChange={e => field.onChange(e.target.checked)} />
            }
            label={props.label}
          />
        )

      case 'phone':
        return (
          <Stack gap={2} width='100%'>
            {props.label && <label className='label'>{props.label}</label>}
            <PhoneInput
              {...field}
              country='us'
              value={field.value || ''}
              buttonStyle={{
                border: 'none',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '9px'
              }}
              inputStyle={{
                fontSize: 16,
                width: '100%',
                height: '42px',
                borderRadius: '9px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: 'none'
              }}
              dropdownStyle={{
                backgroundColor: theme.palette.background.paper
              }}
              specialLabel={props.label as string}
            />
          </Stack>
        )

      case 'select':
        return (
          <FormControl variant='standard' fullWidth error={invalid}>
            {props.label && <InputLabel shrink>{props.label}</InputLabel>}
            <Select {...field} multiple={multiple} disabled={!!lockState}>
              {options.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {invalid && <FormHelperText>{getErrorMessage(errors, name, dictionary)}</FormHelperText>}
          </FormControl>
        )

      case 'password':
        return (
          <Stack gap={0.5} width='100%'>
            {props.label && (
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {props.label}
              </Typography>
            )}
            <TextField
              size='small'
              {...props}
              {...field}
              label={undefined}
              variant='outlined'
              error={invalid}
              helperText={invalid ? getErrorMessage(errors, name, dictionary) : ''}
              type={showPassword ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton onClick={() => setShowPassword(prev => !prev)} edge='end'>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              fullWidth
            />
          </Stack>
        )

      case 'file':
        return (
          <Stack gap={0.5} width='100%'>
            {props.label && (
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {props.label}
              </Typography>
            )}
            <TextField
              size='small'
              {...props}
              label={undefined}
              variant='outlined'
              type='file'
              error={invalid}
              onChange={handleFileChange}
              fullWidth
            />
            <ImageCropper
              file={file}
              setFile={setFile}
              setCroppedImage={(file: any) => {
                setValue?.(name, file)
              }}
            />
          </Stack>
        )

      case 'autocomplete':
        return (
          <Stack gap={0.5} width='100%'>
            {props.label && (
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {props.label}
              </Typography>
            )}
            <Autocomplete
              {...field}
              multiple={multiple}
              options={options}
              getOptionLabel={option => option.label}
              renderInput={params => (
                <TextField
                  {...params}
                  {...props}
                  label={undefined}
                  variant='outlined'
                  size={props.size ?? 'small'}
                  error={invalid}
                  helperText={invalid ? getErrorMessage(errors, name, dictionary) : ''}
                  fullWidth
                />
              )}
            />
          </Stack>
        )

      case 'multitext':
        return (
          <Stack gap={0.5} width='100%'>
            {props.label && (
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {props.label}
              </Typography>
            )}
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={field.value || []}
              inputValue={inputValue}
              onChange={(_, newValue) => field.onChange(newValue || [])}
              onInputChange={(_, newInputValue) => {
                if (newInputValue.endsWith(',')) {
                  const trimmedValue = newInputValue.slice(0, -1).trim()

                  if (trimmedValue) {
                    const currentValue = field.value || []

                    field.onChange([...currentValue, trimmedValue])
                  }

                  setInputValue('')
                } else {
                  setInputValue(newInputValue)
                }
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip size='small' label={option} {...getTagProps({ index })} key={index} />
                ))
              }
              renderInput={params => (
                <TextField
                  {...params}
                  {...props}
                  label={undefined}
                  variant='outlined'
                  size={props.size ?? 'small'}
                  error={invalid}
                  helperText={invalid ? getErrorMessage(errors, name, dictionary) : ''}
                  fullWidth
                />
              )}
            />
          </Stack>
        )

      default: {
        return (
          <Stack gap={0.5} width='100%'>
            {props.label && (
              <Typography variant='body2' color='text.secondary' fontWeight={500}>
                {props.label}
              </Typography>
            )}
            <TextField
              {...props}
              {...field}
              label={undefined}
              variant='outlined'
              size={props.size ?? 'small'}
              inputRef={textFieldRef}
              error={invalid}
              helperText={invalid ? getErrorMessage(errors, name, dictionary) : ''}
              fullWidth
            />
            {variables && (
              <Box padding={1} sx={{ border: `1px solid ${theme.palette.background.paper}` }}>
                <Select
                  sx={{ height: 30 }}
                  variant='standard'
                  value=''
                  onChange={e => handleInsertVariable(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value='' disabled sx={{ display: 'none' }}>
                    {dictionary.addVariable}
                  </MenuItem>
                  {variables.map(v => (
                    <MenuItem key={v} value={`{${v}}`}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </Stack>
        )
      }
    }
  }

  return <>{renderInputField()}</>
}

export default React.memo(InputField)
