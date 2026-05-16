'use client'

import { useMemo, useState } from 'react'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useAuthUser } from '@/hooks/useAuthUser'
import type { IDailyRating, IRevenueByCategory } from '@/redux/api/analyticsApi'
import { useGetHotelAnalyticsQuery } from '@/redux/api/analyticsApi'
import { useGetCategoriesQuery } from '@/redux/api/ordersApi'

const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

const formatDuration = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${seconds}s`
}

const MetricCard = ({ title, value, sub }: { title: string; value: string | number; sub?: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant='body2' color='text.secondary' gutterBottom>
        {title}
      </Typography>
      <Typography variant='h4' fontWeight={700}>
        {value}
      </Typography>
      {sub && (
        <Typography variant='caption' color='text.secondary'>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
)

export default function AnalyticsPage() {
  const authUser = useAuthUser()
  const hotelId = (authUser as any)?.hotel?.id
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * 86_400_000)))
  const [to, setTo] = useState(() => toDateInput(new Date()))

  const { data, isLoading, error } = useGetHotelAnalyticsQuery(
    { hotelId, from: new Date(from).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() },
    { skip: !hotelId }
  )

  const { data: categories = [] } = useGetCategoriesQuery(hotelId, { skip: !hotelId })

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()

    ;(categories as any[]).forEach(category => map.set(String(category.id ?? category._id), category.name))

    return map
  }, [categories])

  const revenueData = useMemo(
    () =>
      ((data?.revenueByCategory ?? []) as IRevenueByCategory[]).map(entry => ({
        name: entry.categoryName || categoryNameById.get(String(entry._id)) || 'Uncategorised',
        revenue: Number(entry.totalRevenue ?? 0),
        orders: Number(entry.orderCount ?? 0)
      })),
    [categoryNameById, data?.revenueByCategory]
  )

  const ratingData = ((data?.dailyRatings ?? []) as IDailyRating[]).map(entry => ({
    date: entry._id,
    rating: Number(entry.avgRating ?? 0),
    count: Number(entry.count ?? 0)
  }))

  const totalRevenue =
    revenueData.reduce((sum: number, entry: { revenue: number }) => sum + entry.revenue, 0) +
    Number(data?.bookings?.revenue ?? 0)

  const avgRating =
    ratingData.length > 0
      ? ratingData.reduce((sum: number, entry: { rating: number }) => sum + entry.rating, 0) / ratingData.length
      : 0

  if (!hotelId) return <Alert severity='info'>No hotel selected.</Alert>

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' gap={2}>
        <div>
          <Typography variant='h4' fontWeight={700}>
            Revenue Analytics
          </Typography>
          <Typography color='text.secondary'>Revenue, booking volume, service quality and SLA signals.</Typography>
        </div>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
          <TextField
            label='From'
            type='date'
            size='small'
            value={from}
            onChange={e => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label='To'
            type='date'
            size='small'
            value={to}
            onChange={e => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </Stack>

      {isLoading && <CircularProgress />}
      {error && <Alert severity='error'>Failed to load analytics.</Alert>}

      {data && (
        <>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard title='Total revenue' value={`${totalRevenue.toFixed(2)} EUR`} sub='Orders + bookings' />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard title='Bookings' value={data.bookings?.total ?? 0} sub='Confirmed/completed' />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title='Avg acceptance'
                value={formatDuration(data.avgAcceptanceMs ?? 0)}
                sub='Created to accepted'
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard title='SLA breaches' value={data.slaBreaches ?? 0} sub='Awaiting over 5 minutes' />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title='Avg rating'
                value={avgRating ? `${avgRating.toFixed(1)} star` : 'N/A'}
                sub='Daily average'
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Revenue by category
                  </Typography>
                  <ResponsiveContainer width='100%' height={340}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} />
                      <XAxis dataKey='name' />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey='revenue' fill='#b8935c' radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} lg={5}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Daily ratings
                  </Typography>
                  <ResponsiveContainer width='100%' height={340}>
                    <LineChart data={ratingData}>
                      <CartesianGrid strokeDasharray='3 3' vertical={false} />
                      <XAxis dataKey='date' />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Line type='monotone' dataKey='rating' stroke='#2e7d5a' strokeWidth={3} dot={false} />
                      <Line type='monotone' dataKey='count' stroke='#7a6f60' strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  )
}
