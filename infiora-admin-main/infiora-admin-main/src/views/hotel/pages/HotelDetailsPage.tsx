import {
  Box,
  Button,
  Card,
  Container,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { DashboardLayout } from "@/layouts/dashboard/layout";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import Link from "next/link";
import { useGetHotelQuery } from "@/redux/api/hotelApi";
import Loader from "@/components/ui/Loader";
import RoomsTable from "@/views/room/components/RoomsTable";
import HotelInsights from "../components/HotelInsights";
import HotelOverviewTab from "../components/HotelOverviewTab";
import GroupsTable from "@/views/group/components/GroupsTable";

const HotelDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") || "overview";

  const { data, isLoading } = useGetHotelQuery(params?.id, {
    skip: !params?.id,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    router.replace(`/hotels/${params?.id}?tab=${newValue}`);
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
            <Typography variant="h4">Hotel Details</Typography>
            <Link href={`/hotels/edit/${params?.id}`}>
              <Button variant="contained" size="small">
                Edit
              </Button>
            </Link>
          </Stack>
          {data && (
            <Card sx={{ my: 2 }}>
              <TabContext value={tab}>
                <TabList
                  onChange={handleTabChange}
                  textColor="secondary"
                  indicatorColor="secondary"
                  sx={{ px: 2 }}
                >
                  <Tab label="Overview" value="overview" />
                  <Tab label="Analytics" value="insights" />
                  <Tab label="Rooms" value="rooms" />
                  <Tab label="Groups" value="groups" />
                </TabList>
                <TabPanel value="overview">
                  <HotelOverviewTab hotel={data} />
                </TabPanel>
                <TabPanel value="insights">
                  <HotelInsights hotel={data?.id} />
                </TabPanel>
                <TabPanel value="rooms">
                  <RoomsTable hotel={data?.id} />
                </TabPanel>
                <TabPanel value="groups">
                  <GroupsTable hotel={data?.id} />
                </TabPanel>
              </TabContext>
            </Card>
          )}
        </Container>
      </Box>
    </>
  );
};

HotelDetailsPage.getLayout = (page: any) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default HotelDetailsPage;
