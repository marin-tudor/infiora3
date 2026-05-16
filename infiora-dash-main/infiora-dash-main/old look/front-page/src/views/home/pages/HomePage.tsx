'use client'

// Next.js imports

import { useMemo } from 'react'

import { useParams, useRouter } from 'next/navigation'

// MUI imports
import { Alert, Card, CardContent, Chip, Grid, Stack, Typography, Box } from '@mui/material'

// Custom imports
import { endOfToday, startOfToday } from 'date-fns'

import { Dangerous, Warning } from '@mui/icons-material'

import RangePicker from '@/components/common/RangePicker'
import { useGetHotelInsightsQuery } from '@/redux/api/hotelApi'
import { useGetOrderAnalyticsQuery } from '@/redux/api/ordersApi'
import { useDictionary } from '@/contexts/DictionaryContext'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import { toSearchParams } from '@/utils/miscUtils'
import { useAuthUser } from '@/hooks/useAuthUser'
import Loader from '@/components/common/Loader'
import KeyMetrics from '../components/KeyMetrics'
import TopRated from '../components/TopRated'
import LineChart from '@/components/charts/LineChart'
import DonutChart from '@/components/charts/DonutChart'
import UpcomingScheduledOrders from '../components/UpcomingScheduledOrders'
import type { IInsights } from '@/types'

const HomePage = () => {
  const router = useRouter()
  const { lang: locale } = useParams()
  const dictionary = useDictionary()
  const authUser = useAuthUser()

  const searchParams: any = useSearchQuery(['startDate', 'endDate'])

  const start = useMemo(() => startOfToday(), [])
  const end = useMemo(() => endOfToday(), [])

  const hotelId = authUser?.hotel?.id

  const { data: orderAnalytics } = useGetOrderAnalyticsQuery(
    {
      hotelId: hotelId!,
      startDate: searchParams.startDate ? new Date(searchParams.startDate).toISOString() : start.toISOString(),
      endDate: searchParams.endDate ? new Date(searchParams.endDate).toISOString() : end.toISOString()
    },
    { skip: !hotelId }
  )

  const { data: insights, isLoading }: { data?: IInsights; isLoading: boolean } = useGetHotelInsightsQuery(
    {
      hotel: authUser?.hotel?.id,
      params: {
        ...searchParams,
        startDate: searchParams.startDate ? new Date(searchParams.startDate).toISOString() : start.toISOString(),
        endDate: searchParams.endDate ? new Date(searchParams.endDate).toISOString() : end.toISOString()
      }
    },
    { skip: !authUser?.hotel?.id }
  )

  const getData = (obj?: Record<string, any>) => {
    if (!obj) return []

    return Object.keys(obj).map(x => ({
      x,
      y: obj[x]
    }))
  }

  return (
    <Stack gap={2}>
      {isLoading && <Loader center />}
      {authUser && authUser?.hotel === null && (
        <Alert icon={<Dangerous />} severity='error' color='error'>
          {dictionary.noHotelMessage}
        </Alert>
      )}
      {authUser?.hotel && !authUser?.hotel?.isActive && (
        <Alert icon={<Warning />} severity='warning' color='warning'>
          {dictionary.inActiveHotelMessage}
        </Alert>
      )}
      {insights && (
        <Stack gap={5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent='space-between'
            alignItems={{ sm: 'center' }}
            gap={2}
          >
            <Typography variant='h4' noWrap>
              {dictionary.welcome} {authUser?.name}
            </Typography>
            <RangePicker
              range={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
              setRange={({ startDate, endDate }) => {
                router.push(
                  `/${locale}/home?` +
                    toSearchParams({
                      ...searchParams,
                      startDate: startDate,
                      endDate: endDate
                    })
                )
              }}
            />
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <KeyMetrics insights={insights} />
            </Grid>
            <Grid container item xs={12} spacing={2}>
              <Grid item xs={12} md={6}>
                <LineChart
                  label={dictionary.pages.insights.viewsAndClicksOverTime.title}
                  info={dictionary.pages.insights.viewsAndClicksOverTime.info}
                  series={[
                    {
                      name: dictionary.views,
                      data: getData(insights?.overTime?.views)
                    },
                    {
                      name: dictionary.taps,
                      data: getData(insights?.overTime?.taps)
                    }
                  ]}
                />
              </Grid>
              <Grid container item xs={12} md={6} spacing={2}>
                <Grid item xs={12}>
                  <DonutChart
                    title={dictionary.pages.insights.devices.title}
                    info={dictionary.pages.insights.devices.info}
                    labels={Object.keys(insights.keyMetrics.viewsByDevices)}
                    series={Object.values(insights.keyMetrics.viewsByDevices)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <DonutChart
                    title={dictionary.pages.insights.languages.title}
                    info={dictionary.pages.insights.languages.info}
                    labels={Object.keys(insights.keyMetrics.viewsByLanguages)}
                    series={Object.values(insights.keyMetrics.viewsByLanguages)}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <TopRated insights={insights} />
            </Grid>

            {/* Orders section */}
            {orderAnalytics && hotelId && (
              <Grid item xs={12}>
                <UpcomingScheduledOrders hotelId={hotelId} />
              </Grid>
            )}
            {orderAnalytics && (
              <Grid item xs={12}>
                <Stack gap={2}>
                  <Typography variant='h6' fontWeight={700}>
                    Orders
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            textTransform='uppercase'
                            letterSpacing={0.5}
                          >
                            Total Orders
                          </Typography>
                          <Typography variant='h4' fontWeight={700} mt={0.5}>
                            {orderAnalytics.totalOrders}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            textTransform='uppercase'
                            letterSpacing={0.5}
                          >
                            Revenue
                          </Typography>
                          <Typography variant='h4' fontWeight={700} color='primary.main' mt={0.5}>
                            {orderAnalytics.totalRevenue?.toFixed(2)} €
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            textTransform='uppercase'
                            letterSpacing={0.5}
                          >
                            Avg Order
                          </Typography>
                          <Typography variant='h4' fontWeight={700} mt={0.5}>
                            {orderAnalytics.avgOrderValue?.toFixed(2)} €
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            textTransform='uppercase'
                            letterSpacing={0.5}
                          >
                            Avg Rating
                          </Typography>
                          <Typography variant='h4' fontWeight={700} mt={0.5}>
                            {orderAnalytics.avgRating ? `${orderAnalytics.avgRating.toFixed(1)} ★` : 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography variant='subtitle2' fontWeight={700} mb={2}>
                            Top Items
                          </Typography>
                          {orderAnalytics.topItems?.length ? (
                            <Stack gap={1}>
                              {orderAnalytics.topItems.slice(0, 5).map((item: any, i: number) => (
                                <Stack key={i} direction='row' alignItems='center' justifyContent='space-between'>
                                  <Stack direction='row' alignItems='center' gap={1}>
                                    <Box
                                      sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.lighter',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
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
                                      {item.revenue?.toFixed(2)} €
                                    </Typography>
                                  </Stack>
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant='body2' color='text.secondary'>
                              No orders yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Card variant='outlined'>
                        <CardContent>
                          <Typography variant='subtitle2' fontWeight={700} mb={2}>
                            Top Rooms by Orders
                          </Typography>
                          {orderAnalytics.topRooms?.length ? (
                            <Stack gap={1}>
                              {orderAnalytics.topRooms.slice(0, 5).map((room: any, i: number) => (
                                <Stack key={i} direction='row' alignItems='center' justifyContent='space-between'>
                                  <Stack direction='row' alignItems='center' gap={1}>
                                    <Box
                                      sx={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        bgcolor: 'success.lighter',
                                        color: 'success.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        fontWeight: 700
                                      }}
                                    >
                                      {i + 1}
                                    </Box>
                                    <Typography variant='body2'>Room {room.roomNumber}</Typography>
                                  </Stack>
                                  <Stack direction='row' gap={1} alignItems='center'>
                                    <Chip label={`${room.count} orders`} size='small' />
                                    <Typography variant='body2' color='text.secondary'>
                                      {room.revenue?.toFixed(2)} €
                                    </Typography>
                                  </Stack>
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant='body2' color='text.secondary'>
                              No orders yet
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Stack>
      )}
    </Stack>
  )
}

export default HomePage
