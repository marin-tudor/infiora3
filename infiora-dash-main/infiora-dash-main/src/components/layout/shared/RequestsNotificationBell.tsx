'use client'

import { useState } from 'react'
import type { MouseEvent } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { Badge, Chip, IconButton, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'

import type { Locale } from '@configs/i18n'
import { getLocalizedUrl } from '@/utils/i18n'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useGetHousekeepingPendingCountQuery } from '@/redux/api/housekeepingApi'
import { useGetMaintenancePendingCountQuery } from '@/redux/api/maintenanceApi'
import { useAuthUser } from '@/hooks/useAuthUser'

export default function RequestsNotificationBell() {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.requestsBell || {}
  const router = useRouter()
  const { lang: locale } = useParams()
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const { data: hkData } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.housekeepingEnabled === false,
    pollingInterval: 30000
  })

  const { data: mxData } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.maintenanceEnabled === false,
    pollingInterval: 30000
  })

  const housekeepingCount = hkData?.count ?? 0
  const maintenanceCount = mxData?.count ?? 0
  const total = housekeepingCount + maintenanceCount
  const housekeepingEnabled = hotelFeatures?.housekeepingEnabled !== false
  const maintenanceEnabled = hotelFeatures?.maintenanceEnabled !== false

  if (!hotelId || (hotelFeatures?.housekeepingEnabled === false && hotelFeatures?.maintenanceEnabled === false))
    return null

  const tooltip =
    total > 0
      ? `${housekeepingCount} ${t.housekeepingShort || 'housekeeping'} · ${maintenanceCount} ${t.maintenancePendingShort || 'maintenance pending'}`
      : t.noPending || 'No pending requests'

  const goTo = (path: '/housekeeping' | '/maintenance') => {
    setAnchorEl(null)
    router.push(getLocalizedUrl(path, locale as Locale))
  }

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!housekeepingEnabled && maintenanceEnabled) {
      goTo('/maintenance')

      return
    }

    if (!maintenanceEnabled && housekeepingEnabled) {
      goTo('/housekeeping')

      return
    }

    if (housekeepingCount > 0 && maintenanceCount > 0) {
      setAnchorEl(event.currentTarget)

      return
    }

    goTo(maintenanceCount > 0 ? '/maintenance' : '/housekeeping')
  }

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton onClick={handleClick} color={total > 0 ? 'warning' : 'default'}>
          <Badge badgeContent={total || undefined} color='warning'>
            <i className={total > 0 ? 'ri-service-fill' : 'ri-service-line'} style={{ fontSize: 22 }} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {housekeepingEnabled && (
          <MenuItem onClick={() => goTo('/housekeeping')}>
            <ListItemText
              primary={t.housekeeping || dictionary.housekeeping || 'Housekeeping'}
              secondary={`${housekeepingCount} ${t.unresolved || 'unresolved'}`}
            />
            <Chip label={housekeepingCount} color='error' size='small' sx={{ ml: 3 }} />
          </MenuItem>
        )}
        {maintenanceEnabled && (
          <MenuItem onClick={() => goTo('/maintenance')}>
            <ListItemText
              primary={t.maintenance || dictionary.maintenance || 'Maintenance'}
              secondary={`${maintenanceCount} ${t.unresolved || 'unresolved'}`}
            />
            <Chip label={maintenanceCount} color='error' size='small' sx={{ ml: 3 }} />
          </MenuItem>
        )}
      </Menu>
    </>
  )
}
