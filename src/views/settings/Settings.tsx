'use client'

import { useState } from 'react'

import { Tabs, Tab, Box } from '@mui/material'

import { useAuthUser } from '@/hooks/useAuthUser'
import AccountSettings from './AccountSettings'
import OrderSettings from '../orders/components/OrderSettings'

const Settings = ({ authUser }: any) => {
  const [tab, setTab] = useState(0)
  const auth = useAuthUser()
  const hotelId = auth?.hotel?.id

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label='Account' icon={<i className='ri-user-line' />} iconPosition='start' />
        <Tab label='Orders Setup' icon={<i className='ri-settings-3-line' />} iconPosition='start' />
      </Tabs>
      {tab === 0 && <AccountSettings authUser={authUser} />}
      {tab === 1 && hotelId && <OrderSettings hotelId={hotelId} />}
    </Box>
  )
}

export default Settings
