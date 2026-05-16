import { Box, Container, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import { useParams } from 'next/navigation';
import { useGetRoomQuery } from '@/redux/api/roomApi';
import RoomForm from '../components/RoomForm';
import Loader from '@/components/ui/Loader';

const EditRoomPage = () => {
  const params = useParams();

  const { data, isLoading } = useGetRoomQuery(params?.id, {
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
          <Typography variant="h4">Update Room</Typography>
          {data && <RoomForm room={data} key={data.id} />}
        </Container>
      </Box>
    </>
  );
};

EditRoomPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default EditRoomPage;
