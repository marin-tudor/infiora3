'use client'
import { useEffect, useState } from 'react'

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Typography, ButtonGroup, Box,
  Select, MenuItem
} from '@mui/material'

import { toast } from 'react-toastify'

import { useCreateCategoryMutation, useUpdateCategoryMutation } from '@/redux/api/ordersApi'


import type { IOrderCategory } from '@/types'
import ImagePicker from '@/components/widgets/ImagePicker'
import { useDictionary } from '@/contexts/DictionaryContext'

const EMOJI_PRESETS = ['🍔', '🍕', '🍣', '🍷', '☕', '🍰', '🥗', '🥂', '✈️', '🏖️', '💆', '🛎️', '🎭', '🚗', '🏋️', '🛒', '🎁', '🧴', '🌿', '🎵']
const IMAGE_TYPES = ['emoji', 'url', 'upload'] as const

interface Props {
  open: boolean
  onClose: () => void
  hotelId: string
  category?: IOrderCategory | null
  categories?: IOrderCategory[]
}

export default function CategoryDialog({ open, onClose, hotelId, category, categories }: Props) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.categoryDialog || {}
  const [name, setName] = useState('')
  const [imageType, setImageType] = useState<'emoji' | 'url' | 'upload'>('emoji')
  const [image, setImage] = useState<any>('🍔')
  const [parentId, setParentId] = useState<string>('')

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation()
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation()
  const loading = creating || updating

  useEffect(() => {
    if (open) {
      setName(category?.name || '')
      const icon = category?.icon || '🍔'

      setImage(icon)

      if (icon.startsWith('http') || icon.startsWith('data:')) {
        setImageType(icon.startsWith('data:') ? 'upload' : 'url')
      } else {
        setImageType('emoji')
      }

      setParentId(category?.parentId || '')
    }
  }, [category, open])

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const getIconValue = async (): Promise<string> => {
    if (imageType === 'upload' && image instanceof File) return toBase64(image)
    if (imageType === 'upload' && typeof image === 'string' && image.startsWith('data:')) return image
    
return typeof image === 'string' ? image || '🍔' : '🍔'
  }

  const handleSave = async () => {
    if (!name.trim()) return
    const icon = await getIconValue()

    try {
      if (category) {
        await updateCategory({ hotelId, categoryId: category.id, name: name.trim(), icon, parentId: parentId || null }).unwrap()
        toast.success(t.categoryUpdated || 'Category updated')
      } else {
        await createCategory({ hotelId, name: name.trim(), icon, parentId: parentId || null }).unwrap()
        toast.success(t.categoryCreated || 'Category created')
      }

      onClose()
    } catch {
      toast.error(t.saveCategoryFailed || 'Failed to save category')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{category ? (t.editCategory || 'Edit Category') : (t.newCategory || 'New Category')}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <Stack gap={0.5}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>{dictionary.name}</Typography>
            <TextField
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
              autoFocus
              size='small'
              placeholder={t.namePlaceholder || 'e.g. Food & Beverages, Travel, Spa...'}
            />
          </Stack>

          {categories && categories.length > 0 && (
            <Stack gap={0.5}>
              <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.parentCategory || 'Parent category (optional)'}</Typography>
              <Select
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                size='small'
                fullWidth
                displayEmpty
              >
                <MenuItem value=''>{t.noneTopLevel || 'None (top-level category)'}</MenuItem>
                {categories.filter(c => !c.parentId && c.id !== category?.id).map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>
                ))}
              </Select>
            </Stack>
          )}

          <Stack gap={1}>
            <Typography variant='caption' color='text.secondary' fontWeight={600}>{t.imageIcon || 'Image / Icon'}</Typography>
            <ButtonGroup size='small' fullWidth>
              {IMAGE_TYPES.map(type => (
                <Button key={type} variant={imageType === type ? 'contained' : 'outlined'} onClick={() => setImageType(type)}>
                  {type === 'emoji' ? (t.emojiTab || 'Emoji') : type === 'url' ? 'URL' : (t.uploadTab || 'Upload')}
                </Button>
              ))}
            </ButtonGroup>

            {imageType === 'emoji' && (
              <Stack gap={1}>
                <Stack direction='row' gap={0.5} flexWrap='wrap'>
                  {EMOJI_PRESETS.map(emoji => (
                    <Button
                      key={emoji}
                      variant={image === emoji ? 'contained' : 'outlined'}
                      size='small'
                      onClick={() => setImage(emoji)}
                      sx={{ minWidth: 42, px: 0.5, fontSize: 20 }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </Stack>
                <TextField
                  label={t.customEmoji || 'Custom emoji'}
                  value={typeof image === 'string' ? image : ''}
                  onChange={e => setImage(e.target.value)}
                  size='small'
                  fullWidth
                />
              </Stack>
            )}

            {imageType === 'url' && (
              <TextField
                value={typeof image === 'string' ? image : ''}
                onChange={e => setImage(e.target.value)}
                fullWidth
                size='small'
                placeholder='https://...'
              />
            )}

            {imageType === 'upload' && (
              <Box sx={{ maxWidth: 120 }}>
                <ImagePicker
                  id='cat-image'
                  label={t.categoryImage || 'Category image'}
                  image={image}
                  setImage={setImage}
                />
              </Box>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{dictionary.cancel}</Button>
        <Button variant='contained' onClick={handleSave} disabled={loading || !name.trim()}>
          {loading ? (t.saving || 'Saving...') : dictionary.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
