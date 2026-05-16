import { Card, CardContent, IconButton, Stack, TextField, Typography, Box } from '@mui/material'
import { Add, ArrowDownward, ArrowUpward, Delete } from '@mui/icons-material'

import type { IMapPoint, ISection } from '@/types'
import InputField from '@/components/common/InputField'
import MultipleImagePicker from '@/components/widgets/MultipleImagePicker'
import RichTextEditor from '@/components/widgets/RichTextEditor'
import SmartUrlInput from '@/components/common/SmartUrlInput'

const createClientId = () => `client-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

interface BlogSectionsEditorProps {
  sections: ISection[]
  mapPoints: IMapPoint[]
  control: any
  errors: any
  dictionary: any
  onAdd: () => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  onImagesChange: (index: number, images: string[]) => void
  setValue: any
}

const BlogSectionsEditor: React.FC<BlogSectionsEditorProps> = ({
  sections,
  mapPoints,
  control,
  errors,
  dictionary,
  onAdd,
  onRemove,
  onMove,
  onImagesChange,
  setValue
}) => {
  const addItem = (sectionIndex: number) => {
    const updatedSections = [...sections]
    const currentItems = updatedSections[sectionIndex].items || []

    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [
        ...currentItems,
        {
          clientId: createClientId(),
          title: '',
          price: '',
          description: ''
        }
      ]
    }

    setValue('sections', updatedSections)
  }

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const updatedSections = [...sections]
    const items = [...(updatedSections[sectionIndex].items || [])]

    items.splice(itemIndex, 1)
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], items }
    setValue('sections', updatedSections)
  }

  const addLink = (sectionIndex: number) => {
    const updatedSections = [...sections]
    const currentLinks = updatedSections[sectionIndex].links || []

    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      links: [...currentLinks, { clientId: createClientId(), url: '', urlButtonText: '' }]
    }

    setValue('sections', updatedSections)
  }

  const removeLink = (sectionIndex: number, linkIndex: number) => {
    const updatedSections = [...sections]
    const links = [...(updatedSections[sectionIndex].links || [])]

    links.splice(linkIndex, 1)
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], links }
    setValue('sections', updatedSections)
  }

  const updateLink = (sectionIndex: number, linkIndex: number, field: 'url' | 'urlButtonText', value: string) => {
    const updatedSections = [...sections]
    const links = [...(updatedSections[sectionIndex].links || [])]

    links[linkIndex] = { ...links[linkIndex], [field]: value }
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], links }
    setValue('sections', updatedSections)
  }

  const mapPointOptions = mapPoints
    .map(point => {
      const pointId = point.id || (point as any)._id

      if (!pointId) return null
      
return {
        label: point.title || point.address || pointId || 'Untitled point',
        value: pointId
      }
    })
    .filter(Boolean) as { label: string; value: string }[]

  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center'>
        <Typography variant='h6'>{dictionary.sections}</Typography>
        <IconButton onClick={onAdd}>
          <Add />
        </IconButton>
      </Stack>

      {sections.map((section: ISection & { clientId?: string }, index) => (
        <Card key={section.clientId || `section-${index}`}>
          <Stack component={CardContent} gap={2}>
            <Stack direction='row' alignItems='center'>
              <Typography>Section {index + 1}</Typography>
              <IconButton disabled={index === 0} onClick={() => onMove(index, 'up')}>
                <ArrowUpward />
              </IconButton>
              <IconButton disabled={index === sections.length - 1} onClick={() => onMove(index, 'down')}>
                <ArrowDownward />
              </IconButton>
              <IconButton color='error' onClick={() => onRemove(index)}>
                <Delete />
              </IconButton>
            </Stack>

            <InputField
              name={`sections[${index}].title`}
              label={dictionary.title}
              control={control}
              errors={errors}
              variant='outlined'
              size='small'
              placeholder='e.g. About us, Menu, Location...'
            />

            <RichTextEditor
              label='Description'
              value={section.description}
              onChange={value => setValue(`sections.${index}.description`, value)}
            />

            {/* Links */}
            <Stack gap={1}>
              <Stack direction='row' alignItems='center'>
                <Typography variant='subtitle2'>Links</Typography>
                <IconButton size='small' onClick={() => addLink(index)}>
                  <Add fontSize='small' />
                </IconButton>
              </Stack>

              {(section.links || []).map((link: any, linkIndex) => (
                <Card key={link.clientId || linkIndex} variant='outlined'>
                  <Stack component={CardContent} gap={1} sx={{ py: '8px !important' }}>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                        Link {linkIndex + 1}
                      </Typography>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => removeLink(index, linkIndex)}
                        sx={{ ml: 'auto' }}
                      >
                        <Delete fontSize='small' />
                      </IconButton>
                    </Stack>

                    <SmartUrlInput
                      label='URL'
                      value={link.url}
                      onChange={val => updateLink(index, linkIndex, 'url', val)}
                    />

                    <Box>
                      <Typography variant='body2' color='text.secondary' fontWeight={500} mb={0.5}>
                        Button text
                      </Typography>
                      <TextField
                        fullWidth
                        size='small'
                        variant='outlined'
                        value={link.urlButtonText}
                        onChange={e => updateLink(index, linkIndex, 'urlButtonText', e.target.value)}
                        placeholder='e.g. See full menu'
                      />
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Stack>

            <InputField
              name={`sections[${index}].phone`}
              label={dictionary.phone}
              control={control}
              errors={errors}
              variant='outlined'
              size='small'
              placeholder='+385...'
            />

            <InputField
              name={`sections[${index}].address`}
              label={dictionary.address}
              control={control}
              errors={errors}
              variant='outlined'
              size='small'
              placeholder='e.g. Ilica 1, Zagreb'
            />

            <InputField
              name={`sections[${index}].video`}
              label={dictionary.video}
              control={control}
              errors={errors}
              variant='outlined'
              size='small'
              placeholder='https://www.youtube.com/watch?v=...'
            />

            <MultipleImagePicker
              id={`sections[${index}].images`}
              label='Images'
              images={section.images || []}
              setImages={images => onImagesChange(index, images)}
              rectangle
              maxImages={12}
            />

            <Stack gap={2} sx={{ borderTop: theme => `1px solid ${theme.palette.divider}`, pt: 2 }}>
              <Typography variant='h6'>Map Settings</Typography>
              <InputField
                name={`sections[${index}].mapEnabled`}
                label='Show this section on map'
                type='switch'
                control={control}
                errors={errors}
              />

              {section.mapEnabled && (
                <>
                  {mapPointOptions.length === 0 && (
                    <Typography variant='body2' color='warning.main'>
                      Nema još spremljenih map pointova za ovaj hotel. Prvo spremi pointe u Hotel Settings pa se vrati
                      ovdje.
                    </Typography>
                  )}
                  <InputField
                    name={`sections[${index}].linkedMapPointId`}
                    label='Linked map point'
                    type='select'
                    options={mapPointOptions}
                    control={control}
                    errors={errors}
                  />
                  <Typography variant='body2' color='text.secondary'>
                    Create and edit map points in Hotel Settings first, then link this section to one of those points.
                  </Typography>
                </>
              )}
            </Stack>

            <Stack direction='row' alignItems='center'>
              <Typography variant='h6'>{dictionary.items}</Typography>
              <IconButton onClick={() => addItem(index)}>
                <Add />
              </IconButton>
            </Stack>

            {section.items?.map((item: any, i: number) => (
              <Card key={item?.clientId || `section-${section.clientId || index}-item-${i}`}>
                <Stack component={CardContent} gap={2}>
                  <Stack direction='row' alignItems='center'>
                    <Typography>Item {i + 1}</Typography>
                    <IconButton color='error' onClick={() => removeItem(index, i)}>
                      <Delete />
                    </IconButton>
                  </Stack>

                  <InputField
                    name={`sections[${index}].items[${i}].title`}
                    label={dictionary.title}
                    control={control}
                    errors={errors}
                    variant='outlined'
                    size='small'
                    placeholder='e.g. Pasta Carbonara'
                  />
                  <InputField
                    name={`sections[${index}].items[${i}].description`}
                    label={dictionary.description}
                    control={control}
                    errors={errors}
                    variant='outlined'
                    size='small'
                    placeholder='Short description (optional)'
                  />
                  <InputField
                    name={`sections[${index}].items[${i}].price`}
                    label={dictionary.price}
                    control={control}
                    errors={errors}
                    variant='outlined'
                    size='small'
                    placeholder='e.g. 12.50 €'
                  />
                </Stack>
              </Card>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

export default BlogSectionsEditor
