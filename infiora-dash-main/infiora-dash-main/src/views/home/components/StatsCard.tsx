import React from 'react'

import { ExpandLess, ExpandMore, InfoRounded } from '@mui/icons-material'
import { Card, CardContent, Stack, Tooltip, Typography, useTheme } from '@mui/material'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

// Define the type for the series
interface SeriesData {
  name: string
  data: {
    x: string
    y: any
  }[]
}

// Define the props for StatsCard
interface StatsCardProps {
  series: SeriesData[]
  title: string
  info: string
  total: string
  change: number
}

const StatsCard: React.FC<StatsCardProps> = ({ series, title, info, total, change }) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    grid: {
      xaxis: {
        lines: { show: false }
      },
      yaxis: {
        lines: { show: false }
      }
    },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false }
    },
    yaxis: {
      labels: { show: false }
    },
    colors: [theme.palette.primary.main]
  }

  return (
    <Card>
      <CardContent>
        <Stack>
          <Stack direction='row' gap={1} alignItems='center'>
            <Typography variant='subtitle1'>{title}</Typography>
            <Tooltip title={<span style={{ fontSize: '10px' }}>{info}</span>} arrow>
              <InfoRounded fontSize='small' />
            </Tooltip>
          </Stack>
          <Stack direction='row' gap={1} alignItems='baseline'>
            <Typography variant='h4'>{total}</Typography>
            <Typography variant='caption'>
              <Stack direction='row' alignItems='center'>
                {change >= 0 ? <ExpandLess color='success' /> : <ExpandMore color='error' />} {change.toFixed(0)}%`
              </Stack>
            </Typography>
          </Stack>
          <AppReactApexCharts type='line' width='100%' height={80} options={options} series={series} />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default StatsCard
