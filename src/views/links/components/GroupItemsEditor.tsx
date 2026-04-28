import { Card, CardContent, IconButton, Stack, Typography } from '@mui/material'
import { Add, Delete } from '@mui/icons-material'

import type { IItem } from '@/types'
import InputField from '@/components/common/InputField'

interface GroupItemsEditorProps {
  items: IItem[]
  control: any
  errors: any
  dictionary: any
  allowOrder: boolean
  onAdd: () => void
  onRemove: (index: number) => void
}

const GroupItemsEditor: React.FC<GroupItemsEditorProps> = ({ items, control, errors, dictionary, allowOrder, onAdd, onRemove }) => {
  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center'>
        <Typography variant='h6'>{dictionary.links}</Typography>
        <IconButton onClick={onAdd}>
          <Add />
        </IconButton>
      </Stack>

      {items.map((item, index) => (
        <Card key={index}>
          <Stack component={CardContent} gap={2}>
            <Stack direction='row' alignItems='center'>
              <Typography>Link {index + 1}</Typography>
              <IconButton color='error' onClick={() => onRemove(index)}>
                <Delete />
              </IconButton>
            </Stack>

            <InputField
              name={`items[${index}].title`}
              label={dictionary.title}
              control={control}
              errors={errors}
              variant='outlined'
              size='small'
              placeholder='e.g. Restaurant, Pool, Spa...'
            />

            <InputField
              name={`items[${index}].type`}
              label={dictionary.type}
              type='select'
              control={control}
              errors={errors}
              options={[
                { label: 'Link', value: 'link' },
                ...(allowOrder || item.type === 'order' ? [{ label: 'Order', value: 'order' }] : []),
                { label: 'Text', value: 'text' },
                { label: 'Wifi', value: 'wifi' }
              ]}
            />

            {!['wifi', 'group', 'order'].includes(item.type) && (
              <InputField
                name={`items[${index}].value`}
                label={dictionary.value}
                control={control}
                errors={errors}
                variant='outlined'
                size='small'
                placeholder='https://...'
              />
            )}

            {item.type === 'wifi' && (
              <Stack gap={2}>
                <InputField
                  name={`items[${index}].data.ssid`}
                  label={dictionary.ssid}
                  control={control}
                  errors={errors}
                  variant='outlined'
                  size='small'
                  placeholder='Network name'
                />
                <InputField
                  name={`items[${index}].data.password`}
                  label={dictionary.password}
                  control={control}
                  errors={errors}
                  variant='outlined'
                  size='small'
                  placeholder='Password'
                />
              </Stack>
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

export default GroupItemsEditor
