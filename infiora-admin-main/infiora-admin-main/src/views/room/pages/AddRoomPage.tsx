import { Box, Container, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import RoomForm from '../components/RoomForm';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const AddRoomPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotel = searchParams.get('hotel');

  useEffect(() => {
    if (!hotel) {
      router.back();
    }
  }, [hotel, router]);

  if (!hotel) return null;

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Add New Room
        </Typography>
        <RoomForm hotel={hotel} />
      </Container>
    </Box>
  );
};

AddRoomPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AddRoomPage;
