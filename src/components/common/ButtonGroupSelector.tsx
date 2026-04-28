import React from 'react'

import { Button, ButtonGroup } from '@mui/material'

interface ButtonGroupSelectorProps {
  options: { label: string; value: any }[]
  selectedValue: any
  onValueChange: (newValue: any) => void
}

const ButtonGroupSelector = ({ options, selectedValue, onValueChange }: ButtonGroupSelectorProps) => {
  return (
    <ButtonGroup size='small'>
      {options.map(option => (
        <Button
          size='small'
          key={option.value}
          variant={option.value === selectedValue ? 'contained' : 'outlined'}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  )
}

export default ButtonGroupSelector
