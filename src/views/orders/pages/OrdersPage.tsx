'use client'

import { useState } from 'react'

import { Stack, Typography, Tabs, Tab, Box, Chip } from '@mui/material'

import { useAuthUser } from '@/hooks/useAuthUser'
import Loader from '@/components/common/Loader'
import FeatureLocked from '@/components/common/FeatureLocked'
import { useUnfinishedOrdersCount } from '@/hooks/useUnfinishedOrdersCount'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import { useDictionary } from '@/contexts/DictionaryContext'

import OrdersDashboard from '../components/OrdersDashboard'
import ActiveOrders from '../components/ActiveOrders'
import MenuManagement from '../components/MenuManagement'
import ReservationCodes from '../components/ReservationCodes'
import OrderSettings from '../components/OrderSettings'

export default function OrdersPage() {
  const [tab, setTab] = useState(0)
  const authUser = useAuthUser()
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.ordersPage || {}
  const hotelId = authUser?.hotel?.id
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })

  const hotelFeatures = ((liveHotel as any) ?? (authUser?.hotel as any))?.features
  const isFeatureLocked = hotelFeatures?.ordersEnabled === false
  const { count: pendingCount } = useUnfinishedOrdersCount(hotelId, { skip: isFeatureLocked })

  if (!authUser) return <Loader center />

  if (!hotelId) {
    return (
      <Box textAlign='center' py={8}>
        <Typography color='text.secondary'>{t.noHotelSelected || 'No hotel selected'}</Typography>
      </Box>
    )
  }

  if (isFeatureLocked) {
    return <FeatureLocked featureName='Orders' />
  }

  const currency = (liveHotel as any)?.orders?.currencySymbol || (authUser.hotel as any)?.orders?.currencySymbol || 'EUR'

  return (
    <Stack gap={3}>
      <Typography variant='h4' fontWeight={700}>{dictionary.orders}</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={t.dashboardTab || 'Dashboard'} icon={<i className='ri-dashboard-line' />} iconPosition='start' />
          <Tab
            label={
              <Stack direction='row' alignItems='center' gap={1}>
                {dictionary.orders}
                {pendingCount > 0 && (
                  <Chip label={pendingCount} size='small' color='error' sx={{ height: 18, fontSize: 11 }} />
                )}
              </Stack>
            }
            icon={<i className='ri-list-check' />}
            iconPosition='start'
          />
          <Tab label={t.menuTab || 'Menu'} icon={<i className='ri-restaurant-line' />} iconPosition='start' />
          <Tab label={t.codesTab || 'Codes'} icon={<i className='ri-key-2-line' />} iconPosition='start' />
          <Tab label={dictionary.settings} icon={<i className='ri-settings-3-line' />} iconPosition='start' />
        </Tabs>
      </Box>

      <Box>
        {tab === 0 && <OrdersDashboard hotelId={hotelId} />}
        {tab === 1 && <ActiveOrders hotelId={hotelId} currency={currency} />}
        {tab === 2 && <MenuManagement hotelId={hotelId} currency={currency} />}
        {tab === 3 && <ReservationCodes hotelId={hotelId} />}
        {tab === 4 && <OrderSettings hotelId={hotelId} />}
      </Box>
    </Stack>
  )
}
