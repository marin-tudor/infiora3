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
import HousekeepingDrawer from "./HousekeepingDrawer";
import MaintenanceDrawer from "./MaintenanceDrawer";
import LinksList from "./links/LinksList";
import PageTracker from "./PageTracker";
import PopupDialog from "./PopupDialog";
import NewsletterDialog from "./NewsletterDialog";
import FeedbackDrawer from "./FeedbackDrawer";
import SurveyDrawer from "./SurveyDrawer";
import RoomMapSection from "./RoomMapSection";
import DownloadGuideButton from "./DownloadGuideButton";

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

const SafeIconPickerItem =
  typeof IconPickerItem === "function" ? IconPickerItem : null;

const RoomView: React.FC<RoomViewProps> = ({ room, links }) => {
  const {
    language,
    setLanguage,
    activityId,
    isDialogOpen,
    blogDialog,
    popupDialog,
    newsletterDialog,
    feedbackDialog,
    surveyDialog,
  } = useRoom();
  const [focusedMapMarkerId, setFocusedMapMarkerId] = React.useState<string | null>(null);
  const [housekeepingOpen, setHousekeepingOpen] = React.useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = React.useState(false);
  const handleShowOnMap = React.useCallback((markerId: string) => {
    setFocusedMapMarkerId(null);
    window.requestAnimationFrame(() => {
      setFocusedMapMarkerId(markerId);
    });
  }, []);

  const hasBackgroundImage = Boolean(room.background?.image);
  const backgroundFit = (room.background as any)?.backgroundFit;
  const backgroundPosition = (room.background as any)?.backgroundPosition || "center center";
  const tileSize = (room.background as any)?.tileSize || 120;

  const gradient =
    room.background?.type === "gradient"
      ? generateGradient(
          room.background?.color || "#ffffff",
          room.background?.direction
        )
      : room.background?.color || "#ffffff";

  const theme = React.useMemo(() => {
    const baseColor = room.background?.color || "#ffffff";
    return createTheme({
      palette: {
        mode: "light",
        background: { default: baseColor },
      },
    });
  }, [room.background?.color]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const activeLinks = React.useMemo(
    () =>
      reorderLinks(room, links)
        .filter((l) => l.isActive)
        .filter((l) => room.hotel.features?.ordersEnabled !== false || l.type !== "order")
        .map((l) =>
          l.type === "group"
            ? {
                ...l,
                items: (l.items || []).filter(
                  (item) => room.hotel.features?.ordersEnabled !== false || item.type !== "order"
                ),
              }
            : l
        ),
    [room, links]
  );

  const safeOpenNewsletter = () => {
    if (!isDialogOpen) {
      newsletterDialog.open();
    }
  };

  const handleClick = async ({ link }: { link: string }) => {
    try {
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
      const requestBody = filterNotNullOrEmptyFields({
        room: room.id,
        language: language?.name,
        device,
        link: link.replace("mailto:", ""),
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

  const trackServiceButtonClick = async (button: "housekeeping" | "maintenance", buttonTitle: string) => {
    try {
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";
      await fetch(`${baseUrl}/v1/rooms/${room.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          filterNotNullOrEmptyFields({
          action: "tap",
          button,
          buttonTitle,
          language: language?.name,
          device,
          })
        ),
      });
    } catch (error) {
      console.error("Error tracking service button:", error);
    }
  };

  const handlePopupClose = () => {
    popupDialog.close();
    if (room.newsletter?.isActive && room.newsletter?.type === "popup") {
      setTimeout(() => safeOpenNewsletter(), 2000);
    }
  };

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
                    <Typography
                      variant="caption"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {(buttonText || "?").trim().charAt(0).toUpperCase()}
                    </Typography>
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
          ...(hasBackgroundImage
            ? {
                backgroundImage: `url(${room.background!.image})`,
                backgroundSize:
                  backgroundFit === "contain"
                    ? "contain"
                    : backgroundFit === "repeat"
                    ? `${tileSize}px auto`
                    : backgroundFit === "natural"
                    ? "auto"
                    : "cover",
                backgroundRepeat: backgroundFit === "repeat" ? "repeat" : "no-repeat",
                backgroundPosition,
              }
            : {
                background: gradient,
                backgroundColor: "background.default",
              }),
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        {hasBackgroundImage && (room.background?.imageOpacity ?? 1) < 1 && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: `rgba(0,0,0,${1 - (room.background?.imageOpacity ?? 1)})`,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}
        <Box position="fixed" right={10} top={10} zIndex={2}>
          <LanguageButton language={language} setLanguage={setLanguage} />
        </Box>

        <Stack
          gap={2}
          width={{ xs: "100%", sm: "80%", md: "50%", lg: "35%" }}
          sx={{
            position: "relative",
            zIndex: 1,
            margin: "auto",
            paddingBottom: 10,
          }}
        >
          <Stack gap={2}>
            <Stack textAlign="center" alignItems="center" gap={1}>
              {isNullOrEmpty(room.hotel.cover) ? (
                <ProfileImage
                  style={{
                    ...(room.hotel.image ? { backgroundImage: `url(${room.hotel.image})` } : {}),
                    margin: "auto",
                    backgroundColor: "white",
                  }}
                />
              ) : (
                <ProfileCover
                  style={room.hotel.cover ? { backgroundImage: `url(${room.hotel.cover})` } : undefined}
                >
                  <ProfileImage
                    style={{
                      ...(room.hotel.image ? { backgroundImage: `url(${room.hotel.image})` } : {}),
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

            <Stack direction="row" gap={1} justifyContent="center">
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

            <LinksList room={room} links={activeLinks} onShowOnMap={handleShowOnMap} />

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
            {room.survey?.isActive &&
              room.survey?.type === "button" &&
              !isNullOrEmpty(room.survey?.mainButtonText) && (
                <CustomButton
                  onClick={surveyDialog.open}
                  buttonText={room.survey.mainButtonText || ""}
                  imageType={room.survey.imageType || "none"}
                  image={room.survey.image || ""}
                />
              )}

            {room.hotel.features?.housekeepingEnabled !== false && room.housekeeping?.isActive && (
              <Stack mx={5}>
                <Button
                  variant={room.button?.variant || "contained"}
                  fullWidth
                  sx={getButtonStyles(room)}
                  onClick={() => {
                    void trackServiceButtonClick(
                      "housekeeping",
                      room.housekeeping?.mainButtonText || "Housekeeping Request"
                    );
                    setHousekeepingOpen(true);
                  }}
                  startIcon={
                    (room.housekeeping as any)?.icon ? (
                      SafeIconPickerItem ? (
                        <SafeIconPickerItem value={(room.housekeeping as any).icon} size={20} />
                      ) : (
                        <span>{(room.housekeeping as any).icon}</span>
                      )
                    ) : undefined
                  }
                >
                  {room.housekeeping.mainButtonText || "Housekeeping Request"}
                </Button>
              </Stack>
            )}

            {room.hotel.features?.maintenanceEnabled !== false && room.maintenance?.isActive && (
              <Stack mx={5}>
                <Button
                  variant={room.button?.variant || "contained"}
                  fullWidth
                  sx={getButtonStyles(room)}
                  onClick={() => {
                    void trackServiceButtonClick(
                      "maintenance",
                      room.maintenance?.mainButtonText || "Report Maintenance Issue"
                    );
                    setMaintenanceOpen(true);
                  }}
                  startIcon={
                    (room.maintenance as any)?.icon ? (
                      SafeIconPickerItem ? (
                        <SafeIconPickerItem value={(room.maintenance as any).icon} size={20} />
                      ) : (
                        <span>{(room.maintenance as any).icon}</span>
                      )
                    ) : undefined
                  }
                >
                  {room.maintenance.mainButtonText || "Report Maintenance Issue"}
                </Button>
              </Stack>
            )}

            <RoomMapSection
              room={room}
              links={activeLinks}
              focusMarkerId={focusedMapMarkerId}
              onReadMore={(linkedLinkId, linkedSectionId) => {
                const targetLink = activeLinks.find((link) => link.id === linkedLinkId);
                if (!targetLink) return;

                blogDialog.open({
                  data: {
                    ...targetLink,
                    __targetSectionId: linkedSectionId,
                  } as any,
                });
              }}
            />
            {!room.kioskMode && room.hotel.settings?.offlineGuideEnabled !== false && (
              <DownloadGuideButton
                room={room}
                links={activeLinks}
                language={language}
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
          <Link href="https://infiora.hr" target="_blank">
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

        {popupDialog.isOpen && (
          <PopupDialog room={room} onClose={handlePopupClose} />
        )}
        {newsletterDialog.isOpen && (
          <NewsletterDialog room={room} onClose={newsletterDialog.close} />
        )}
        {feedbackDialog.isOpen && (
          <FeedbackDrawer room={room} onClose={feedbackDialog.close} />
        )}
        {surveyDialog.isOpen && (
          <SurveyDrawer room={room} onClose={surveyDialog.close} />
        )}

        {housekeepingOpen && (
          <HousekeepingDrawer room={room} onClose={() => setHousekeepingOpen(false)} />
        )}
        {maintenanceOpen && (
          <MaintenanceDrawer room={room} onClose={() => setMaintenanceOpen(false)} />
        )}

        <Box component="footer" sx={{ textAlign: "center", py: 2, mt: 2, opacity: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" color="inherit">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" color="inherit">
              Terms of Use
            </Link>
            {" · Powered by Infiora"}
          </Typography>
        </Box>
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
