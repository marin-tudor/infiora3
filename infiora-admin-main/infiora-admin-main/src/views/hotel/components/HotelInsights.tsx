import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { endOfToday, startOfToday, format } from 'date-fns';
import type { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

import { useSearchQuery } from '@/components/hooks/useSearchQuery';
import { useGetHotelInsightsQuery } from '@/redux/api/hotelApi';
import { useGetHotelFeedbacksQuery } from '@/redux/api/roomApi';
import { useGetOrderAnalyticsQuery, useGetOrderVisitAnalyticsQuery } from '@/redux/api/ordersApi';
import { IInsights } from '@/types';
import Loader from '@/components/ui/Loader';
import RangePicker from '@/components/common/RangePicker';
import {
  formatTime,
  getSeriesData,
  toSearchParams,
} from '@/utils/miscUtils';
import RoomsReports from './RoomsReports';
import LinksReports from './LinksReports';
import InsightsFilter from './InsightsFilter';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Shared helper components ────────────────────────────────────────────────

function KpiCard({ label, value, change, color, sub }: {
  label: string; value: string | number; change?: number; color?: string; sub?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color={color || 'text.primary'} mt={0.5}>
          {value}
        </Typography>
        {change !== undefined ? (
          <Typography
            variant="caption"
            color={change >= 0 ? 'success.main' : 'error.main'}
            component="div"
            mt={0.5}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%{' '}
            <Typography variant="caption" color="text.secondary" component="span">vs prev period</Typography>
          </Typography>
        ) : sub ? (
          <Typography variant="caption" color="text.secondary" component="div" mt={0.5}>{sub}</Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatKpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color={color || 'text.primary'} mt={0.5}>
          {value}
        </Typography>
        {sub && <Typography variant="caption" color="text.secondary" component="div" mt={0.5}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function baseLineOptions(theme: any): ApexOptions {
  return {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      type: 'datetime',
      labels: { format: 'MMM dd', style: { colors: theme.palette.text.secondary } },
    },
    yaxis: {
      labels: {
        style: { colors: theme.palette.text.secondary },
        formatter: (v: number) => `${Math.floor(v)}`,
      },
    },
    legend: { labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
  };
}

function baseDonutOptions(theme: any): ApexOptions {
  return {
    chart: { type: 'donut' },
    dataLabels: { enabled: true, formatter: (val: number) => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } },
  };
}

function fmtDate(iso: string) {
  try { return format(new Date(iso), 'yyyy-MM-dd'); } catch { return iso; }
}

function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewContent({ insights, hotelId, startDate, endDate }: {
  insights: IInsights; hotelId: string; startDate: string; endDate: string;
}) {
  const theme = useTheme();
  const km = insights.keyMetrics;
  const ch = insights.change;

  const { data: fbData } = useGetHotelFeedbacksQuery(
    { hotel: hotelId, startDate, endDate, limit: 2000 },
    { skip: !hotelId }
  );

  const feedbackByRoom = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    (fbData?.results || []).forEach((f: any) => {
      if (!f.room || !f.rating) return;
      const e = map[f.room] ?? { count: 0, total: 0 };
      e.count++;
      e.total += f.rating;
      map[f.room] = e;
    });
    return map;
  }, [fbData]);

  const globalAvgRating = useMemo(() => {
    const withRating = (fbData?.results || []).filter((f: any) => f.rating != null);
    if (!withRating.length) return null;
    return withRating.reduce((s: number, f: any) => s + (f.rating ?? 0), 0) / withRating.length;
  }, [fbData]);

  const guideDownloads = useMemo(
    () => (insights.activities || []).filter((a: any) => a.details?.button === 'offlineGuide').length,
    [insights.activities]
  );

  const trendSeries = [
    { name: 'Views', data: getSeriesData(insights.overTime?.views) },
    { name: 'Taps', data: getSeriesData(insights.overTime?.taps) },
  ];
  const trendOptions = baseLineOptions(theme);

  const deviceLabels = Object.keys(km.viewsByDevices || {});
  const deviceValues = Object.values(km.viewsByDevices || {}) as number[];
  const langLabels = Object.keys(km.viewsByLanguages || {});
  const langValues = Object.values(km.viewsByLanguages || {}) as number[];
  const donutOpts = baseDonutOptions(theme);

  const topRooms = [...(insights.rooms || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="Total Views" value={km.views ?? 0} change={ch?.views} /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="Live Views" value={km.liveViews ?? 0} color="success.main" sub="Currently active" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="Button Taps" value={km.taps ?? 0} change={ch?.taps} color="primary.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="Avg Time Spent" value={formatTime(km.timeSpent || 0) || '0s'} change={ch?.timeSpent} /></Grid>
        <Grid item xs={6} sm={4} md={3}><KpiCard label="Bounce Rate" value={`${km.bounceRate ?? 0}%`} color="warning.main" /></Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Guests Check In Opens"
            value={insights.checkinUsage?.opens ?? 0}
            sub={insights.checkinUsage?.lastUsedAt ? `Last used ${fmtDate(String(insights.checkinUsage.lastUsedAt))}` : 'No usage yet'}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Avg Guest Rating"
            value={globalAvgRating != null ? `${globalAvgRating.toFixed(1)} ★` : 'N/A'}
            color={globalAvgRating != null ? (globalAvgRating >= 4 ? 'success.main' : globalAvgRating >= 3 ? 'warning.main' : 'error.main') : undefined}
            sub={fbData?.results?.length ? `${fbData.results.length} reviews` : 'No reviews yet'}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <KpiCard
            label="Guide Downloads"
            value={guideDownloads}
            sub="Offline PDF"
            color="info.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Views & Taps Trend" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <ReactApexChart type="line" width="100%" height={260} options={trendOptions} series={trendSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Device Usage" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {deviceValues.length > 0 ? (
                <ReactApexChart type="donut" width="100%" height={230} options={{ ...donutOpts, labels: deviceLabels }} series={deviceValues} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No device data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Traffic by Language" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {langValues.length > 0 ? (
                <ReactApexChart type="donut" width="100%" height={230} options={{ ...donutOpts, labels: langLabels }} series={langValues} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No language data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardHeader title="Room Performance Breakdown" titleTypographyProps={{ variant: 'h6' }} />
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Room #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Group</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Views</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Returning</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Bounce Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Time Spent</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Taps</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topRooms.length > 0 ? (
              topRooms.map(room => {
                const fb = feedbackByRoom[room.id];
                const avgRating = fb ? fb.total / fb.count : null;
                return (
                  <TableRow key={room.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{room.number || 'N/A'}</TableCell>
                    <TableCell>
                      {(room as any).group ? (
                        <Chip size="small" label={(room as any).group?.title || ''} color="secondary" />
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">{room.views || 0}</TableCell>
                    <TableCell align="right">{room.bounceRate || 0}%</TableCell>
                    <TableCell align="right">{formatTime(room.timeSpent || 0) || '0s'}</TableCell>
                    <TableCell align="right">{room.taps || 0}</TableCell>
                    <TableCell align="right">
                      {avgRating != null ? (
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color={avgRating >= 4 ? 'success.main' : avgRating >= 3 ? 'warning.main' : 'error.main'}
                        >
                          ★ {avgRating.toFixed(1)} ({fb!.count})
                        </Typography>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>No room data yet</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}

// ─── Rooms Tab ────────────────────────────────────────────────────────────────

function getRoomLabel(room: any) {
  const br = parseFloat(room.bounceRate) || 0;
  const ts = room.timeSpent || 0;
  if (br < 30 && ts > 120) return 'top';
  if (br > 60 || ts < 45) return 'attention';
  return 'average';
}

function RoomsContent({ insights, hotelId, startDate, endDate }: {
  insights: IInsights; hotelId: string; startDate: string; endDate: string;
}) {
  const theme = useTheme();
  const km = insights.keyMetrics;
  const ch = insights.change;
  const rooms = insights.rooms || [];

  const { data: fbData } = useGetHotelFeedbacksQuery(
    { hotel: hotelId, startDate, endDate, limit: 2000 },
    { skip: !hotelId }
  );

  const feedbackByRoom = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    (fbData?.results || []).forEach((f: any) => {
      if (!f.room || !f.rating) return;
      const e = map[f.room] ?? { count: 0, total: 0 };
      e.count++;
      e.total += f.rating;
      map[f.room] = e;
    });
    return map;
  }, [fbData]);

  const globalAvgRating = useMemo(() => {
    const withRating = (fbData?.results || []).filter((f: any) => f.rating != null);
    if (!withRating.length) return null;
    return withRating.reduce((s: number, f: any) => s + (f.rating ?? 0), 0) / withRating.length;
  }, [fbData]);

  const sortedRooms = [...rooms].sort((a, b) => (b.views || 0) - (a.views || 0));
  const maxTimeSpent = Math.max(...rooms.map(r => r.timeSpent || 0), 1);

  const trendSeries = [
    { name: 'Views', data: getSeriesData(insights.overTime?.views) },
  ];
  const trendOptions = baseLineOptions(theme);

  const top10 = sortedRooms.slice(0, 10);
  const barSeries = [{ name: 'Views', data: top10.map(r => r.views || 0) }];
  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
    xaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
    yaxis: { categories: top10.map(r => `Room ${r.number || '?'}`), labels: { style: { colors: theme.palette.text.secondary } } } as any,
    grid: { borderColor: theme.palette.divider },
    tooltip: { theme: theme.palette.mode },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
  };

  const buckets = { low: 0, mid: 0, high: 0 };
  rooms.forEach(r => {
    const br = parseFloat(r.bounceRate as any) || 0;
    if (br < 30) buckets.low++;
    else if (br < 60) buckets.mid++;
    else buckets.high++;
  });
  const bounceOptions: ApexOptions = {
    ...baseDonutOptions(theme),
    labels: ['< 30% Good', '30–60% Medium', '> 60% High'],
    colors: ['#10b981', '#f59e0b', '#ef4444'],
  };

  const ratingBuckets = [0, 0, 0, 0, 0];
  (fbData?.results || []).forEach((f: any) => {
    if (f.rating && f.rating >= 1 && f.rating <= 5) ratingBuckets[f.rating - 1]++;
  });
  const hasFeedback = ratingBuckets.some(v => v > 0);
  const ratingBarSeries = [{ name: 'Reviews', data: ratingBuckets }];
  const ratingBarOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, distributed: true } },
    colors: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'],
    xaxis: { categories: ['★1', '★2', '★3', '★4', '★5'], labels: { style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: (v: number) => `${Math.floor(v)}` } },
    grid: { borderColor: theme.palette.divider },
    tooltip: { theme: theme.palette.mode },
    legend: { show: false },
    dataLabels: { enabled: false },
  };

  const topRooms = rooms.filter(r => getRoomLabel(r) === 'top');
  const avgRooms = rooms.filter(r => getRoomLabel(r) === 'average');
  const attentionRooms = rooms.filter(r => {
    const fb = feedbackByRoom[r.id];
    const avgRating = fb ? fb.total / fb.count : null;
    return getRoomLabel(r) === 'attention' || (avgRating !== null && avgRating < 3);
  });

  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} md={2}><KpiCard label="Total Rooms" value={rooms.length} sub="In period" /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard label="Total Views" value={km.views ?? 0} change={ch?.views} color="primary.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard label="Total Taps" value={km.taps ?? 0} change={ch?.taps} /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard label="Avg Time Spent" value={formatTime(km.timeSpent || 0) || '0s'} color="info.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}><KpiCard label="Avg Bounce Rate" value={`${km.bounceRate ?? 0}%`} color="warning.main" /></Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            label="Avg Rating"
            value={globalAvgRating != null ? `${globalAvgRating.toFixed(1)} ★` : 'N/A'}
            color={globalAvgRating != null ? (globalAvgRating >= 4 ? 'success.main' : globalAvgRating >= 3 ? 'warning.main' : 'error.main') : undefined}
            sub={fbData?.results?.length ? `${fbData.results.length} reviews` : 'No reviews yet'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardHeader title="Views Trend" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <ReactApexChart type="line" width="100%" height={240} options={trendOptions} series={trendSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardHeader title="Top Rooms by Views" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {top10.length > 0 ? (
                <ReactApexChart type="bar" width="100%" height={240} options={barOptions} series={barSeries} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Bounce Rate Split" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {rooms.length > 0 ? (
                <ReactApexChart type="donut" width="100%" height={240} options={bounceOptions} series={[buckets.low, buckets.mid, buckets.high]} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {hasFeedback && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardHeader
                title="Guest Rating Distribution"
                titleTypographyProps={{ variant: 'h6' }}
                subheader={`${fbData?.results?.length || 0} total reviews · Avg ${globalAvgRating?.toFixed(1) ?? 'N/A'} ★`}
              />
              <CardContent sx={{ pt: 0 }}>
                <ReactApexChart type="bar" width="100%" height={200} options={ratingBarOptions} series={ratingBarSeries} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardHeader title="Rooms by Feedback Rating" titleTypographyProps={{ variant: 'h6' }} subheader="Rooms with at least 1 review" />
              <CardContent>
                <Stack gap={1.5}>
                  {Object.entries(feedbackByRoom)
                    .map(([roomId, fb]) => {
                      const room = rooms.find(r => r.id === roomId);
                      if (!room) return null;
                      const avg = fb.total / fb.count;
                      return { room, avg, count: fb.count };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => b.avg - a.avg)
                    .slice(0, 8)
                    .map((item: any) => (
                      <Stack key={item.room.id} direction="row" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 70 }}>Room {item.room.number}</Typography>
                        <Box sx={{ flex: 1, height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                          <Box sx={{
                            height: '100%',
                            width: `${(item.avg / 5) * 100}%`,
                            bgcolor: item.avg >= 4 ? 'success.main' : item.avg >= 3 ? 'warning.main' : 'error.main',
                            borderRadius: 4,
                          }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}
                          color={item.avg >= 4 ? 'success.main' : item.avg >= 3 ? 'warning.main' : 'error.main'}>
                          {item.avg.toFixed(1)} ★
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>({item.count})</Typography>
                      </Stack>
                    ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {rooms.length > 0 && (
        <Card variant="outlined">
          <CardHeader title="Performance Overview" titleTypographyProps={{ variant: 'h6' }} subheader="Classified by bounce rate, time spent and guest ratings" />
          <CardContent>
            <Grid container spacing={2}>
              {[
                { label: 'Top Performers', color: 'success', items: topRooms, sub: 'Bounce < 30% & time > 2min' },
                { label: 'Average', color: 'info', items: avgRooms, sub: 'Moderate engagement' },
                { label: 'Needs Attention', color: 'error', items: attentionRooms, sub: 'High bounce, low time or bad ratings' },
              ].map(group => (
                <Grid item xs={12} md={4} key={group.label}>
                  <Box sx={{ p: 2, borderRadius: 2, border: 2, borderColor: `${group.color}.light`, bgcolor: `${group.color}.lighter` }}>
                    <Stack direction="row" gap={1} alignItems="center" mb={1}>
                      <Typography fontWeight={700} color={`${group.color}.main`}>{group.label}</Typography>
                      <Chip size="small" label={group.items.length} color={group.color as any} sx={{ ml: 'auto' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" component="div" mb={1}>{group.sub}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {group.items.length > 0
                        ? group.items.map(r => <Chip key={r.id} size="small" label={`Room ${r.number}`} color={group.color as any} variant="outlined" />)
                        : <Typography variant="body2" color="text.secondary">None</Typography>}
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {sortedRooms.length > 0 && (
        <Box>
          <Typography variant="h6" mb={2}>Room Detail Cards</Typography>
          <Grid container spacing={2}>
            {sortedRooms.slice(0, 12).map(room => {
              const br = parseFloat(room.bounceRate as any) || 0;
              const fb = feedbackByRoom[room.id];
              const avgRating = fb ? fb.total / fb.count : null;
              const label = getRoomLabel(room);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                  <Card variant="outlined" sx={{
                    height: '100%',
                    borderColor: label === 'top' ? 'success.main' : label === 'attention' ? 'error.main' : 'divider',
                    borderWidth: label !== 'average' ? 2 : 1,
                  }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Box>
                          <Typography variant="h5" fontWeight={700} color="primary.main">Room {room.number || 'N/A'}</Typography>
                          {(room as any).group && <Chip size="small" label={(room as any).group?.title} color="secondary" sx={{ mt: 0.5 }} />}
                        </Box>
                        {avgRating != null ? (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight={700}
                              color={avgRating >= 4 ? 'success.main' : avgRating >= 3 ? 'warning.main' : 'error.main'}>
                              ★ {avgRating.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{fb!.count} reviews</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">No ratings</Typography>
                        )}
                      </Stack>
                      <Grid container spacing={1} mb={1.5}>
                        {[
                          { label: 'Views', val: room.views || 0 },
                          { label: 'Taps', val: room.taps || 0 },
                        ].map(s => (
                          <Grid item xs={4} key={s.label}>
                            <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
                            <Typography variant="body2" fontWeight={600}>{s.val}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                      <Stack gap={0.75}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Time Spent</Typography>
                          <Typography variant="caption" fontWeight={600}>{formatTime(room.timeSpent || 0) || '0s'}</Typography>
                        </Stack>
                        <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${Math.min(((room.timeSpent || 0) / maxTimeSpent) * 100, 100)}%`, bgcolor: 'primary.main', borderRadius: 3 }} />
                        </Box>
                        <Stack direction="row" justifyContent="space-between" mt={0.5}>
                          <Typography variant="caption" color="text.secondary">Bounce Rate</Typography>
                          <Typography variant="caption" fontWeight={600} color={br < 30 ? 'success.main' : br < 60 ? 'warning.main' : 'error.main'}>{br}%</Typography>
                        </Stack>
                        <Box sx={{ height: 5, bgcolor: 'action.hover', borderRadius: 3, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${Math.min(br, 100)}%`, bgcolor: br < 30 ? '#10b981' : br < 60 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <RoomsReports insights={insights} />
    </Stack>
  );
}

// ─── Buttons Tab ─────────────────────────────────────────────────────────────

const ICON_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

function ButtonsContent({ insights }: { insights: IInsights }) {
  const theme = useTheme();
  const links = insights.links || [];

  const totalTaps = links.reduce((s, l) => s + (l.taps || 0), 0);
  const activeButtons = links.filter(l => (l.taps || 0) > 0).length;
  const topLink = [...links].sort((a, b) => (b.taps || 0) - (a.taps || 0))[0];
  const avgTapsPerView = insights.keyMetrics.views > 0 ? (totalTaps / insights.keyMetrics.views).toFixed(1) : '0';

  const sortedLinks = [...links].sort((a, b) => (b.taps || 0) - (a.taps || 0));
  const top8 = sortedLinks.slice(0, 8);
  const maxTaps = top8[0]?.taps || 1;

  const hourBuckets = useMemo(() => {
    const buckets = new Array(24).fill(0);
    (insights.activities || [])
      .filter((a: any) => a.action === 'tap')
      .forEach((a: any) => { buckets[new Date(a.createdAt).getHours()]++; });
    return buckets;
  }, [insights.activities]);

  const trendSeries = [{ name: 'Taps', data: getSeriesData(insights.overTime?.taps) }];
  const trendOptions: ApexOptions = {
    ...baseLineOptions(theme),
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  };

  const donutLinks = top8.slice(0, 6);
  const othersTotal = sortedLinks.slice(6).reduce((s, l) => s + (l.taps || 0), 0);
  const donutLabels = [...donutLinks.map(l => l.title || 'Button'), ...(othersTotal > 0 ? ['Others'] : [])];
  const donutSeries = [...donutLinks.map(l => l.taps || 0), ...(othersTotal > 0 ? [othersTotal] : [])];
  const donutOptions: ApexOptions = {
    chart: { type: 'donut' },
    labels: donutLabels,
    dataLabels: { enabled: true, formatter: (val: number) => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } },
  };

  const peakOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3 } },
    xaxis: {
      categories: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      labels: { rotate: -45, style: { colors: theme.palette.text.secondary, fontSize: '10px' } },
    },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: (v: number) => `${Math.floor(v)}` } },
    grid: { borderColor: theme.palette.divider },
    tooltip: { theme: theme.palette.mode },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: false },
  };
  const peakSeries = [{ name: 'Taps', data: hourBuckets }];

  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Total Taps</Typography>
            <Typography variant="h4" fontWeight={700} color="primary.main" mt={0.5}>{totalTaps}</Typography>
            <Typography variant="caption" color="text.secondary">All buttons combined</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Active Buttons</Typography>
            <Typography variant="h4" fontWeight={700} mt={0.5}>{activeButtons}</Typography>
            <Typography variant="caption" color="text.secondary">of {links.length} total</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Most Popular</Typography>
            <Typography variant="h6" fontWeight={700} color="success.main" mt={0.5} noWrap>{topLink?.title || 'N/A'}</Typography>
            <Typography variant="caption" color="text.secondary">{topLink?.taps || 0} taps</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Taps per View</Typography>
            <Typography variant="h4" fontWeight={700} color="warning.main" mt={0.5}>{avgTapsPerView}</Typography>
            <Typography variant="caption" color="text.secondary">Avg per page visit</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            <CardHeader title="Taps Over Time" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              <ReactApexChart type="area" width="100%" height={240} options={trendOptions} series={trendSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Tap Distribution" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {donutSeries.some(v => v > 0) ? (
                <ReactApexChart type="donut" width="100%" height={240} options={donutOptions} series={donutSeries} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No tap data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Peak Hours" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {hourBuckets.some(v => v > 0) ? (
                <ReactApexChart type="bar" width="100%" height={240} options={peakOptions} series={peakSeries} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No activity data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {top8.length > 0 && (
        <Card variant="outlined">
          <CardHeader title="Top Performing Buttons" titleTypographyProps={{ variant: 'h6' }} />
          <CardContent>
            <Grid container spacing={2}>
              {top8.map((link, i) => {
                const pct = totalTaps > 0 ? ((link.taps || 0) / totalTaps) * 100 : 0;
                const color = ICON_COLORS[i % ICON_COLORS.length];
                const source = (link as any).room
                  ? `Room ${(link as any).room?.number || ''}`
                  : (link as any).group?.title || '';
                return (
                  <Grid item xs={12} sm={6} key={link.id}>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, flexShrink: 0, bgcolor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography fontWeight={700} color={color} fontSize={16}>{i + 1}</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{link.title || 'Untitled'}</Typography>
                        {source && <Typography variant="caption" color="text.secondary">{source}</Typography>}
                        <Box sx={{ mt: 0.5, height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${(link.taps || 0) / maxTaps * 100}%`, bgcolor: color, borderRadius: 2 }} />
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="h6" fontWeight={700}>{link.taps || 0}</Typography>
                        <Chip size="small" label={`${pct.toFixed(1)}%`} sx={{ bgcolor: `${color}18`, color }} />
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      <LinksReports insights={insights} />
    </Stack>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersContent({ hotelId, startDate, endDate }: { hotelId: string; startDate: string; endDate: string }) {
  const theme = useTheme();
  const { data: analytics, isLoading } = useGetOrderAnalyticsQuery({ hotelId, startDate, endDate });
  const { data: visits } = useGetOrderVisitAnalyticsQuery({ hotelId, startDate, endDate });

  if (isLoading) return <Loader center />;
  if (!analytics) {
    return (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary">No order analytics data for this period</Typography>
      </Box>
    );
  }

  const currency = '€';
  const a = analytics as any;

  const overTime: { date: string; orders: number; revenue: number }[] = a.overTime || [];
  const lineOpts: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { width: 2, curve: 'smooth' },
    grid: { borderColor: theme.palette.divider, xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } },
    xaxis: { type: 'datetime', labels: { format: 'MMM dd', style: { colors: theme.palette.text.secondary } } },
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: (v: number) => `${Math.floor(v)}` } },
    legend: { labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
  };
  const revenueOpts: ApexOptions = {
    ...lineOpts,
    yaxis: { labels: { style: { colors: theme.palette.text.secondary }, formatter: (v: number) => `${v.toFixed(0)} ${currency}` } },
    tooltip: { theme: theme.palette.mode, y: { formatter: (v: number) => `${v.toFixed(2)} ${currency}` } },
  };

  const byStatus: Record<string, number> = a.byStatus || {};
  const byPayment: Record<string, number> = a.byPayment || {};
  const byLanguage: Record<string, number> = a.byLanguage || {};
  const donutOpts = (colors: string[], labels: string[]): ApexOptions => ({
    chart: { type: 'donut' },
    colors,
    labels,
    dataLabels: { enabled: true, formatter: (val: number) => `${Number(val).toFixed(0)}%` },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.primary } },
    tooltip: { theme: theme.palette.mode },
    plotOptions: { pie: { donut: { size: '65%' } } },
  });

  const topItems: any[] = a.topItems || [];
  const topRooms: any[] = a.topRooms || [];
  const maxItemCount = topItems[0]?.count || 1;
  const maxRoomCount = topRooms[0]?.count || 1;

  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        {[
          { label: 'Total Orders', value: analytics.totalOrders, sub: 'All statuses' },
          { label: 'Revenue', value: `${analytics.totalRevenue?.toFixed(2)} ${currency}`, sub: 'Completed orders', color: 'primary.main' },
          { label: 'Avg Order Value', value: `${analytics.avgOrderValue?.toFixed(2)} ${currency}`, sub: 'Per completed order' },
          { label: 'Avg Fulfillment', value: analytics.avgFulfillmentTime != null ? `${analytics.avgFulfillmentTime} min` : 'N/A', sub: 'Accept → delivery' },
          { label: 'Completed', value: analytics.completedOrders, sub: 'Successfully delivered', color: 'success.main' },
          { label: 'Cancelled', value: analytics.cancelledOrders ?? 0, sub: 'Total cancelled', color: 'error.main' },
          { label: 'Pending', value: analytics.pendingOrders, sub: 'Awaiting action', color: 'warning.main' },
          { label: 'Avg Rating', value: analytics.avgRating ? `${analytics.avgRating?.toFixed(1)} ★` : 'N/A', sub: 'Guest satisfaction', color: 'warning.main' },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <StatKpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} color={(kpi as any).color} />
          </Grid>
        ))}
      </Grid>

      {visits && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>Menu Visitor Analytics</Typography>
          </Grid>
          {[
            { label: 'Menu Views', value: visits.totalVisits, sub: 'Guests who opened menu' },
            { label: 'Ordered', value: visits.converted, sub: 'Placed an order', color: 'success.main' },
            { label: 'Browsed Only', value: visits.notConverted, sub: 'Viewed without ordering' },
            { label: 'Conversion Rate', value: `${visits.conversionRate}%`, sub: 'Visitors who ordered', color: 'primary.main' },
          ].map(kpi => (
            <Grid item xs={6} md={3} key={kpi.label}>
              <StatKpiCard label={kpi.label} value={kpi.value} sub={kpi.sub} color={(kpi as any).color} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardHeader title="Orders Over Time" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {overTime.length > 0 ? (
                <ReactApexChart type="bar" width="100%" height={240} options={lineOpts} series={[{ name: 'Orders', data: overTime.map(d => ({ x: d.date, y: d.orders })) }]} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No order trend data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Orders by Status" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {Object.values(byStatus).length > 0 ? (
                <ReactApexChart type="donut" width="100%" height={240} options={donutOpts(['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'], Object.keys(byStatus))} series={Object.values(byStatus) as number[]} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardHeader title="Revenue Over Time" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {overTime.length > 0 ? (
                <ReactApexChart type="area" width="100%" height={240} options={revenueOpts} series={[{ name: 'Revenue', data: overTime.map(d => ({ x: d.date, y: d.revenue })) }]} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No revenue trend data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="Payment Methods" titleTypographyProps={{ variant: 'body1', fontWeight: 600 }} />
            <CardContent sx={{ pt: 0 }}>
              {Object.values(byPayment).length > 0 ? (
                <ReactApexChart type="donut" width="100%" height={240} options={donutOpts(['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'], Object.keys(byPayment))} series={Object.values(byPayment) as number[]} />
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={6}>No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {Object.keys(byLanguage).length > 1 && (
        <Card variant="outlined">
          <CardHeader title="Orders by Guest Language" titleTypographyProps={{ variant: 'h6' }} subheader="Based on the device language of the guest who placed the order" />
          <CardContent sx={{ pt: 0 }}>
            <ReactApexChart
              type="donut" width="100%" height={280}
              options={donutOpts(['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'], Object.keys(byLanguage))}
              series={Object.values(byLanguage) as number[]}
            />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Top Items" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {topItems.length > 0 ? (
                <Stack gap={1.5}>
                  {topItems.slice(0, 10).map((item: any, i: number) => (
                    <Stack key={i} gap={0.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {i + 1}
                          </Box>
                          <Typography variant="body2">{item.name}</Typography>
                        </Stack>
                        <Stack direction="row" gap={1} alignItems="center">
                          <Chip label={`×${item.count}`} size="small" />
                          <Typography variant="body2" color="text.secondary">{item.revenue?.toFixed(2)} {currency}</Typography>
                        </Stack>
                      </Stack>
                      <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${(item.count / maxItemCount) * 100}%`, bgcolor: 'primary.main', borderRadius: 2 }} />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No items data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader title="Top Rooms by Orders" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {topRooms.length > 0 ? (
                <Stack gap={1.5}>
                  {topRooms.slice(0, 10).map((room: any, i: number) => (
                    <Stack key={i} gap={0.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'success.lighter', color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {i + 1}
                          </Box>
                          <Typography variant="body2">Room {room.roomNumber}</Typography>
                        </Stack>
                        <Stack direction="row" gap={1} alignItems="center">
                          <Chip label={`${room.count} orders`} size="small" />
                          <Typography variant="body2" color="text.secondary">{room.revenue?.toFixed(2)} {currency}</Typography>
                        </Stack>
                      </Stack>
                      <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${(room.count / maxRoomCount) * 100}%`, bgcolor: 'success.main', borderRadius: 2 }} />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No room order data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsContent({ insights, hotelId, startDate, endDate }: {
  insights: IInsights | undefined; hotelId: string; startDate: string; endDate: string;
}) {
  const { data: orderAnalytics } = useGetOrderAnalyticsQuery({ hotelId, startDate, endDate }, { skip: !hotelId });
  const { data: visitAnalytics } = useGetOrderVisitAnalyticsQuery({ hotelId, startDate, endDate }, { skip: !hotelId });
  const { data: fbData } = useGetHotelFeedbacksQuery({ hotel: hotelId, startDate, endDate, limit: 5000 }, { skip: !hotelId });

  const periodLabel = `${fmtDate(startDate)}_to_${fmtDate(endDate)}`;

  const overviewRows = Object.entries(insights?.overTime?.views || {}).map(([date, views]) => [
    date, views,
    insights?.overTime?.taps?.[date] ?? 0,
    insights?.overTime?.bounceRate?.[date] ?? 0,
    insights?.overTime?.timeSpent?.[date] ?? 0,
  ]);

  const feedbackByRoom: Record<string, { count: number; total: number }> = {};
  (fbData?.results || []).forEach((f: any) => {
    if (!f.room || !f.rating) return;
    const e = feedbackByRoom[f.room] ?? { count: 0, total: 0 };
    e.count++; e.total += f.rating; feedbackByRoom[f.room] = e;
  });
  const roomRows = (insights?.rooms || []).map(r => {
    const fb = feedbackByRoom[r.id];
    const avgRating = fb ? (fb.total / fb.count).toFixed(2) : '';
    return [r.number || '', (r as any).group?.title || '', r.views || 0, r.bounceRate || 0, r.timeSpent || 0, formatTime(r.timeSpent || 0), r.taps || 0, avgRating, fb?.count ?? 0];
  });

  const totalTaps = (insights?.links || []).reduce((s, l) => s + (l.taps || 0), 0);
  const buttonRows = [...(insights?.links || [])]
    .sort((a, b) => (b.taps || 0) - (a.taps || 0))
    .map(l => [l.title || '', (l as any).room ? `Room ${(l as any).room?.number || ''}` : (l as any).group?.title || '', l.taps || 0, totalTaps > 0 ? `${(((l.taps || 0) / totalTaps) * 100).toFixed(1)}%` : '0%']);

  const oa = orderAnalytics as any;
  const ordersRows = (oa?.overTime || []).map((d: any) => [d.date, d.orders, d.revenue?.toFixed(2)]);

  const fbRows = (fbData?.results || []).map((f: any) => {
    const room = insights?.rooms?.find(r => r.id === f.room);
    return [room?.number || f.room || '', f.rating ?? '', f.message || '', f.email || '', fmtDate(f.createdAt)];
  });

  const reports = [
    {
      color: '#3b82f6', title: 'Analytics Overview',
      description: 'Daily views, taps, bounce rate and time spent.',
      rows: overviewRows.length,
      onDownload: () => downloadCSV(`analytics-overview-${periodLabel}.csv`, ['Date', 'Views', 'Taps', 'Bounce Rate %', 'Time Spent (s)'], overviewRows),
    },
    {
      color: '#10b981', title: 'Room Performance',
      description: 'Per-room views, bounce rate, time spent, taps, and guest ratings.',
      rows: roomRows.length,
      onDownload: () => downloadCSV(`room-performance-${periodLabel}.csv`, ['Room #', 'Group', 'Views', 'Bounce Rate %', 'Time Spent (s)', 'Time Spent', 'Taps', 'Avg Rating', 'Review Count'], roomRows),
    },
    {
      color: '#f59e0b', title: 'Button Interactions',
      description: 'All button tap counts, source, and percentage share of total taps.',
      rows: buttonRows.length,
      onDownload: () => downloadCSV(`button-interactions-${periodLabel}.csv`, ['Button Name', 'Source', 'Total Taps', '% of Total'], buttonRows),
    },
    {
      color: '#8b5cf6', title: 'Orders Report',
      description: 'Daily order counts and revenue with summary and conversion stats.',
      rows: ordersRows.length,
      onDownload: () => {
        const summaryRows = [...ordersRows, [], ['--- Summary ---', '', ''], ['Total Orders', oa?.totalOrders ?? 0, ''], ['Total Revenue', `${oa?.totalRevenue?.toFixed(2) ?? 0} €`, ''], ['Avg Order Value', `${oa?.avgOrderValue?.toFixed(2) ?? 0} €`, ''], ['Completed', oa?.completedOrders ?? 0, ''], ['Cancelled', oa?.cancelledOrders ?? 0, ''], ['Menu Visits', visitAnalytics?.totalVisits ?? 0, ''], ['Conversion Rate', `${visitAnalytics?.conversionRate ?? 0}%`, '']];
        downloadCSV(`orders-report-${periodLabel}.csv`, ['Date', 'Orders', 'Revenue (€)'], summaryRows);
      },
    },
    {
      color: '#ef4444', title: 'Guest Feedback',
      description: 'All guest reviews: room, star rating, message and optional email.',
      rows: fbRows.length,
      onDownload: () => downloadCSV(`guest-feedback-${periodLabel}.csv`, ['Room #', 'Rating (1-5)', 'Message', 'Guest Email', 'Date'], fbRows),
    },
  ];

  return (
    <Stack gap={3}>
      <Card variant="outlined" sx={{ bgcolor: 'primary.lighter', borderColor: 'primary.light' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Typography variant="body2" fontWeight={600}>
              Generating reports for:{' '}
              <Typography component="span" color="primary.main" fontWeight={700}>{fmtDate(startDate)}</Typography>
              {' '}→{' '}
              <Typography component="span" color="primary.main" fontWeight={700}>{fmtDate(endDate)}</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>All exports include data within the selected date range</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {reports.map(r => (
          <Grid item xs={12} sm={6} md={4} key={r.title}>
            <Card variant="outlined" sx={{ height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
              <CardContent>
                <Stack gap={2}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: `${r.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography fontWeight={900} fontSize={24} color={r.color}>↓</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} mb={0.5}>{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>{r.description}</Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip size="small" label={`${r.rows} records`} variant="outlined" />
                      <Button size="small" variant="contained" onClick={r.onDownload} disabled={r.rows === 0}>
                        Export CSV
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const HotelInsights = ({ hotel }: { hotel: string }) => {
  const router = useRouter();
  const [tab, setTab] = useState('overview');

  const searchParams: any = useSearchQuery(['startDate', 'endDate', 'language', 'device']);

  const start = useMemo(() => startOfToday(), []);
  const end = useMemo(() => endOfToday(), []);

  const { data: insights, isLoading }: { data?: IInsights; isLoading: boolean } = useGetHotelInsightsQuery({
    hotel,
    params: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      ...searchParams,
    },
  });

  const effectiveStart = searchParams.startDate || start.toISOString();
  const effectiveEnd = searchParams.endDate || end.toISOString();

  return (
    <>
      {isLoading && <Loader center />}
      <Stack gap={3}>
        {/* Header */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
          <Typography variant="h5" noWrap>Analytics</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
            <InsightsFilter
              languages={[...new Set(insights?.activities?.map((a: any) => a.details.language))].map((l: any) => ({ label: l || '', value: l || '' }))}
              filters={searchParams}
              setFilters={(filters: any) => {
                const params = { ...searchParams };
                delete params.device;
                delete params.language;
                router.push(`/hotels/${hotel}?tab=insights&` + toSearchParams({ ...params, ...filters }));
              }}
            />
            <RangePicker
              range={{ startDate: searchParams.startDate, endDate: searchParams.endDate }}
              setRange={({ startDate, endDate }: any) => {
                router.push(`/hotels/${hotel}?tab=insights&` + toSearchParams({ ...searchParams, startDate, endDate }));
              }}
            />
          </Stack>
        </Stack>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Rooms" value="rooms" />
          <Tab label="Buttons" value="buttons" />
          <Tab label="Orders" value="orders" />
          <Tab label="Reports" value="reports" />
        </Tabs>

        {tab === 'overview' && (
          insights ? (
            <OverviewContent insights={insights} hotelId={hotel} startDate={effectiveStart} endDate={effectiveEnd} />
          ) : !isLoading ? (
            <Typography color="text.secondary" textAlign="center" py={6}>No data available for the selected period</Typography>
          ) : null
        )}

        {tab === 'rooms' && insights && (
          <RoomsContent insights={insights} hotelId={hotel} startDate={effectiveStart} endDate={effectiveEnd} />
        )}

        {tab === 'buttons' && insights && (
          <ButtonsContent insights={insights} />
        )}

        {tab === 'orders' && (
          <OrdersContent hotelId={hotel} startDate={effectiveStart} endDate={effectiveEnd} />
        )}

        {tab === 'reports' && (
          <ReportsContent insights={insights} hotelId={hotel} startDate={effectiveStart} endDate={effectiveEnd} />
        )}
      </Stack>
    </>
  );
};

export default HotelInsights;
