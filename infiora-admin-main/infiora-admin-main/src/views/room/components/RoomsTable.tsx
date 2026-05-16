import {
  useDeleteRoomMutation,
  useGetRoomsQuery,
  useLazyExportRoomsQuery,
  useUpdateRoomMutation,
} from "@/redux/api/roomApi";
import DataTable from "@/components/ui/DataTable";
import {
  Button,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
} from "@mui/material";
import { useRouter } from "next/router";
import { downloadBlob } from "@/utils/downloadBlob";
import { toast } from "react-toastify";
import { useSearchQuery } from "@/components/hooks/useSearchQuery";
import Loader from "@/components/ui/Loader";
import useDialog from "@/components/hooks/useDialog";
import CreateRoomsDialog from "./CreateRoomsDialog";
import { Check, Close, Save, Download } from "@mui/icons-material";
import { useAppSelector } from "@/redux/store";
import { useState } from "react";

const RoomsTable = ({ hotel }: { hotel: string }) => {
  const authUser = useAppSelector((state) => state.userState.user);
  const router = useRouter();
  const createRoomsDialog = useDialog<string>();
  const searchParams: any = useSearchQuery([
    "page",
    "limit",
    "search",
    "sortBy",
  ]);

  const [number, setNumber] = useState<{
    [key: string]: string;
  }>({});

  const { data, isLoading } = useGetRoomsQuery({
    sortBy: "createdAt:desc",
    ...searchParams,
    hotel,
  });
  const [deleteRoom, { isLoading: deleteLoading }] = useDeleteRoomMutation();
  const [updateRoom, { isLoading: updateLoading }] = useUpdateRoomMutation();
  const [exportRooms, { isLoading: exportLoading }] = useLazyExportRoomsQuery();

  const columns = [
    {
      field: "number",
      headerName: "Number",
      sortable: false,
      disableColumnMenu: true,
      width: 200,
      renderCell: ({ row }: any) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;

          setNumber((prevState) => ({
            ...prevState,
            [row.id]: value,
          }));
        };

        const handleSave = () => {
          const value = number[row.id];

          if (!value) return;

          setNumber((prevState) => ({
            ...prevState,
            [row.id]: null,
          }));

          handleRoomUpdate(row.id, {
            number: value,
          });
        };

        return (
          <TextField
            variant="outlined"
            size="small"
            key={row.number}
            defaultValue={row.number}
            value={number[row.id]}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSave} disabled={!number[row.id]}>
                    <Save />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        );
      },
    },
    {
      field: "url",
      headerName: "URL",
      sortable: false,
      disableColumnMenu: true,
      flex: 1,
      minWidth: 350,
      renderCell: ({ row }: any) => <>https://app.infiora.hr/{row.id}</>,
    },
    {
      field: "qr",
      headerName: "QR-Code",
      sortable: false,
      disableColumnMenu: true,
      width: 100,
      renderCell: ({ row }: any) => (
        <IconButton
          onClick={() => handleDownloadQRCode(row)}
          title="Download QR Code"
        >
          <Download />
        </IconButton>
      ),
    },
    ...(authUser?.role === "admin"
      ? [
          {
            field: "isActive",
            headerName: "Active",
            sortable: false,
            disableColumnMenu: true,
            width: 100,
            renderCell: ({ row }: any) => {
              return (
                <Switch
                  checked={row.isActive}
                  onChange={(e, c) => {
                    handleRoomUpdate(row.id, { isActive: c });
                  }}
                />
              );
            },
          },
        ]
      : [
          {
            field: "active",
            headerName: "Active",
            sortable: false,
            disableColumnMenu: true,
            width: 100,
            renderCell: ({ row }: any) => {
              return row.isActive ? <Check /> : <Close />;
            },
          },
        ]),
    {
      field: "kioskMode",
      headerName: "Kiosk",
      sortable: false,
      disableColumnMenu: true,
      width: 100,
      renderCell: ({ row }: any) => {
        return (
          <Switch
            checked={!!row.kioskMode}
            onChange={(e, c) => {
              handleRoomUpdate(row.id, { kioskMode: c });
            }}
          />
        );
      },
    },
  ];

  const handleAddRoom = () => {
    if (hotel) createRoomsDialog.open({ data: hotel });
  };

  const handleEditRoom = (id: any) => {
    router.push(`/rooms/edit/${id}`);
  };

  const handleDeleteRoom = (id: any) => {
    deleteRoom(id);
  };

  const handleExportRooms = async () => {
    try {
      const res: any = await exportRooms({ hotel }).unwrap();
      downloadBlob(res, "rooms.csv", 'text/csv; name="rooms.csv"');
    } catch (error) {
      console.error('Export rooms error:', error);
    }
  };

  const handleRoomUpdate = async (id: any, room: any) => {
    try {
      await updateRoom({
        id,
        room,
      }).unwrap();
      toast.success("Room updated");
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  const handleDownloadQRCode = async (row: any) => {
    try {
      const url = `https://app.infiora.hr/${row.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `room-${row.number}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  return (
    <>
      {(isLoading || updateLoading || deleteLoading || exportLoading) && (
        <Loader center />
      )}
      <DataTable
        title="Rooms"
        data={data}
        columns={columns}
        params={searchParams}
        onAdd={handleAddRoom}
        onEdit={handleEditRoom}
        onDelete={handleDeleteRoom}
        onExport={handleExportRooms}
      />
      {createRoomsDialog.isOpen && createRoomsDialog.content?.data && (
        <CreateRoomsDialog
          hotel={createRoomsDialog.content?.data}
          onClose={createRoomsDialog.close}
        />
      )}
    </>
  );
};

export default RoomsTable;
