import { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { DashboardLayout } from '@/layouts/dashboard/layout';

interface RevenueRow {
  hotelId: string;
  hotelName: string;
  gmv: number;
  platformFees: number;
  stripeFees: number;
  transactions: number;
  lastActivity?: string;
}

interface RevenueTotals {
  gmv: number;
  platformFees: number;
  stripeFees: number;
  transactions: number;
}

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const StripeRevenuePage = () => {
  const today = toDateInput(new Date());
  const firstOfMonth = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [totals, setTotals] = useState<RevenueTotals | null>(null);
  const [globalFee, setGlobalFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/v1/admin/stripe-revenue?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to load Stripe revenue');
        return;
      }

      setRows(data.rows || []);
      setTotals(data.totals || null);
      setGlobalFee(data.settings?.stripePlatformFeePercent ?? null);
    } catch {
      setError('Failed to load Stripe revenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Stripe Revenue | Infiora Admin</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4">Stripe Revenue</Typography>
              <Typography color="text.secondary" variant="body2">
                GMV and fee revenue from succeeded Stripe payments. Global default fee: {globalFee ?? '-'}%.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <TextField
                type="date"
                label="From"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                type="date"
                label="To"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <Button variant="contained" onClick={load} disabled={loading}>
                {loading ? 'Loading...' : 'Load'}
              </Button>
            </Stack>

            {error && <Typography color="error">{error}</Typography>}

            {totals && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {[
                  { label: 'Total GMV', value: `€${totals.gmv.toFixed(2)}` },
                  { label: 'Infiora Fees', value: `€${totals.platformFees.toFixed(2)}` },
                  { label: 'Stripe Fees', value: `€${totals.stripeFees.toFixed(2)}` },
                  { label: 'Transactions', value: String(totals.transactions) },
                ].map((kpi) => (
                  <Card key={kpi.label} sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography color="text.secondary" variant="overline">
                        {kpi.label}
                      </Typography>
                      <Typography variant="h5">{kpi.value}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            <Card>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Hotel</TableCell>
                    <TableCell align="right">GMV</TableCell>
                    <TableCell align="right">Infiora fees</TableCell>
                    <TableCell align="right">Stripe fees</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell>Last activity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.hotelId} hover>
                      <TableCell>{row.hotelName}</TableCell>
                      <TableCell align="right">€{row.gmv.toFixed(2)}</TableCell>
                      <TableCell align="right">€{row.platformFees.toFixed(2)}</TableCell>
                      <TableCell align="right">€{row.stripeFees.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.transactions}</TableCell>
                      <TableCell>{row.lastActivity ? format(new Date(row.lastActivity), 'dd.MM.yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No data for selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

StripeRevenuePage.getLayout = (page: any) => <DashboardLayout>{page}</DashboardLayout>;

export default StripeRevenuePage;
