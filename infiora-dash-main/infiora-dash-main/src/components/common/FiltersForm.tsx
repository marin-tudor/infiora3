import React from 'react'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { useForm } from 'react-hook-form'

import InputField from './InputField'

const FiltersForm = ({ onClose, filters, onSubmit, values }: any) => {
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<any>({
    defaultValues: values
  })

  return (
    <Dialog open={true} fullWidth maxWidth='xs'>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>Filter Options</DialogTitle>
        <DialogContent>
          {filters.map((f: any, i: any) => (
            <InputField
              key={i}
              label={f.label}
              name={f.name}
              type={f.type}
              options={f.options}
              control={control}
              errors={errors}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Clear</Button>
          <Button type='submit'>Apply</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default FiltersForm
