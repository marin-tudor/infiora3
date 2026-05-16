import { Box, Container, Stack, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import { useParams } from 'next/navigation';
import { useGetUserQuery } from '@/redux/api/userApi';
import UserForm from '../components/UserForm';
import Loader from '@/components/ui/Loader';

const EditUserPage = () => {
  const params = useParams();

  const { data, isLoading } = useGetUserQuery(params?.id, {
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
            <Typography variant="h4">Update User</Typography>
            {data && <UserForm user={data} key={data.id} />}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EditUserPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default EditUserPage;
