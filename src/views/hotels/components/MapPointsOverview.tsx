'use client'

import { useEffect, useMemo, useRef } from 'react'

import L from 'leaflet'

import type { IMapPoint } from '@/types'

interface MapPointsOverviewProps {
  hotelCenter?: { lat?: number; lng?: number }
  points: IMapPoint[]
  showHotelMarker?: boolean
}

const createMarkerIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 6px 18px rgba(15,23,42,.24);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

const MapPointsOverview = ({ hotelCenter, points, showHotelMarker }: MapPointsOverviewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  const safeCenter = useMemo<[number, number]>(() => {
    if (
      typeof hotelCenter?.lat === 'number' &&
      Number.isFinite(hotelCenter.lat) &&
      typeof hotelCenter?.lng === 'number' &&
      Number.isFinite(hotelCenter.lng)
    ) {
      return [hotelCenter.lat, hotelCenter.lng]
    }

    return [43.5081, 16.4402]
  }, [hotelCenter?.lat, hotelCenter?.lng])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: true
    }).setView(safeCenter, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)

    mapRef.current = map
    layerGroupRef.current = layerGroup

    return () => {
      layerGroup.clearLayers()
      map.remove()
      layerGroupRef.current = null
      mapRef.current = null
    }
  }, [safeCenter])

  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return

    const layerGroup = layerGroupRef.current

    layerGroup.clearLayers()

    const coords: [number, number][] = []

    if (
      showHotelMarker &&
      typeof hotelCenter?.lat === 'number' &&
      Number.isFinite(hotelCenter.lat) &&
      typeof hotelCenter?.lng === 'number' &&
      Number.isFinite(hotelCenter.lng)
    ) {
      const hotelMarker = L.marker([hotelCenter.lat, hotelCenter.lng], { icon: createMarkerIcon('#1d4ed8') })

      hotelMarker.bindTooltip('Hotel')
      layerGroup.addLayer(hotelMarker)
      coords.push([hotelCenter.lat, hotelCenter.lng])
    }

    points.forEach((point, index) => {
      if (!(typeof point.lat === 'number' && Number.isFinite(point.lat) && typeof point.lng === 'number' && Number.isFinite(point.lng))) {
        return
      }

      const marker = L.marker([point.lat, point.lng], { icon: createMarkerIcon(point.color || '#0ea5e9') })

      marker.bindTooltip(point.title || point.address || `Point ${index + 1}`)
      layerGroup.addLayer(marker)
      coords.push([point.lat, point.lng])
    })

    if (coords.length === 0) {
      mapRef.current.setView([43.5081, 16.4402], 13)

      return
    }

    if (coords.length === 1) {
      mapRef.current.setView(coords[0], 15)

      return
    }

    mapRef.current.fitBounds(L.latLngBounds(coords), { padding: [24, 24], maxZoom: 15 })
  }, [hotelCenter?.lat, hotelCenter?.lng, points, showHotelMarker])

  return <div ref={containerRef} style={{ height: 320, width: '100%', borderRadius: 16, overflow: 'hidden' }} />
}

export default MapPointsOverview
