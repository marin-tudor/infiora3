import React from 'react'

import { Box, Button, Divider, FormControlLabel, IconButton, Stack, Switch, TextField, Typography, useTheme } from '@mui/material'
import * as yup from 'yup'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { toast } from 'react-toastify'
import { LoadingButton } from '@mui/lab'
import IconPicker, { IconPickerItem } from 'react-icons-picker'

import type { IRoom, IGroup } from '@/types'
import { useUpdateRoomJsonMutation } from '@/redux/api/roomApi'
import { useUpdateGroupJsonMutation } from '@/redux/api/groupApi'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import InputField from '@/components/common/InputField'
import { emailValidation } from '@/utils/validationSchemas'

interface Props {
  room?: IRoom
  group?: IGroup
}

const schema = yup.object({
  housekeepingActive: yup.boolean().default(false),
  housekeepingText: yup.string().max(60).default(''),
  housekeepingIcon: yup.string().default(''),
  housekeepingEmails: yup.array().of(emailValidation).default([]),
  housekeepingAskRoomNumber: yup.boolean().default(false),
  housekeepingRoomNumberLabel: yup.string().max(80).default(''),
  housekeepingAskReservationCode: yup.boolean().default(false),
  housekeepingReservationCodeLabel: yup.string().max(80).default(''),
  housekeepingOptions: yup.array().of(yup.object({ key: yup.string().default(''), label: yup.string().default(''), icon: yup.string().default('') })).default([]),
  maintenanceActive: yup.boolean().default(false),
  maintenanceText: yup.string().max(60).default(''),
  maintenanceIcon: yup.string().default(''),
  maintenanceEmails: yup.array().of(emailValidation).default([]),
  maintenanceAskRoomNumber: yup.boolean().default(false),
  maintenanceRoomNumberLabel: yup.string().max(80).default(''),
  maintenanceAskReservationCode: yup.boolean().default(false),
  maintenanceReservationCodeLabel: yup.string().max(80).default(''),
  maintenanceOptions: yup.array().of(yup.object({ key: yup.string().default(''), label: yup.string().default('') })).default([]),
})

type FormData = yup.InferType<typeof schema>

const defaultHousekeepingOptions = [
  { key: 'cleaning', label: 'Room Cleaning', icon: 'MdCleaningServices' },
  { key: 'towels', label: 'Fresh Towels', icon: 'FaBath' },
  { key: 'pillows', label: 'Extra Pillows', icon: 'GiPillow' },
  { key: 'amenities', label: 'Amenities', icon: 'MdLocalHotel' },
  { key: 'do_not_disturb', label: 'Do Not Disturb', icon: 'MdDoNotDisturb' },
  { key: 'extra_bed', label: 'Extra Bed', icon: 'MdBed' },
  { key: 'other', label: 'Other', icon: 'MdMoreHoriz' },
]

const defaultMaintenanceOptions = [
  { key: 'ac', label: 'Air Conditioning' },
  { key: 'plumbing', label: 'Plumbing / Water' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'tv', label: 'TV / Remote' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'furniture', label: 'Furniture / Door' },
  { key: 'other', label: 'Other' },
]

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `option_${Date.now()}`

const HousekeepingMaintenanceTab: React.FC<Props> = ({ room, group }) => {
  const s = room || group
  const dictionary: any = useDictionary()
  const theme = useTheme()
  const t = dictionary.pages?.serviceSettings || {}

  const hotelId =
    (s?.hotel as any)?.id ||
    (s?.hotel as any)?._id ||
    (typeof s?.hotel === 'string' ? s.hotel : undefined)

  const [updateRoom, { isLoading: roomLoading }] = useUpdateRoomJsonMutation()
  const [updateGroup, { isLoading: groupLoading }] = useUpdateGroupJsonMutation()
  const { data: hotelData } = useGetHotelQuery(hotelId, { skip: !hotelId })
  const isLoading = roomLoading || groupLoading

  const hotelFeatures = hotelData?.features || (s?.hotel as any)?.features || {}
  const housekeepingAllowed = hotelFeatures.housekeepingEnabled !== false
  const maintenanceAllowed = hotelFeatures.maintenanceEnabled !== false

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      housekeepingActive: s?.housekeeping?.isActive ?? false,
      housekeepingText: s?.housekeeping?.mainButtonText ?? '',
      housekeepingIcon: (s?.housekeeping as any)?.icon ?? '',
      housekeepingEmails: (s?.housekeeping as any)?.emails ?? [],
      housekeepingAskRoomNumber: (s?.housekeeping as any)?.askRoomNumber ?? false,
      housekeepingRoomNumberLabel: (s?.housekeeping as any)?.roomNumberLabel ?? 'What room are you in?',
      housekeepingAskReservationCode: (s?.housekeeping as any)?.askReservationCode ?? false,
      housekeepingReservationCodeLabel: (s?.housekeeping as any)?.reservationCodeLabel ?? 'Reservation code (optional)',
      housekeepingOptions: (s?.housekeeping as any)?.options?.length ? (s?.housekeeping as any).options : defaultHousekeepingOptions,
      maintenanceActive: s?.maintenance?.isActive ?? false,
      maintenanceText: s?.maintenance?.mainButtonText ?? '',
      maintenanceIcon: (s?.maintenance as any)?.icon ?? '',
      maintenanceEmails: (s?.maintenance as any)?.emails ?? [],
      maintenanceAskRoomNumber: (s?.maintenance as any)?.askRoomNumber ?? false,
      maintenanceRoomNumberLabel: (s?.maintenance as any)?.roomNumberLabel ?? 'What room are you in?',
      maintenanceAskReservationCode: (s?.maintenance as any)?.askReservationCode ?? false,
      maintenanceReservationCodeLabel: (s?.maintenance as any)?.reservationCodeLabel ?? 'Reservation code (optional)',
      maintenanceOptions: (s?.maintenance as any)?.options?.length ? (s?.maintenance as any).options : defaultMaintenanceOptions,
    },
  })

  const housekeepingOptions = useFieldArray({ control, name: 'housekeepingOptions' })
  const maintenanceOptions = useFieldArray({ control, name: 'maintenanceOptions' })

  const housekeepingActive = watch('housekeepingActive')
  const housekeepingIcon = watch('housekeepingIcon')
  const maintenanceActive = watch('maintenanceActive')
  const maintenanceIcon = watch('maintenanceIcon')

  const onSubmit = async (data: FormData) => {
    const payload = {
      housekeeping: {
        isActive: housekeepingAllowed ? data.housekeepingActive : false,
        mainButtonText: data.housekeepingText,
        icon: data.housekeepingIcon || undefined,
        emails: data.housekeepingEmails || [],
        askRoomNumber: data.housekeepingAskRoomNumber,
        roomNumberLabel: data.housekeepingRoomNumberLabel,
        askReservationCode: data.housekeepingAskReservationCode,
        reservationCodeLabel: data.housekeepingReservationCodeLabel,
        options: (data.housekeepingOptions || [])
          .filter(option => option?.label?.trim())
          .map(option => ({ key: option.key || slugify(option.label || ''), label: option.label, icon: option.icon || undefined })),
      },
      maintenance: {
        isActive: maintenanceAllowed ? data.maintenanceActive : false,
        mainButtonText: data.maintenanceText,
        icon: data.maintenanceIcon || undefined,
        emails: data.maintenanceEmails || [],
        askRoomNumber: data.maintenanceAskRoomNumber,
        roomNumberLabel: data.maintenanceRoomNumberLabel,
        askReservationCode: data.maintenanceAskReservationCode,
        reservationCodeLabel: data.maintenanceReservationCodeLabel,
        options: (data.maintenanceOptions || [])
          .filter(option => option?.label?.trim())
          .map(option => ({ key: option.key || slugify(option.label || ''), label: option.label })),
      },
    }

    try {
      if (room) {
        await updateRoom({ id: room.id, data: payload }).unwrap()
      } else if (group) {
        await updateGroup({ id: group.id, data: payload }).unwrap()
      }

      toast.success(dictionary.messages?.updateRoomSuccess || 'Saved')
    } catch (err: any) {
      toast.error(err?.data?.message || err.message)
    }
  }

  return (
    <Stack gap={3} sx={{ maxWidth: 520 }}>
      <Typography variant='h6'>{t.title || 'Housekeeping & Maintenance'}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {t.subtitle || 'Allow guests to submit housekeeping requests or report maintenance issues directly from their room guide.'}
      </Typography>

      <Stack gap={2}>
        <Typography variant='subtitle2'>{t.housekeepingSection || 'Housekeeping Requests'}</Typography>
        <Controller
          name='housekeepingActive'
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={field.onChange} disabled={!housekeepingAllowed} />}
              label={t.enableHousekeeping || 'Enable housekeeping requests'}
            />
          )}
        />
        {!housekeepingAllowed && (
          <Typography variant='caption' color='warning.main'>
            {dictionary.housekeepingDisabledPlanMessage}
          </Typography>
        )}
        {housekeepingAllowed && housekeepingActive && (
          <>
            <Controller
              name='housekeepingText'
              control={control}
              render={({ field }) => (
                <Stack gap={0.75}>
                  <Typography variant='body2' color='text.secondary'>Button text</Typography>
                  <TextField
                    {...field}
                    placeholder='e.g. Housekeeping Request'
                    size='small'
                    inputProps={{ maxLength: 60 }}
                    helperText='Text shown on the button guests tap to open the request form'
                  />
                </Stack>
              )}
            />
            <InputField
              name='housekeepingEmails'
              label='Email addresses for housekeeping notifications'
              type='multitext'
              control={control}
              errors={errors}
            />
            <InputField
              name='housekeepingAskRoomNumber'
              label='Ask guest for their room number'
              type='switch'
              control={control}
              errors={errors}
            />
            {watch('housekeepingAskRoomNumber') && (
              <InputField
                name='housekeepingRoomNumberLabel'
                label='Room number question label'
                placeholder='What room are you in?'
                control={control}
                errors={errors}
              />
            )}
            <InputField
              name='housekeepingAskReservationCode'
              label='Ask for reservation code proof'
              type='switch'
              control={control}
              errors={errors}
            />
            {watch('housekeepingAskReservationCode') && (
              <InputField
                name='housekeepingReservationCodeLabel'
                label='Reservation code field label'
                placeholder='Reservation code (optional)'
                control={control}
                errors={errors}
              />
            )}
            <Stack gap={1}>
              <Typography variant='body2' color='text.secondary'>Request options</Typography>
              {housekeepingOptions.fields.map((option, index) => (
                <Stack key={option.id} direction='row' gap={1} alignItems='center'>
                  <Controller name={`housekeepingOptions.${index}.label`} control={control} render={({ field }) => <TextField {...field} size='small' placeholder='Option text' fullWidth onBlur={e => { field.onBlur(); setValue(`housekeepingOptions.${index}.key`, slugify(e.target.value)) }} />} />
                  <Controller
                    name={`housekeepingOptions.${index}.icon`}
                    control={control}
                    render={({ field }) => (
                      <Stack direction='row' alignItems='center' gap={1}>
                        {field.value && (
                          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 1, display: 'flex' }}>
                            <IconPickerItem value={field.value} size={20} />
                          </Box>
                        )}
                        <IconPicker
                          value={field.value || 'TiCancel'}
                          onChange={(val: string) => field.onChange(val)}
                          buttonStyles={{ borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}
                        />
                        {field.value && (
                          <IconButton size='small' color='secondary' onClick={() => field.onChange('')}>
                            <i className='ri-close-line' />
                          </IconButton>
                        )}
                      </Stack>
                    )}
                  />
                  <IconButton color='error' onClick={() => housekeepingOptions.remove(index)}><i className='ri-delete-bin-line' /></IconButton>
                </Stack>
              ))}
              <Button size='small' variant='outlined' onClick={() => housekeepingOptions.append({ key: '', label: '', icon: '' })}>Add housekeeping option</Button>
            </Stack>
            <Stack gap={1}>
              <Typography variant='body2' color='text.secondary'>Button icon (optional)</Typography>
              <Stack direction='row' alignItems='center' gap={2}>
                {housekeepingIcon && (
                  <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 1, display: 'flex' }}>
                    <IconPickerItem value={housekeepingIcon} size={24} />
                  </Box>
                )}
                <IconPicker
                  value={housekeepingIcon || 'TiCancel'}
                  onChange={(val: string) => setValue('housekeepingIcon', val)}
                  buttonStyles={{ borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}
                />
                {housekeepingIcon && (
                  <Button size='small' variant='text' color='secondary' onClick={() => setValue('housekeepingIcon', '')}>
                    Remove icon
                  </Button>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </Stack>

      <Divider />

      <Stack gap={2}>
        <Typography variant='subtitle2'>{t.maintenanceSection || 'Maintenance Issue Reporting'}</Typography>
        <Controller
          name='maintenanceActive'
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={field.onChange} disabled={!maintenanceAllowed} />}
              label={t.enableMaintenance || 'Enable maintenance reporting'}
            />
          )}
        />
        {!maintenanceAllowed && (
          <Typography variant='caption' color='warning.main'>
            {dictionary.maintenanceDisabledPlanMessage}
          </Typography>
        )}
        {maintenanceAllowed && maintenanceActive && (
          <>
            <Controller
              name='maintenanceText'
              control={control}
              render={({ field }) => (
                <Stack gap={0.75}>
                  <Typography variant='body2' color='text.secondary'>Button text</Typography>
                  <TextField
                    {...field}
                    placeholder='e.g. Report an Issue'
                    size='small'
                    inputProps={{ maxLength: 60 }}
                    helperText='Text shown on the button guests tap to report a maintenance issue'
                  />
                </Stack>
              )}
            />
            <InputField
              name='maintenanceEmails'
              label='Email addresses for maintenance notifications'
              type='multitext'
              control={control}
              errors={errors}
            />
            <InputField
              name='maintenanceAskRoomNumber'
              label='Ask guest for their room number'
              type='switch'
              control={control}
              errors={errors}
            />
            {watch('maintenanceAskRoomNumber') && (
              <InputField
                name='maintenanceRoomNumberLabel'
                label='Room number question label'
                placeholder='What room are you in?'
                control={control}
                errors={errors}
              />
            )}
            <InputField
              name='maintenanceAskReservationCode'
              label='Ask for reservation code proof'
              type='switch'
              control={control}
              errors={errors}
            />
            {watch('maintenanceAskReservationCode') && (
              <InputField
                name='maintenanceReservationCodeLabel'
                label='Reservation code field label'
                placeholder='Reservation code (optional)'
                control={control}
                errors={errors}
              />
            )}
            <Stack gap={1}>
              <Typography variant='body2' color='text.secondary'>Issue options</Typography>
              {maintenanceOptions.fields.map((option, index) => (
                <Stack key={option.id} direction='row' gap={1} alignItems='center'>
                  <Controller name={`maintenanceOptions.${index}.label`} control={control} render={({ field }) => <TextField {...field} size='small' placeholder='Option text' fullWidth onBlur={e => { field.onBlur(); setValue(`maintenanceOptions.${index}.key`, slugify(e.target.value)) }} />} />
                  <IconButton color='error' onClick={() => maintenanceOptions.remove(index)}><i className='ri-delete-bin-line' /></IconButton>
                </Stack>
              ))}
              <Button size='small' variant='outlined' onClick={() => maintenanceOptions.append({ key: '', label: '' })}>Add maintenance option</Button>
            </Stack>
            <Stack gap={1}>
              <Typography variant='body2' color='text.secondary'>Button icon (optional)</Typography>
              <Stack direction='row' alignItems='center' gap={2}>
                {maintenanceIcon && (
                  <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 1, display: 'flex' }}>
                    <IconPickerItem value={maintenanceIcon} size={24} />
                  </Box>
                )}
                <IconPicker
                  value={maintenanceIcon || 'TiCancel'}
                  onChange={(val: string) => setValue('maintenanceIcon', val)}
                  buttonStyles={{ borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}
                />
                {maintenanceIcon && (
                  <Button size='small' variant='text' color='secondary' onClick={() => setValue('maintenanceIcon', '')}>
                    Remove icon
                  </Button>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </Stack>

      <Stack direction='row' gap={2}>
        <LoadingButton loading={isLoading} variant='contained' onClick={handleSubmit(onSubmit)}>
          Save
        </LoadingButton>
      </Stack>
    </Stack>
  )
}

export default HousekeepingMaintenanceTab
