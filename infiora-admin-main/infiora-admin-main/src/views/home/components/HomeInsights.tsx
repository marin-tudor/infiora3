import DonutChart from '@/components/charts/DonutChart';
import LineChart from '@/components/charts/LineChart';
import { IInsights } from '@/types';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import React from 'react';
import StatsCard from './StatsCard';
import { InfoRounded, CompareArrows } from '@mui/icons-material';
import {
  formatTime,
  getPeakTime,
  getSeriesData,
} from '@/utils/miscUtils';
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid';

function HotelsToolbar() {
  return (
    <GridToolbarContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        px={1}
        py={0.5}
      >
        <GridToolbarQuickFilter
          quickFilterProps={{ debounceMs: 300 }}
          sx={{ maxWidth: 260 }}
        />
        <Link href="/hotels/compare" passHref>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CompareArrows />}
          >
            Compare Hotels
          </Button>
        </Link>
      </Stack>
    </GridToolbarContainer>
  );
}

const getDataSource = (insights: IInsights) => {
  const topHotel = insights?.hotels?.reduce(
    (max, hotel) => (hotel.views > max.views ? hotel : max),
    insights?.hotels?.[0]
  );
  const topHotelRedirect = insights?.hotels?.reduce(
    (max, hotel) => (hotel.redirects > max.redirects ? hotel : max),
    insights?.hotels?.[0]
  );

  return {
    keyMetrics: {
      highlights: {
        liveVisitors: {
          title: 'Total Live Visitors',
          content: insights.keyMetrics.liveViews,
        },
        topRoom: {
          title: 'Top Performing Hotel',
          content: topHotel?.name ?? '—',
        },
        topLink: {
          title: 'Top Hotel Redirects',
          content: topHotelRedirect?.name ?? '—',
        },
        peakActivity: {
          title: 'Peak Activity Time',
          content: getPeakTime(insights?.activities),
        },
      },
      stats: [
        {
          title: 'Total Visits',
          info: 'Total number of visits to the site.',
          series: [
            {
              name: '',
              data: getSeriesData(insights?.overTime?.views),
            },
          ],
          total: `${insights?.keyMetrics?.views}`,
          change: insights?.change?.views,
        },
        {
          title: 'Time Spent',
          info: 'Total time spent by users on the site.',
          series: [
            {
              name: '',
              data: getSeriesData(insights?.overTime?.timeSpent),
            },
          ],
          total: `${
            formatTime(insights?.keyMetrics?.timeSpent) || 0
          }`,
          change: insights?.change?.timeSpent,
        },
        {
          title: 'Total Button Clicks',
          info: 'Total number of button clicks on the site.',
          series: [
            {
              name: '',
              data: getSeriesData(insights?.overTime?.taps),
            },
          ],
          total: `${insights?.keyMetrics?.taps}`,
          change: insights?.change?.taps,
        },
        {
          title: 'Bounce Rate',
          info: 'Percentage of visitors who leave the site after viewing only one page.',
          series: [
            {
              name: '',
              data: getSeriesData(insights?.overTime?.bounceRate),
            },
          ],
          total: `${insights?.keyMetrics?.bounceRate}`,
          change: insights?.change?.bounceRate,
        },
        {
          title: 'Guests Check In Opens',
          info: 'How many times hotels opened the Guests Check In sidebar option.',
          series: [
            {
              name: '',
              data: getSeriesData(
                Object.fromEntries(
                  Object.entries(insights?.overTime?.taps || {}).map(([date]) => {
                    const opens = (insights?.activities || []).filter(
                      (activity) =>
                        activity.action === 'tap' &&
                        activity.details.button === 'checkin' &&
                        activity.details.source === 'sidebar' &&
                        activity.createdAt.startsWith(date)
                    ).length;
                    return [date, opens];
                  })
                )
              ),
            },
          ],
          total: `${insights?.checkinUsage?.opens ?? 0}`,
          change: undefined,
        },
      ],
    },
    overTimeStats: {
      title: 'Views and Clicks Over Time',
      info: 'Displays a timeline of views and clicks to track user engagement over a specific period.',
      series: [
        {
          name: 'Views',
          data: getSeriesData(insights?.overTime?.views),
        },
        {
          name: 'Taps',
          data: getSeriesData(insights?.overTime?.taps),
        },
      ],
    },
    deviceUsage: {
      title: 'Device Usage',
      info: 'Provides a breakdown of views by device type, such as mobile or desktop.',
      labels: Object.keys(insights?.keyMetrics?.viewsByDevices),
      series: Object.values(insights?.keyMetrics?.viewsByDevices),
    },
    languagePreferences: {
      title: 'Language Preferences',
      info: 'Displays the distribution of views by preferred language of the users.',
      labels: Object.keys(insights?.keyMetrics?.viewsByLanguages),
      series: Object.values(insights?.keyMetrics?.viewsByLanguages),
    },
  };
};

const hotelColumns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Hotel',
    minWidth: 160,
    flex: 2,
    renderCell: ({ row }) => (
      <Link
        href={`/hotels/${row.id}?tab=insights`}
        style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
      >
        {row.name || row.id}
      </Link>
    ),
  },
  {
    field: 'views',
    headerName: 'Views',
    minWidth: 90,
    flex: 1,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'redirects',
    headerName: 'Redirects',
    minWidth: 100,
    flex: 1,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'checkinOpens',
    headerName: 'Guests Check In Opens',
    minWidth: 120,
    flex: 1,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'isActive',
    headerName: 'Status',
    minWidth: 90,
    flex: 1,
    renderCell: ({ row }) => (
      <Chip
        size="small"
        label={row.isActive ? 'Active' : 'Inactive'}
        color={row.isActive ? 'success' : 'default'}
      />
    ),
  },
  {
    field: 'actions',
    headerName: '',
    width: 80,
    sortable: false,
    disableColumnMenu: true,
    renderCell: ({ row }) => (
      <Link href={`/hotels/${row.id}?tab=insights`} passHref>
        <Button size="small" variant="text">
          View
        </Button>
      </Link>
    ),
  },
];

const HomeInsights = ({ insights }: { insights: IInsights }) => {
  const dataSource = getDataSource(insights);

  const sortedHotels = [...(insights?.hotels ?? [])].sort(
    (a, b) => b.views - a.views
  );
  const hotelsUsingCheckin = (insights?.hotels ?? []).filter((hotel: any) => (hotel.checkinOpens ?? 0) > 0).length;

  return (
    <Grid container spacing={2}>
      {/* Highlight cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {Object.entries(dataSource.keyMetrics.highlights).map(
            ([key, { title, content }], index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" color="text.secondary">
                      {title}
                    </Typography>
                    <Typography variant="h5">{content}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          )}
        </Grid>
      </Grid>

      {/* Stats cards */}
      <Grid container item xs={12} spacing={2}>
        {dataSource.keyMetrics.stats.map(
          ({ title, info, series, total, change }, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <StatsCard
                title={title}
                info={info}
                series={series}
                total={total}
                change={change}
              />
            </Grid>
          )
        )}
        <Grid item xs={12} sm={6} md={4}>
          <StatsCard
            title="Hotels Using Guests Check In"
            info="Unique hotels that opened the Guests Check In sidebar option in the selected period."
            series={[{ name: '', data: [{ x: 'hotels', y: hotelsUsingCheckin }] }]}
            total={`${hotelsUsingCheckin}`}
            change={undefined}
          />
        </Grid>
      </Grid>

      {/* Over-time chart + donuts */}
      <Grid container item xs={12} spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <LineChart
                label={dataSource.overTimeStats.title}
                info={dataSource.overTimeStats.info}
                series={dataSource.overTimeStats.series}
                height={470}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid container item xs={12} md={6} spacing={2}>
          <Grid item xs={12}>
            <DonutChart
              title={dataSource.deviceUsage.title}
              info={dataSource.deviceUsage.info}
              labels={dataSource.deviceUsage.labels}
              series={dataSource.deviceUsage.series}
            />
          </Grid>
          <Grid item xs={12}>
            <DonutChart
              title={dataSource.languagePreferences.title}
              info={dataSource.languagePreferences.info}
              labels={dataSource.languagePreferences.labels}
              series={dataSource.languagePreferences.series}
            />
          </Grid>
        </Grid>
      </Grid>

      {/* All hotels table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6">All Hotels</Typography>
              <Tooltip
                title={
                  <span style={{ fontSize: '10px' }}>
                    All hotels sorted by views. Click a hotel name to open its analytics.
                  </span>
                }
                arrow
              >
                <InfoRounded fontSize="small" />
              </Tooltip>
            </Stack>
            <Box sx={{ height: 420 }}>
              <DataGrid
                density="compact"
                rows={sortedHotels}
                columns={hotelColumns}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                pagination
                slots={{ toolbar: HotelsToolbar }}
                sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HomeInsights;
