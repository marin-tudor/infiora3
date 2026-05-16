'use client'

// MUI imports
import { useState } from 'react'

import { Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material'

// Validation imports
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// Other imports
import { toast } from 'react-toastify'

// Custom imports
import { useSession } from 'next-auth/react'

import { stringMax255, stringRequiredMax50 } from '@/utils/validationSchemas'
import InputField from '@/components/common/InputField'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useUpdateHotelMutation } from '@/redux/api/hotelApi'
import type { IHotel } from '@/types'
import ImagePicker from '@/components/widgets/ImagePicker'
import MapSettingsSection from '../components/MapSettingsSection'

const schema = yup.object().shape({
  name: stringRequiredMax50,
  description: stringMax255,
  socialLinks: yup.array()
})

export type FormData = yup.InferType<typeof schema>

const EditHotelPage = ({ hotel }: { hotel: IHotel }) => {
  const dictionary = useDictionary()

  const [image, setImage] = useState(hotel.image)
  const [cover, setCover] = useState(hotel.cover)
  const [map, setMap] = useState(hotel.map)
  const [mapPoints, setMapPoints] = useState(hotel.mapPoints || [])

  const [offlineGuideEnabled, setOfflineGuideEnabled] = useState(hotel.settings?.offlineGuideEnabled !== false)

  const [staffRbacEnabled, setStaffRbacEnabled] = useState(hotel.features?.staffRbacEnabled === true)

  const [smartDispatchingEnabled, setSmartDispatchingEnabled] = useState(
    hotel.features?.smartDispatchingEnabled === true
  )

  const [bookableServicesEnabled, setBookableServicesEnabled] = useState(
    hotel.features?.bookableServicesEnabled === true
  )

  const [updateHotel, { isLoading }] = useUpdateHotelMutation()

  const { update } = useSession()

  const {
    reset,
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: hotel.name || '',
      description: hotel.description || '',
      socialLinks: hotel.socialLinks || []
    },
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data: any) => {
    try {
      const updatedHotel = await updateHotel({
        id: hotel.id,
        hotel: {
          ...data,
          image,
          cover,
          map,
          mapPoints,
          settings: { offlineGuideEnabled },
          features: {
            ordersEnabled: hotel.features?.ordersEnabled ?? true,
            maintenanceEnabled: hotel.features?.maintenanceEnabled ?? true,
            housekeepingEnabled: hotel.features?.housekeepingEnabled ?? true,
            staffRbacEnabled,
            smartDispatchingEnabled,
            bookableServicesEnabled
          }
        }
      }).unwrap()

      await update({ hotel: updatedHotel })
      toast.success(dictionary.messages.updateHotelSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.message)
    }
  }

  const handleCancel = () => {
    reset({ name: hotel.name || '', description: hotel.description || '' })
    setMap(hotel.map)
    setMapPoints(hotel.mapPoints || [])
    setOfflineGuideEnabled(hotel.settings?.offlineGuideEnabled !== false)
    setStaffRbacEnabled(hotel.features?.staffRbacEnabled === true)
    setSmartDispatchingEnabled(hotel.features?.smartDispatchingEnabled === true)
    setBookableServicesEnabled(hotel.features?.bookableServicesEnabled === true)
  }

  return (
    <Card>
      <CardContent>
        <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)} style={{ flex: 1 }}>
          <Stack gap={5} sx={{ maxWidth: { md: '50%' }, minHeight: '80vh', margin: 'auto' }}>
            <Typography variant='h4'>{dictionary.hotelSettings}</Typography>
            <Stack gap={4}>
              <ImagePicker
                id='logo'
                label={dictionary.image}
                description={dictionary.hotelImageDescription}
                image={image}
                setImage={setImage}
              />
              <ImagePicker
                id='cover'
                rectangle
                label={dictionary.cover}
                description={dictionary.hotelCoverDescription}
                image={cover}
                setImage={setCover}
              />
              <InputField name='name' label={dictionary.name} control={control} errors={errors} />
              <InputField name='description' label={dictionary.description} control={control} errors={errors} />
              <InputField
                type='multitext'
                name='socialLinks'
                label={dictionary.socialLinks}
                control={control}
                errors={errors}
                setValue={setValue}
              />
              <MapSettingsSection
                map={map}
                mapPoints={mapPoints}
                onMapChange={setMap}
                onMapPointsChange={setMapPoints}
              />
            </Stack>
            <Stack gap={2}>
              <Typography variant='subtitle2' fontWeight={600} mb={1}>
                Guest App Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch checked={offlineGuideEnabled} onChange={e => setOfflineGuideEnabled(e.target.checked)} />
                }
                label='Show offline guide download button'
              />
              <Typography variant='subtitle2' fontWeight={600} mb={1}>
                Wave 1 Features
              </Typography>
              <FormControlLabel
                control={<Switch checked={staffRbacEnabled} onChange={e => setStaffRbacEnabled(e.target.checked)} />}
                label='Enable Staff RBAC'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={smartDispatchingEnabled}
                    onChange={e => setSmartDispatchingEnabled(e.target.checked)}
                  />
                }
                label='Enable Smart Dispatching'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={bookableServicesEnabled}
                    onChange={e => setBookableServicesEnabled(e.target.checked)}
                  />
                }
                label='Enable Bookable Services'
              />
            </Stack>
            <Stack direction='row' gap={2} sx={{ ml: 'auto' }}>
              <Button variant='outlined' color='secondary' onClick={handleCancel}>
                {dictionary.cancel}
              </Button>
              <Button type='submit' variant='contained' disabled={isLoading}>
                {isLoading ? <Loader /> : dictionary.save}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  )
}

export default EditHotelPage
