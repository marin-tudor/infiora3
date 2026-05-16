import {
  useDeleteHotelMutation,
  useGetHotelsQuery,
  useLazyExportHotelsQuery,
  useUpdateHotelMutation,
} from '@/redux/api/hotelApi';
import DataTable from '@/components/ui/DataTable';
import {
  Avatar,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useRouter } from 'next/router';
import { downloadBlob } from '@/utils/downloadBlob';
import Link from 'next/link';
import { getInitials } from '@/utils/get-initials';
import { toast } from 'react-toastify';
import { useSearchQuery } from '@/components/hooks/useSearchQuery';
import Loader from '@/components/ui/Loader';
import { Check, Clear, Close, Save } from '@mui/icons-material';
import { useState } from 'react';
import { useAppSelector } from '@/redux/store';
import { minWidth } from '@mui/system';

const HotelsTable = ({ batch, user }: any) => {
  const authUser = useAppSelector((state) => state.userState.user);
  const [activeUntil, setActiveUntil] = useState<{
    [key: string]: string;
  }>({});

  const router = useRouter();
  const searchParams: any = useSearchQuery([
    'page',
    'limit',
    'search',
  ]);

  const { data, isLoading } = useGetHotelsQuery({
    ...searchParams,
    batch,
    user,
    sortBy: 'createdAt:desc',
  });
  const [deleteHotel, { isLoading: deleteLoading }] =
    useDeleteHotelMutation();
  const [updateHotel, { isLoading: updateLoading }] =
    useUpdateHotelMutation();
  const [exportHotels, { isLoading: exportLoading }] =
    useLazyExportHotelsQuery();

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      sortable: false,
      disableColumnMenu: true,
      flex: 1,
      minWidth: 300,
      renderCell: ({ row }: any) => {
        return (
          <Link
            href={`/hotels/${row.id}`}
            style={{ textDecoration: 'none', color: 'black' }}
          >
            <Stack direction="row" spacing={1}>
              <Avatar src={row?.image}>
                {getInitials(row?.name)}
              </Avatar>
              <div>
                {row?.name}
                <br />
                ID: {row.id}
              </div>
            </Stack>
          </Link>
        );
      },
    },
    ...(authUser?.role === 'admin'
      ? [
          {
            field: 'activeUntil',
            headerName: 'Active Until',
            sortable: false,
            disableColumnMenu: true,
            width: 300,
            renderCell: ({ row }: any) => {
              // Handle the date change for a specific row
              const handleChange = (
                e: React.ChangeEvent<HTMLInputElement>
              ) => {
                const updatedDate = e.target.value;
                setActiveUntil((prevState) => ({
                  ...prevState,
                  [row.id]: updatedDate,
                }));
              };

              // Save the updated value if valid
              const handleSave = () => {
                if (authUser?.role !== 'admin') {
                  toast.error('Forbiden');
                  return;
                }
                const dateValue = activeUntil[row.id];
                if (!dateValue) return;

                const isValidDate = !isNaN(Date.parse(dateValue));

                if (isValidDate) {
                  handleHotelUpdate(row.id, {
                    activeUntil: dateValue,
                  });
                } else {
                }
              };

              // Reset the value to null and clear it from the state
              const handleReset = () => {
                setActiveUntil((prevState) => ({
                  ...prevState,
                  [row.id]: '',
                }));
                handleHotelUpdate(row.id, { activeUntil: null });
              };
              const defaultValue = row.activeUntil?.split('T');

              return (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <TextField
                    variant="outlined"
                    type="date"
                    size="small"
                    key={row.activeUntil}
                    value={
                      activeUntil[row.id] ||
                      (defaultValue?.length > 0
                        ? defaultValue[0]
                        : '')
                    }
                    onChange={handleChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleSave}>
                            <Save />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <IconButton onClick={handleReset} color="error">
                    <Clear />
                  </IconButton>
                </Stack>
              );
            },
          },
          {
            field: 'active',
            headerName: 'Active',
            sortable: false,
            disableColumnMenu: true,
            width: 100,
            renderCell: ({ row }: any) => {
              return (
                <Switch
                  disabled={authUser?.role !== 'admin'}
                  checked={row.isActive}
                  onChange={(e, c) => {
                    if (authUser?.role !== 'admin') {
                      toast.error('Forbiden');
                    } else {
                      handleHotelUpdate(row.id, { isActive: c });
                    }
                  }}
                />
              );
            },
          },
        ]
      : [
          {
            field: 'active',
            headerName: 'Active',
            sortable: false,
            disableColumnMenu: true,
            width: 100,
            renderCell: ({ row }: any) => {
              return row.isActive ? <Check /> : <Close />;
            },
          },
        ]),
  ];

  const handleViewHotel = (id: any) => {
    router.push(`/hotels/${id}`);
  };

  const handleAddHotel = () => {
    router.push(`/hotels/add?user=${user}`);
  };

  const handleEditHotel = (id: any) => {
    router.push(`/hotels/edit/${id}`);
  };

  const handleDeleteHotel = (id: any) => {
    deleteHotel(id);
  };

  const handleExportHotels = async () => {
    try {
      const res: any = await exportHotels({ batch, user }).unwrap();
      downloadBlob(res, 'hotels.csv', 'text/csv; name="hotels.csv"');
    } catch (error) {
      console.error('Export hotels error:', error);
    }
  };

  const handleHotelUpdate = async (id: any, hotel: any) => {
    try {
      await updateHotel({
        id,
        hotel,
      }).unwrap();
      toast.success('Hotel updated');
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
        title="Hotels"
        data={data}
        columns={columns}
        params={searchParams}
        onView={handleViewHotel}
        onAdd={user ? handleAddHotel : undefined}
        onEdit={handleEditHotel}
        onDelete={handleDeleteHotel}
        onExport={handleExportHotels}
      />
    </>
  );
};

export default HotelsTable;
