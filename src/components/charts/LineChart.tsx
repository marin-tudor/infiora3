import React from 'react'

import { InfoRounded } from '@mui/icons-material'
import { Card, CardContent, Stack, Tooltip, Typography, useTheme } from '@mui/material'

import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

interface SeriesData {
  name: string
  data: { x: string; y: number }[]
}
interface StatsCardProps {
  series?: SeriesData[]
  label?: string
  info?: string
}

const LineChart: React.FC<StatsCardProps> = ({ series, label, info }) => {
  const theme = useTheme()

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: {
        lines: { show: false }
      },
      yaxis: {
        lines: { show: false }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'MMM dd',
        style: {
          colors: theme.palette.primary.main
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.primary.main
        },
        formatter: function (value) {
          return `${Math.floor(value)}`
        }
      }
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack>
          {label && (
            <Stack direction='row' gap={1} alignItems='center'>
              <Typography>{label}</Typography>
              <Tooltip title={<span style={{ fontSize: '10px' }}>{info}</span>} arrow>
                <InfoRounded fontSize='small' />
              </Tooltip>
            </Stack>
          )}
          <AppReactApexCharts type='line' width='100%' height={400} options={options} series={series} />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default LineChart
