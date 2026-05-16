import { Box, Container, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import HotelForm from '../components/HotelForm';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const AddHotelPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = searchParams.get('user');

  useEffect(() => {
    if (!user) {
      router.back();
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Add New Hotel
        </Typography>
        <HotelForm user={user} />
      </Container>
    </Box>
  );
};

AddHotelPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AddHotelPage;
