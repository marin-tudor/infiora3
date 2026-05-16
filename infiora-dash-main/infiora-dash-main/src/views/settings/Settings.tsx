'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { Box, Tab, Tabs } from '@mui/material'

import AccountSettings from './AccountSettings'
import SecuritySettings from './SecuritySettings'
import OrdersSetupPage from '@/views/staff/pages/OrdersSetupPage'

const Settings = ({ authUser }: any) => {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'orders-setup' ? 1 : tabParam === 'security' ? 2 : 0
  const locale = String(params.lang ?? '')

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(_, nextTab) => {
          const tabMap = ['', '?tab=orders-setup', '?tab=security']

          router.replace(`/${locale}/settings${tabMap[nextTab] || ''}`)
        }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label='Account' icon={<i className='ri-user-line' />} iconPosition='start' />
        <Tab label='Orders Setup' icon={<i className='ri-tablet-line' />} iconPosition='start' />
        <Tab label='Security' icon={<i className='ri-shield-keyhole-line' />} iconPosition='start' />
      </Tabs>

      {activeTab === 0 && <AccountSettings authUser={authUser} />}
      {activeTab === 1 && <OrdersSetupPage initialTab={0} />}
      {activeTab === 2 && <SecuritySettings />}
    </Box>
  )
}

export default Settings
