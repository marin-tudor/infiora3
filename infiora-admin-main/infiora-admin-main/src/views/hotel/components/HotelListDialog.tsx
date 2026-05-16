"use client";
import React from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Stack,
  Chip,
} from "@mui/material";
import { useGetHotelsQuery } from "@/redux/api/hotelApi";
import type { IHotel } from "@/types";
import Loader from "@/components/ui/Loader";

interface HotelListDialogProps {
  open: boolean;
  handleSelect: (hotel: IHotel) => void;
}

const HotelListDialog: React.FC<HotelListDialogProps> = ({
  open,
  handleSelect,
}) => {
  const { data, isLoading } = useGetHotelsQuery({ limit: 100 });

  return (
    <Dialog open={true} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5">Select Hotel</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          {isLoading ? (
            <Loader />
          ) : (
            <List
              sx={{
                maxHeight: 200,
                overflowY: "auto",
                "& .MuiListItemButton-root": { mb: 1 },
              }}
            >
              {data?.results.length ? (
                data.results.map((s: IHotel) => (
                  <ListItemButton
                    key={s.id}
                    disabled={!s.isActive}
                    onClick={() => handleSelect(s)}
                    sx={{
                      borderRadius: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <ListItemText primary={<Typography>{s.name}</Typography>} />
                    <Chip
                      label={s.isActive ? "Active" : "In Active"}
                      size="small"
                      color={s.isActive ? "success" : "default"}
                    />
                  </ListItemButton>
                ))
              ) : (
                <Typography align="center" sx={{ mt: 2 }}>
                  No hotels found
                </Typography>
              )}
            </List>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default HotelListDialog;
