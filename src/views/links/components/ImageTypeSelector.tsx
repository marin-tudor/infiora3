import { Button, ButtonGroup, Stack, Typography } from '@mui/material'
import IconPicker from 'react-icons-picker'

import InputField from '@/components/common/InputField'
import ImagePicker from '@/components/widgets/ImagePicker'

interface ImageTypeSelectorProps {
  imageType: string
  image: any
  dictionary: any
  control: any
  errors: any
  onTypeChange: (type: string) => void
  onImageChange: (value: any) => void
}

const IMAGE_TYPES = ['none', 'icon', 'image', 'url']

const ImageTypeSelector: React.FC<ImageTypeSelectorProps> = ({
  imageType,
  image,
  dictionary,
  control,
  errors,
  onTypeChange,
  onImageChange
}) => {
  return (
    <Stack gap={2}>
      <Typography variant='body2'>{dictionary.imageType}</Typography>

      <ButtonGroup>
        {IMAGE_TYPES.map(type => (
          <Button key={type} variant={imageType === type ? 'contained' : 'outlined'} onClick={() => onTypeChange(type)}>
            {dictionary[type]}
          </Button>
        ))}
      </ButtonGroup>

      {imageType === 'icon' && (
        <Stack gap={1}>
          <Typography variant='body2'>{dictionary.icon}</Typography>
          <Stack direction='row' gap={2} alignItems='center'>
            <IconPicker value={image || 'TiCancel'} onChange={(value: any) => onImageChange(value)} />
            {image && (
              <Button color='error' onClick={() => onImageChange(undefined)}>
                {dictionary.remove}
              </Button>
            )}
          </Stack>
        </Stack>
      )}

      {imageType === 'image' && (
        <ImagePicker
          id='image'
          label={dictionary.image}
          description={dictionary.linkImageDescription}
          image={image}
          setImage={onImageChange}
        />
      )}

      {imageType === 'url' && <InputField name='image' label={dictionary.imageUrl} control={control} errors={errors} />}
    </Stack>
  )
}

export default ImageTypeSelector
