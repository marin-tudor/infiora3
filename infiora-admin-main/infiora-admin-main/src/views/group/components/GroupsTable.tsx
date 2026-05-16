import {
  useDuplicateGroupMutation,
  useGetGroupsQuery,
  useUpdateGroupMutation,
} from "@/redux/api/groupApi";
import DataTable from "@/components/ui/DataTable";
import { Button, Switch } from "@mui/material";
import { toast } from "react-toastify";
import { useSearchQuery } from "@/components/hooks/useSearchQuery";
import Loader from "@/components/ui/Loader";
import { Check, Close } from "@mui/icons-material";
import { useAppSelector } from "@/redux/store";
import useDialog from "@/components/hooks/useDialog";
import { IGroup, IHotel } from "@/types";
import HotelListDialog from "@/views/hotel/components/HotelListDialog";

const GroupsTable = ({ hotel }: { hotel: string }) => {
  const authUser = useAppSelector((state) => state.userState.user);
  const searchParams: any = useSearchQuery([
    "page",
    "limit",
    "search",
    "sortBy",
  ]);
  const hotelsDialog = useDialog<IGroup>();

  const { data, isLoading } = useGetGroupsQuery({
    sortBy: "createdAt:desc",
    ...searchParams,
    hotel,
  });
  const [updateGroup, { isLoading: updateLoading }] = useUpdateGroupMutation();
  const [duplicateGroup, { isLoading: isDuplicating }] =
    useDuplicateGroupMutation();

  const columns = [
    {
      field: "title",
      headerName: "Title",
      width: 150,
      sortable: false,
      disableColumnMenu: true,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 150,
      sortable: false,
      disableColumnMenu: true,
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
                    handleGroupUpdate(row.id, { isActive: c });
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
      field: "Duplicate",
      headerName: "Duplicate",
      sortable: false,
      disableColumnMenu: true,
      width: 100,
      renderCell: ({ row }: any) => {
        return (
          <Button
            onClick={() => {
              handleDuplicateGroupToHotel(row);
            }}
          >
            Duplicate
          </Button>
        );
      },
    },
  ];

  const handleDuplicateGroup = async (hotel: string) => {
    try {
      hotelsDialog.close();
      if (hotelsDialog.content?.data?.id)
        await duplicateGroup({
          id: hotelsDialog.content?.data?.id,
          hotel,
        }).unwrap();
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  const handleDuplicateGroupToHotel = async (g: IGroup) => {
    hotelsDialog.open({ data: g });
  };

  const handleGroupUpdate = async (id: any, group: any) => {
    try {
      await updateGroup({
        id,
        group,
      }).unwrap();
      toast.success("Group updated");
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  return (
    <>
      {(isLoading || updateLoading || isDuplicating) && <Loader center />}
      <DataTable
        title="Groups"
        data={data}
        columns={columns}
        params={searchParams}
      />
      {hotelsDialog.isOpen && (
        <HotelListDialog
          open={hotelsDialog.isOpen}
          handleSelect={(hotel: IHotel) => {
            handleDuplicateGroup(hotel.id);
          }}
        />
      )}
    </>
  );
};

export default GroupsTable;
