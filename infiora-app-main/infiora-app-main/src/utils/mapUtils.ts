import type { ILink, IMapPoint, IRoom, MapMarkerIcon } from '@/types'

export interface RoomMapPoint extends IMapPoint {
  markerId: string
  source: 'hotel' | 'manual'
  linkedLinkId?: string
  linkedSectionId?: string
}

export const MAP_ICON_CLASS: Record<MapMarkerIcon, string> = {
  hotel: 'ri-hotel-line',
  food: 'ri-restaurant-line',
  drink: 'ri-goblet-line',
  beach: 'ri-umbrella-line',
  pool: 'ri-water-flash-line',
  spa: 'ri-heart-pulse-line',
  taxi: 'ri-taxi-line',
  parking: 'ri-parking-box-line',
  activity: 'ri-run-line',
  shopping: 'ri-shopping-bag-3-line',
  info: 'ri-information-line',
  viewpoint: 'ri-landscape-line',
  transport: 'ri-bus-line',
  coffee: 'ri-cup-line',
  custom: 'ri-shapes-line'
}

const toSafeDescription = (value?: string) => value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''

const findLinkedSection = (pointId: string | undefined, links: ILink[]) => {
  if (!pointId) return undefined

  for (const link of links.filter(item => item.type === 'blog')) {
    for (const section of link.sections || []) {
      if (section.linkedMapPointId && section.linkedMapPointId === pointId) {
        return { linkId: link.id, sectionId: section.id, section }
      }
    }
  }

  return undefined
}

const fillPointMetadata = (point: IMapPoint, links: ILink[]) => {
  const pointId = point.id || (point as any)._id
  const linkedSection = findLinkedSection(pointId, links)

  return {
    ...point,
    title: point.title || linkedSection?.section?.mapTitle,
    description: point.description || linkedSection?.section?.mapDescription || toSafeDescription(linkedSection?.section?.description),
    image: point.image || linkedSection?.section?.mapImage || linkedSection?.section?.images?.[0],
    color: point.color || linkedSection?.section?.mapColor,
    icon: point.icon || linkedSection?.section?.mapIcon,
    linkedLinkId: linkedSection?.linkId,
    linkedSectionId: linkedSection?.sectionId
  }
}

export const buildRoomMapPoints = (room: IRoom, links: ILink[]): RoomMapPoint[] => {
  const points: RoomMapPoint[] = []
  const map = room.hotel.map

  if (map?.showHotelMarker && typeof map.centerLat === 'number' && typeof map.centerLng === 'number') {
    points.push({
      markerId: 'hotel-home',
      source: 'hotel',
      title: room.hotel.name || 'Hotel',
      description: room.hotel.description,
      lat: map.centerLat,
      lng: map.centerLng,
      color: '#1d4ed8',
      icon: 'hotel',
      isActive: true
    })
  }

  ;(room.hotel.mapPoints || [])
    .filter(point => point.isActive !== false)
    .forEach((point, index) => {
      if (typeof point.lat !== 'number' || typeof point.lng !== 'number') return

      const linked = fillPointMetadata(point, links)
      const pointId = point.id || (point as any)._id

      points.push({
        ...linked,
        title: linked.title || linked.address || `Point ${index + 1}`,
        markerId: pointId || `manual-${index}`,
        source: 'manual'
      })
    })

  return points
}

export const getDirectionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
