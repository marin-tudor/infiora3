import * as yup from 'yup';

export const stringRequired = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .required('Field is required.');
export const stringRequiredMin5Max50 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .required('Field is required.')
  .min(5, 'Must be at least 5 characters')
  .max(50, 'Must be at most 50 characters');
export const stringRequiredMax50 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .required('Field is required.')
  .max(50, 'Must be at most 50 characters');
export const stringRequiredMax255 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .required('Field is required.')
  .max(255, 'Must be at most 255 characters');
export const stringMin5Max50 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .min(5, 'Must be at least 5 characters')
  .max(50, 'Must be at most 50 characters');
export const stringMax255 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .max(255, 'Must be at most 255 characters');
export const stringMax50 = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .max(50, 'Must be at most 50 characters');
export const numberMin0 = yup
  .number()
  .transform((value, originalValue) =>
    String(originalValue).trim() === '' ? undefined : value
  )
  .min(0, 'Must be a non-negative number');
export const numberRequiredMin0 = yup
  .number()
  .required('Field is required')
  .transform((value, originalValue) =>
    String(originalValue).trim() === '' ? undefined : value
  )
  .min(0, 'Must be a non-negative number');
export const numberRequired = yup
  .number()
  .required('Field is required')
  .transform((value, originalValue) =>
    String(originalValue).trim() === '' ? undefined : value
  );

export const numberValidation = yup
  .number()
  .nullable()
  .transform((value, originalValue) =>
    String(originalValue).trim() === '' ? null : value
  );

export const slugValidation = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .matches(
    /^[a-z0-9-]+$/,
    'Can only contain lowercase letters, numbers, and hyphens.'
  )
  .min(3, 'Must be at least 3 characters long.')
  .max(100, 'Cannot be more than 50 characters long.');

export const emailValidation = yup
  .string()
  .email('Invalid email format.');

export const urlValidation = yup.string().url('Invalid url format.');

export const phoneValidation = yup.string();

export const passwordValidation = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .test(
    'empty-or-valid',
    'Password must be at least 8 characters and less than 32 characters.',
    (value) => !value || (value.length >= 8 && value.length <= 32)
  );

export const confirmPasswordValidation = yup
  .string()
  .trim('No leading or trailing spaces allowed.')
  .strict(true)
  .oneOf([yup.ref('password')], 'Must match password.');

export const dateValidation = yup
  .date()
  .transform((value, originalValue) =>
    String(originalValue).trim() === '' ? undefined : value
  );
