import { Chip } from '@mui/material'

import { useDictionary } from '@/contexts/DictionaryContext'
import Reports from './Reports'
import { getSeriesData } from '@/utils/miscUtils'
import type { IInsights } from '@/types'

const LinksReports = ({ insights }: { insights: IInsights }) => {
  const dictionary = useDictionary()

  const columns = [
    {
      field: 'title',
      headerName: dictionary.title,
      minWidth: 100,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.title || 'N/A'}`
    },
    {
      field: 'taps',
      headerName: dictionary.taps,
      minWidth: 150,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.taps || 0}`
    },
    {
      field: 'type',
      headerName: dictionary.source,
      minWidth: 120,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      type: 'singleSelect',
      valueOptions: (insights?.links || [])
        .map((l: any) => ({
          value: `${(l.room ? l.room?.id : l.group?.id) || ''}`,
          label: `${l.room ? `${dictionary.room} ${l.room?.number || ''}` : l.group?.title || ''}`
        }))
        .filter((value, index, self) => index === self.findIndex(t => t.value === value.value)),
      renderCell: ({ row }: any) => (
        <Chip
          size='small'
          color={row.room ? 'warning' : 'secondary'}
          label={row.room ? `${dictionary.room} ${row.room?.number || ''}` : row.group?.title || ''}
        />
      )
    }
  ]

  const series = [
    {
      name: dictionary.taps,
      data: getSeriesData(insights?.overTime?.taps)
    }
  ]

  return (
    <Reports
      title={dictionary.pages.insights?.buttonAnalytics.title}
      subheader={dictionary.pages.insights?.buttonAnalytics.info}
      series={series}
      rows={(insights?.links || []).map((l: any) => ({
        ...l,
        type: `${(l.room ? l.room?.id : l.group?.id) || ''}`
      }))}
      columns={columns}
    />
  )
}

export default LinksReports
