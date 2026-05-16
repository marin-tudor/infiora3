import {
  useDeleteTicketMutation,
  useGetTicketsQuery,
  useLazyExportTicketsQuery,
  useUpdateTicketMutation,
} from '@/redux/api/ticketApi';
import DataTable from '@/components/ui/DataTable';
import { Chip, MenuItem, Select } from '@mui/material';
import { downloadBlob } from '@/utils/downloadBlob';
import { toast } from 'react-toastify';
import { useSearchQuery } from '@/components/hooks/useSearchQuery';
import Loader from '@/components/ui/Loader';

const TicketsTable = ({ user }: any) => {
  const searchParams: any = useSearchQuery([
    'page',
    'limit',
    'search',
  ]);

  const { data, isLoading } = useGetTicketsQuery({
    ...searchParams,
    user,
    sortBy: 'createdAt:desc',
  });

  const [deleteTicket, { isLoading: deleteLoading }] =
    useDeleteTicketMutation();
  const [updateTicket, { isLoading: updateLoading }] =
    useUpdateTicketMutation();
  const [exportTickets, { isLoading: exportLoading }] =
    useLazyExportTicketsQuery();

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 250,
    },
    {
      field: 'subject',
      headerName: 'Subject',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'message',
      headerName: 'Message',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 120,
      renderCell: ({ row }: any) => {
        return <Chip label={row.category} />;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ row }: any) => {
        return (
          <Select
            size="small"
            value={row.status}
            onChange={(event) => {
              handleStatusChange(row.id, event);
            }}
          >
            <MenuItem value="opened">Opened</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
          </Select>
        );
      },
    },
  ];

  const handleDeleteTicket = (id: any) => {
    deleteTicket(id);
  };

  const handleExportTickets = async () => {
    try {
      const res: any = await exportTickets({ user }).unwrap();
      downloadBlob(
        res,
        'tickets.csv',
        'text/csv; name="tickets.csv"'
      );
    } catch (error) {
      console.error('Export tickets error:', error);
    }
  };

  const handleStatusChange = async (id: any, event: any) => {
    try {
      await updateTicket({
        id,
        ticket: {
          status: event,
        },
      }).unwrap();
      toast.success('Ticket updated');
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  return (
    <>
      {(isLoading ||
        updateLoading ||
        deleteLoading ||
        exportLoading) && <Loader center />}
      <DataTable
        title="Tickets"
        data={data}
        columns={columns}
        params={searchParams}
        onDelete={handleDeleteTicket}
        onExport={handleExportTickets}
      />
    </>
  );
};

export default TicketsTable;
