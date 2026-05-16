import { Chip } from '@mui/material';

import Reports from './Reports';
import { getSeriesData } from '@/utils/miscUtils';
import type { IInsights } from '@/types';

const LinksReports = ({ insights }: { insights: IInsights }) => {
  const dictionary = {
    title: 'Title',
    taps: 'Taps',
    source: 'Source',
    room: 'Room',
    group: 'Group',
  };

  const columns = [
    {
      field: 'title',
      headerName: dictionary.title,
      minWidth: 100,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.title || 'N/A'}`,
    },
    {
      field: 'taps',
      headerName: dictionary.taps,
      minWidth: 150,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.taps || 0}`,
    },
    {
      field: 'type',
      headerName: dictionary.source,
      minWidth: 120,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      type: 'singleSelect',
      valueOptions: [
        { value: 'Room', label: dictionary.room },
        { value: 'Group', label: dictionary.group },
      ],
      renderCell: ({ row }: any) => (
        <Chip
          size="small"
          color={row.room ? 'warning' : 'secondary'}
          label={
            row.room
              ? `Room: ${row.room?.number || ''}`
              : row.group?.title || ''
          }
        />
      ),
    },
  ];

  const series = [
    {
      name: dictionary.taps,
      data: getSeriesData(insights?.overTime?.taps),
    },
  ];

  return (
    <Reports
      title="Button Analytics"
      subheader="Tracks the engagement metrics of buttons, such as clicks and interactions, providing data on user behavior and feature utilization."
      series={series}
      rows={(insights?.links || []).map((l) => ({
        ...l,
        type: l.room ? 'Room' : 'Group',
      }))}
      columns={columns}
    />
  );
};

export default LinksReports;
