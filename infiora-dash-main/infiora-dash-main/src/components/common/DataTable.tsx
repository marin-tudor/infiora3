import React from 'react'

import { usePathname, useRouter } from 'next/navigation'

import type { GridCallbackDetails, GridRowSelectionModel } from '@mui/x-data-grid'
import { DataGrid } from '@mui/x-data-grid'
import { Button, IconButton, InputAdornment, Stack, SvgIcon, TextField } from '@mui/material'
import { Visibility, Edit, Delete, Add, Search, FilterAlt, CloudDownload } from '@mui/icons-material'

import { debounce } from 'lodash'
import Swal from 'sweetalert2'

import { filterNotNullOrEmptyFields, toSearchParams } from '@/utils/miscUtils'
import useDialog from '@/@core/hooks/useDialog'
import FiltersForm from './FiltersForm'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import { useDictionary } from '@/contexts/DictionaryContext'

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
      cancelButtonText: 'No'
    })

    if (result.isConfirmed && onDelete) {
      onDelete(id)
    }
  }

  return (
    <Stack direction='row' gap={0}>
      {onView && (
        <IconButton onClick={() => onView(id)}>
          <Visibility fontSize='small' />
        </IconButton>
      )}
      {onEdit && (
        <IconButton onClick={() => onEdit(id)}>
          <Edit fontSize='small' />
        </IconButton>
      )}
      {onDelete && (
        <IconButton onClick={handleDelete}>
          <Delete fontSize='small' style={{ color: 'red' }} />
        </IconButton>
      )}
    </Stack>
  )
}

interface DataTableProps {
  title?: any
  placeholder?: string
  data: any
  columns: any[]
  params?: any
  checkboxSelection?: boolean
  handleSelectionChange?: ((rowSelectionModel: GridRowSelectionModel, details: GridCallbackDetails) => void) | undefined
  rowSelectionModel?: GridRowSelectionModel
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onExport?: () => void
  onAdd?: () => void
  filters?: any[]
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  placeholder,
  data,
  columns,
  params,
  onView,
  onEdit,
  onDelete,
  onExport,
  onAdd,
  filters,
  checkboxSelection,
  handleSelectionChange,
  rowSelectionModel
}) => {
  const filterDialog = useDialog()
  const dictionary = useDictionary()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchQuery(['tab'])

  const debouncedSearch = debounce(async search => {
    router.push(
      pathname +
        '?' +
        toSearchParams(
          filterNotNullOrEmptyFields({
            ...searchParams,
            ...params,
            page: 1,
            limit: 10,
            search
          })
        )
    )
  }, 1000)

  const onFilterSelect = (data: any) => {
    filterDialog.close()
    router.push(
      pathname +
        '?' +
        toSearchParams(
          filterNotNullOrEmptyFields({
            ...searchParams,
            ...params,
            page: 1,
            limit: 10,
            ...data
          })
        )
    )
  }

  const actionColumn = {
    field: 'Actions',
    width: 140,
    sortable: false,
    disableColumnMenu: true,
    renderCell: ({ row }: any) => <RowActions id={row.id} onView={onView} onEdit={onEdit} onDelete={onDelete} />
  }

  return (
    <>
      <Stack>
        <Stack alignItems='center' direction='row' justifyContent='space-between' sx={{ mb: 2 }}>
          <Stack alignItems='center' direction='row' gap={2}>
            {title}
            {onAdd && (
              <Button
                size='small'
                variant='contained'
                onClick={onAdd}
                startIcon={
                  <SvgIcon fontSize='small'>
                    <Add />
                  </SvgIcon>
                }
              >
                Add
              </Button>
            )}
          </Stack>
          {/* Right Section: Filters and Actions */}
          <Stack alignItems='center' direction='row' gap={2} {...(!title && { flex: 1 })}>
            <TextField
              size='small'
              placeholder={placeholder || dictionary.search + '...'}
              defaultValue={searchParams.search}
              onChange={e => debouncedSearch(e.target.value)}
              fullWidth
              InputProps={{
                style: {
                  borderRadius: '20px'
                },
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search color='info' />
                  </InputAdornment>
                )
              }}
            />
            {filters && (
              <Button
                color='inherit'
                size='small'
                onClick={() => filterDialog.open()}
                startIcon={
                  <SvgIcon fontSize='small'>
                    <FilterAlt />
                  </SvgIcon>
                }
              >
                Filter
              </Button>
            )}
            {onExport && (
              <Button
                color='inherit'
                size='small'
                onClick={onExport}
                startIcon={
                  <SvgIcon fontSize='small'>
                    <CloudDownload />
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
          columns={!onView && !onEdit && !onDelete ? columns : columns.concat(actionColumn)}
          paginationModel={{
            page: Number(data?.page || 1) - 1,
            pageSize: Number(data?.limit || 10)
          }}
          onPaginationModelChange={paginationModel => {
            router.push(
              pathname +
                '?' +
                toSearchParams({
                  ...searchParams,
                  ...params,
                  limit: paginationModel.pageSize,
                  page: paginationModel.page + 1
                })
            )
          }}
          disableRowSelectionOnClick
          checkboxSelection={checkboxSelection || false}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={handleSelectionChange}
          pageSizeOptions={[10, 25, 50]}
          pagination
          paginationMode='server'
          rowCount={data?.totalResults || 0}
          sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
        />
      </Stack>
      {filterDialog.isOpen && (
        <FiltersForm
          onClose={() => {
            router.push(
              pathname +
                '?' +
                toSearchParams({
                  ...searchParams,
                  page: 1,
                  limit: 10
                })
            )
            filterDialog.close()
          }}
          filters={filters}
          onSubmit={onFilterSelect}
          values={params}
        />
      )}
    </>
  )
}

export default DataTable
