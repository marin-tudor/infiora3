'use client'
import { useMemo } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme
} from '@mui/material'
import type { ApexOptions } from 'apexcharts'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { IInsights, IFeedbackSubmission } from '@/types'
import { formatTime } from '@/utils/miscUtils'
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi'
import { useDictionary } from '@/contexts/DictionaryContext'

function KpiCard({
  label,
  value,
  change,
  color,
  sub
}: {
  label: string
  value: string | number
  change?: number
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
        {change !== undefined ? (
          <Typography
            variant='caption'
            color={change >= 0 ? 'success.main' : 'error.main'}
            component='div'
            mt={0.5}
            display='flex'
            alignItems='center'
            gap={0.5}
          >
            <i className={change >= 0 ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} style={{ fontSize: 14 }} />
            {Math.abs(change).toFixed(1)}%{' '}
            <Typography variant='caption' color='text.secondary' component='span'>
              vs prev period
            </Typography>
          </Typography>
        ) : sub ? (
          <Typography variant='caption' color='text.secondary' component='div' mt={0.5}>
            {sub}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function OverviewTab({
  insights,
  hotelId,
  startDate,
  endDate
}: {
  insights: IInsights
  hotelId?: string
  startDate?: string
  endDate?: string
}) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.insightsUi || {}
  const theme = useTheme()
  const km = insights.keyMetrics
  const ch = insights.change

  const resolveCssVarColor = (value: string) => {
    if (typeof window === 'undefined' || !value?.startsWith('var(')) return value

    const cssVarName = value.slice(4, -1).trim()

    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim() || value
  }

  const chartTextColor = resolveCssVarColor(theme.palette.text.secondary)
  const chartPrimaryTextColor = resolveCssVarColor(theme.palette.text.primary)
  const chartDividerColor = resolveCssVarColor(theme.palette.divider)

  const trendLegendItems = [
    { label: dictionary.views, color: '#3b82f6' },
    { label: dictionary.taps, color: '#f59e0b' }
  ]

  const { data: fbData } = useGetHotelFeedbacksQuery(
    { hotel: hotelId!, startDate, endDate, limit: 2000 },
    { skip: !hotelId }
  )

  const getFeedbackRoomKey = (room: IFeedbackSubmission['room']) => (typeof room === 'string' ? room : room?.id)

  const feedbackByRoom = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {}

    ;(fbData?.results || []).forEach((f: IFeedbackSubmission) => {
      const roomKey = getFeedbackRoomKey(f.room)

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

  const guideDownloads = useMemo(
    () => (insights.activities || []).filter((a: any) => a.details?.button === 'offlineGuide').length,
    [insights.activities]
  )

  const trendChartData = useMemo(() => {
    const keys = Array.from(
      new Set([...Object.keys(insights.overTime?.views || {}), ...Object.keys(insights.overTime?.taps || {})])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    return keys.map(key => {
      const date = new Date(key)

      return {
        label: Number.isNaN(date.getTime())
          ? key
          : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        views: insights.overTime?.views?.[key] ?? 0,
        taps: insights.overTime?.taps?.[key] ?? 0
      }
    })
  }, [insights.overTime])

  // Donut options base
  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    dataLabels: { enabled: true, formatter: val => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } }
  }

  const deviceLabels = Object.keys(km.viewsByDevices || {})
  const deviceValues = Object.values(km.viewsByDevices || {}) as number[]
  const langLabels = Object.keys(km.viewsByLanguages || {})
  const langValues = Object.values(km.viewsByLanguages || {}) as number[]

  const topRooms = [...(insights.rooms || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10)

  return (
    <Stack gap={3}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label={t.totalViews || 'Total Views'} value={km.views ?? 0} change={ch?.views} />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label={dictionary.liveViews}
            value={km.liveViews ?? 0}
            color='success.main'
            sub={t.currentlyActive || 'Currently active'}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard label={t.buttonTaps || 'Button Taps'} value={km.taps ?? 0} change={ch?.taps} color='primary.main' />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label={t.avgTimeSpent || 'Avg Time Spent'}
            value={formatTime(km.timeSpent || 0) || '0s'}
            change={ch?.timeSpent}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label='Bounce Rate'
            value={`${km.bounceRate ?? 0}%`}
            color='warning.main'
            sub={
              ch?.bounceRate != null ? `${ch.bounceRate > 0 ? '+' : ''}${ch.bounceRate.toFixed(1)}% vs prev` : undefined
            }
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label='Engaged Views'
            value={
              typeof insights.overTime?.engagedViews === 'object'
                ? Object.values(insights.overTime.engagedViews).reduce((a, b) => a + b, 0)
                : 0
            }
            change={ch?.engagedViews}
            color='info.main'
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label={t.guideDownloads || 'Guide Downloads'}
            value={guideDownloads}
            color='info.main'
            sub={t.offlinePdfDownloaded || 'Offline PDF downloaded'}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label={t.avgGuestRating || 'Avg Guest Rating'}
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

      {/* Charts Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title={t.viewsAndTapsTrend || 'Views & Taps Trend'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <ResponsiveContainer width='100%' height={260}>
                <LineChart data={trendChartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartDividerColor} vertical={false} />
                  <XAxis
                    dataKey='label'
                    tick={{ fill: chartTextColor, fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: chartDividerColor }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: chartTextColor, fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: chartDividerColor }}
                    allowDecimals={false}
                    width={42}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderColor: chartDividerColor,
                      color: chartPrimaryTextColor,
                      backgroundColor: resolveCssVarColor(theme.palette.background.paper)
                    }}
                  />
                  <Line
                    type='monotone'
                    dataKey='views'
                    name={dictionary.views}
                    stroke='#3b82f6'
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type='monotone'
                    dataKey='taps'
                    name={dictionary.taps}
                    stroke='#f59e0b'
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <Stack direction='row' justifyContent='center' gap={2} flexWrap='wrap' sx={{ pt: 2 }}>
                {trendLegendItems.map(item => (
                  <Stack key={item.label} direction='row' alignItems='center' gap={0.5}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        display: 'inline-block'
                      }}
                    />
                    <Typography variant='body2' sx={{ color: chartPrimaryTextColor }}>
                      {item.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={dictionary.pages.insights?.devices?.title || 'Device Usage'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {deviceValues.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={230}
                  options={{ ...donutOptions, labels: deviceLabels }}
                  series={deviceValues}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noDeviceData || 'No device data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={t.trafficByLanguage || 'Traffic by Language'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {langValues.length > 0 ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={230}
                  options={{ ...donutOptions, labels: langLabels }}
                  series={langValues}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noLanguageData || 'No language data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Room Performance Summary */}
      <Card variant='outlined'>
        <CardHeader
          title={t.roomPerformanceBreakdown || 'Room Performance Breakdown'}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <Table size='small'>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Room #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{dictionary.group}</TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                {dictionary.views}
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                {dictionary.bounceRate}
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                {dictionary.timeSpent}
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                {dictionary.taps}
              </TableCell>
              <TableCell align='right' sx={{ fontWeight: 600 }}>
                {t.rating || 'Rating'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topRooms.length > 0 ? (
              topRooms.map(room => {
                const fb = feedbackByRoom[room.id]
                const avgRating = fb ? fb.total / fb.count : null

                return (
                  <TableRow key={room.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{room.number || 'N/A'}</TableCell>
                    <TableCell>
                      {room.group ? <Chip size='small' label={room.group.title || ''} color='secondary' /> : '—'}
                    </TableCell>
                    <TableCell align='right'>{room.views || 0}</TableCell>
                    <TableCell align='right'>{room.bounceRate || 0}%</TableCell>
                    <TableCell align='right'>{formatTime(room.timeSpent || 0) || '0s'}</TableCell>
                    <TableCell align='right'>{room.taps || 0}</TableCell>
                    <TableCell align='right'>
                      {avgRating != null ? (
                        <Typography
                          variant='caption'
                          fontWeight={600}
                          color={avgRating >= 4 ? 'success.main' : avgRating >= 3 ? 'warning.main' : 'error.main'}
                        >
                          ★ {avgRating.toFixed(1)} ({fb!.count})
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align='center'>
                  <Typography variant='body2' color='text.secondary' py={3}>
                    {t.noRoomDataForPeriod || 'No room data yet for this period'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  )
}
