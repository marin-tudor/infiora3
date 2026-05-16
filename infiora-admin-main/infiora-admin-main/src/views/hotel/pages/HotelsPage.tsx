import { Box, Container, Stack, Typography } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import HotelsTable from '../components/HotelsTable';

const HotelsPage = () => {
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
            <Typography variant="h4">Hotels</Typography>
          </Stack>
          <HotelsTable />
        </Stack>
      </Container>
    </Box>
  );
};

HotelsPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default HotelsPage;
