'use client'

import { useEffect, useMemo, useRef } from 'react'

import L from 'leaflet'

interface MapPointLocationPickerProps {
  lat: number
  lng: number
  color?: string
  onChange: (coords: { lat: number; lng: number }) => void
}

const createMarkerIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 6px 18px rgba(15,23,42,.24);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })

const MapPointLocationPicker = ({ lat, lng, color = '#0ea5e9', onChange }: MapPointLocationPickerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const safeLat = useMemo(() => (Number.isFinite(lat) ? lat : 43.5081), [lat])
  const safeLng = useMemo(() => (Number.isFinite(lng) ? lng : 16.4402), [lng])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([safeLat, safeLng], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)

    const marker = L.marker([safeLat, safeLng], {
      draggable: true,
      icon: createMarkerIcon(color)
    }).addTo(map)

    marker.on('dragend', () => {
      const next = marker.getLatLng()

      onChange({ lat: next.lat, lng: next.lng })
    })

    map.on('click', event => {
      const next = event.latlng

      marker.setLatLng(next)
      onChange({ lat: next.lat, lng: next.lng })
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      marker.remove()
      map.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [color, onChange, safeLat, safeLng])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return

    markerRef.current.setIcon(createMarkerIcon(color))
    markerRef.current.setLatLng([safeLat, safeLng])
    mapRef.current.setView([safeLat, safeLng], Math.max(mapRef.current.getZoom(), 14), { animate: false })
  }, [color, safeLat, safeLng])

  return <div ref={containerRef} style={{ height: 260, width: '100%', borderRadius: 16, overflow: 'hidden' }} />
}

export default MapPointLocationPicker
