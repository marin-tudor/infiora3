"use client";
import React, { useState, useRef } from "react";
import {
  Drawer,
  Typography,
  Stack,
  Button,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { appendGuestServiceReceipt } from "@/lib/guestStatusCenter";
import { IRoom } from "@/types";
import { getButtonStyles } from "@/utils/miscUtils";

const ISSUE_TYPES = [
  { key: "ac", label: "Air Conditioning" },
  { key: "plumbing", label: "Plumbing / Water" },
  { key: "electrical", label: "Electrical" },
  { key: "tv", label: "TV / Remote" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "furniture", label: "Furniture / Door" },
  { key: "other", label: "Other" },
];

interface MaintenanceDrawerProps {
  room: IRoom;
  onClose: () => void;
}

const MaintenanceDrawer: React.FC<MaintenanceDrawerProps> = ({ room, onClose }) => {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [guestRoomNumber, setGuestRoomNumber] = useState("");
  const [reservationCode, setReservationCode] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const requiresReservationCode = room.maintenance?.askReservationCode === true;
  const issueTypes = room.maintenance?.options?.length
    ? room.maintenance.options.map(option => ({ key: option.key || option.label || 'other', label: option.label || option.key || 'Other' }))
    : ISSUE_TYPES;

  const handleSubmit = async () => {
    if (!type) { toast.error("Please select an issue type"); return; }
    if (!description.trim()) { toast.error("Please describe the issue"); return; }
    if (requiresReservationCode && !reservationCode.trim()) { toast.error("Please enter your reservation code"); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("room", room.id);
      formData.append("type", type);
      formData.append("typeLabel", issueTypes.find((it) => it.key === type)?.label || type);
      formData.append("description", description.trim());
      if (guestRoomNumber.trim()) formData.append("guestRoomNumber", guestRoomNumber.trim());
      if (reservationCode.trim()) formData.append("reservationCode", reservationCode.trim());
      if (photo) formData.append("photo", photo);

      const res = await fetch(`${baseUrl}/v1/maintenance`, { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit. Please try again.");
      }
      if (data?.id && data?.guestStatusToken) {
        appendGuestServiceReceipt(room.id, {
          id: data.id,
          token: data.guestStatusToken,
          kind: "maintenance",
          label: issueTypes.find((it) => it.key === type)?.label || "Maintenance request",
          createdAt: new Date().toISOString(),
        });
      }
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer anchor="bottom" open onClose={onClose} PaperProps={{ sx: { borderRadius: "16px 16px 0 0", maxHeight: "85vh" } }}>
      <Box p={3}>
        {submitted ? (
          <Stack alignItems="center" spacing={2} py={4}>
            <Typography variant="h5">🔧</Typography>
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              Issue Reported!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Our maintenance team will look into it.
            </Typography>
            <Button variant="contained" sx={getButtonStyles(room)} onClick={onClose} fullWidth>
              Close
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              {room.maintenance?.mainButtonText || "Report Maintenance Issue"}
            </Typography>
            <TextField
              select
              label="Issue Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              fullWidth
              size="small"
            >
              {issueTypes.map((it) => (
                <MenuItem key={it.key} value={it.key}>{it.label}</MenuItem>
              ))}
            </TextField>
            {room.maintenance?.askRoomNumber && (
              <TextField
                label={room.maintenance.roomNumberLabel || "What room are you in?"}
                value={guestRoomNumber}
                onChange={(e) => setGuestRoomNumber(e.target.value)}
                fullWidth
                size="small"
              />
            )}
            {room.maintenance?.askReservationCode && (
              <TextField
                label={room.maintenance.reservationCodeLabel || "Reservation code *"}
                value={reservationCode}
                onChange={(e) => setReservationCode(e.target.value)}
                fullWidth
                size="small"
                required
              />
            )}
            <TextField
              label="Describe the issue"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              size="small"
              required
            />
            <Box>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && !file.type.startsWith("image/")) {
                    toast.error("Please attach an image file");
                    setPhoto(null);
                    return;
                  }
                  if (file && file.size > 5 * 1024 * 1024) {
                    toast.error("Photo must be 5MB or smaller");
                    setPhoto(null);
                    return;
                  }
                  setPhoto(file);
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileRef.current?.click()}
                fullWidth
              >
                {photo ? `📷 ${photo.name}` : "Attach Photo (optional)"}
              </Button>
            </Box>
            <Button
              variant="contained"
              fullWidth
              sx={getButtonStyles(room)}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : "Submit Report"}
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

export default MaintenanceDrawer;
