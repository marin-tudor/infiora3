import * as yup from 'yup'

export const stringRequired = yup.string().trim('trim').strict(true).required('required')
export const stringRequiredMin5Max50 = yup
  .string()
  .trim('trim')
  .strict(true)
  .required('required')
  .min(5, 'min5')
  .max(50, 'max50')
export const stringRequiredMax50 = yup.string().trim('trim').strict(true).required('required').max(50, 'max50')
export const stringRequiredMax255 = yup.string().trim('trim').strict(true).required('required').max(255, 'max255')
export const stringMin5Max50 = yup.string().trim('trim').strict(true).min(5, 'min5').max(50, 'max50')
export const stringMax255 = yup.string().trim('trim').strict(true).max(255, 'max255')
export const stringMax50 = yup.string().trim('trim').strict(true).max(50, 'max50')
export const stringMax20 = yup.string().trim('trim').strict(true).max(20, 'max20')
export const numberMin0 = yup
  .number()
  .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))
  .min(0, 'wholeNumber')
export const numberRequiredMin0 = yup
  .number()
  .required('required')
  .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))
  .min(0, 'wholeNumber')
export const numberRequired = yup
  .number()
  .required('required')
  .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))

export const emailValidation = yup.string().email('email')

export const urlValidation = yup
  .string()
  .test('url-or-tel', 'url', value => {
    if (!value) return true // Allow empty values

    // Check if it's a tel: link
    if (value.startsWith('tel:')) return true

    // Check if it's a mailto: link
    if (value.startsWith('mailto:')) return true

    // Otherwise validate as URL
    return yup.string().url().isValidSync(value)
  })

export const phoneValidation = yup.string()

export const passwordValidation = yup
  .string()
  .nullable()
  .notRequired()
  .trim('trim')
  .strict(true)
  .test('is-not-empty', 'trim', value => value === null || value === undefined || value.trim() === value)
  .test('min-length-if-not-empty', 'min8', value => !value || value.length >= 8)
  .max(32, 'max32')
  .test('has-letter', 'hasLetter', value => !value || /[A-Za-z]/.test(value))
  .test('has-number', 'hasNumber', value => !value || /\d/.test(value))
  .test(
    'valid-special-chars',
    'validSpecialChars',
    value => !value || /^[A-Za-z\d!@#$%^&*()_+={}|\\:;"',.?/<>\-]*$/.test(value)
  )

export const confirmPasswordValidation = yup
  .string()
  .trim('trim')
  .strict(true)
  .oneOf([yup.ref('password')], 'matchPassword')

export const dateValidation = yup
  .date()
  .transform((value, originalValue) => (String(originalValue).trim() === '' ? undefined : value))
