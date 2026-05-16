import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  SvgIcon,
} from '@mui/material';
import { debounce, sortBy } from 'lodash';
import { filterNotNullOrEmptyFields } from '@/utils/filter-not-null-or-empty-fields';
import Swal from 'sweetalert2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import useDialog from '../hooks/useDialog';
import FiltersForm from './FiltersForm';
import { Add } from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { toSearchParams } from '@/utils/miscUtils';
import { useSearchQuery } from '../hooks/useSearchQuery';

const RowActions = ({ id, onView, onEdit, onDelete }: any) => {
  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '<strong>Warning</strong>',
      icon: 'warning',
      html: 'Are you sure you want to delete this?',
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
    });

    if (result.isConfirmed && onDelete) {
      onDelete(id);
    }
  };

  return (
    <Stack direction="row" gap={0}>
      {onView && (
        <IconButton onClick={() => onView(id)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      )}
      {onEdit && (
        <IconButton onClick={() => onEdit(id)}>
          <EditIcon fontSize="small" />
        </IconButton>
      )}
      {onDelete && (
        <IconButton onClick={handleDelete}>
          <DeleteIcon fontSize="small" style={{ color: 'red' }} />
        </IconButton>
      )}
    </Stack>
  );
};
interface DataTableProps {
  title?: any;
  placeholder?: string;
  data: any;
  columns: any[];
  sortBy?: any[];
  params?: any;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: () => void;
  onAdd?: () => void;
  filters?: any[];
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  placeholder,
  sortBy,
  data,
  columns,
  params,
  onView,
  onEdit,
  onDelete,
  onExport,
  onAdd,
  filters,
}) => {
  const filterDialog = useDialog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchQuery(['tab']);

  const debouncedSearch = debounce(async (search) => {
    router.push(
      pathname +
        '?' +
        toSearchParams(
          filterNotNullOrEmptyFields({
            ...searchParams,
            ...params,
            page: 1,
            limit: 10,
            search,
          })
        )
    );
  }, 1000);

  const onFilterSelect = (data: any) => {
    filterDialog.close();
    router.push(
      pathname +
        '?' +
        toSearchParams(
          filterNotNullOrEmptyFields({
            ...searchParams,
            ...params,
            page: 1,
            limit: 10,
            ...data,
          })
        )
    );
  };

  const actionColumn = {
    field: 'Actions',
    width: 140,
    sortable: false,
    disableColumnMenu: true,
    renderCell: ({ row }: any) => (
      <RowActions
        id={row.id}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  };

  return (
    <>
      <Card sx={{ p: 2 }}>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          {/* Left Section: Title and Search */}
          <Stack alignItems="center" direction="row" gap={2}>
            {title}
            {onAdd && (
              <Button
                size="small"
                variant="contained"
                onClick={onAdd}
                startIcon={
                  <SvgIcon fontSize="small">
                    <Add />
                  </SvgIcon>
                }
              >
                Add
              </Button>
            )}
          </Stack>
          {/* Placeholder for spacing */}
          <Box />
          {/* Right Section: Filters and Actions */}
          <Stack alignItems="center" direction="row" gap={2}>
            <OutlinedInput
              defaultValue=""
              placeholder={placeholder || 'Search'}
              size="small"
              startAdornment={
                <InputAdornment position="start">
                  <SvgIcon fontSize="small">
                    <SearchIcon />
                  </SvgIcon>
                </InputAdornment>
              }
              sx={{ maxWidth: 500 }}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            {filters && (
              <Button
                color="inherit"
                size="small"
                onClick={() => filterDialog.open()}
                startIcon={
                  <SvgIcon fontSize="small">
                    <FilterAltIcon />
                  </SvgIcon>
                }
              >
                Filter
              </Button>
            )}
            {onExport && (
              <Button
                color="inherit"
                size="small"
                onClick={onExport}
                startIcon={
                  <SvgIcon fontSize="small">
                    <CloudDownloadIcon />
                  </SvgIcon>
                }
              >
                Export
              </Button>
            )}
          </Stack>
        </Stack>
        <DataGrid
          autoHeight
          rows={data?.results || []}
          columns={
            !onView && !onEdit && !onDelete
              ? columns
              : columns.concat(actionColumn)
          }
          sortModel={sortBy || []}
          onSortModelChange={(sortModel) => {
            const p = { sortBy, ...searchParams };
            router.push(
              pathname +
                '?' +
                toSearchParams({
                  ...p,
                  page: 1,
                  limit: 10,
                  ...(sortModel.length > 0
                    ? {
                        sortBy: `${sortModel[0].field}:${sortModel[0].sort}`,
                      }
                    : {}),
                })
            );
          }}
          paginationModel={{
            page: Number(data?.page || 1) - 1,
            pageSize: Number(data?.limit || 10),
          }}
          onPaginationModelChange={(paginationModel) => {
            router.push(
              pathname +
                '?' +
                toSearchParams({
                  ...searchParams,
                  ...params,
                  limit: paginationModel.pageSize,
                  page: paginationModel.page + 1,
                })
            );
          }}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          pagination
          paginationMode="server"
          rowCount={data?.totalResults || 0}
          sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
        />
      </Card>
      {filterDialog.isOpen && (
        <FiltersForm
          onClose={() => {
            router.push(
              pathname +
                '?' +
                toSearchParams({
                  ...searchParams,
                  page: 1,
                  limit: 10,
                })
            );
            filterDialog.close();
          }}
          filters={filters}
          onSubmit={onFilterSelect}
          values={params}
        />
      )}
    </>
  );
};

export default DataTable;
