import React, { useState } from 'react';
import type { StandardTextFieldProps } from '@mui/material';
import {
  Chip,
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
} from '@mui/material';
import type {
  Control,
  FieldErrors,
  FieldError,
} from 'react-hook-form';
import { useController } from 'react-hook-form';
import { Visibility, VisibilityOff, Add } from '@mui/icons-material';
import ImageCropper from '../widgets/ImageCropper';
import { compressImage } from '@/utils/imageUtils';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/material.css';

type InputProps = StandardTextFieldProps;

interface InputFieldProps extends InputProps {
  name: string;
  control: Control<any>;
  errors: FieldErrors;
  options?: Array<{ label: string; value: any }>;
  multiple?: any;
  setValue?: any;
  multiString?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  name,
  control,
  errors,
  type,
  options,
  multiple,
  setValue,
  multiString,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [newString, setNewString] = useState<string>('');

  const {
    field,
    fieldState: { invalid, isTouched },
  } = useController({
    name,
    control,
    defaultValue: type === 'multiString' ? [] : '',
  });

  const handleFileChange = async (event: any) => {
    if (setValue) {
      const selectedFile = event.target.files[0];
      const fileType = selectedFile.type;

      if (fileType.startsWith('image/')) {
        const compressedFile: any = await compressImage(selectedFile);

        setFile(URL.createObjectURL(compressedFile));
      } else {
        setValue(name, selectedFile);
      }
    }
  };

  const handleAddString = () => {
    if (newString.trim() !== '') {
      setValue(name, [...field.value, newString]);
      setNewString('');
    }
  };

  const handleRemoveString = (index: number) => {
    const updatedStrings = field.value.filter(
      (_: string, i: number) => i !== index
    );

    setValue(name, updatedStrings);
  };

  const renderInputField = () => {
    switch (type) {
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            }
            label={props.label}
          />
        );
      case 'phone':
        return (
          <PhoneInput
            {...field}
            country="us"
            value={field.value || ''}
            inputStyle={{
              fontSize: 16,
              width: '100%',
              height: '55px',
              borderRadius: '9px',
            }}
            specialLabel={String(props.label)}
          />
        );
      case 'select':
        return (
          <>
            <InputLabel variant="outlined">{props.label}</InputLabel>
            <Select variant="outlined" multiple={multiple} {...field}>
              {options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </>
        );
      case 'password':
        return (
          <TextField
            {...props}
            variant="outlined"
            {...field}
            error={invalid && isTouched}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              ...props.InputProps,
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
          />
        );
      case 'file':
        return (
          <>
            <TextField
              {...props}
              variant="outlined"
              type={type}
              error={invalid && isTouched}
              onChange={handleFileChange}
            />
            <ImageCropper
              file={file}
              setFile={setFile}
              setCroppedImage={(file: any) => {
                setValue(name, file);
              }}
            />
          </>
        );
      default:
        return (
          <TextField
            type={type}
            {...props}
            variant="outlined"
            {...field}
            error={invalid && isTouched}
          />
        );
    }
  };

  const renderMultiStringInputField = () => {
    switch (type) {
      case 'phone':
        return (
          <PhoneInput
            country="us"
            value={newString}
            onChange={(value) => setNewString(value)}
            inputStyle={{
              fontSize: 16,
              width: '100%',
              height: '55px',
              borderRadius: '9px',
            }}
            specialLabel={String(props.label)}
          />
        );
      default:
        return (
          <TextField
            {...props}
            variant="outlined"
            error={invalid && isTouched}
            value={newString}
            fullWidth
            onChange={(e) => setNewString(e.target.value)}
          />
        );
    }
  };

  const getNestedErrorMessage = (
    errors: FieldErrors,
    path: string
  ): string => {
    const keys = path.split('.');
    let current: FieldErrors | FieldError | undefined = errors;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as FieldErrors)[key];
      } else {
        return '';
      }
    }

    return (current as FieldError)?.message || '';
  };

  const errorMessage = getNestedErrorMessage(errors, name);

  return (
    <FormControl fullWidth sx={{ mb: 2, textAlign: 'left' }}>
      {multiString ? (
        <Stack>
          <Stack direction="row" alignItems="center">
            {renderMultiStringInputField()}
            <IconButton onClick={handleAddString} edge="end">
              <Add />
            </IconButton>
          </Stack>
          <Stack direction="row" sx={{ overflow: 'auto' }}>
            {field.value.map((str: string, index: number) => (
              <Chip
                key={index}
                label={str}
                onDelete={() => handleRemoveString(index)}
                sx={{ margin: '4px' }}
              />
            ))}
          </Stack>
        </Stack>
      ) : (
        renderInputField()
      )}
      {errorMessage && (
        <FormHelperText error>{errorMessage}</FormHelperText>
      )}
    </FormControl>
  );
};

export default InputField;
