import { useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import {
  Button,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Popover,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'

import { toast } from 'react-toastify'

import { AddCircleOutline, Close, QrCode2, Save, WebOutlined } from '@mui/icons-material'

import type { GridRowSelectionModel } from '@mui/x-data-grid'

import { useGetRoomsQuery, useUpdateRoomMutation } from '@/redux/api/roomApi'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'
import Loader from '@/components/common/Loader'
import DataTable from '@/components/common/DataTable'
import useDialog from '@/@core/hooks/useDialog'
import type { IGroup, IRoom } from '@/types'
import { useDictionary } from '@/contexts/DictionaryContext'
import AssignGroupDialog from './AssignGroupDialog'
import { useGetGroupsQuery } from '@/redux/api/groupApi'
import ShareRoomDialog from '@/views/shared/ShareRoomDialog'

const RoomsTable = ({ hotel }: { hotel: string }) => {
  const router = useRouter()
  const dictionary = useDictionary()
  const { lang: locale } = useParams()
  const assignGroupDialog = useDialog<IRoom>()
  const [qrRoomUrl, setQrRoomUrl] = useState<string | null>(null)

  const [number, setNumber] = useState<{
    [key: string]: string
  }>({})

  const searchParams: any = useSearchQuery(['page', 'limit', 'search'])

  const { data, isLoading } = useGetRoomsQuery({
    ...searchParams,
    hotel
  })

  const { data: groupsData } = useGetGroupsQuery({
    limit: 100,
    hotel
  })

  const [updateRoom, { isLoading: updateLoading }] = useUpdateRoomMutation()

  const columns = [
    {
      field: 'number',
      headerName: 'Number',
      width: 150,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value

          setNumber(prevState => ({
            ...prevState,
            [row.id]: value
          }))
        }

        const handleSave = () => {
          const value = number[row.id]

          if (!value) return
          setNumber(prevState => ({
            ...prevState,
            [row.id]: null
          }))
          handleRoomUpdate(row.id, {
            number: value
          })
        }

        return (
          <TextField
            variant='outlined'
            size='small'
            key={row.number}
            defaultValue={row.number}
            value={number[row.id]}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton onClick={handleSave} disabled={!number[row.id]}>
                    <Save />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        )
      }
    },
    {
      field: 'description',
      headerName: dictionary.description,
      flex: 1,
      sortable: false,
      disableColumnMenu: true
    },
    {
      field: 'Group',
      headerName: dictionary.group,
      sortable: false,
      disableColumnMenu: true,
      minWidth: 150,
      renderCell: ({ row }: any) => (
        <Button
          size='small'
          variant='outlined'
          endIcon={!row.group && <AddCircleOutline color='secondary' />}
          onClick={() => {
            assignGroupDialog.open({ data: row })
          }}
        >
          {!row.group ? <WebOutlined fontSize='small' /> : row.group?.title || 'Group'}
        </Button>
      )
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
              handleRoomUpdate(row.id, { isActive: c })
            }}
          />
        )
      }
    },
    {
      field: 'qr',
      headerName: 'QR',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: any) => (
        <Tooltip title='Generate QR Code'>
          <IconButton size='small' onClick={() => setQrRoomUrl(`${process.env.NEXT_PUBLIC_APP_URL}/${row.id}`)}>
            <QrCode2 fontSize='small' />
          </IconButton>
        </Tooltip>
      )
    }
  ]

  const handleEditRoom = (id: any) => {
    router.push(`/${locale}/rooms/${id}`)
  }

  const handleViewRoom = (id: any) => {
    const roomLink = `${process.env.NEXT_PUBLIC_APP_URL}/${id}`

    window.open(roomLink, '_blank')
  }

  const handleRoomUpdate = async (id: any, room: any) => {
    try {
      await updateRoom({
        id,
        room
      }).unwrap()
      toast.success('Room updated')
    } catch (error: any) {
      toast.error(error?.data?.message || error.error)
    }
  }

  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([])

  const handleSelectionChange = (newSelection: GridRowSelectionModel) => {
    setSelectedRows(newSelection)
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
    setSelectedRows([])
  }

  const open = Boolean(anchorEl)
  const id = open ? 'assign-group-popover' : undefined

  const onSelect = async (group: IGroup) => {
    await Promise.all(
      selectedRows.map(async id => {
        return await updateRoom({
          id,
          room: {
            group: group.id
          }
        }).unwrap()
      })
    )
    handleClose()
  }

  return (
    <>
      {(isLoading || updateLoading) && <Loader center />}
      <DataTable
        data={data}
        columns={columns}
        params={searchParams}
        onEdit={handleEditRoom}
        checkboxSelection
        handleSelectionChange={handleSelectionChange}
        rowSelectionModel={selectedRows}
        onView={handleViewRoom}
      />
      {assignGroupDialog.isOpen && assignGroupDialog.content?.data && (
        <AssignGroupDialog
          room={assignGroupDialog.content.data}
          onClose={() => {
            assignGroupDialog.close()
          }}
        />
      )}
      {qrRoomUrl && <ShareRoomDialog url={qrRoomUrl} onClose={() => setQrRoomUrl(null)} />}
      {selectedRows.length > 0 && (
        <Stack
          direction='row'
          gap={10}
          alignItems='center'
          position='fixed'
          bottom={10}
          right={10}
          left={{ xs: 10, md: 270 }}
          sx={{ backgroundColor: 'primary.main', color: 'white', padding: 5, borderRadius: '10px' }}
        >
          <Typography variant='body1' color='white'>
            {selectedRows.length} {dictionary.selected}
          </Typography>
          <Stack direction='row' gap={2} justifyContent='end' alignItems='center' sx={{ flex: 1 }}>
            <Divider orientation='vertical' flexItem sx={{ color: 'white' }} />
            <Button sx={{ color: 'white' }} onClick={handleClick}>
              {dictionary.assignGroup}
            </Button>
            <Divider orientation='vertical' flexItem sx={{ color: 'white' }} />
            <IconButton sx={{ color: 'white' }} onClick={() => setSelectedRows([])}>
              <Close />
            </IconButton>
          </Stack>
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center'
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'center'
            }}
          >
            <List sx={{ width: 200, bgcolor: 'background.paper' }}>
              {groupsData?.results?.length > 0 &&
                groupsData?.results?.map((group: IGroup, index: number) => (
                  <ListItemButton key={index} onClick={() => onSelect(group)}>
                    {group.title}
                  </ListItemButton>
                ))}
            </List>
          </Popover>
        </Stack>
      )}
    </>
  )
}

export default RoomsTable
