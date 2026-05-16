import { useState } from 'react';

import {
  BarChartOutlined,
  ShowChartOutlined,
  TableChartOutlined,
} from '@mui/icons-material';

import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Card,
  CardContent,
  Stack,
  Tab,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid';

import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        width="100%"
      >
        <GridToolbarQuickFilter
          quickFilterProps={{ debounceMs: 500 }}
          sx={{ flexGrow: 1, maxWidth: '300px' }}
        />
        <Stack direction="row">
          <GridToolbarDensitySelector />
          <GridToolbarColumnsButton />
          <GridToolbarFilterButton />
          <GridToolbarExport />
        </Stack>
      </Stack>
    </GridToolbarContainer>
  );
}

const Reports = ({
  title,
  subheader,
  series,
  rows,
  columns,
}: {
  title: string;
  subheader: string;
  series: any;
  rows: any;
  columns: any;
}) => {
  const [tab, setTab] = useState('3');

  return (
    <Card>
      <CardContent>
        <Stack gap={1}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2">{subheader}</Typography>
        </Stack>
        <TabContext value={tab}>
          <TabList
            variant="scrollable"
            onChange={(e, value) => {
              setTab(value);
            }}
          >
            <Tab
              icon={<ShowChartOutlined />}
              iconPosition="start"
              label="Line Chart"
              value="1"
            />
            <Tab
              icon={<BarChartOutlined />}
              iconPosition="start"
              label="Bar Chart"
              value="2"
            />
            <Tab
              icon={<TableChartOutlined />}
              iconPosition="start"
              label="Table"
              value="3"
            />
          </TabList>
          <TabPanel value="1" sx={{ flexGrow: 1 }}>
            <LineChart series={series} />
          </TabPanel>
          <TabPanel value="2" sx={{ flexGrow: 1 }}>
            <BarChart series={series} />
          </TabPanel>
          <TabPanel value="3" sx={{ flexGrow: 1, height: 500 }}>
            <DataGrid
              density="compact"
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              pagination
              slots={{
                toolbar: CustomToolbar,
              }}
              sx={{
                '& .MuiDataGrid-columnHeaders': { borderRadius: 0 },
              }}
            />
          </TabPanel>
        </TabContext>
      </CardContent>
    </Card>
  );
};

export default Reports;
