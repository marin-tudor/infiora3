'use client'

import { Alert, Card, CardContent, CardHeader, Chip, Grid, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'

import Loader from '@/components/common/Loader'
import { useGetHotelOperationsOverviewQuery } from '@/redux/api/hotelApi'

function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card variant='outlined' sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant='caption' color='text.secondary' textTransform='uppercase' letterSpacing={0.6}>
          {label}
        </Typography>
        <Typography variant='h4' fontWeight={700} mt={0.5}>
          {value}
        </Typography>
        {helper && (
          <Typography variant='caption' color='text.secondary' component='div' mt={0.5}>
            {helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function OperationsOverviewTab({ hotelId }: { hotelId: string }) {
  const { data, isLoading } = useGetHotelOperationsOverviewQuery(hotelId, { skip: !hotelId })

  if (isLoading) return <Loader center />
  if (!data) return null

  return (
    <Stack gap={3}>
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <MetricCard label='Active Orders' value={data.summary.activeOrders} helper='Awaiting, processing, on the way' />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard label='Upcoming Bookings' value={data.summary.upcomingBookings} helper='Pending and confirmed' />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard label='Open Maintenance' value={data.summary.openMaintenance} helper='Pending or in progress' />
        </Grid>
        <Grid item xs={6} md={3}>
          <MetricCard label='Open Housekeeping' value={data.summary.openHousekeeping} helper='Pending or in progress' />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Service Levels' />
            <CardContent>
              <Stack direction='row' gap={1} flexWrap='wrap' mb={2}>
                <Chip label={`Acceptance: ${data.serviceLevels.avgOrderAcceptanceMinutes ?? 'N/A'} min`} color='primary' />
                <Chip label={`SLA breaches: ${data.serviceLevels.orderSlaBreaches}`} color='warning' />
                <Chip
                  label={`Maintenance: ${data.serviceLevels.maintenanceResolutionMinutes ?? 'N/A'} min`}
                  variant='outlined'
                />
                <Chip
                  label={`Housekeeping: ${data.serviceLevels.housekeepingResolutionMinutes ?? 'N/A'} min`}
                  variant='outlined'
                />
              </Stack>
              <Alert severity='info'>
                Dispatch rules active: {data.staffing.activeDispatchRules}/{data.staffing.totalDispatchRules}. Average
                escalation: {data.staffing.avgEscalationSeconds ?? 'N/A'} seconds.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Premium Readiness' />
            <CardContent>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                {Object.entries(data.premiumModules || {}).map(([key, enabled]: [string, unknown]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${enabled ? 'on' : 'off'}`}
                    color={enabled ? 'success' : 'default'}
                    variant={enabled ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
              <Typography variant='body2' color='text.secondary' mt={2}>
                Confirmed booking revenue: €{data.bookings.confirmedRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Maintenance Categories' />
            <CardContent>
              <List dense disablePadding>
                {data.issueBreakdown.maintenance.length > 0 ? (
                  data.issueBreakdown.maintenance.map((item: { label: string; count: number }) => (
                    <ListItem key={item.label} disableGutters divider>
                      <ListItemText primary={item.label} secondary={`${item.count} requests`} />
                    </ListItem>
                  ))
                ) : (
                  <Typography color='text.secondary'>No maintenance requests in the last 30 days.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Housekeeping Categories' />
            <CardContent>
              <List dense disablePadding>
                {data.issueBreakdown.housekeeping.length > 0 ? (
                  data.issueBreakdown.housekeeping.map((item: { label: string; count: number }) => (
                    <ListItem key={item.label} disableGutters divider>
                      <ListItemText primary={item.label} secondary={`${item.count} requests`} />
                    </ListItem>
                  ))
                ) : (
                  <Typography color='text.secondary'>No housekeeping requests in the last 30 days.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Recent Audit Log' />
            <CardContent>
              <List dense disablePadding>
                {data.recentAuditLogs.length > 0 ? (
                  data.recentAuditLogs.map((entry: { id: string; summary: string; actorType: string; createdAt: string }) => (
                    <ListItem key={entry.id} disableGutters divider>
                      <ListItemText
                        primary={entry.summary}
                        secondary={`${entry.actorType} · ${new Date(entry.createdAt).toLocaleString()}`}
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography color='text.secondary'>No recent audit events.</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant='outlined'>
            <CardHeader title='Translation Cache Review' />
            <CardContent>
              <Stack direction='row' gap={1} flexWrap='wrap' mb={2}>
                {data.translationCacheReview.totals.map((entry: { scope: string; status: string; count: number }) => (
                  <Chip key={`${entry.scope}-${entry.status}`} label={`${entry.scope} ${entry.status}: ${entry.count}`} />
                ))}
              </Stack>
              {data.translationCacheReview.pendingOldest ? (
                <Typography variant='body2' color='text.secondary' mb={1}>
                  Oldest pending: {data.translationCacheReview.pendingOldest.scope} /
                  {data.translationCacheReview.pendingOldest.language} since{' '}
                  {new Date(data.translationCacheReview.pendingOldest.createdAt).toLocaleString()}
                </Typography>
              ) : (
                <Typography variant='body2' color='text.secondary' mb={1}>
                  No pending cache entries.
                </Typography>
              )}
              {data.translationCacheReview.recentFailures.length > 0 && (
                <Alert severity='warning'>
                  Recent failures: {data.translationCacheReview.recentFailures.length}. Review before changing the
                  translation pipeline.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
