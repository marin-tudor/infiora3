import { Card, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { IconPickerItem } from 'react-icons-picker'

interface PresetsSelectorProps {
  presets: {
    label: string
    image: string
  }[]
  onSelect: (label: string) => void
}

const PresetsSelector: React.FC<PresetsSelectorProps> = ({ presets, onSelect }) => {
  return (
    <Stack gap={2}>
      <Typography variant='body2'>Presets</Typography>

      <Stack direction='row' spacing={1} flexWrap='wrap'>
        {presets.map(preset => (
          <Tooltip key={preset.label} title={preset.label}>
            <Card>
              <IconButton onClick={() => onSelect(preset.label)} color='primary'>
                <IconPickerItem value={preset.image} readOnly />
              </IconButton>
            </Card>
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  )
}

export default PresetsSelector
