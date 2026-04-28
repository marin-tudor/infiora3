'use client'

import { useMemo } from 'react'

import { useParams, useRouter } from 'next/navigation'

import { Stack, Typography, Tab } from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { endOfToday, startOfToday } from 'date-fns'

import RangePicker from '@/components/common/RangePicker'
import { useGetHotelInsightsQuery } from '@/redux/api/hotelApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import { toSearchParams } from '@/utils/miscUtils'
import { useAuthUser } from '@/hooks/useAuthUser'
import Loader from '@/components/common/Loader'
import type { IInsights } from '@/types'
import InsightsFilter from '../components/InsightsFilter'
import OverviewTab from '../components/OverviewTab'
import RoomsTab from '../components/RoomsTab'
import ButtonsTab from '../components/ButtonsTab'
import OrdersAnalyticsTab from '../components/OrdersAnalyticsTab'
import ReportsTab from '../components/ReportsTab'
import RevenueAnalyticsTab from '../components/RevenueAnalyticsTab'

const normalizeLanguageLabel = (language?: string) => {
  if (!language) return 'Others'

  const trimmed = language.trim()
  const lower = trimmed.toLowerCase()
  const primaryCode = lower.split(/[-_]/)[0]

  if (['en', 'en-gb', 'en-us'].includes(lower) || primaryCode === 'en') return 'English'
  if (['hr', 'hr-hr'].includes(lower) || primaryCode === 'hr') return 'Croatian'

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

const InsightsPage = () => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const dictionary = useDictionary()
  const t: any = dictionary.pages?.insightsPage || {}
  const authUser = useAuthUser()

  const searchParams: any = useSearchQuery(['startDate', 'endDate', 'language', 'device', 'tab'])

  const start = useMemo(() => startOfToday(), [])
  const end = useMemo(() => endOfToday(), [])

  // Extract only API-relevant params (exclude 'tab' which is UI-only)
  const apiParams = Object.fromEntries(Object.entries(searchParams).filter(([key]) => key !== 'tab'))

  const { data: insights, isLoading }: { data?: IInsights; isLoading: boolean } = useGetHotelInsightsQuery(
    {
      hotel: authUser?.hotel?.id,
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...apiParams
      }
    },
    { skip: !authUser?.hotel?.id }
  )

  const activeTab = searchParams.tab || 'overview'

  const setTab = (tab: string) => {
    router.push(
      `/${locale}/insights?` +
        toSearchParams({ ...searchParams, tab })
    )
  }

  const setRange = ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
    router.push(
      `/${locale}/insights?` +
        toSearchParams({ ...searchParams, startDate, endDate })
    )
  }

  const effectiveStartDate = searchParams.startDate || start.toISOString()
  const effectiveEndDate = searchParams.endDate || end.toISOString()

  const languageOptions = [...new Set((insights?.activities || []).map(a => normalizeLanguageLabel(a.details.language)))].map(language => ({
    label: language,
    value: language
  }))

  return (
    <>
      {isLoading && <Loader center />}
      <Stack gap={3}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ sm: 'center' }}
          gap={2}
        >
          <Typography variant='h4' noWrap>
            {dictionary.welcome} {authUser?.hotel?.name}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
            <InsightsFilter
              languages={languageOptions}
              filters={searchParams}
              setFilters={filters => {
                const rest = Object.fromEntries(
                  Object.entries(searchParams).filter(([key]) => !['device', 'language'].includes(key))
                )

                router.push(
                  `/${locale}/insights?` +
                    toSearchParams({ ...rest, ...filters })
                )
              }}
            />
            <RangePicker
              range={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
              setRange={setRange}
            />
          </Stack>
        </Stack>

        {/* Tabbed content */}
        <TabContext value={activeTab}>
          <TabList
            onChange={(_, v) => setTab(v)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<i className='ri-dashboard-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.overviewTab || 'Overview'}
              value='overview'
            />
            <Tab
              icon={<i className='ri-door-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.roomsTab || dictionary.rooms}
              value='rooms'
            />
            <Tab
              icon={<i className='ri-cursor-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.buttonsTab || dictionary.buttons}
              value='buttons'
            />
            <Tab
              icon={<i className='ri-shopping-bag-3-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.ordersTab || dictionary.orders}
              value='orders'
            />
            <Tab
              icon={<i className='ri-file-chart-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.reportsTab || 'Reports'}
              value='reports'
            />
            <Tab
              icon={<i className='ri-bar-chart-box-line' style={{ fontSize: 18 }} />}
              iconPosition='start'
              label={t.revenueTab || 'Revenue'}
              value='revenue'
            />
          </TabList>

          <TabPanel value='overview' sx={{ px: 0 }}>
            {insights ? (
              <OverviewTab
                insights={insights}
                hotelId={authUser?.hotel?.id}
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
              />
            ) : !isLoading ? (
              <Typography color='text.secondary' textAlign='center' py={6}>
                {t.noDataForPeriod || 'No data available for the selected period'}
              </Typography>
            ) : null}
          </TabPanel>

          <TabPanel value='rooms' sx={{ px: 0 }}>
            {insights && authUser?.hotel?.id && (
              <RoomsTab
                insights={insights}
                hotelId={authUser.hotel.id}
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
              />
            )}
          </TabPanel>

          <TabPanel value='buttons' sx={{ px: 0 }}>
            {insights && <ButtonsTab insights={insights} />}
          </TabPanel>

          <TabPanel value='orders' sx={{ px: 0 }}>
            {authUser?.hotel?.id && (
              <OrdersAnalyticsTab
                hotelId={authUser.hotel.id}
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
              />
            )}
          </TabPanel>

          <TabPanel value='reports' sx={{ px: 0 }}>
            <ReportsTab
              insights={insights}
              hotelId={authUser?.hotel?.id || ''}
              startDate={effectiveStartDate}
              endDate={effectiveEndDate}
            />
          </TabPanel>

          <TabPanel value='revenue' sx={{ px: 0 }}>
            {authUser?.hotel?.id && (
              <RevenueAnalyticsTab
                hotelId={authUser.hotel.id}
                startDate={effectiveStartDate}
                endDate={effectiveEndDate}
              />
            )}
          </TabPanel>
        </TabContext>
      </Stack>
    </>
  )
}

export default InsightsPage
