"use client";
import React, { useEffect, useState } from "react";
import { IRoom } from "@/types";
import { Close } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";

interface NewsletterDialogProps {
  room: IRoom;
  onClose: () => void;
}

const NewsletterDialog: React.FC<NewsletterDialogProps> = ({
  room,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/subscribers`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: room.hotel.user,
          room: room.id,
          email,
        }),
      });

      if (!response.ok) throw new Error("Failed to subscribe");

      setSuccess(true);
      setEmail("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open fullWidth maxWidth="sm">
      <form onSubmit={handleSubscribe}>
        <DialogContent
          sx={{
            background: room.newsletter?.color || "black",
            position: "relative",
            pt: 6,
          }}
        >
          {/* Close Button */}
          <IconButton
            size="small"
            sx={{ position: "absolute", top: 8, right: 8 }}
            onClick={() => {
              setEmail("");
              setSuccess(false);
              onClose();
            }}
          >
            <Close sx={{ color: "white" }} />
          </IconButton>

          <Stack alignItems="center" spacing={2} textAlign="center">
            <Typography
              variant="body1"
              sx={{ whiteSpace: "pre-line", color: "white" }}
            >
              {success
                ? room.newsletter?.successMessage ||
                  "Thank you for subscribing!"
                : room.newsletter?.message ||
                  "Please Subscribe to our newsletter."}
            </Typography>

            {!success && (
              <TextField
                variant="outlined"
                size="small"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>

        {!success && (
          <DialogActions
            sx={{
              background: room.newsletter?.color || "black",
              justifyContent: "center",
              pb: 2,
            }}
          >
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                background: "white",
                color: room.newsletter?.color || "black",
                "&:hover": { backgroundColor: "white" },
              }}
              size="small"
            >
              {loading
                ? "Subscribing..."
                : room.newsletter?.buttonText || "Subscribe"}
            </Button>
          </DialogActions>
        )}
      </form>
    </Dialog>
  );
};

export default NewsletterDialog;
