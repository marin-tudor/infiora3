'use client'

import { useEffect, useState } from 'react'

import { useParams } from 'next/navigation'

import { Alert, Box, Tab, Tabs, Typography } from '@mui/material'

import FeatureLocked from '@/components/common/FeatureLocked'
import Loader from '@/components/common/Loader'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useGetHotelQuery } from '@/redux/api/hotelApi'
import NotificationGroupsPage from '@/views/staff/pages/NotificationGroupsPage'
import DispatchRulesPage from '@/views/staff/pages/DispatchRulesPage'
import StaffPage from '@/views/staff/pages/StaffPage'
import StaffRolesPage from '@/views/staff/pages/StaffRolesPage'
import TabletSetupPanel from '@/views/staff/components/TabletSetupPanel'

const TAB_LABELS = ['Staff Members', 'Staff Roles', 'Notification Groups', 'Dispatch Rules', 'Tablet Setup'] as const

type Props = {
  initialTab?: number
}

export default function OrdersSetupPage({ initialTab = 0 }: Props) {
  const params = useParams()
  const lang = (params['lang'] as string) || 'en'
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id as string | undefined
  const { data: liveHotel } = useGetHotelQuery(hotelId!, { skip: !hotelId })
  const hotelFeatures = ((liveHotel as any) ?? (authUser as any)?.hotel)?.features
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  if (!authUser) return <Loader center />
  if (!hotelId) return <Loader center />
  if (hotelFeatures?.staffRbacEnabled === false) return <FeatureLocked featureName='Staff RBAC' />

  return (
    <Box>
      <Typography variant='h4' fontWeight={700} mb={1}>
        Orders Setup
      </Typography>
      <Typography variant='body2' color='text.secondary' mb={3}>
        Configure staff access, dispatch routing, and the tablet login flow for your hotel orders.
      </Typography>

      <Alert severity='info' sx={{ mb: 3 }}>
        Use the tabs to set up staff, routing, and tablet devices in one place. Start with roles and groups if this is
        your first setup.
      </Alert>

      <Tabs
        value={tab}
        onChange={(_event, nextValue) => setTab(nextValue)}
        variant='scrollable'
        allowScrollButtonsMobile
        sx={{ mb: 3 }}
      >
        {TAB_LABELS.map((label, index) => {
          const isDispatchTab = index === 3 || index === 4

          return (
            <Tab
              key={label}
              label={label}
              disabled={isDispatchTab && hotelFeatures?.smartDispatchingEnabled === false}
            />
          )
        })}
      </Tabs>

      {tab === 0 && <StaffPage />}
      {tab === 1 && <StaffRolesPage />}
      {tab === 2 && <NotificationGroupsPage />}
      {tab === 3 &&
        (hotelFeatures?.smartDispatchingEnabled === false ? (
          <FeatureLocked featureName='Smart Dispatching' />
        ) : (
          <DispatchRulesPage />
        ))}
      {tab === 4 &&
        (hotelFeatures?.smartDispatchingEnabled === false ? (
          <FeatureLocked featureName='Smart Dispatching' />
        ) : (
          <TabletSetupPanel hotelId={hotelId} lang={lang} />
        ))}
    </Box>
  )
}
