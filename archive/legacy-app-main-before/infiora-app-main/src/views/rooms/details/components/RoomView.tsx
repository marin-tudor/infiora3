"use client";
import React from "react";
import { ILink, IRoom } from "@/types";
import {
  Typography,
  Stack,
  Box,
  Button,
  styled,
  CssBaseline,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  filterNotNullOrEmptyFields,
  generateGradient,
  getButtonStyles,
  isNullOrEmpty,
} from "@/utils/miscUtils";
import { SocialIcon } from "react-social-icons";
import "@fontsource/montserrat";
import Link from "next/link";
import Image from "next/image";
import LanguageButton from "@/components/LanguageButton";
import { useRoom } from "@/contexts/RoomContext";
import { isIOS, isDesktop } from "react-device-detect";
import { IconPickerItem } from "react-icons-picker";
import { reorderLinks } from "@/utils/arrayUtils";
import PageTracker from "./PageTracker";
import LinksList from "./links/LinksList";
import PopupDialog from "./PopupDialog";
import NewsletterDialog from "./NewsletterDialog";
import FeedbackDrawer from "./FeedbackDrawer";

interface RoomViewProps {
  room: IRoom;
  links: ILink[];
}

const ProfileCover = styled(Box)(() => ({
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  width: "100%",
  height: "230px",
  marginBottom: 30,
}));

const ProfileImage = styled(Box)(() => ({
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  width: "130px",
  height: "130px",
  border: "5px solid white",
  borderRadius: "50%",
  position: "relative",
}));

const RoomView: React.FC<RoomViewProps> = ({ room, links }) => {
  const {
    language,
    setLanguage,
    activityId,
    isDialogOpen,
    popupDialog,
    newsletterDialog,
    feedbackDialog,
  } = useRoom();

  const gradient =
    room.background?.type === "gradient"
      ? generateGradient(
          room.background?.color || "#ffffff",
          room.background?.direction
        )
      : room.background?.color || "#ffffff";

  // Calculate bottom color for page background
  const getBottomColor = () => {
    const baseColor = room.background?.color || "#ffffff";
    if (room.background?.type !== "gradient") return baseColor;

    const shift = { r: 20, g: 154, b: 0 };
    const r = parseInt(baseColor.substring(1, 3), 16);
    const g = parseInt(baseColor.substring(3, 5), 16);
    const b = parseInt(baseColor.substring(5, 7), 16);
    const r2 = Math.min(255, r + shift.r);
    const g2 = Math.min(255, g + shift.g);
    const b2 = Math.min(255, b + shift.b);
    const secondColor = `#${r2.toString(16).padStart(2, "0")}${g2
      .toString(16)
      .padStart(2, "0")}${b2.toString(16).padStart(2, "0")}`;

    // down: top=baseColor, bottom=secondColor
    // up: top=secondColor, bottom=baseColor
    return room.background?.direction === "down" ? secondColor : baseColor;
  };

  const theme = createTheme({
    palette: {
      mode: "light",
      background: {
        default: getBottomColor(),
      },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Safe dialog open wrappers that check if any dialog is already open
  const safeOpenNewsletter = () => {
    if (!isDialogOpen) {
      newsletterDialog.open();
    }
  };

  const handleClick = async ({ link, logo }: any) => {
    try {
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
      const requestBody = filterNotNullOrEmptyFields({
        room: room.id,
        language: language.name,
        device,
        ...(link ? { link: link.replace("mailto:", "") } : {}),
        logo,
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

  // Handle popup close -> show newsletter
  const handlePopupClose = () => {
    popupDialog.close();
    if (room.newsletter?.isActive && room.newsletter?.type === "popup") {
      setTimeout(() => safeOpenNewsletter(), 2000);
    }
  };

  // Extracted Component for Newsletter Button
  const CustomButton: React.FC<{
    onClick: () => void;
    buttonText: string;
    imageType: string;
    image: string | null;
  }> = ({ onClick, buttonText, imageType, image }) => {
    const iconStyle = {
      height: 40,
      width: 40,
      borderRadius: "50%",
      backgroundColor: room.button?.backgroundColor,
    };
    return (
      <Stack mx={5}>
        <Button
          variant={room.button?.variant || "contained"}
          fullWidth
          sx={getButtonStyles(room)}
          onClick={onClick}
          startIcon={
            imageType !== "none" && (
              <>
                {imageType === "icon" ? (
                  <Box style={iconStyle}>
                    <IconPickerItem value={image} size={40} />
                  </Box>
                ) : (
                  <Box
                    style={{
                      ...iconStyle,
                      background: `url(${image || ""})`,
                      objectFit: "contain",
                      backgroundSize: "100% 100%",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                )}
              </>
            )
          }
        >
          {buttonText || ""}
        </Button>
      </Stack>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        position="relative"
        sx={{
          background: gradient,
          backgroundColor: "background.default",
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <Box position="fixed" right={10} top={10}>
          <LanguageButton language={language} setLanguage={setLanguage} />
        </Box>
        <Stack
          justifyContent="flex-start"
          gap={2}
          width={{ xs: "100%", sm: "80%", md: "50%", lg: "35%" }}
          sx={{
            margin: "auto",
            paddingBottom: 10,
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Hotel Details */}
          <Stack gap={2}>
            <Stack textAlign="center" alignItems="center" gap={1}>
              {isNullOrEmpty(room.hotel.cover) ? (
                <ProfileImage
                  style={{
                    backgroundImage: `url(${room.hotel.image})`,
                    margin: "auto",
                    backgroundColor: "white",
                  }}
                />
              ) : (
                <ProfileCover
                  style={{ backgroundImage: `url(${room.hotel.cover})` }}
                >
                  <ProfileImage
                    style={{
                      backgroundImage: `url(${room.hotel.image})`,
                      margin: "auto",
                      bottom: -140,
                      backgroundColor: "white",
                    }}
                  />
                </ProfileCover>
              )}
              <Typography
                variant="h6"
                fontFamily={room.font?.family}
                color={room.font?.color}
                fontWeight="bold"
              >
                {room.hotel.name}
              </Typography>
              {room.hotel.description && (
                <Typography
                  variant="body1"
                  fontFamily={room.font?.family}
                  color={room.font?.color}
                  fontSize="10px"
                  whiteSpace="pre-line"
                >
                  {room.hotel.description}
                </Typography>
              )}
              <Typography
                variant="body1"
                color={room.font?.color}
                fontFamily={room.font?.family}
                fontSize="10px"
                whiteSpace="pre-line"
              >
                {room.description || ""}
              </Typography>
            </Stack>

            {/* Social Links */}
            <Stack
              direction="row"
              gap={1}
              justifyContent="center"
              sx={room.kioskMode ? { pointerEvents: 'none', opacity: 0.6 } : {}}
            >
              {room.hotel?.socialLinks?.map((link) => (
                <SocialIcon
                  key={link}
                  url={link}
                  target="_blank"
                  bgColor="transparent"
                  fgColor={room.font?.color || "black"}
                  style={{ width: "40px", height: "40px" }}
                  onClick={() => handleClick({ link })}
                />
              ))}
            </Stack>

            {/* Links List */}
            <LinksList
              room={room}
              links={reorderLinks(room, links).filter((l) => l.isActive)}
            />

            {/* Newsletter Button */}
            {room.newsletter?.isActive &&
              room.newsletter?.type === "button" &&
              !isNullOrEmpty(room.newsletter?.mainButtonText) && (
                <CustomButton
                  onClick={safeOpenNewsletter}
                  buttonText={room.newsletter?.mainButtonText || ""}
                  imageType={room.newsletter.imageType || "none"}
                  image={room.newsletter.image || ""}
                />
              )}
          </Stack>
        </Stack>
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          width="100%"
          paddingX={2}
        >
          <Typography fontFamily={room.font?.family} color={room.font?.color}>
            Powered by
          </Typography>
          <Link
            href="https://infiora.hr"
            target="_blank"
            onClick={() => handleClick({ logo: true })}
          >
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={0}
              height={0}
              sizes="100vh"
              style={{
                width: "80px",
                height: "auto",
              }}
            />
          </Link>
        </Stack>

        {/* Dialogs */}
        {popupDialog.isOpen && (
          <PopupDialog room={room} onClose={handlePopupClose} />
        )}
        {newsletterDialog.isOpen && (
          <NewsletterDialog room={room} onClose={newsletterDialog.close} />
        )}
        {feedbackDialog.isOpen && (
          <FeedbackDrawer room={room} onClose={feedbackDialog.close} />
        )}
      </Box>
      <PageTracker
        roomId={room.id}
        activityId={activityId}
        language={language}
        feedback={room.feedback}
      />
    </ThemeProvider>
  );
};

export default RoomView;
