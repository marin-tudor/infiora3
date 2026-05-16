'use client'
import { useMemo } from 'react'

import { Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Typography, useTheme } from '@mui/material'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { IInsights, IFeedbackSubmission } from '@/types'
import { formatTime, getSeriesData } from '@/utils/miscUtils'
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi'
import RoomsReports from './RoomsReports'
import { useDictionary } from '@/contexts/DictionaryContext'

function KpiCard({
  label,
  value,
  color,
  sub
}: {
  label: string
  value: string | number
  color?: string
  sub?: string
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
          <Typography variant='caption' color='text.secondary' component='div' mt={0.5}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function bounceColor(rate: number) {
  if (rate < 30) return 'success.main'
  if (rate < 60) return 'warning.main'

  return 'error.main'
}

function getRoomLabel(room: any) {
  const br = parseFloat(room.bounceRate) || 0
  const ts = room.timeSpent || 0

  if (br < 30 && ts > 120) return 'top'
  if (br > 60 || ts < 45) return 'attention'

  return 'average'
}

export default function RoomsTab({
  insights,
  hotelId,
  startDate,
  endDate
}: {
  insights: IInsights
  hotelId: string
  startDate: string
  endDate: string
}) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.insightsUi || {}
  const theme = useTheme()
  const km = insights.keyMetrics
  const ch = insights.change
  const rooms = insights.rooms || []

  const { data: fbData } = useGetHotelFeedbacksQuery(
    { hotel: hotelId, startDate, endDate, limit: 2000 },
    { skip: !hotelId }
  )

  const feedbackByRoom = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {}

    ;(fbData?.results || []).forEach((f: IFeedbackSubmission) => {
      const roomKey = typeof f.room === 'string' ? f.room : f.room?.id

      if (!roomKey || !f.rating) return
      const e = map[roomKey] ?? { count: 0, total: 0 }

      e.count++
      e.total += f.rating
      map[roomKey] = e
    })

    return map
  }, [fbData])

  const globalAvgRating = useMemo(() => {
    const withRating = (fbData?.results || []).filter((f: IFeedbackSubmission) => f.rating != null)

    if (!withRating.length) return null

    return withRating.reduce((s: number, f: IFeedbackSubmission) => s + (f.rating ?? 0), 0) / withRating.length
  }, [fbData])

  const sortedRooms = [...rooms].sort((a, b) => (b.views || 0) - (a.views || 0))
  const maxTimeSpent = Math.max(...rooms.map(r => r.timeSpent || 0), 1)

  // Views trend
  const trendSeries = [{ name: dictionary.views, data: getSeriesData(insights.overTime?.views) }]

  const trendOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    grid: { borderColor: theme.palette.divider, xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } },
    xaxis: { type: 'datetime', labels: { format: 'MMM dd', style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: v => `${Math.floor(v)}` } },
    legend: { labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode }
  }

  // Horizontal bar — top rooms
  const top10 = sortedRooms.slice(0, 10)
  const barSeries = [{ name: 'Views', data: top10.map(r => r.views || 0) }]

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, dataLabels: { position: 'top' } } },
    xaxis: {
      categories: top10.map(r => `${dictionary.room} ${r.number || '?'}`),
      labels: { style: { colors: theme.palette.text.secondary } }
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    grid: { borderColor: theme.palette.divider },
    tooltip: { theme: theme.palette.mode },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false }
  }

  // Bounce rate distribution donut
  const buckets = { low: 0, mid: 0, high: 0 }

  rooms.forEach(r => {
    const br = parseFloat(r.bounceRate as any) || 0

    if (br < 30) buckets.low++
    else if (br < 60) buckets.mid++
    else buckets.high++
  })

  const bounceOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: ['< 30% Good', '30–60% Medium', '> 60% High'],
    colors: ['#10b981', '#f59e0b', '#ef4444'],
    dataLabels: { enabled: true, formatter: val => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } }
  }

  // Feedback ratings distribution (1-5 stars)
  const ratingBuckets = [0, 0, 0, 0, 0]

  ;(fbData?.results || []).forEach((f: IFeedbackSubmission) => {
    if (f.rating && f.rating >= 1 && f.rating <= 5) ratingBuckets[f.rating - 1]++
  })
  const hasFeedback = ratingBuckets.some(v => v > 0)
  const ratingBarSeries = [{ name: t.reviews || 'Reviews', data: ratingBuckets }]

  const ratingBarOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, distributed: true } },
    colors: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'],
    xaxis: { categories: ['★1', '★2', '★3', '★4', '★5'], labels: { style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: v => `${Math.floor(v)}` } },
    grid: { borderColor: theme.palette.divider },
    tooltip: { theme: theme.palette.mode },
    legend: { show: false },
    dataLabels: { enabled: false }
  }

  // Classification
  const topRooms = rooms.filter(r => getRoomLabel(r) === 'top')
  const avgRooms = rooms.filter(r => getRoomLabel(r) === 'average')

  const attentionRooms = rooms.filter(r => {
    const fb = feedbackByRoom[r.id]
    const avgRating = fb ? fb.total / fb.count : null

    return getRoomLabel(r) === 'attention' || (avgRating !== null && avgRating < 3)
  })

  return (
    <Stack gap={3}>
      {/* KPIs */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label={t.totalRooms || 'Total Rooms'} value={rooms.length} sub={t.inPeriod || 'In period'} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            label={t.totalViews || 'Total Views'}
            value={km.views ?? 0}
            color='primary.main'
            sub={ch?.views != null ? `${ch.views >= 0 ? '+' : ''}${ch.views.toFixed(1)}% vs prev` : undefined}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            label={t.totalTaps || 'Total Taps'}
            value={km.taps ?? 0}
            sub={ch?.taps != null ? `${ch.taps >= 0 ? '+' : ''}${ch.taps.toFixed(1)}% vs prev` : undefined}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            label={t.avgTimeSpent || 'Avg Time Spent'}
            value={formatTime(km.timeSpent || 0) || '0s'}
            color='info.main'
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label={t.avgBounceRate || 'Avg Bounce Rate'} value={`${km.bounceRate ?? 0}%`} color='warning.main' />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            label={t.avgRating || 'Avg Rating'}
            value={globalAvgRating != null ? `${globalAvgRating.toFixed(1)} ★` : 'N/A'}
            color={
              globalAvgRating != null
                ? globalAvgRating >= 4
                  ? 'success.main'
                  : globalAvgRating >= 3
                    ? 'warning.main'
                    : 'error.main'
                : undefined
            }
            sub={
              fbData?.results?.length
                ? `${fbData.results.length} ${t.reviews || 'reviews'}`
                : t.noReviewsYet || 'No reviews yet'
            }
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card variant='outlined'>
            <CardHeader title={t.viewsTrend || 'Views Trend'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <AppReactApexCharts type='line' width='100%' height={240} options={trendOptions} series={trendSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant='outlined'>
            <CardHeader
              title={dictionary.pages.insights?.topRooms?.title || 'Top Rooms by Views'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {top10.length > 0 ? (
                <AppReactApexCharts type='bar' width='100%' height={240} options={barOptions} series={barSeries} />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noData || 'No data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={t.bounceRateSplit || 'Bounce Rate Split'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {rooms.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={240}
                  options={bounceOptions}
                  series={[buckets.low, buckets.mid, buckets.high]}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noData || 'No data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Feedback rating chart */}
      {hasFeedback && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant='outlined'>
              <CardHeader
                title={t.guestRatingDistribution || 'Guest Rating Distribution'}
                titleTypographyProps={{ variant: 'h6' }}
                subheader={`${fbData?.results?.length || 0} ${t.totalReviews || 'total reviews'} · ${t.avgRating || 'Avg'} ${globalAvgRating?.toFixed(1) ?? 'N/A'} ★`}
              />
              <CardContent sx={{ pt: 0 }}>
                <AppReactApexCharts
                  type='bar'
                  width='100%'
                  height={200}
                  options={ratingBarOptions}
                  series={ratingBarSeries}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardHeader
                title={t.roomsByFeedbackRating || 'Rooms by Feedback Rating'}
                titleTypographyProps={{ variant: 'h6' }}
                subheader={t.roomsWithAtLeastOneReview || 'Rooms with at least 1 review'}
              />
              <CardContent>
                <Stack gap={1.5}>
                  {Object.entries(feedbackByRoom)
                    .map(([roomId, fb]) => {
                      const room = rooms.find(r => r.id === roomId)

                      if (!room) return null
                      const avg = fb.total / fb.count

                      return { room, avg, count: fb.count }
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => b.avg - a.avg)
                    .slice(0, 8)
                    .map((item: any) => (
                      <Stack key={item.room.id} direction='row' alignItems='center' gap={1}>
                        <Typography variant='body2' fontWeight={600} sx={{ minWidth: 70 }}>
                          {dictionary.room} {item.room.number}
                        </Typography>
                        <Box sx={{ flex: 1, height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(item.avg / 5) * 100}%`,
                              bgcolor: item.avg >= 4 ? 'success.main' : item.avg >= 3 ? 'warning.main' : 'error.main',
                              borderRadius: 4
                            }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          fontWeight={600}
                          sx={{ minWidth: 40, textAlign: 'right' }}
                          color={item.avg >= 4 ? 'success.main' : item.avg >= 3 ? 'warning.main' : 'error.main'}
                        >
                          {item.avg.toFixed(1)} ★
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ minWidth: 40 }}>
                          ({item.count})
                        </Typography>
                      </Stack>
                    ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Performance classification */}
      {rooms.length > 0 && (
        <Card variant='outlined'>
          <CardHeader
            title={t.performanceOverview || 'Performance Overview'}
            titleTypographyProps={{ variant: 'h6' }}
            subheader={t.classifiedByPerformance || 'Classified by bounce rate, time spent and guest ratings'}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{ p: 2, borderRadius: 2, border: 2, borderColor: 'success.light', bgcolor: 'success.lighter' }}
                >
                  <Stack direction='row' gap={1} alignItems='center' mb={1}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <i className='ri-award-line' style={{ color: '#fff', fontSize: 15 }} />
                    </Box>
                    <Typography fontWeight={700} color='success.main'>
                      {t.topPerformers || 'Top Performers'}
                    </Typography>
                    <Chip size='small' label={topRooms.length} color='success' sx={{ ml: 'auto' }} />
                  </Stack>
                  <Typography variant='caption' color='text.secondary' component='div' mb={1}>
                    {t.topPerformersHint || 'Bounce < 30% and time > 2min'}
                  </Typography>
                  <Stack direction='row' flexWrap='wrap' gap={0.5}>
                    {topRooms.length > 0 ? (
                      topRooms.map(r => (
                        <Chip
                          key={r.id}
                          size='small'
                          label={`${dictionary.room} ${r.number}`}
                          color='success'
                          variant='outlined'
                        />
                      ))
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t.noRoomsQualifyYet || 'No rooms qualify yet'}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 2, border: 2, borderColor: 'info.light', bgcolor: 'info.lighter' }}>
                  <Stack direction='row' gap={1} alignItems='center' mb={1}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <i className='ri-bar-chart-line' style={{ color: '#fff', fontSize: 15 }} />
                    </Box>
                    <Typography fontWeight={700} color='info.main'>
                      {t.average || 'Average'}
                    </Typography>
                    <Chip size='small' label={avgRooms.length} color='info' sx={{ ml: 'auto' }} />
                  </Stack>
                  <Typography variant='caption' color='text.secondary' component='div' mb={1}>
                    {t.moderateEngagement || 'Moderate engagement'}
                  </Typography>
                  <Stack direction='row' flexWrap='wrap' gap={0.5}>
                    {avgRooms.length > 0 ? (
                      avgRooms.map(r => (
                        <Chip
                          key={r.id}
                          size='small'
                          label={`${dictionary.room} ${r.number}`}
                          color='info'
                          variant='outlined'
                        />
                      ))
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t.noneInThisRange || 'None in this range'}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 2, border: 2, borderColor: 'error.light', bgcolor: 'error.lighter' }}>
                  <Stack direction='row' gap={1} alignItems='center' mb={1}>
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <i className='ri-alert-line' style={{ color: '#fff', fontSize: 15 }} />
                    </Box>
                    <Typography fontWeight={700} color='error.main'>
                      {t.needsAttention || 'Needs Attention'}
                    </Typography>
                    <Chip size='small' label={attentionRooms.length} color='error' sx={{ ml: 'auto' }} />
                  </Stack>
                  <Typography variant='caption' color='text.secondary' component='div' mb={1}>
                    {t.needsAttentionHint || 'High bounce, low time or bad ratings'}
                  </Typography>
                  <Stack direction='row' flexWrap='wrap' gap={0.5}>
                    {attentionRooms.length > 0 ? (
                      attentionRooms.map(r => (
                        <Chip
                          key={r.id}
                          size='small'
                          label={`${dictionary.room} ${r.number}`}
                          color='error'
                          variant='outlined'
                        />
                      ))
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        {t.allRoomsPerformingWell || 'All rooms performing well'}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Room detail cards */}
      {sortedRooms.length > 0 && (
        <Box>
          <Typography variant='h6' mb={2}>
            {t.roomDetailCards || 'Room Detail Cards'}
          </Typography>
          <Grid container spacing={2}>
            {sortedRooms.slice(0, 12).map(room => {
              const br = parseFloat(room.bounceRate as any) || 0
              const fb = feedbackByRoom[room.id]
              const avgRating = fb ? fb.total / fb.count : null
              const label = getRoomLabel(room)

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                  <Card
                    variant='outlined'
                    sx={{
                      height: '100%',
                      borderColor: label === 'top' ? 'success.main' : label === 'attention' ? 'error.main' : 'divider',
                      borderWidth: label !== 'average' ? 2 : 1
                    }}
                  >
                    <CardContent>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' mb={1.5}>
                        <Box>
                          <Typography variant='h5' fontWeight={700} color='primary.main'>
                            {dictionary.room} {room.number || 'N/A'}
                          </Typography>
                          {room.group && (
                            <Chip size='small' label={room.group.title} color='secondary' sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                        {avgRating != null ? (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant='body2'
                              fontWeight={700}
                              color={avgRating >= 4 ? 'success.main' : avgRating >= 3 ? 'warning.main' : 'error.main'}
                            >
                              ★ {avgRating.toFixed(1)}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {fb!.count} {t.reviews || 'reviews'}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant='caption' color='text.disabled'>
                            {t.noRatings || 'No ratings'}
                          </Typography>
                        )}
                      </Stack>

                      <Grid container spacing={1} mb={1.5}>
                        {[
                          { label: dictionary.views, val: room.views || 0 },
                          { label: dictionary.taps, val: room.taps || 0 }
                        ].map(s => (
                          <Grid item xs={4} key={s.label}>
                            <Typography variant='caption' color='text.secondary' display='block'>
                              {s.label}
                            </Typography>
                            <Typography variant='body2' fontWeight={600}>
                              {s.val}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>

                      <Stack gap={0.75}>
                        <Stack direction='row' justifyContent='space-between'>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.timeSpent}
                          </Typography>
                          <Typography variant='caption' fontWeight={600}>
                            {formatTime(room.timeSpent || 0) || '0s'}
                          </Typography>
                        </Stack>
                        <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${Math.min(((room.timeSpent || 0) / maxTimeSpent) * 100, 100)}%`,
                              bgcolor: 'primary.main',
                              borderRadius: 3
                            }}
                          />
                        </Box>

                        <Stack direction='row' justifyContent='space-between' mt={0.5}>
                          <Typography variant='caption' color='text.secondary'>
                            {dictionary.bounceRate}
                          </Typography>
                          <Typography variant='caption' fontWeight={600} color={bounceColor(br)}>
                            {br}%
                          </Typography>
                        </Stack>
                        <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${Math.min(br, 100)}%`,
                              bgcolor: br < 30 ? '#10b981' : br < 60 ? '#f59e0b' : '#ef4444',
                              borderRadius: 3
                            }}
                          />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      )}

      {/* Full DataGrid */}
      <RoomsReports insights={insights} />
    </Stack>
  )
}
