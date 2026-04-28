// MUI Imports
import type { Theme } from '@mui/material/styles'

const input: Theme['components'] = {
  MuiFormControl: {
    styleOverrides: {
      root: {
        '&:has(.MuiRadio-root) .MuiFormHelperText-root, &:has(.MuiCheckbox-root) .MuiFormHelperText-root, &:has(.MuiSwitch-root) .MuiFormHelperText-root':
          {
            marginInline: 0
          }
      }
    }
  },
  MuiInputBase: {
    styleOverrides: {
      root: ({ theme }) => ({
        lineHeight: 1.6,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 10,
        padding: '5px 10px 5px 10px',
        '&.MuiInput-underline': {
          '&:before': {
            border: 'none',
            borderColor: 'var(--mui-palette-customColors-inputBorder)'
          },
          '&:after': {
            border: 'none'
          },
          '&:not(.Mui-disabled, .Mui-error):hover:before': {
            border: 'none',
            borderColor: 'var(--mui-palette-action-active)'
          },
          '&.Mui-disabled:before': {
            border: 'none',
            borderColor: 'var(--mui-palette-divider)'
          },
          '& + .MuiFormHelperText-root': {
            marginInline: 0
          }
        },
        '&.Mui-disabled .MuiInputAdornment-root, &.Mui-disabled .MuiInputAdornment-root > *': {
          color: 'var(--mui-palette-action-disabled)'
        },
        '&.MuiAutocomplete-inputRoot:not(.MuiInput-underline)': {
          paddingInlineStart: `${theme.spacing(4)} !important`
        }
      }),
      inputAdornedStart: {
        paddingInlineStart: '0 !important'
      },
      inputAdornedEnd: {
        paddingInlineEnd: '0 !important'
      }
    }
  },
  MuiFilledInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        '&.MuiInputBase-sizeSmall': {
          borderStartStartRadius: 'var(--mui-shape-customBorderRadius-md)',
          borderStartEndRadius: 'var(--mui-shape-customBorderRadius-md)'
        },
        '&:before': {
          borderBlockEnd: '1px solid var(--mui-palette-text-secondary)'
        },
        '&:hover:before': {
          borderBlockEnd: '1px solid var(--mui-palette-text-primary)'
        },
        '&.Mui-disabled:before': {
          borderBlockEndStyle: 'solid',
          opacity: 0.38
        },
        '&.MuiInputBase-multiline': {
          paddingInline: theme.spacing(4)
        },
        '&:has(.MuiInputAdornment-positionStart)': {
          paddingInlineStart: theme.spacing(4)
        },
        '&:has(.MuiInputAdornment-positionEnd)': {
          paddingInlineEnd: theme.spacing(4)
        }
      }),
      input: ({ theme }) => ({
        '&:not(.MuiInputBase-inputMultiline)': {
          paddingInline: theme.spacing(4)
        },
        blockSize: '1.534em'
      })
    }
  },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        paddingLeft: '6px',
        color: 'var(--mui-palette-text-secondary)',
        transform: 'translate(16px, 17px) scale(1)', // Default position, always visible
        '&.Mui-focused': {
          color: 'var(--mui-palette-text-secondary)' // Ensure color doesn't change on focus
        },
        '&.Mui-error': {
          color: 'var(--mui-palette-text-secondary)' // Prevent color change on error
        },
        '&.MuiInputLabel-filled, &.MuiInputLabel-outlined': {
          // Keep the label always visible, even when not shrunk
          transform: 'translate(16px, 17px) scale(1)'
        }
      },
      shrink: ({ ownerState }) => ({
        ...(ownerState.variant === 'outlined' && {
          color: 'var(--mui-palette-text-secondary)',
          transform: 'translate(16px, -8px) scale(0.867)' // Shrunk position
        }),
        ...(ownerState.variant === 'filled' && {
          transform: `translate(16px, ${ownerState.size === 'small' ? 4 : 7}px) scale(0.867)` // Shrunk position
        }),
        ...(ownerState.variant === 'standard' && {
          transform: 'translate(-4px, -4px) scale(0.867)' // Shrunk position
        })
      }),
      sizeSmall: {
        '&.MuiInputLabel-filled, &.MuiInputLabel-outlined': {
          transform: 'translate(16px, 13px) scale(1)' // Default position for small size
        }
      }
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        '&.MuiInputBase-sizeSmall': {
          borderRadius: 'var(--mui-shape-customBorderRadius-md)',
          '&.MuiInputBase-multiline': {
            padding: theme.spacing(2, 4)
          }
        },
        '&:not(.Mui-focused):not(.Mui-error):not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--mui-palette-action-active)'
        },
        '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--mui-palette-divider)'
        },
        '&.MuiInputBase-multiline': {
          padding: theme.spacing(4)
        },
        '&:has(.MuiInputAdornment-positionStart)': {
          paddingInlineStart: theme.spacing(4)
        },
        '&:has(.MuiInputAdornment-positionEnd)': {
          paddingInlineEnd: theme.spacing(4)
        }
      }),
      input: ({ theme, ownerState }) => ({
        ...(ownerState?.size === 'medium' && {
          '&:not(.MuiInputBase-inputMultiline)': {
            padding: theme.spacing(4)
          }
        }),
        ...(ownerState?.size === 'small' && {
          '&:not(.MuiInputBase-inputMultiline)': {
            padding: theme.spacing(2, 4)
          }
        }),
        blockSize: '1.6em',
        '& ~ .MuiOutlinedInput-notchedOutline': {
          borderColor: 'var(--mui-palette-customColors-inputBorder)'
        }
      }),
      notchedOutline: {
        '& legend': {
          fontSize: '0.867em',
          marginInlineStart: 2
        }
      }
    }
  },
  MuiInputAdornment: {
    styleOverrides: {
      root: {
        color: 'var(--mui-palette-text-primary)',
        '& i, & svg': {
          fontSize: '1.25rem'
        },
        '& *': {
          color: 'inherit !important'
        },
        '&.MuiInputAdornment-positionEnd:has(.MuiIconButton-root)': {
          '.MuiIconButton-root': {
            marginInlineEnd: -8
          }
        }
      },
      positionStart: ({ theme }) => ({
        marginInlineEnd: theme.spacing(2.5)
      }),
      positionEnd: ({ theme }) => ({
        marginInlineStart: theme.spacing(2.5)
      })
    }
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: ({ theme }) => ({
        lineHeight: 1,
        letterSpacing: 'unset',
        marginBlockStart: theme.spacing(1),
        marginInline: theme.spacing(4)
      })
    }
  }
}

export default input
