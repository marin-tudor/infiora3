// React imports
import React from 'react'

// MUI imports
import { Dialog } from '@mui/material'

// Custom imports
import type { ILink } from '@/types'
import LinkForm from './LinkForm'

interface LinkDialogProps {
  link?: ILink
  room?: string
  group?: string
  onClose: any
}

const LinkDialog: React.FC<LinkDialogProps> = ({ link, room, group, onClose }) => {
  return (
    <Dialog fullWidth open={true} maxWidth='md' scroll='paper' onClose={onClose}>
      <LinkForm key={link?.id} room={room} group={group} link={link} onClose={onClose} />
    </Dialog>
  )
}

export default LinkDialog
