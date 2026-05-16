import React, { useState, useCallback, useRef } from 'react';

import type { StandardTextFieldProps } from '@mui/material';
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
  TextField,
  Checkbox,
  useTheme,
  Autocomplete,
  Chip,
  Box,
} from '@mui/material';
import type { Control, FieldErrors } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import { compressImage } from '@/utils/imageUtils';

import ImageCropper from '../widgets/ImageCropper';
import { getErrorMessage } from '@/utils/miscUtils';

interface Option {
  label: string;
  value: any;
}

interface InputFieldProps extends StandardTextFieldProps {
  name: string;
  control: Control<any>;
  errors: FieldErrors;
  options?: Option[];
  multiple?: boolean;
  getValues?: any;
  setValue?: any;
  lockState?: 'admin' | 'pro' | 'template';
  variables?: string[];
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
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const textFieldRef = useRef(null);

  const {
    field,
    fieldState: { invalid },
  } = useController({
    name,
    control,
  });

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!setValue) return;

      const selectedFile = event.target.files?.[0];

      if (!selectedFile) return;

      if (selectedFile.type.startsWith('image/')) {
        const compressedFile: any = await compressImage(selectedFile);

        setFile(URL.createObjectURL(compressedFile));
      } else {
        setValue(name, selectedFile);
      }
    },
    [setValue, name]
  );

  const handleInsertVariable = (value: string) => {
    if (!textFieldRef.current) return;

    const input: any = textFieldRef.current;
    const { selectionStart, selectionEnd } = input;
    const text = getValues(name); // Get current value from form

    // Insert variable at cursor position
    const newText =
      text.substring(0, selectionStart) +
      value +
      text.substring(selectionEnd);

    // Update React Hook Form state
    setValue(name, newText, { shouldValidate: true });

    // Restore cursor position
    setTimeout(() => {
      input.selectionStart = input.selectionEnd =
        selectionStart + value.length;
    }, 0);
  };

  const renderInputField = () => {
    switch (type) {
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            }
            label={props.label}
          />
        );

      case 'phone':
        return (
          <Stack gap={2} width="100%">
            {props.label && (
              <label className="label">{props.label}</label>
            )}
            <PhoneInput
              {...field}
              country="us"
              value={field.value || ''}
              buttonStyle={{
                border: 'none',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '9px',
              }}
              inputStyle={{
                fontSize: 16,
                width: '100%',
                height: '42px',
                borderRadius: '9px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: 'none',
              }}
              dropdownStyle={{
                backgroundColor: theme.palette.background.paper,
              }}
              specialLabel={props.label as string}
            />
          </Stack>
        );

      case 'select':
        return (
          <FormControl variant="filled" fullWidth error={invalid}>
            {props.label && (
              <InputLabel shrink>{props.label}</InputLabel>
            )}
            <Select
              {...field}
              multiple={multiple}
              disabled={!!lockState || props.disabled}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {invalid && (
              <FormHelperText>
                {getErrorMessage(errors, name)}
              </FormHelperText>
            )}
          </FormControl>
        );

      case 'password':
        return (
          <TextField
            {...props}
            {...field}
            variant="filled"
            error={invalid}
            type={showPassword ? 'text' : 'password'}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            fullWidth
          />
        );

      case 'file':
        return (
          <>
            <TextField
              {...props}
              variant="filled"
              type="file"
              error={invalid}
              onChange={handleFileChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <ImageCropper
              file={file}
              setFile={setFile}
              setCroppedImage={(file: any) => {
                setValue?.(name, file);
              }}
            />
          </>
        );

      case 'autocomplete':
        return (
          <Autocomplete
            {...field}
            disabled={props.disabled}
            multiple={multiple}
            options={options}
            getOptionLabel={(option) => option.label}
            value={options.filter((opt) =>
              field.value?.includes(opt.value)
            )}
            onChange={(_, newValue) =>
              field.onChange(
                Array.isArray(newValue)
                  ? newValue.map((option) => option.value)
                  : []
              )
            }
            isOptionEqualToValue={(option, value) =>
              option.value === value.value
            }
            renderInput={(params) => (
              <TextField
                {...params}
                {...props}
                variant="filled"
                error={invalid}
                helperText={
                  invalid ? getErrorMessage(errors, name) : ''
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
          />
        );

      case 'multitext':
        return (
          <Autocomplete
            {...field}
            multiple
            freeSolo
            options={[]}
            value={field.value}
            inputValue={inputValue}
            onChange={(_, newValue) => setValue(name, newValue)}
            onInputChange={(event, newInputValue) => {
              if (newInputValue.endsWith(',')) {
                const trimmedValue = newInputValue
                  .slice(0, -1)
                  .trim(); // Remove trailing comma and trim spaces

                if (trimmedValue) {
                  setValue(name, [...field.value, trimmedValue]); // Add value to array
                }

                setInputValue(''); // Clear input field
              } else {
                setInputValue(newInputValue); // Update input field value
              }
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  size="small"
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                {...props}
                variant="filled"
                error={invalid}
                helperText={
                  invalid ? getErrorMessage(errors, name) : ''
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
          />
        );

      default:
        return (
          <Stack gap={0} width="100%">
            <TextField
              {...props}
              {...field}
              inputRef={textFieldRef}
              variant="filled"
              error={invalid}
              helperText={
                invalid ? getErrorMessage(errors, name) : ''
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            {variables && (
              <Box
                padding={1}
                sx={{
                  border: `1px solid ${theme.palette.background.paper}`,
                }}
              >
                <Select
                  sx={{ height: 30 }}
                  variant="filled"
                  value=""
                  onChange={(e) =>
                    handleInsertVariable(e.target.value)
                  }
                  displayEmpty
                >
                  <MenuItem
                    value=""
                    disabled
                    sx={{ display: 'none' }}
                  >
                    Add Variable
                  </MenuItem>
                  {variables.map((v) => (
                    <MenuItem key={v} value={`{${v}}`}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}
          </Stack>
        );
    }
  };

  return <>{renderInputField()}</>;
};

export default React.memo(InputField);
