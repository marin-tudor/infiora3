"use client";
import React, { useState } from "react";
import {
  Drawer,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
  Grid,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { IconPickerItem } from "react-icons-picker";
import { appendGuestServiceReceipt } from "@/lib/guestStatusCenter";
import { IRoom } from "@/types";
import { getButtonStyles } from "@/utils/miscUtils";

const REQUEST_TYPES = [
  { key: "cleaning", label: "Room Cleaning", icon: "🧹" },
  { key: "towels", label: "Fresh Towels", icon: "🛁" },
  { key: "pillows", label: "Extra Pillows", icon: "🛏" },
  { key: "amenities", label: "Amenities", icon: "🧴" },
  { key: "do_not_disturb", label: "Do Not Disturb", icon: "🔕" },
  { key: "extra_bed", label: "Extra Bed", icon: "🛋" },
  { key: "other", label: "Other", icon: "💬" },
];

interface HousekeepingDrawerProps {
  room: IRoom;
  onClose: () => void;
}

const SafeIconPickerItem =
  typeof IconPickerItem === "function" ? IconPickerItem : null;

const HousekeepingDrawer: React.FC<HousekeepingDrawerProps> = ({ room, onClose }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [guestRoomNumber, setGuestRoomNumber] = useState("");
  const [reservationCode, setReservationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const requiresReservationCode = room.housekeeping?.askReservationCode === true;
  const requestTypes = room.housekeeping?.options?.length
    ? room.housekeeping.options.map(option => ({
        key: option.key || option.label || 'other',
        label: option.label || option.key || 'Other',
        icon: option.icon || "",
      }))
    : REQUEST_TYPES;

  const handleSubmit = async () => {
    if (!selectedType) {
      toast.error("Please select a request type");
      return;
    }
    if (requiresReservationCode && !reservationCode.trim()) {
      toast.error("Please enter your reservation code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/v1/housekeeping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: room.id,
          type: selectedType,
          typeLabel: requestTypes.find((rt) => rt.key === selectedType)?.label,
          guestRoomNumber: guestRoomNumber.trim() || undefined,
          reservationCode: reservationCode.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit request. Please try again.");
      }
      if (data?.id && data?.guestStatusToken) {
        appendGuestServiceReceipt(room.id, {
          id: data.id,
          token: data.guestStatusToken,
          kind: "housekeeping",
          label: requestTypes.find((rt) => rt.key === selectedType)?.label || "Housekeeping request",
          createdAt: new Date().toISOString(),
        });
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer anchor="bottom" open onClose={onClose} PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "85vh" } }}>
      <Box p={3}>
        {submitted ? (
          <Stack alignItems="center" spacing={2} py={4}>
            <Typography variant="h5">✅</Typography>
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              Request Received!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Our team will take care of it shortly.
            </Typography>
            <Button variant="contained" sx={getButtonStyles(room)} onClick={onClose} fullWidth>
              Close
            </Button>
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              {room.housekeeping?.mainButtonText || "Housekeeping Request"}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              What do you need?
            </Typography>
            <Grid container spacing={1.5}>
              {requestTypes.map((rt) => (
                <Grid item xs={6} key={rt.key}>
                  <Button
                    fullWidth
                    variant={selectedType === rt.key ? "contained" : "outlined"}
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      flexDirection: "column",
                      gap: 0.5,
                      ...(selectedType === rt.key ? getButtonStyles(room) : {}),
                    }}
                    onClick={() => setSelectedType(rt.key)}
                  >
                    {rt.icon && (
                      <span style={{ fontSize: 22 }}>
                        {rt.icon.includes(" ") || rt.icon.length <= 4 || !SafeIconPickerItem ? (
                          rt.icon
                        ) : (
                          <SafeIconPickerItem value={rt.icon} size={22} />
                        )}
                      </span>
                    )}
                    <Typography variant="caption">{rt.label}</Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
            {room.housekeeping?.askRoomNumber && (
              <TextField
                label={room.housekeeping.roomNumberLabel || "What room are you in?"}
                value={guestRoomNumber}
                onChange={(e) => setGuestRoomNumber(e.target.value)}
                fullWidth
                size="small"
              />
            )}
            {room.housekeeping?.askReservationCode && (
              <TextField
                label={room.housekeeping.reservationCodeLabel || "Reservation code *"}
                value={reservationCode}
                onChange={(e) => setReservationCode(e.target.value)}
                fullWidth
                size="small"
                required
              />
            )}
            <TextField
              label="Note (optional)"
              multiline
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              fullWidth
              sx={getButtonStyles(room)}
              onClick={handleSubmit}
              disabled={loading || !selectedType}
            >
              {loading ? <CircularProgress size={20} /> : "Send Request"}
            </Button>
            <Button variant="text" onClick={onClose} fullWidth>
              Cancel
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default HousekeepingDrawer;
