import { useState, useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';
import { endOfToday, startOfToday } from 'date-fns';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import { useGetHotelInsightsQuery, useGetHotelsQuery } from '@/redux/api/hotelApi';
import RangePicker from '@/components/common/RangePicker';
import type { IHotel, IInsights } from '@/types';
import { formatTime } from '@/utils/miscUtils';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444'];

const METRICS = [
  { key: 'views', label: 'Views' },
  { key: 'taps', label: 'Button Clicks' },
  { key: 'liveViews', label: 'Live Visitors' },
  { key: 'bounceRate', label: 'Bounce Rate (%)' },
  { key: 'timeSpent', label: 'Time Spent' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

function getMetricValue(insights: IInsights, key: MetricKey): number {
  return (insights.keyMetrics as any)[key] ?? 0;
}

function formatMetric(insights: IInsights, key: MetricKey): string {
  const val = getMetricValue(insights, key);
  if (key === 'timeSpent') return formatTime(val) || '0s';
  if (key === 'bounceRate') return `${val}%`;
  return `${val}`;
}

// ── Fixed 4-slot RTK Query hooks (rules of hooks) ──────────────────────────
function useHotelData(id: string | undefined, params: any) {
  return useGetHotelInsightsQuery(
    { hotel: id ?? '', params },
    { skip: !id }
  );
}

const HotelComparePage = () => {
  const [selected, setSelected] = useState<IHotel[]>([]);
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>({});

  const dateParams = useMemo(
    () => ({
      startDate: range.startDate || startOfToday().toISOString(),
      endDate: range.endDate || endOfToday().toISOString(),
    }),
    [range]
  );

  const { data: hotelsData, isLoading: hotelsLoading } = useGetHotelsQuery(
    { limit: 200 } as any,
    {}
  );
  const hotels: IHotel[] = hotelsData?.results ?? [];

  // Always call all 4 hooks — skip when slot is empty
  const q0 = useHotelData(selected[0]?.id, dateParams);
  const q1 = useHotelData(selected[1]?.id, dateParams);
  const q2 = useHotelData(selected[2]?.id, dateParams);
  const q3 = useHotelData(selected[3]?.id, dateParams);

  const queries = [q0, q1, q2, q3].slice(0, selected.length);
  const isAnyLoading = queries.some((q) => q.isLoading || q.isFetching);

  const selectedData: (IInsights | undefined)[] = [
    q0.data,
    q1.data,
    q2.data,
    q3.data,
  ].slice(0, selected.length);

  // Bar chart: one series per metric, one data point per hotel
  const chartCategories = selected.map((h) => h.name ?? h.id);
  const chartSeries: ApexOptions['series'] = METRICS.filter(
    (m) => m.key !== 'timeSpent'
  ).map((m) => ({
    name: m.label,
    data: selectedData.map((d) =>
      d ? getMetricValue(d, m.key) : 0
    ) as number[],
  }));

  const chartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: chartCategories },
    legend: { position: 'top' },
    colors: COLORS,
  };

  return (
    <Box component="main" sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ sm: 'center' }}
            gap={2}
          >
            <Typography variant="h4">Compare Hotels</Typography>
            <Stack direction="row" gap={2} alignItems="center">
              {isAnyLoading && <CircularProgress size={20} />}
              <RangePicker range={range} setRange={setRange} />
            </Stack>
          </Stack>

          {/* Hotel selector */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Select up to 4 hotels to compare
              </Typography>
              <Autocomplete
                multiple
                loading={hotelsLoading}
                options={hotels}
                value={selected}
                onChange={(_, val) => setSelected(val.slice(0, 4))}
                getOptionLabel={(o) => o.name ?? o.id}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });

                    return (
                      <Chip
                        key={key}
                        label={option.name}
                        size="small"
                        sx={{ bgcolor: COLORS[index], color: '#fff' }}
                        {...tagProps}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search hotels..."
                    size="small"
                  />
                )}
              />
            </CardContent>
          </Card>

          {selected.length > 0 && (
            <>
              {/* Metrics comparison table */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Key Metrics
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Metric</strong>
                          </TableCell>
                          {selected.map((h, i) => (
                            <TableCell key={h.id} align="right">
                              <Chip
                                label={h.name}
                                size="small"
                                sx={{ bgcolor: COLORS[i], color: '#fff' }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {METRICS.map((m) => {
                          const values = selectedData.map((d) =>
                            d ? getMetricValue(d, m.key) : null
                          );
                          const maxVal = Math.max(
                            ...(values.filter((v) => v !== null) as number[])
                          );
                          return (
                            <TableRow key={m.key} hover>
                              <TableCell>{m.label}</TableCell>
                              {selected.map((h, i) => {
                                const d = selectedData[i];
                                const val = d ? getMetricValue(d, m.key) : null;
                                const isBest =
                                  val !== null &&
                                  val === maxVal &&
                                  maxVal > 0 &&
                                  m.key !== 'bounceRate';
                                return (
                                  <TableCell
                                    key={h.id}
                                    align="right"
                                    sx={
                                      isBest
                                        ? {
                                            color: 'success.main',
                                            fontWeight: 700,
                                          }
                                        : {}
                                    }
                                  >
                                    {d ? formatMetric(d, m.key) : '—'}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>

              {/* Comparison bar chart */}
              {selected.length > 1 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Visual Comparison
                    </Typography>
                    <ReactApexChart
                      type="bar"
                      height={400}
                      options={chartOptions}
                      series={chartSeries}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Per-hotel device & language breakdown */}
              <Typography variant="h6">Device & Language Breakdown</Typography>
              <Grid container spacing={2}>
                {selected.map((hotel, i) => {
                  const d = selectedData[i];
                  if (!d) return null;
                  const devLabels = Object.keys(d.keyMetrics?.viewsByDevices ?? {});
                  const devValues = Object.values(d.keyMetrics?.viewsByDevices ?? {});
                  const langLabels = Object.keys(d.keyMetrics?.viewsByLanguages ?? {});
                  const langValues = Object.values(d.keyMetrics?.viewsByLanguages ?? {});
                  return (
                    <Grid item xs={12} md={6} key={hotel.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" alignItems="center" gap={1} mb={2}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: COLORS[i],
                              }}
                            />
                            <Typography variant="subtitle1" fontWeight={600}>
                              {hotel.name}
                            </Typography>
                          </Stack>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Devices
                              </Typography>
                              {devLabels.map((label, idx) => (
                                <Stack
                                  key={label}
                                  direction="row"
                                  justifyContent="space-between"
                                >
                                  <Typography variant="body2">{label}</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {devValues[idx]}
                                  </Typography>
                                </Stack>
                              ))}
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">
                                Top Languages
                              </Typography>
                              {langLabels.slice(0, 5).map((label, idx) => (
                                <Stack
                                  key={label}
                                  direction="row"
                                  justifyContent="space-between"
                                >
                                  <Typography variant="body2">{label}</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {langValues[idx]}
                                  </Typography>
                                </Stack>
                              ))}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}

          {selected.length === 0 && (
            <Box textAlign="center" py={8}>
              <Typography fontSize={48} mb={1}>
                📊
              </Typography>
              <Typography color="text.secondary">
                Select at least one hotel above to see analytics
              </Typography>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

HotelComparePage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default HotelComparePage;
