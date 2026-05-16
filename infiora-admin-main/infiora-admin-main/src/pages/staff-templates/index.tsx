import { Box, Container } from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import StaffRoleTemplatesPage from '@/views/staff/pages/StaffRoleTemplatesPage';

const Page = () => (
  <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
    <Container maxWidth="xl">
      <StaffRoleTemplatesPage />
    </Container>
  </Box>
);

Page.getLayout = (page: any) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
