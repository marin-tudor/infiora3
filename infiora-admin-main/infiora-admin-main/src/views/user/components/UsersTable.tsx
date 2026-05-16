import {
  useDeleteUserMutation,
  useGetUsersQuery,
  useLazyExportUsersQuery,
  useUpdateUserMutation,
} from '@/redux/api/userApi';
import DataTable from '@/components/ui/DataTable';
import { Avatar, Chip, Stack, Switch } from '@mui/material';
import { useRouter } from 'next/router';
import { downloadBlob } from '@/utils/downloadBlob';
import Link from 'next/link';
import { getInitials } from '@/utils/get-initials';
import { toast } from 'react-toastify';
import { useSearchQuery } from '@/components/hooks/useSearchQuery';
import Loader from '@/components/ui/Loader';

const UsersTable = () => {
  const router = useRouter();
  const searchParams: any = useSearchQuery([
    'page',
    'limit',
    'search',
    'role',
  ]);

  const { data, isLoading } = useGetUsersQuery({
    ...searchParams,
  });
  const [deleteUser, { isLoading: deleteLoading }] =
    useDeleteUserMutation();
  const [updateUser, { isLoading: updateLoading }] =
    useUpdateUserMutation();
  const [exportUsers, { isLoading: exportLoading }] =
    useLazyExportUsersQuery();

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 300,
      renderCell: ({ row }: any) => {
        return (
          <Link
            href={`/users/${row.id}`}
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
    {
      field: 'role',
      headerName: 'Role',
      width: 100,
      renderCell: ({ row }: any) => {
        return <Chip label={row.role} />;
      },
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 100,
      renderCell: ({ row }: any) => {
        return (
          <Switch
            checked={row.isActive}
            onChange={(e, c) => {
              handleStatusChange(row.id, c);
            }}
          />
        );
      },
    },
  ];

  const handleViewUser = (id: any) => {
    router.push(`/users/${id}`);
  };

  const handleAddUser = () => {
    router.push(`/users/add`);
  };

  const handleEditUser = (id: any) => {
    router.push(`/users/edit/${id}`);
  };

  const handleDeleteUser = (id: any) => {
    deleteUser(id);
  };

  const handleExportUsers = async () => {
    try {
      const res: any = await exportUsers().unwrap();
      downloadBlob(res, 'users.csv', 'text/csv; name="users.csv"');
    } catch (error) {
      console.error('Export users error:', error);
    }
  };

  const handleStatusChange = async (id: any, event: any) => {
    try {
      await updateUser({
        id,
        user: {
          isActive: event,
        },
      }).unwrap();
      toast.success('User updated');
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  const filters = [
    {
      label: 'Role',
      name: 'role',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
        { label: 'Manager', value: 'manager' },
      ],
    },
  ];

  return (
    <>
      {(isLoading ||
        updateLoading ||
        deleteLoading ||
        exportLoading) && <Loader center />}
      <DataTable
        title="Users"
        data={data}
        columns={columns}
        params={searchParams}
        filters={filters}
        onView={handleViewUser}
        onAdd={handleAddUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onExport={handleExportUsers}
      />
    </>
  );
};

export default UsersTable;
