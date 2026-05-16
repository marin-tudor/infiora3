'use client'
import { useMemo } from 'react'

import { Box, Card, CardContent, CardHeader, Chip, Grid, Stack, Typography, useTheme } from '@mui/material'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { IInsights } from '@/types'
import { getSeriesData } from '@/utils/miscUtils'
import LinksReports from './LinksReports'
import { useDictionary } from '@/contexts/DictionaryContext'

const ICON_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

export default function ButtonsTab({ insights }: { insights: IInsights }) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.insightsUi || {}
  const theme = useTheme()
  const links = insights.links || []
  const groupLinks = links.filter(link => link.type === 'group')

  const totalTaps = links.reduce((s, l) => s + (l.taps || 0), 0)
  const activeButtons = links.filter(l => (l.taps || 0) > 0).length
  const topButton = [...links].sort((a, b) => (b.taps || 0) - (a.taps || 0))[0]

  const avgTapsPerView = insights.keyMetrics.views > 0 ? (totalTaps / insights.keyMetrics.views).toFixed(1) : '0'

  const sortedButtonLinks = [...links].sort((a, b) => (b.taps || 0) - (a.taps || 0))
  const topButtons = sortedButtonLinks.slice(0, 3)
  const maxButtonTaps = topButtons[0]?.taps || 1
  const sortedGroupLinks = [...groupLinks].sort((a, b) => (b.taps || 0) - (a.taps || 0))
  const topGroups = sortedGroupLinks.slice(0, 3)
  const maxGroupVisits = topGroups[0]?.taps || 1

  // Peak hours from activities
  const hourBuckets = useMemo(() => {
    const buckets = new Array(24).fill(0)

    ;(insights.activities || [])
      .filter(a => a.action === 'tap')
      .forEach(a => {
        const h = new Date(a.createdAt).getHours()

        buckets[h]++
      })

    return buckets
  }, [insights.activities])

  // Taps over time
  const trendSeries = [{ name: dictionary.taps, data: getSeriesData(insights.overTime?.taps) }]

  const trendOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    grid: { borderColor: theme.palette.divider, xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } },
    xaxis: { type: 'datetime', labels: { format: 'MMM dd', style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: v => `${Math.floor(v)}` } },
    legend: { labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode }
  }

  // Tap distribution donut (top 6 + Others)
  const donutLinks = sortedButtonLinks.slice(0, 6)
  const othersTotal = sortedButtonLinks.slice(6).reduce((s, l) => s + (l.taps || 0), 0)

  const donutLabels = [
    ...donutLinks.map(l => l.title || t.button || 'Button'),
    ...(othersTotal > 0 ? [t.others || 'Others'] : [])
  ]

  const donutSeries = [...donutLinks.map(l => l.taps || 0), ...(othersTotal > 0 ? [othersTotal] : [])]

  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: donutLabels,
    dataLabels: { enabled: true, formatter: val => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } }
  }

  // Peak hours bar
  const peakOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3 } },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      labels: {
        rotate: -45,
        style: { colors: theme.palette.text.secondary, fontSize: '10px' }
      }
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: v => `${Math.floor(v)}` } },
    grid: { borderColor: theme.palette.divider },
    tooltip: {
      theme: theme.palette.mode,
      x: { formatter: (_, opts) => `${String(opts.dataPointIndex).padStart(2, '0')}:00` }
    },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false }
  }

  const peakSeries = [{ name: dictionary.taps, data: hourBuckets }]

  return (
    <Stack gap={3}>
      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                {t.totalTaps || 'Total Taps'}
              </Typography>
              <Typography variant='h4' fontWeight={700} color='primary.main' mt={0.5}>
                {totalTaps}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {t.allButtonsCombined || 'All buttons combined'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                {t.activeButtons || 'Active Buttons'}
              </Typography>
              <Typography variant='h4' fontWeight={700} mt={0.5}>
                {activeButtons}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {t.of || 'of'} {links.length} {t.total || 'total'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                {t.mostTappedButton || 'Most Tapped Button'}
              </Typography>
              <Typography variant='h6' fontWeight={700} color='success.main' mt={0.5} noWrap>
                {topButton?.title || 'N/A'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {topButton?.taps || 0} {t.clicks || 'clicks'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant='outlined'>
            <CardContent>
              <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.5}>
                {t.tapsPerView || 'Taps per View'}
              </Typography>
              <Typography variant='h4' fontWeight={700} color='warning.main' mt={0.5}>
                {avgTapsPerView}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {t.avgPerPageVisit || 'Avg per page visit'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card variant='outlined'>
            <CardHeader title={t.tapsOverTime || 'Taps Over Time'} titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <AppReactApexCharts type='area' width='100%' height={240} options={trendOptions} series={trendSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={t.tapDistribution || 'Tap Distribution'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {donutSeries.some(v => v > 0) ? (
                <AppReactApexCharts
                  type='donut'
                  width='100%'
                  height={240}
                  options={donutOptions}
                  series={donutSeries}
                />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noTapData || 'No tap data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant='outlined' sx={{ height: '100%' }}>
            <CardHeader
              title={t.peakHours || 'Peak Hours'}
              titleTypographyProps={{ variant: 'body1', fontWeight: 600 }}
            />
            <CardContent sx={{ pt: 0 }}>
              {hourBuckets.some(v => v > 0) ? (
                <AppReactApexCharts type='bar' width='100%' height={240} options={peakOptions} series={peakSeries} />
              ) : (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                  {t.noActivityData || 'No activity data'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top button cards */}
      {(topButtons.length > 0 || topGroups.length > 0) && (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardHeader
                title={dictionary.pages.insights?.topButtons?.title || 'Top 3 Buttons'}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                {topButtons.length > 0 ? (
                  <Grid container spacing={2}>
                    {topButtons.map((link, i) => {
                      const pct = totalTaps > 0 ? ((link.taps || 0) / totalTaps) * 100 : 0
                      const color = ICON_COLORS[i % ICON_COLORS.length]

                      const source = (link as any).room
                        ? `${dictionary.room} ${(link as any).room?.number || ''}`
                        : (link as any).group?.title || ''

                      return (
                        <Grid item xs={12} key={link.id}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5
                            }}
                          >
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                flexShrink: 0,
                                bgcolor: `${color}18`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className='ri-cursor-line' style={{ color, fontSize: 20 }} />
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant='body2' fontWeight={600} noWrap>
                                {link.title || t.untitled || 'Untitled'}
                              </Typography>
                              {source && (
                                <Typography variant='caption' color='text.secondary'>
                                  {source}
                                </Typography>
                              )}
                              <Box
                                sx={{
                                  mt: 0.5,
                                  height: 4,
                                  bgcolor: 'action.hover',
                                  borderRadius: 2,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box
                                  sx={{
                                    height: '100%',
                                    width: `${((link.taps || 0) / maxButtonTaps) * 100}%`,
                                    bgcolor: color,
                                    borderRadius: 2
                                  }}
                                />
                              </Box>
                            </Box>

                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography variant='h6' fontWeight={700}>
                                {link.taps || 0}
                              </Typography>
                              <Chip size='small' label={`${pct.toFixed(1)}%`} sx={{ bgcolor: `${color}18`, color }} />
                            </Box>
                          </Box>
                        </Grid>
                      )
                    })}
                  </Grid>
                ) : (
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                    {t.noButtonClickData || 'No button click data'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Card variant='outlined' sx={{ height: '100%' }}>
              <CardHeader
                title={dictionary.pages.insights?.topGroupButtons?.title || 'Top 3 Group Buttons'}
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                {topGroups.length > 0 ? (
                  <Grid container spacing={2}>
                    {topGroups.map((link, i) => {
                      const totalGroupVisits = groupLinks.reduce((sum, group) => sum + (group.taps || 0), 0)
                      const pct = totalGroupVisits > 0 ? ((link.taps || 0) / totalGroupVisits) * 100 : 0
                      const color = ICON_COLORS[(i + 3) % ICON_COLORS.length]

                      return (
                        <Grid item xs={12} key={link.id}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5
                            }}
                          >
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                flexShrink: 0,
                                bgcolor: `${color}18`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className='ri-folder-chart-line' style={{ color, fontSize: 20 }} />
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant='body2' fontWeight={600} noWrap>
                                {link.title || t.untitledGroup || 'Untitled Group'}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {t.measuredByGroupVisits || 'Measured by group visits'}
                              </Typography>
                              <Box
                                sx={{
                                  mt: 0.5,
                                  height: 4,
                                  bgcolor: 'action.hover',
                                  borderRadius: 2,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box
                                  sx={{
                                    height: '100%',
                                    width: `${((link.taps || 0) / maxGroupVisits) * 100}%`,
                                    bgcolor: color,
                                    borderRadius: 2
                                  }}
                                />
                              </Box>
                            </Box>

                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography variant='h6' fontWeight={700}>
                                {link.taps || 0}
                              </Typography>
                              <Chip size='small' label={`${pct.toFixed(1)}%`} sx={{ bgcolor: `${color}18`, color }} />
                            </Box>
                          </Box>
                        </Grid>
                      )
                    })}
                  </Grid>
                ) : (
                  <Typography variant='body2' color='text.secondary' textAlign='center' py={6}>
                    {t.noGroupVisitData || 'No group visit data'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Full table */}
      <LinksReports insights={insights} />
    </Stack>
  )
}
