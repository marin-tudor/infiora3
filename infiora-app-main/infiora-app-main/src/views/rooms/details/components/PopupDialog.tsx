import { useRoom } from "@/contexts/RoomContext";
import { IRoom } from "@/types";
import { filterNotNullOrEmptyFields, isNullOrEmpty } from "@/utils/miscUtils";
import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { isIOS, isDesktop } from "react-device-detect";
import { IconPickerItem } from "react-icons-picker";

interface PopupDialogProps {
  room: IRoom;
  onClose: () => void;
}

const SafeIconPickerItem =
  typeof IconPickerItem === "function" ? IconPickerItem : null;

const PopupDialog: React.FC<PopupDialogProps> = ({ room, onClose }) => {
  const { language } = useRoom();

  const handleClick = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
      const requestBody = filterNotNullOrEmptyFields({
        room: room.id,
        language: language.name,
        device,
        popup: true,
      });
      const url = `${baseUrl}/v1/hotels/${room.hotel.id}`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      console.error("Error sending request:", error);
    }
  };

  // Get size configuration
  const getSizeStyles = () => {
    const size = room.popup?.size || "small";
    switch (size) {
      case "small":
        return { height: "auto" };
      case "medium":
        return { height: "50%" };
      case "fullscreen":
        return { height: "95%" };
      default:
        return { height: "auto" };
    }
  };

  // Get position configuration
  const getPositionStyles = () => {
    const position = room.popup?.position || "bottom";
    switch (position) {
      case "top":
        return { top: 0, bottom: "auto", justifyContent: "flex-start" };
      case "center":
        return {
          top: "50%",
          transform: "translateY(-50%)",
          bottom: "auto",
          justifyContent: "center",
        };
      case "bottom":
        return { bottom: 0, top: "auto", justifyContent: "flex-end" };
      default:
        return { bottom: 0, top: "auto", justifyContent: "flex-end" };
    }
  };

  const renderPopupContent = () => {
    if (isNullOrEmpty(room.popup?.message)) return null;

    return (
      <Stack gap={2} alignItems="center">
        {room.popup?.imageType === "icon" && room.popup?.image && SafeIconPickerItem && (
          <SafeIconPickerItem
            value={room.popup.image}
            size={80}
            color={room.popup?.fontColor || "white"}
          />
        )}
        <Typography
          variant="h6"
          sx={{
            whiteSpace: "pre-line",
            color: room.popup?.fontColor || "white",
          }}
        >
          {room.popup?.message}
        </Typography>
        {renderPopupButton()}
      </Stack>
    );
  };

  const renderPopupButton = () => {
    if (isNullOrEmpty(room.popup?.buttonText)) return null;

    return (
      <Button
        variant="contained"
        sx={{
          background: "white",
          "&:hover": {
            backgroundColor: "white",
          },
          color: room.popup?.backgroundColor || "black",
        }}
        href={room.popup?.link || "#"}
        onClick={handleClick}
      >
        {room.popup?.buttonText}
      </Button>
    );
  };

  const sizeStyles = getSizeStyles();
  const positionStyles = getPositionStyles();

  return (
    <>
      {!isNullOrEmpty(room.popup?.message) && (
        <Box
          sx={{
            position: "fixed",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: positionStyles.justifyContent,
            pointerEvents: "none",
            margin: "auto",
            ...positionStyles,
          }}
        >
          <Stack
            component={Card}
            alignItems="center"
            justifyContent="flex-end"
            width={{ xs: "90%", sm: "80%", md: "50%", lg: "30%" }}
            gap={2}
            sx={{
              background: room.popup?.image
                ? `url(${room.popup.image}) center/cover no-repeat`
                : null,
              backgroundColor: room.popup?.backgroundColor,
              height: sizeStyles.height,
              mx: "auto",
              my: 3,
              p: 2,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              position: "relative",
              textAlign: "center",
              pointerEvents: "auto",
              overflow: "auto",
            }}
          >
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={onClose}
            >
              <Close sx={{ color: room.popup?.fontColor || "white" }} />
            </IconButton>
            {renderPopupContent()}
          </Stack>
        </Box>
      )}
    </>
  );
};

export default PopupDialog;
