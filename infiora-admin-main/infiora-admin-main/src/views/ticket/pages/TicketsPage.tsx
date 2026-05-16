import { Box, Container, Stack, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import TicketsTable from '../components/TicketsTable';

const TicketsPage = () => {
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
            <Typography variant="h4">Tickets</Typography>
          </Stack>
          <TicketsTable />
        </Stack>
      </Container>
    </Box>
  );
};

TicketsPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default TicketsPage;
