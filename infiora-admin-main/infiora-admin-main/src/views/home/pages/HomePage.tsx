'use client';
import { useRouter } from 'next/navigation';
import { Stack, Typography } from '@mui/material';
import { endOfToday, startOfToday, subDays } from 'date-fns';
import RangePicker from '@/components/common/RangePicker';
import { useGetAdminInsightsQuery } from '@/redux/api/userApi';
import type { IInsights } from '@/types';
import { useSearchQuery } from '@/components/hooks/useSearchQuery';
import Loader from '@/components/ui/Loader';
import { toSearchParams } from '@/utils/miscUtils';
import HomeInsights from '../components/HomeInsights';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import { useMemo } from 'react';

const HomePage = () => {
  const router = useRouter();
  const searchParams: any = useSearchQuery(['startDate', 'endDate']);
  const start = useMemo(() => startOfToday(), []);
  const end = useMemo(() => endOfToday(), []);
  const { data: insights }: { data?: IInsights } =
    useGetAdminInsightsQuery({
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ...searchParams,
      },
    });

  if (!insights) return <Loader center />;

  return (
    <Stack gap={5} padding={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={2}
      >
        <Typography variant="h4" noWrap>
          Welcome
        </Typography>
        <RangePicker
          range={{
            startDate: searchParams.startDate,
            endDate: searchParams.endDate,
          }}
          setRange={({ startDate, endDate }) => {
            router.push(
              `/?` +
                toSearchParams({
                  ...searchParams,
                  startDate,
                  endDate,
                })
            );
          }}
        />
      </Stack>
      <HomeInsights insights={insights} />
    </Stack>
  );
};

HomePage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default HomePage;
