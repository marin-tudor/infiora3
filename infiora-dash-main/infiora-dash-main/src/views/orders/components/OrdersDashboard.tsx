'use client'
import { useState } from 'react'

import { Grid, Card, CardContent, Typography, Stack, Box, Chip } from '@mui/material'
import { startOfMonth, endOfToday, formatISO } from 'date-fns'

import { useGetOrderAnalyticsQuery, useGetOrderVisitAnalyticsQuery } from '@/redux/api/ordersApi'
import Loader from '@/components/common/Loader'
import RangePicker from '@/components/common/RangePicker'
import { useDictionary } from '@/contexts/DictionaryContext'

const StatCard = ({
  label,
  value,
  sub,
  color
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) => (
  <Card variant='outlined'>
    <CardContent>
      <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
        {label}
      </Typography>
      <Typography variant='h4' fontWeight={700} color={color || 'text.primary'} mt={0.5}>
        {value}
      </Typography>
      {sub && (
        <Typography variant='caption' color='text.secondary'>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
)

export default function OrdersDashboard({ hotelId }: { hotelId: string }) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.ordersDashboard || {}

  // Default: this month
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>({
    startDate: formatISO(startOfMonth(new Date())),
    endDate: formatISO(endOfToday())
  })

  const { data: analytics, isLoading } = useGetOrderAnalyticsQuery({
    hotelId,
    startDate: range.startDate,
    endDate: range.endDate
  })

  const { data: visits } = useGetOrderVisitAnalyticsQuery({
    hotelId,
    startDate: range.startDate,
    endDate: range.endDate
  })

  if (isLoading) return <Loader center />

  if (!analytics) {
    return (
      <Box textAlign='center' py={8}>
        <Typography color='text.secondary'>{t.noAnalytics || 'No analytics data available'}</Typography>
      </Box>
    )
  }

  const currency = '€'

  return (
    <Stack gap={3}>
      {/* Date picker — right-aligned like /home */}
      <Stack direction='row' justifyContent='flex-end'>
        <RangePicker range={range} setRange={setRange} />
      </Stack>

      {/* Order stats */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.totalOrders || 'Total Orders'}
            value={analytics.totalOrders}
            sub={t.allStatuses || 'All statuses'}
          />
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
            label={t.pending || 'Pending'}
            value={analytics.pendingOrders}
            sub={t.awaitingAction || 'Awaiting action'}
            color='warning.main'
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
            label={t.avgOrderValue || 'Avg Order Value'}
            value={`${analytics.avgOrderValue?.toFixed(2)} ${currency}`}
            sub={t.perCompletedOrder || 'Per completed order'}
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
            label={t.avgFulfillment || 'Avg Fulfillment'}
            value={analytics.avgFulfillmentTime != null ? `${analytics.avgFulfillmentTime} min` : 'N/A'}
            sub='Accept → delivery'
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard
            label={t.avgRating || 'Avg Rating'}
            value={analytics.avgRating ? `${analytics.avgRating?.toFixed(1)} ★` : 'N/A'}
            sub={t.guestSatisfaction || 'Guest satisfaction'}
          />
        </Grid>
      </Grid>

      {/* Visitor tracking */}
      {visits && (
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <StatCard
              label={t.menuViews || 'Menu Views'}
              value={visits.totalVisits}
              sub={t.guestsOpenedMenu || 'Guests who opened menu'}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label={t.ordered || 'Ordered'}
              value={visits.converted}
              sub={t.placedOrder || 'Placed an order'}
              color='success.main'
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label={t.browsedOnly || 'Browsed Only'}
              value={visits.notConverted}
              sub={t.viewedWithoutOrdering || 'Viewed without ordering'}
              color='text.secondary'
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              label={t.conversion || 'Conversion'}
              value={`${visits.conversionRate}%`}
              sub={t.visitorsWhoOrdered || 'Visitors who ordered'}
              color='primary.main'
            />
          </Grid>
        </Grid>
      )}

      {/* Top items & rooms */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='subtitle2' fontWeight={700} mb={2}>
                {t.topItems || 'Top Items'}
              </Typography>
              {analytics.topItems?.length ? (
                <Stack gap={1}>
                  {analytics.topItems.slice(0, 8).map((item: any, i: number) => (
                    <Stack key={i} direction='row' alignItems='center' justifyContent='space-between'>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: 'primary.lighter',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700
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
                  ))}
                </Stack>
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={2}>
                  {t.noDataYet || 'No data yet'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='subtitle2' fontWeight={700} mb={2}>
                {t.topRoomsByOrders || 'Top Rooms by Orders'}
              </Typography>
              {analytics.topRooms?.length ? (
                <Stack gap={1}>
                  {analytics.topRooms.slice(0, 8).map((room: any, i: number) => (
                    <Stack key={i} direction='row' alignItems='center' justifyContent='space-between'>
                      <Stack direction='row' alignItems='center' gap={1}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: 'success.lighter',
                            color: 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {i + 1}
                        </Box>
                        <Typography variant='body2'>
                          {dictionary.room} {room.roomNumber}
                        </Typography>
                      </Stack>
                      <Stack direction='row' gap={1} alignItems='center'>
                        <Chip label={`${room.count} ${dictionary.orders.toLowerCase()}`} size='small' />
                        <Typography variant='body2' color='text.secondary'>
                          {room.revenue?.toFixed(2)} {currency}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={2}>
                  {t.noDataYet || 'No data yet'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
