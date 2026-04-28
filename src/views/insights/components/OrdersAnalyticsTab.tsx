'use client'
import {
  Box, Card, CardContent, CardHeader, Chip, Grid,
  Stack, Typography, useTheme
} from '@mui/material'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import { useGetOrderAnalyticsQuery, useGetOrderVisitAnalyticsQuery } from '@/redux/api/ordersApi'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <Card variant='outlined' sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
          {label}
        </Typography>
        <Typography variant='h4' fontWeight={700} color={color || 'text.primary'} mt={0.5}>
          {value}
        </Typography>
        {sub && (
          <Typography variant='caption' color='text.secondary' component='div' mt={0.5}>{sub}</Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function OrdersAnalyticsTab({
  hotelId,
  startDate,
  endDate,
}: {
  hotelId: string
  startDate: string
  endDate: string
}) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.ordersDashboard || {}
  const ti = dictionary.pages?.insightsUi || {}
  const theme = useTheme()

  const { data: analytics, isLoading } = useGetOrderAnalyticsQuery({ hotelId, startDate, endDate })
  const { data: visits } = useGetOrderVisitAnalyticsQuery({ hotelId, startDate, endDate })

  if (isLoading) return <Loader center />

  if (!analytics) {
    return (
      <Box textAlign='center' py={8}>
        <Typography color='text.secondary'>{ti.noOrderAnalyticsForPeriod || 'No order analytics data for this period'}</Typography>
      </Box>
    )
  }

  const currency = '€'
  const a = analytics as any // backend returns extra fields not in the TS type

  // Orders over time line chart
  const overTime: { date: string; orders: number; revenue: number }[] = a.overTime || []

  const ordersTimeSeries = [
    {
      name: dictionary.orders,
      data: overTime.map(d => ({ x: d.date, y: d.orders })),
    },
  ]

  const revenueTimeSeries = [
    {
      name: t.revenue || 'Revenue',
      data: overTime.map(d => ({ x: d.date, y: d.revenue })),
    },
  ]

  const lineOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      type: 'datetime',
      labels: { format: 'MMM dd', style: { colors: theme.palette.text.secondary } },
    },
    yaxis: {
      labels: {
        style: { colors: theme.palette.text.secondary },
        formatter: v => `${Math.floor(v)}`,
      },
    },
    legend: { labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
  }

  const revenueOptions: ApexOptions = {
    ...lineOptions,
    yaxis: {
      labels: {
        style: { colors: theme.palette.text.secondary },
        formatter: v => `${v.toFixed(0)} ${currency}`,
      },
    },
    tooltip: {
      theme: theme.palette.mode,
      y: { formatter: v => `${v.toFixed(2)} ${currency}` },
    },
  }

  // By-status donut
  const byStatus: Record<string, number> = a.byStatus || {}
  const statusLabels = Object.keys(byStatus)
  const statusValues = Object.values(byStatus) as number[]

  // By-payment donut
  const byPayment: Record<string, number> = a.byPayment || {}
  const paymentLabels = Object.keys(byPayment)
  const paymentValues = Object.values(byPayment) as number[]

  const statusColors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']
  const paymentColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']

  const donutOptions = (colors: string[]): ApexOptions => ({
    chart: { type: 'donut' },
    colors,
    dataLabels: { enabled: true, formatter: val => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } },
  })

  const topItems: any[] = a.topItems || []
  const topRooms: any[] = a.topRooms || []
  const maxItemCount = topItems[0]?.count || 1
  const maxRoomCount = topRooms[0]?.count || 1

  return (
    <Stack gap={3}>
      {/* Order KPIs */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard label={t.totalOrders || 'Total Orders'} value={analytics.totalOrders} sub={t.allStatuses || 'All statuses'} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.revenue || 'Revenue'}
            value={`${analytics.totalRevenue?.toFixed(2)} ${currency}`}
            sub={t.completedOrdersSub || 'Completed orders'}
            color='primary.main'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.avgOrderValue || 'Avg Order Value'}
            value={`${analytics.avgOrderValue?.toFixed(2)} ${currency}`}
            sub={t.perCompletedOrder || 'Per completed order'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.avgFulfillment || 'Avg Fulfillment'}
            value={analytics.avgFulfillmentTime != null ? `${analytics.avgFulfillmentTime} min` : 'N/A'}
            sub='Accept → delivery'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.completed || 'Completed'}
            value={analytics.completedOrders}
            sub={t.successfullyDelivered || 'Successfully delivered'}
            color='success.main'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.cancelled || 'Cancelled'}
            value={analytics.cancelledOrders ?? 0}
            sub={t.totalCancelled || 'Total cancelled'}
            color='error.main'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.pending || 'Pending'}
            value={analytics.pendingOrders}
            sub={t.awaitingAction || 'Awaiting action'}
            color='warning.main'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.avgRating || 'Avg Rating'}
            value={analytics.avgRating ? `${analytics.avgRating?.toFixed(1)} ★` : 'N/A'}
            sub={t.guestSatisfaction || 'Guest satisfaction'}
            color='warning.main'
          />
        </Grid>
      </Grid>

      {/* Menu Visit / Conversion */}
      {visits && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant='subtitle2' color='text.secondary' fontWeight={600} textTransform='uppercase' letterSpacing={0.5}>
              {ti.menuVisitorAnalytics || 'Menu Visitor Analytics'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label={t.menuViews || 'Menu Views'} value={visits.totalVisits} sub={t.guestsOpenedMenu || 'Guests who opened menu'} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label={t.ordered || 'Ordered'} value={visits.converted} sub={t.placedOrder || 'Placed an order'} color='success.main' />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard label={t.browsedOnly || 'Browsed Only'} value={visits.notConverted} sub={t.viewedWithoutOrdering || 'Viewed without ordering'} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label={ti.conversionRate || 'Conversion Rate'}
              value={`${visits.conversionRate}%`}
              sub={t.visitorsWhoOrdered || 'Visitors who ordered'}
              color='primary.main'
            />
          </Grid>
        </Grid>
      )}

      {/* Orders trend + Status donut */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant='outlined'>
            <CardHeader title={ti.ordersOverTime || 'Orders Over Time'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {overTime.length > 0 ? (
                <AppReactApexCharts
                  type='bar'
                  width='100%'
                  height={240}
                  options={lineOptions}
                  series={ordersTimeSeries}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {ti.noOrderTrendData || 'No order trend data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader title={ti.ordersByStatus || 'Orders by Status'} titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {statusValues.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={240}
                  options={{ ...donutOptions(statusColors), labels: statusLabels }}
                  series={statusValues}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {ti.noData || 'No data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue trend + Payment donut */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant='outlined'>
            <CardHeader title={ti.revenueOverTime || 'Revenue Over Time'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {overTime.length > 0 ? (
                <AppReactApexCharts
                  type='area'
                  width='100%'
                  height={240}
                  options={revenueOptions}
                  series={revenueTimeSeries}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {ti.noRevenueTrendData || 'No revenue trend data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader title={ti.paymentMethods || 'Payment Methods'} titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {paymentValues.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={240}
                  options={{ ...donutOptions(paymentColors), labels: paymentLabels }}
                  series={paymentValues}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {ti.noData || 'No data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Items + Top Rooms */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title={t.topItems || 'Top Items'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {topItems.length > 0 ? (
                <Stack gap={1.5}>
                  {topItems.slice(0, 10).map((item: any, i: number) => (
                    <Stack key={i} gap={0.5}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center'>
                        <Stack direction='row' alignItems='center' gap={1}>
                          <Box
                            sx={{
                              width: 24, height: 24, borderRadius: '50%',
                              bgcolor: 'primary.lighter', color: 'primary.main',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </Box>
                          <Typography variant='body2'>{item.name}</Typography>
                        </Stack>
                        <Stack direction='row' gap={1} alignItems='center'>
                          <Chip label={`×${item.count}`} size='small' />
                          <Typography variant='body2' color='text.secondary'>
                            {item.revenue?.toFixed(2)} {currency}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${(item.count / maxItemCount) * 100}%`,
                            bgcolor: 'primary.main',
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                  {ti.noItemsDataYet || 'No items data yet'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title={t.topRoomsByOrders || 'Top Rooms by Orders'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {topRooms.length > 0 ? (
                <Stack gap={1.5}>
                  {topRooms.slice(0, 10).map((room: any, i: number) => (
                    <Stack key={i} gap={0.5}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center'>
                        <Stack direction='row' alignItems='center' gap={1}>
                          <Box
                            sx={{
                              width: 24, height: 24, borderRadius: '50%',
                              bgcolor: 'success.lighter', color: 'success.main',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </Box>
                          <Typography variant='body2'>{dictionary.room} {room.roomNumber}</Typography>
                        </Stack>
                        <Stack direction='row' gap={1} alignItems='center'>
                          <Chip label={`${room.count} ${dictionary.orders.toLowerCase()}`} size='small' />
                          <Typography variant='body2' color='text.secondary'>
                            {room.revenue?.toFixed(2)} {currency}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                        <Box
                          sx={{
                            height: '100%',
                            width: `${(room.count / maxRoomCount) * 100}%`,
                            bgcolor: 'success.main',
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
                  {ti.noRoomOrderDataYet || 'No room order data yet'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
