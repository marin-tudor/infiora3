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

// Define props interface
interface DonutChartProps {
  title: string;
  info?: string; // Optional
  series: number[];
  labels: string[];
}

const DonutChart: React.FC<DonutChartProps> = ({
  title,
  info,
  series,
  labels,
}) => {
  const theme = useTheme();

  // Define options for the chart
  const options: ApexOptions = {
    labels,
    chart: {
      type: 'donut',
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: 'left',
      horizontalAlign: 'center',
      labels: {
        colors: theme.palette.text.primary,
      },
    },
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack>
          <Stack direction="row" gap={1} alignItems="center">
            <Typography>{title}</Typography>
            {info && (
              <Tooltip
                title={
                  <span style={{ fontSize: '10px' }}>{info}</span>
                }
                arrow
              >
                <InfoRounded fontSize="small" />
              </Tooltip>
            )}
          </Stack>
          <ReactApexChart
            type="donut"
            height="100%"
            series={series}
            options={options}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DonutChart;
