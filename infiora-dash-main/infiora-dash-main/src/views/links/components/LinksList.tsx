import React from 'react'

import { Stack } from '@mui/material'
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import LinksListItem from './LinksListItem'
import SortableItem from './SortableItem'
import type { ILink } from '@/types'

interface LinksListProps {
  isGroup?: boolean
  links?: ILink[]
  handleClick?: (link: ILink) => void
  handleReorderLinks?: (links: string[]) => void
}

const LinksList: React.FC<LinksListProps> = ({ isGroup, links = [], handleReorderLinks, ...props }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300, // Set hold delay to 1 minute (60000 milliseconds)
        tolerance: 5 // Allow small movements before drag starts
      }
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = links.findIndex(link => link.id === active.id)
      const newIndex = links.findIndex(link => link.id === over.id)
      const reorderedLinks = arrayMove(links, oldIndex, newIndex)

      if (handleReorderLinks) {
        handleReorderLinks(reorderedLinks.map(link => link.id))
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={links.map(link => link.id)} strategy={verticalListSortingStrategy}>
        <Stack gap={1}>
          {links.map(link => (
            <SortableItem
              key={link.id}
              id={link.id}
              renderItem={() => <LinksListItem isLocked={!!(link.group && !isGroup)} link={link} {...props} />}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  )
}

export default LinksList
