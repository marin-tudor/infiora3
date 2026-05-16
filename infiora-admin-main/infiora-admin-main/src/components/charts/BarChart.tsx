import React from 'react';

import { InfoRounded } from '@mui/icons-material';
import {
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import type { ApexOptions } from 'apexcharts';

import dynamic from 'next/dynamic';
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
});

interface SeriesData {
  name: string;
  data: { x: string; y: number }[];
}
interface StatsCardProps {
  series: SeriesData[];
  label?: string;
  info?: string;
}

const BarChart: React.FC<StatsCardProps> = ({
  series,
  label,
  info,
}) => {
  const theme = useTheme();

  const options: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false },
      type: 'bar',
    },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: {
        lines: { show: false },
      },
      yaxis: {
        lines: { show: false },
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'MMM dd',
        style: {
          colors: theme.palette.primary.main,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.primary.main,
        },
        formatter: function (value) {
          return `${Math.floor(value)}`;
        },
      },
    },
  };

  return (
    <Stack sx={{ height: '100%' }}>
      {label && (
        <Stack direction="row" gap={1} alignItems="center">
          <Typography>{label}</Typography>
          <Tooltip
            title={<span style={{ fontSize: '10px' }}>{info}</span>}
            arrow
          >
            <InfoRounded fontSize="small" />
          </Tooltip>
        </Stack>
      )}
      <ReactApexChart
        type="bar"
        height={400}
        options={options}
        series={series}
      />
    </Stack>
  );
};

export default BarChart;
