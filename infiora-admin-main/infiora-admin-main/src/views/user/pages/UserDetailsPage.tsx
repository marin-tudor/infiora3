import {
  Box,
  Button,
  Card,
  Container,
  Stack,
  Tab,
  Typography,
} from '@mui/material';
import { DashboardLayout } from '@/layouts/dashboard/layout';
import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Link from 'next/link';
import { useGetUserQuery } from '@/redux/api/userApi';
import UserOverviewTab from '../components/UserOverviewTab';
import HotelsTable from '@/views/hotel/components/HotelsTable';
import Loader from '@/components/ui/Loader';

const UserDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const tab = searchParams.get('tab') || 'overview';

  const { data, isLoading } = useGetUserQuery(params?.id, {
    skip: !params?.id,
  });

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: string
  ) => {
    router.replace(`/users/${params?.id}?tab=${newValue}`);
  };

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
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h4">User Details</Typography>
            <Link href={`/users/edit/${params?.id}`}>
              <Button variant="contained" size="small">
                Edit
              </Button>
            </Link>
          </Stack>
          <Card sx={{ my: 2 }}>
            <TabContext value={tab}>
              <TabList
                onChange={handleTabChange}
                textColor="secondary"
                indicatorColor="secondary"
                sx={{ px: 2 }}
              >
                <Tab label="Overview" value="overview" />
                <Tab label="Hotels" value="hotels" />
              </TabList>
              <TabPanel value="overview">
                <UserOverviewTab user={data} />
              </TabPanel>
              <TabPanel value="hotels">
                <HotelsTable user={data?.id} />
              </TabPanel>
            </TabContext>
          </Card>
        </Container>
      </Box>
    </>
  );
};

UserDetailsPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default UserDetailsPage;
