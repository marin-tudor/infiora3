'use client'

import { Box, Button, Card, CardContent, CardHeader, Chip, Grid, Stack, Typography } from '@mui/material'
import { format } from 'date-fns'

import type { IInsights, IFeedbackSubmission } from '@/types'
import { formatTime } from '@/utils/miscUtils'
import { useGetOrderAnalyticsQuery, useGetOrderVisitAnalyticsQuery } from '@/redux/api/ordersApi'
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi'
import { useDictionary } from '@/contexts/DictionaryContext'

// ─── CSV helper ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), 'yyyy-MM-dd')
  } catch {
    return iso
  }
}

// ─── Report card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  icon: string
  iconColor: string
  title: string
  description: string
  rows: number
  onDownload: () => void
  disabled?: boolean
}

function ReportCard({ icon, iconColor, title, description, rows, onDownload, disabled }: ReportCardProps) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.reportsTab || {}

  return (
    <Card variant='outlined' sx={{ height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
      <CardContent>
        <Stack gap={2}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: `${iconColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className={icon} style={{ fontSize: 26, color: iconColor }} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant='subtitle1' fontWeight={700} mb={0.5}>
              {title}
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={1.5}>
              {description}
            </Typography>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Chip size='small' label={`${rows} ${t.records || 'records'}`} variant='outlined' />
              <Button
                size='small'
                variant='contained'
                startIcon={<i className='ri-download-2-line' />}
                onClick={onDownload}
                disabled={disabled || rows === 0}
              >
                {t.exportCsv || 'Export CSV'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsTab({
  insights,
  hotelId,
  startDate,
  endDate
}: {
  insights: IInsights | undefined
  hotelId: string
  startDate: string
  endDate: string
}) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.reportsTab || {}

  const { data: orderAnalytics } = useGetOrderAnalyticsQuery({ hotelId, startDate, endDate }, { skip: !hotelId })

  const { data: visitAnalytics } = useGetOrderVisitAnalyticsQuery({ hotelId, startDate, endDate }, { skip: !hotelId })

  const { data: fbData } = useGetHotelFeedbacksQuery(
    { hotel: hotelId, startDate, endDate, limit: 5000 },
    { skip: !hotelId }
  )

  const periodLabel = `${fmtDate(startDate)}_to_${fmtDate(endDate)}`

  // ── Export: Analytics Overview ─────────────────────────────────────────────
  const overviewRows = Object.entries(insights?.overTime?.views || {}).map(([date, views]) => [
    date,
    views,
    insights?.overTime?.taps?.[date] ?? 0,
    insights?.overTime?.bounceRate?.[date] ?? 0,
    insights?.overTime?.timeSpent?.[date] ?? 0
  ])

  // ── Export: Room Performance ───────────────────────────────────────────────
  const feedbackByRoom: Record<string, { count: number; total: number }> = {}

  ;(fbData?.results || []).forEach((f: IFeedbackSubmission) => {
    const roomKey = typeof f.room === 'string' ? f.room : f.room?.id

    if (!roomKey || !f.rating) return
    const e = feedbackByRoom[roomKey] ?? { count: 0, total: 0 }

    e.count++
    e.total += f.rating
    feedbackByRoom[roomKey] = e
  })

  const roomRows = (insights?.rooms || []).map(r => {
    const fb = feedbackByRoom[r.id]
    const avgRating = fb ? (fb.total / fb.count).toFixed(2) : ''

    return [
      r.number || '',
      r.group?.title || '',
      r.views || 0,
      r.bounceRate || 0,
      r.timeSpent || 0,
      formatTime(r.timeSpent || 0),
      r.taps || 0,
      avgRating,
      fb?.count ?? 0
    ]
  })

  // ── Export: Button Interactions ────────────────────────────────────────────
  const totalTaps = (insights?.links || []).reduce((s, l) => s + (l.taps || 0), 0)

  const buttonRows = [...(insights?.links || [])]
    .sort((a, b) => (b.taps || 0) - (a.taps || 0))
    .map(l => [
      l.title || '',
      (l as any).room ? `${dictionary.room} ${(l as any).room?.number || ''}` : (l as any).group?.title || '',
      l.taps || 0,
      totalTaps > 0 ? `${(((l.taps || 0) / totalTaps) * 100).toFixed(1)}%` : '0%'
    ])

  // ── Export: Orders ─────────────────────────────────────────────────────────
  const oa = orderAnalytics as any

  const ordersRows = (oa?.overTime || []).map((d: any) => [d.date, d.orders, d.revenue?.toFixed(2)])

  // ── Export: Guest Feedback ─────────────────────────────────────────────────
  const fbRows = (fbData?.results || []).map((f: IFeedbackSubmission) => {
    const room = insights?.rooms?.find(r => r.id === f.room)

    return [room?.number || f.room || '', f.rating ?? '', f.message || '', f.email || '', fmtDate(f.createdAt)]
  })

  const reports = [
    {
      icon: 'ri-line-chart-line',
      iconColor: '#3b82f6',
      title: t.analyticsOverview || 'Analytics Overview',
      description:
        t.analyticsOverviewDesc || 'Daily views, taps, bounce rate and time spent across the selected period.',
      rows: overviewRows.length,
      onDownload: () =>
        downloadCSV(
          `analytics-overview-${periodLabel}.csv`,
          ['Date', 'Views', 'Taps', 'Bounce Rate %', 'Time Spent (s)'],
          overviewRows
        )
    },
    {
      icon: 'ri-door-line',
      iconColor: '#10b981',
      title: t.roomPerformance || 'Room Performance',
      description:
        t.roomPerformanceDesc || 'Per-room breakdown with views, bounce rate, time spent, taps, and guest ratings.',
      rows: roomRows.length,
      onDownload: () =>
        downloadCSV(
          `room-performance-${periodLabel}.csv`,
          [
            'Room #',
            'Group',
            'Views',
            'Bounce Rate %',
            'Time Spent (s)',
            'Time Spent',
            'Taps',
            'Avg Rating',
            'Review Count'
          ],
          roomRows
        )
    },
    {
      icon: 'ri-cursor-line',
      iconColor: '#f59e0b',
      title: t.buttonInteractions || 'Button Interactions',
      description:
        t.buttonInteractionsDesc ||
        'All button/link tap counts, source room or group, and percentage share of total taps.',
      rows: buttonRows.length,
      onDownload: () =>
        downloadCSV(
          `button-interactions-${periodLabel}.csv`,
          ['Button Name', 'Source', 'Total Taps', '% of Total'],
          buttonRows
        )
    },
    {
      icon: 'ri-shopping-bag-3-line',
      iconColor: '#8b5cf6',
      title: t.ordersReport || 'Orders Report',
      description:
        t.ordersReportDesc ||
        'Daily order counts and revenue. Includes total summary, completion rate and avg order value.',
      rows: ordersRows.length,
      onDownload: () => {
        const summaryRows = [
          ...ordersRows,
          [],
          ['--- Summary ---', '', ''],
          ['Total Orders', oa?.totalOrders ?? 0, ''],
          ['Total Revenue', `${oa?.totalRevenue?.toFixed(2) ?? 0} €`, ''],
          ['Avg Order Value', `${oa?.avgOrderValue?.toFixed(2) ?? 0} €`, ''],
          ['Completed', oa?.completedOrders ?? 0, ''],
          ['Cancelled', oa?.cancelledOrders ?? 0, ''],
          ['Menu Visits', visitAnalytics?.totalVisits ?? 0, ''],
          ['Conversion Rate', `${visitAnalytics?.conversionRate ?? 0}%`, '']
        ]

        downloadCSV(`orders-report-${periodLabel}.csv`, ['Date', 'Orders', 'Revenue (€)'], summaryRows)
      }
    },
    {
      icon: 'ri-feedback-line',
      iconColor: '#ef4444',
      title: t.guestFeedback || 'Guest Feedback',
      description:
        t.guestFeedbackDesc ||
        'All guest reviews collected in the period: room, star rating, message and optional email.',
      rows: fbRows.length,
      onDownload: () =>
        downloadCSV(
          `guest-feedback-${periodLabel}.csv`,
          ['Room #', 'Rating (1-5)', 'Message', 'Guest Email', 'Date'],
          fbRows
        )
    }
  ]

  return (
    <Stack gap={3}>
      {/* Period banner */}
      <Card variant='outlined' sx={{ bgcolor: 'primary.lighter', borderColor: 'primary.light' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction='row' alignItems='center' gap={1.5}>
            <i className='ri-calendar-line' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
            <Typography variant='body2' fontWeight={600}>
              {t.generatingReportsFor || 'Generating reports for'}:{' '}
              <Typography component='span' color='primary.main' fontWeight={700}>
                {fmtDate(startDate)}
              </Typography>{' '}
              →{' '}
              <Typography component='span' color='primary.main' fontWeight={700}>
                {fmtDate(endDate)}
              </Typography>
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>
              {t.exportsIncludeRange || 'All exports include data within the selected date range'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Report cards */}
      <Grid container spacing={2}>
        {reports.map(r => (
          <Grid item xs={12} sm={6} md={4} key={r.title}>
            <ReportCard {...r} />
          </Grid>
        ))}
      </Grid>

      {/* Quick stats row */}
      <Card variant='outlined'>
        <CardHeader
          title={t.dataSummary || 'Data Summary'}
          titleTypographyProps={{ variant: 'h6' }}
          subheader={t.availableRecords || 'Available records for the selected period'}
        />
        <CardContent>
          <Grid container spacing={2}>
            {[
              {
                label: t.dailyViewSnapshots || 'Daily view snapshots',
                value: overviewRows.length,
                icon: 'ri-eye-line',
                color: '#3b82f6'
              },
              {
                label: t.roomsTracked || 'Rooms tracked',
                value: insights?.rooms?.length ?? 0,
                icon: 'ri-door-line',
                color: '#10b981'
              },
              {
                label: t.buttonRecords || 'Button records',
                value: buttonRows.length,
                icon: 'ri-cursor-line',
                color: '#f59e0b'
              },
              {
                label: t.orderDays || 'Order days',
                value: ordersRows.length,
                icon: 'ri-shopping-bag-3-line',
                color: '#8b5cf6'
              },
              {
                label: t.feedbackReviews || 'Feedback reviews',
                value: fbRows.length,
                icon: 'ri-star-line',
                color: '#ef4444'
              }
            ].map(s => (
              <Grid item xs={6} sm={4} md key={s.label}>
                <Stack direction='row' gap={1.5} alignItems='center'>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: `${s.color}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <i className={s.icon} style={{ color: s.color, fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography variant='h6' fontWeight={700}>
                      {s.value}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {s.label}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  )
}
