import { Chip, Stack } from '@mui/material'

import { useDictionary } from '@/contexts/DictionaryContext'
import Reports from './Reports'
import { formatTime, getPeakTime, getSeriesData } from '@/utils/miscUtils'
import type { IInsights } from '@/types'

const RoomsReports = ({ insights }: { insights: IInsights }) => {
  const dictionary = useDictionary()

  const columns = [
    {
      field: 'number',
      headerName: dictionary.number,
      minWidth: 80,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => row.number || 'N/A'
    },
    {
      field: 'views',
      headerName: dictionary.views,
      minWidth: 100,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.views || 0}`
    },
    {
      field: 'liveViews',
      headerName: dictionary.liveViews,
      minWidth: 100,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.liveViews || 0}`
    },
    {
      field: 'bounceRate',
      headerName: dictionary.bounceRate,
      minWidth: 120,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.bounceRate || 0}%`
    },
    {
      field: 'timeSpent',
      headerName: dictionary.timeSpent,
      minWidth: 120,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${formatTime(row.timeSpent || 0) || '0s'}`
    },
    {
      field: 'taps',
      headerName: dictionary.taps,
      minWidth: 100,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.taps || 0}`
    },
    {
      field: 'feedbacks',
      headerName: dictionary.feedbacks,
      minWidth: 100,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.feedbacks || 0}`
    },
    {
      field: 'popup',
      headerName: dictionary.popupTaps,
      minWidth: 100,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => `${row.popupTaps || 0}`
    },
    {
      field: 'topLink',
      headerName: dictionary.topLink,
      minWidth: 150,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        const topLink = insights.links.find(l => l.id === row.topPerformingLink)

        return topLink ? <Chip size='small' color={'secondary'} label={topLink.title} /> : ''
      }
    },
    {
      field: 'topSocialLink',
      headerName: dictionary.topSocialLink,
      minWidth: 150,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        return row.topPerformingSocialLink ? (
          <Chip size='small' color={'secondary'} label={row.topPerformingSocialLink} />
        ) : (
          ''
        )
      }
    },
    {
      field: 'group',
      headerName: dictionary.group,
      minWidth: 120,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) =>
        row.group ? <Chip size='small' color={'secondary'} label={row.group?.title || ''} /> : ''
    },
    {
      field: 'peak',
      headerName: dictionary.peakActivity,
      minWidth: 120,
      flex: 1,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        return `${getPeakTime(insights?.activities?.filter(a => a.details.room === row.id)) || 'N/A'}`
      }
    },
    {
      field: 'device',
      headerName: dictionary.viewsByDevice,
      minWidth: 150,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        return (
          row.viewsByDevices && (
            <Stack direction='row' sx={{ overflow: 'auto', height: '100%', alignItems: 'center' }}>
              {Object.entries(row.viewsByDevices).map(([key, value]) => (
                <span key={key} style={{ marginRight: 5 }}>{`${key}: ${value || 0}% `}</span>
              ))}
            </Stack>
          )
        )
      }
    },
    {
      field: 'language',
      headerName: dictionary.viewsByLanguage,
      minWidth: 150,
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        return (
          row.viewsByLanguages && (
            <Stack direction='row' sx={{ overflow: 'auto', height: '100%', alignItems: 'center' }}>
              {Object.entries(row.viewsByLanguages).map(([key, value]) => (
                <span key={key} style={{ marginRight: 5 }}>{`${key}: ${value || 0}% `}</span>
              ))}
            </Stack>
          )
        )
      }
    }
  ]

  const series = [
    {
      name: dictionary.views,
      data: getSeriesData(insights?.overTime?.views)
    }
  ]

  return (
    <Reports
      title={dictionary.pages.insights?.roomAnalytics.title}
      subheader={dictionary.pages.insights?.roomAnalytics.info}
      series={series}
      rows={insights?.rooms || []}
      columns={columns}
    />
  )
}

export default RoomsReports
