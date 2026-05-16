import { Box, Container, Stack, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import { useParams } from 'next/navigation';
import { useGetHotelQuery } from '@/redux/api/hotelApi';
import HotelForm from '../components/HotelForm';
import Loader from '@/components/ui/Loader';

const EditHotelPage = () => {
  const params = useParams();

  const { data, isLoading } = useGetHotelQuery(params?.id, {
    skip: !params?.id,
  });

  if (!data) {
    return;
  }

  return (
    <>
      {isLoading && <Loader center />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
        }}
      >
        <Container maxWidth="xl">
          <Stack gap={4}>
            <Typography variant="h4">Update Hotel</Typography>
            {data && <HotelForm hotel={data} key={data.id} />}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EditHotelPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default EditHotelPage;
