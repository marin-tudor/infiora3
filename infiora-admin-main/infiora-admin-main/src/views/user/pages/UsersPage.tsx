import { Box, Container, Stack, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import UsersTable from '../components/UsersTable';

const UsersPage = () => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Stack direction="row" spacing={1}>
            <Typography variant="h4">Users</Typography>
          </Stack>
          <UsersTable />
        </Stack>
      </Container>
    </Box>
  );
};

UsersPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default UsersPage;
