import React from 'react'

import { Grid, Typography, Card, CardContent, Stack, Tooltip, useTheme } from '@mui/material'

import { InfoRounded } from '@mui/icons-material'

import StatsCard from './StatsCard'
import { useDictionary } from '@/contexts/DictionaryContext'
import type { IInsights } from '@/types'
import { formatTime, getPeakTime } from '@/utils/miscUtils'

const KeyMetrics = ({ insights }: { insights: IInsights }) => {
  const dictionary = useDictionary()
  const theme = useTheme()

  const getData = (obj?: Record<string, any>) => {
    if (!obj) return []

    return Object.keys(obj).map(x => ({
      x,
      y: obj[x]
    }))
  }

  return (
    <Grid container spacing={2}>
      {/* Highlights Section */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='subtitle1'>{dictionary.totalLiveViews}</Typography>
                <Typography variant='body1'>{insights?.keyMetrics?.liveViews}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='subtitle1'>{dictionary.topPerformingRoom}</Typography>
                <Typography variant='body1'>Room {insights?.topRoom?.number}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='subtitle1'>{dictionary.topLink}</Typography>
                <Typography variant='body1'>{insights?.topLink?.title}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent>
                <Typography variant='subtitle1'>{dictionary.peakActivity}</Typography>
                <Typography variant='body1'>{getPeakTime(insights?.activities)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Stats Section */}
      <Grid container item xs={12} md={8} spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title={dictionary.pages.insights.totalVisits.title}
            info={dictionary.pages.insights.totalVisits.info}
            series={[{ name: '', data: getData(insights?.overTime?.views) }]}
            total={`${insights?.keyMetrics?.views}`}
            change={insights?.change?.views}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title={dictionary.pages.insights.timeSpent.title}
            info={dictionary.pages.insights.timeSpent.info}
            series={[{ name: '', data: getData(insights?.overTime?.timeSpent) }]}
            total={formatTime(insights?.keyMetrics?.timeSpent || 0)}
            change={insights?.change?.timeSpent}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title={dictionary.pages.insights.totalButtonClicks.title}
            info={dictionary.pages.insights.totalButtonClicks.info}
            series={[{ name: '', data: getData(insights?.overTime?.taps) }]}
            total={`${insights?.keyMetrics?.taps}`}
            change={insights?.change?.taps}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title={dictionary.pages.insights.bounceRate.title}
            info={dictionary.pages.insights.bounceRate.info}
            series={[{ name: '', data: getData(insights?.overTime?.bounceRate) }]}
            total={`${insights?.keyMetrics?.bounceRate}%`}
            change={insights?.change?.bounceRate}
          />
        </Grid>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Stack gap={2}>
              <Stack direction='row' gap={1} alignItems='center'>
                <Typography>{dictionary.pages.insights.recentActivity.title}</Typography>
                <Tooltip
                  title={<span style={{ fontSize: '10px' }}>{dictionary.pages.insights.recentActivity.info}</span>}
                  arrow
                >
                  <InfoRounded fontSize='small' />
                </Tooltip>
              </Stack>
              <Stack height={300} overflow='auto' gap={2}>
                {insights?.activities?.map((a: any, i: number) => {
                  return (
                    <Stack
                      key={i}
                      sx={{
                        backgroundColor: i % 2 === 0 ? theme.palette.background.paper : 'transparent',
                        borderRadius: 1,
                        padding: 2
                      }}
                    >
                      <Typography flex={1}>
                        {a.details?.source === 'orders'
                          ? `Orders — Room ${a.details?.headline?.match(/Room\s+(\S+)/)?.[1] ?? ''}`
                          : a.details?.headline}
                      </Typography>
                    </Stack>
                  )
                })}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default KeyMetrics
