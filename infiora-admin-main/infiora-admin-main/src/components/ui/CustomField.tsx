import React, { useState } from 'react';
import {
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useController } from 'react-hook-form';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface CustomFieldProps {
  size?: 'small' | 'medium';
  name: string;
  label: string;
  control: any;
  type?: any;
  accept?: string;
  errors?: Record<string, any>;
  setValue?: any;
  hidden?: boolean;
  options?: Array<{ label: string; value: any }>;
  inputProps?: any;
  disabled?: boolean;
  autoComplete?: any;
}

const CustomField: React.FC<CustomFieldProps> = ({
  name,
  label,
  control,
  type = 'text',
  accept,
  errors,
  setValue,
  hidden,
  options,
  size,
  inputProps,
  disabled,
}) => {
  const {
    field,
    fieldState: { invalid, isTouched },
  } = useController({
    name,
    control,
    defaultValue: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (setValue && event.target.files) {
      setValue(name, event.target.files[0]);
    }
  };

  const renderInputField = () => {
    switch (type) {
      case 'file':
        return (
          <TextField
            size={size}
            type="file"
            inputProps={{ accept }}
            onChange={handleFileChange}
            error={invalid && isTouched}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <>
            <InputLabel variant="filled">{label}</InputLabel>
            <Select
              variant="filled"
              label={label}
              {...field}
              disabled={disabled}
            >
              {options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </>
        );
      case 'date':
        return (
          <TextField
            variant="filled"
            size={size}
            label={label}
            type={type}
            inputProps={inputProps}
            {...field}
            error={invalid && isTouched}
            disabled={disabled}
          />
        );
      case 'password':
        return (
          <TextField
            variant="filled"
            size={size}
            label={label}
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              ...inputProps,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={togglePasswordVisibility}
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
            {...field}
            error={invalid && isTouched}
            disabled={disabled}
          />
        );
      default:
        return (
          <TextField
            variant="filled"
            size={size}
            label={label}
            type={type}
            inputProps={inputProps}
            {...field}
            error={invalid && isTouched}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <FormControl
      fullWidth
      sx={{ mb: 1, textAlign: 'left' }}
      hidden={hidden}
    >
      {renderInputField()}
      {errors?.[name] && (
        <FormHelperText error>{errors[name].message}</FormHelperText>
      )}
    </FormControl>
  );
};

export default CustomField;
