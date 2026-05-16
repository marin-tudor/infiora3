import React, { useMemo } from 'react'

import { Button, DialogActions, DialogContent, IconButton, Stack, Typography } from '@mui/material'
import { Close, Delete, Save } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'

import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

import { toast } from 'react-toastify'

import type { ILink } from '@/types'
import InputField from '@/components/common/InputField'
import { useCreateLinkMutation, useDeleteLinkMutation, useUpdateLinkMutation } from '@/redux/api/linkApi'
import { useGetGroupQuery } from '@/redux/api/groupApi'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useGetRoomQuery } from '@/redux/api/roomApi'
import { stringMax50, stringRequired } from '@/utils/validationSchemas'
import { useDictionary } from '@/contexts/DictionaryContext'
import GroupItemsEditor from './GroupItemsEditor'
import BlogSectionsEditor from './BlogSectionsEditor'
import ImageTypeSelector from './ImageTypeSelector'
import PresetsSelector from './PresetsSelector'

interface LinkFormProps {
  room?: string
  group?: string
  link?: ILink
  onClose: () => void
}

const schema = yup.object({
  title: stringMax50.clone().concat(stringRequired),
  value: yup.string(),
  type: stringRequired,
  items: yup.array(),
  sections: yup.array(),
  data: yup.mixed(),
  image: yup.mixed(),
  imageType: stringRequired
})

export type FormData = yup.InferType<typeof schema>

const PRESETS = [
  {
    label: 'Wi-Fi',
    title: 'Wi-Fi',
    type: 'wifi',
    imageType: 'icon',
    image: 'AiOutlineWifi',
    defaultData: { ssid: '', password: '' }
  },
  {
    label: 'WhatsApp',
    title: 'Chat on WhatsApp',
    type: 'link',
    imageType: 'icon',
    image: 'AiOutlineWhatsApp',
    defaultValue: 'https://wa.me/'
  },
  {
    label: 'Call Us',
    title: 'Call Us',
    type: 'link',
    imageType: 'icon',
    image: 'AiOutlinePhone',
    defaultValue: 'tel:'
  },
  {
    label: 'Order',
    title: 'Order',
    type: 'order',
    imageType: 'icon',
    image: 'AiOutlineShoppingCart'
  }
]

const createClientId = () => `client-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

const withSectionClientIds = (sections: any[] = []) =>
  sections.map(section => {
    // Migrate legacy single url/urlButtonText → links array
    let links = section.links

    if ((!links || links.length === 0) && section.url) {
      links = [{ url: section.url, urlButtonText: section.urlButtonText ?? '' }]
    }

    return {
      ...section,
      links: links || [],
      clientId: section.clientId || createClientId(),
      items: (section.items || []).map((item: any) => ({
        ...item,
        clientId: item.clientId || createClientId()
      }))
    }
  })

const LinkForm: React.FC<LinkFormProps> = ({ room, group, link, onClose }) => {
  const dictionary: any = useDictionary()

  const [createLink, { isLoading: createLoading }] = useCreateLinkMutation()
  const [updateLink, { isLoading: updateLoading }] = useUpdateLinkMutation()
  const [deleteLink, { isLoading: deleteLoading }] = useDeleteLinkMutation()
  const { data: roomData } = useGetRoomQuery(room, { skip: !room })
  const { data: groupData } = useGetGroupQuery(group, { skip: !group })

  const hotelId =
    (roomData?.hotel as any)?.id ||
    (roomData?.hotel as any)?._id ||
    (typeof roomData?.hotel === 'string' ? roomData.hotel : undefined) ||
    (groupData?.hotel as any)?.id ||
    (groupData?.hotel as any)?._id ||
    (typeof groupData?.hotel === 'string' ? groupData.hotel : undefined)

  const { data: hotelData } = useGetHotelQuery(hotelId, { skip: !hotelId })

  const hotelFeatures = hotelData?.features || {}

  const allowOrder = hotelFeatures.ordersEnabled !== false

  const availableMapPoints = useMemo(
    () =>
      hotelData?.mapPoints || (roomData?.hotel as any)?.mapPoints || [] || (groupData?.hotel as any)?.mapPoints || [],
    [groupData?.hotel, hotelData?.mapPoints, roomData?.hotel]
  )

  const defaultValues: FormData = {
    title: link?.title || '',
    value: link?.value,
    type: link?.type || 'link',
    items: link?.items || [],
    sections: withSectionClientIds(link?.sections || []),
    data: link?.data,
    image: link?.image,
    imageType: link?.imageType || 'none'
  }

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(schema)
  })

  const watched = watch()

  const handlePresetSelect = (label: string) => {
    const preset = PRESETS.find(p => p.label === label)

    if (!preset) return

    setValue('title', preset.title)
    setValue('type', preset.type as any)
    setValue('imageType', preset.imageType)
    setValue('image', preset.image)

    if (preset.defaultValue !== undefined) {
      setValue('value', preset.defaultValue)
    } else {
      setValue('value', '')
    }

    if (preset.defaultData !== undefined) {
      setValue('data', preset.defaultData)
    } else {
      setValue('data', undefined)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      let processedSections = data.sections?.map((section: any) => ({
        ...section,
        url: undefined,
        urlButtonText: undefined,
        mapEnabled: Boolean(section.linkedMapPointId),
        mapTitle: undefined,
        mapDescription: undefined,
        mapImage: undefined,
        mapLat: undefined,
        mapLng: undefined,
        mapColor: undefined,
        mapIcon: undefined,
        clientId: undefined,
        links: (section.links || []).map((link: any) => ({
          url: link.url,
          urlButtonText: link.urlButtonText
        })),
        items: (section.items || []).map((item: any) => ({
          ...item,
          clientId: undefined
        }))
      }))

      if (data.type === 'blog' && processedSections) {
        processedSections = await Promise.all(
          processedSections.map(async (section: any, sIndex: number) => {
            if (!section.images?.length) return section

            const images = await Promise.all(
              section.images.map(async (img: any, i: number) => {
                if (typeof img === 'string' && img.startsWith('blob:')) {
                  const blob = await (await fetch(img)).blob()

                  return new File([blob], `image-${sIndex}-${i}.jpg`, { type: blob.type })
                }

                return img
              })
            )

            return { ...section, images: images.filter(Boolean) }
          })
        )
      }

      const payload = {
        ...data,
        value: ['wifi', 'group', 'blog', 'order'].includes(data.type) ? undefined : data.value,
        items: data.type === 'group' ? data.items : undefined,
        sections: data.type === 'blog' ? processedSections : undefined
      }

      if (link) {
        await updateLink({ id: link.id, link: payload }).unwrap()
      } else {
        await createLink({ room, group, ...payload }).unwrap()
      }

      toast.success(dictionary.messages.updateLinkSuccess)
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err.error)
    }
  }

  const addItem = () => setValue('items', [...(watched.items || []), { title: '', value: '', type: 'link' }])

  const removeItem = (index: number) => {
    const items = [...(watched.items || [])]

    items.splice(index, 1)
    setValue('items', items)
  }

  const addSection = () =>
    setValue('sections', [...(watched.sections || []), { title: '', clientId: createClientId(), items: [] }])

  const removeSection = (index: number) => {
    const sections = [...(watched.sections || [])]

    sections.splice(index, 1)
    setValue('sections', sections)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(watched.sections || [])]
    const nextIndex = direction === 'up' ? index - 1 : index + 1

    if (nextIndex < 0 || nextIndex >= sections.length) return
    ;[sections[index], sections[nextIndex]] = [sections[nextIndex], sections[index]]
    setValue('sections', sections)
  }

  const handleSetImageType = (type: string) => {
    setValue('imageType', type)
    setValue('image', link?.type === type ? link?.image : undefined)
  }

  const handleDelete = async () => {
    try {
      await deleteLink(link!.id).unwrap()
      toast.success(dictionary.messages.deleteLinkSuccess)
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err.error)
    }
  }

  return (
    <form noValidate autoComplete='off'>
      <DialogContent sx={{ pb: 2 }}>
        {/* Close button */}
        <IconButton sx={{ position: 'absolute', top: 0, right: 0, padding: 5 }} onClick={onClose}>
          <Close />
        </IconButton>

        <Stack gap={2}>
          {/* Header */}
          <Typography variant='h5'>{dictionary.dialogs.addLink.title}</Typography>
          <Typography variant='body1'>{dictionary.dialogs.addLink.message}</Typography>

          {/* Presets */}
          <PresetsSelector
            presets={allowOrder || watched.type === 'order' ? PRESETS : PRESETS.filter(p => p.type !== 'order')}
            onSelect={handlePresetSelect}
          />

          {/* Basic fields */}
          <InputField name='title' label={dictionary.title} control={control} errors={errors} />

          <InputField
            name='type'
            label={dictionary.type}
            type='select'
            control={control}
            errors={errors}
            options={[
              { label: 'Link', value: 'link' },
              ...(allowOrder || watched.type === 'order' ? [{ label: 'Order', value: 'order' }] : []),
              { label: 'Text', value: 'text' },
              { label: 'Group', value: 'group' },
              { label: 'Wifi', value: 'wifi' },
              { label: 'Blog', value: 'blog' }
            ]}
          />

          {!allowOrder && (
            <Typography variant='caption' color='warning.main'>
              {dictionary.orderingDisabledPlanMessage}
            </Typography>
          )}

          {/* Value */}
          {!['wifi', 'group', 'blog', 'order'].includes(watched.type) && (
            <InputField name='value' label={dictionary.value} control={control} errors={errors} />
          )}

          {/* Wifi */}
          {watched.type === 'wifi' && (
            <Stack gap={2}>
              <InputField name='data.ssid' label={dictionary.ssid} control={control} errors={errors} />
              <InputField name='data.password' label={dictionary.password} control={control} errors={errors} />
            </Stack>
          )}

          {/* Image selector */}
          <ImageTypeSelector
            imageType={watched.imageType}
            image={watched.image}
            dictionary={dictionary}
            control={control}
            errors={errors}
            onTypeChange={handleSetImageType}
            onImageChange={value => setValue('image', value)}
          />

          {/* Group items */}
          {watched.type === 'group' && (
            <GroupItemsEditor
              items={watched.items || []}
              control={control}
              errors={errors}
              dictionary={dictionary}
              allowOrder={allowOrder}
              onAdd={addItem}
              onRemove={removeItem}
            />
          )}

          {/* Blog sections */}
          {watched.type === 'blog' && (
            <BlogSectionsEditor
              sections={watched.sections || []}
              mapPoints={availableMapPoints || []}
              control={control}
              errors={errors}
              dictionary={dictionary}
              setValue={setValue}
              onAdd={addSection}
              onRemove={removeSection}
              onMove={moveSection}
              onImagesChange={(index, images) => {
                const updated = [...(watched.sections || [])]

                updated[index] = { ...updated[index], images }
                setValue('sections', updated)
              }}
            />
          )}
        </Stack>
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          borderTop: theme => `1px solid ${theme.palette.divider}`,
          backgroundColor: 'background.paper',
          px: 3,
          py: 2
        }}
      >
        <Button variant='outlined' onClick={onClose}>
          {dictionary.cancel}
        </Button>

        <LoadingButton
          variant='contained'
          startIcon={<Save />}
          loading={createLoading || updateLoading}
          disabled={createLoading || updateLoading || deleteLoading}
          onClick={handleSubmit(onSubmit)}
        >
          {dictionary.save}
        </LoadingButton>

        {link && (
          <LoadingButton
            variant='outlined'
            color='error'
            startIcon={<Delete />}
            loading={deleteLoading}
            disabled={createLoading || updateLoading || deleteLoading}
            onClick={handleDelete}
          >
            {dictionary.delete}
          </LoadingButton>
        )}
      </DialogActions>
    </form>
  )
}

export default LinkForm
