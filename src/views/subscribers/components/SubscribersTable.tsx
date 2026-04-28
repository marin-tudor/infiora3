import { useMemo } from 'react'

import { toast } from 'react-toastify'

import { endOfToday, startOfToday } from 'date-fns'

import {
  useDeleteSubscriberMutation,
  useGetSubscribersQuery,
  useLazyExportSubscribersQuery
} from '@/redux/api/subscriberApi'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import DataTable from '@/components/common/DataTable'
import { useDictionary } from '@/contexts/DictionaryContext'
import { downloadBlob } from '@/utils/miscUtils'

const SubscribersTable = ({ user }: { user: string }) => {
  const dictionary = useDictionary()

  const searchParams: any = useSearchQuery(['startDate', 'endDate', 'page', 'limit', 'search'])

  const start = useMemo(() => startOfToday(), [])
  const end = useMemo(() => endOfToday(), [])

  const { data, isLoading } = useGetSubscribersQuery({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ...searchParams,
    user
  })

  const [exportSubscribers, { isLoading: isExportingSubscribers }] = useLazyExportSubscribersQuery()
  const [deleteSubscriber, { isLoading: deleteLoading }] = useDeleteSubscriberMutation()

  const columns = [
    {
      field: 'email',
      headerName: dictionary.email,
      flex: 1
    },
    {
      field: 'createdAt',
      headerName: dictionary.subscribedAt,
      flex: 1,
      renderCell: ({ row }: any) => {
        const date = new Date(row.createdAt)

        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }
  ]

  const handleDeleteSubscriber = (id: any) => {
    deleteSubscriber(id)
  }

  const handleExportSubscribers = async () => {
    try {
      const res: any = await exportSubscribers({
        ...searchParams,
        user,
        sortBy: '-createdAt'
      }).unwrap()

      downloadBlob(res, 'subscribers.csv', 'text/csv; name="subscribers.csv"')

      toast.success(dictionary.messages.exportSubscribersSuccess)
    } catch (error: any) {
      toast.error(error.data?.message || error.message)
    }
  }

  return (
    <>
      {(isLoading || deleteLoading || isExportingSubscribers) && <Loader center />}
      <DataTable
        data={data}
        columns={columns}
        params={searchParams}
        onDelete={handleDeleteSubscriber}
        onExport={handleExportSubscribers}
      />
    </>
  )
}

export default SubscribersTable
