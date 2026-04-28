import { useParams, useRouter } from 'next/navigation'

import { Switch } from '@mui/material'

import { toast } from 'react-toastify'

import { useDeleteGroupMutation, useGetGroupsQuery, useUpdateGroupMutation } from '@/redux/api/groupApi'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import DataTable from '@/components/common/DataTable'
import { useDictionary } from '@/contexts/DictionaryContext'

const GroupsTable = ({ hotel }: { hotel: string }) => {
  const router = useRouter()
  const dictionary = useDictionary()
  const { lang: locale } = useParams()

  const searchParams: any = useSearchQuery(['page', 'limit', 'search'])

  const { data, isLoading } = useGetGroupsQuery({
    ...searchParams,
    hotel
  })

  const [deleteGroup, { isLoading: deleteLoading }] = useDeleteGroupMutation()
  const [updateGroup, { isLoading: updateLoading }] = useUpdateGroupMutation()

  const columns = [
    {
      field: 'title',
      headerName: dictionary.title,
      width: 150,
      sortable: false,
      disableColumnMenu: true
    },
    {
      field: 'description',
      headerName: dictionary.description,
      flex: 1,
      minWidth: 150,
      sortable: false,
      disableColumnMenu: true
    },
    {
      field: 'isActive',
      headerName: dictionary.active,
      width: 100,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        return (
          <Switch
            checked={row.isActive}
            onChange={(e, c) => {
              handleStatusChange(row.id, c)
            }}
          />
        )
      }
    }
  ]

  const handleEditGroup = (id: any) => {
    router.push(`/${locale}/groups/${id}`)
  }

  const handleDeleteGroup = (id: any) => {
    deleteGroup(id)
  }

  const handleStatusChange = async (id: any, event: any) => {
    try {
      await updateGroup({
        id,
        group: {
          isActive: event
        }
      }).unwrap()
      toast.success(dictionary.messages.updateGroupSuccess)
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  return (
    <>
      {(isLoading || updateLoading || deleteLoading) && <Loader center />}
      <DataTable
        data={data}
        columns={columns}
        params={searchParams}
        onEdit={handleEditGroup}
        onDelete={handleDeleteGroup}
      />
    </>
  )
}

export default GroupsTable
