import { useGetTagsQuery, useUnLinkTagMutation } from '@/redux/api/tagApi'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import DataTable from '@/components/common/DataTable'
import { copyToClipboard } from '@/utils/miscUtils'

const TagsTable = ({ room }: { room: string }) => {
  const searchParams: any = useSearchQuery(['page', 'limit', 'search'])

  const { data, isLoading } = useGetTagsQuery({
    ...searchParams,
    room
  })

  const [unLinkTag, { isLoading: unLinkLoading }] = useUnLinkTagMutation()

  const columns = [
    {
      field: 'url',
      headerName: 'URL',
      flex: 1,
      renderCell: ({ row }: any) => {
        return (
          <div
            onClick={() => {
              copyToClipboard(row.url)
            }}
          >
            {row.url}
          </div>
        )
      }
    }
  ]

  const handleUnLinkTag = (id: any) => {
    unLinkTag(id)
  }

  return (
    <>
      {(isLoading || unLinkLoading) && <Loader center />}
      <DataTable data={data} columns={columns} params={searchParams} onDelete={handleUnLinkTag} />
    </>
  )
}

export default TagsTable
