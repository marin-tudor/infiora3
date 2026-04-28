// React imports
import React from 'react'

// MUI imports
import { styled } from '@mui/material/styles'
import { Card, Stack, Switch, Typography } from '@mui/material'
import { DragIndicator, Lock } from '@mui/icons-material'

// Other imports
import { toast } from 'react-toastify'

// Custom imports
import type { ILink } from '@/types'
import { useUpdateLinkMutation } from '@/redux/api/linkApi'
import { useDictionary } from '@/contexts/DictionaryContext'

interface LinksListItemProps {
  isLocked?: boolean
  link: ILink
  handleClick?: (link: ILink) => void
}

const LinkTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  [theme.breakpoints.down('md')]: {
    marginTop: theme.spacing(1),
    fontSize: '1.1rem'
  }
}))

const LinksListItem: React.FC<LinksListItemProps> = ({ isLocked, link, handleClick }) => {
  const dictionary = useDictionary()

  const [updateLink] = useUpdateLinkMutation()

  const handleLinkUpdate = async (updateData: Partial<ILink>) => {
    try {
      await updateLink({ id: link?.id, link: updateData }).unwrap()
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  const handleMakeActive = () => {
    if (isLocked) {
      toast.info(dictionary.messages.groupLocked)
    } else {
      handleLinkUpdate({ isActive: !link.isActive })
    }
  }

  return (
    <Stack component={Card} direction='row' alignItems='center' gap={1} paddingY={2} marginBottom={2}>
      <DragIndicator sx={{ cursor: 'grab' }} />
      <Stack direction='row' flexGrow={1} gap={1} alignItems='center'>
        <Stack
          onClick={() => {
            if (isLocked) {
              toast.info(dictionary.messages.groupLocked)
            } else if (handleClick) {
              handleClick(link)
            }
          }}
          flex={1}
        >
          <Stack direction='row' alignItems='center'>
            <LinkTitle variant='h6'>{link.title}</LinkTitle>
            {isLocked && <Lock />}
          </Stack>
        </Stack>
        <Switch color='secondary' checked={link.isActive} onChange={handleMakeActive} />
      </Stack>
    </Stack>
  )
}

export default LinksListItem
