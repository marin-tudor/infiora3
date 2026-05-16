import React from "react";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";

import type { ILink, IRoom } from "@/types";
import WifiDialog from "./WifiDialog";
import useDialog from "@/hooks/useDialog";
import TextDialog from "./TextDialog";
import BlogDrawer from "./BlogDrawer";
import { isIOS, isDesktop } from "react-device-detect";
import { useRoom } from "@/contexts/RoomContext";

const getIconFallback = (link: ILink) => {
  if (link.type === "order") return "O";
  if (link.title?.trim()) return link.title.trim().charAt(0).toUpperCase();
  return "?";
};

const LinksList = ({
  room,
  links,
  onShowOnMap,
}: {
  room: IRoom;
  links: ILink[];
  onShowOnMap?: (markerId: string) => void;
}) => {
  const { language, wifiDialog, textDialog, blogDialog } = useRoom();

  const variant = room.button?.variant || "contained";

  // Shared styles for buttons
  const buttonStyles = {
    ".MuiBox-root": {
      backgroundColor: "transparent !important",
    },
    "& .MuiButton-startIcon": {
      position: "absolute",
      left: "15px",
      marginRight: 0,
    },
    "& .MuiButton-endIcon": {
      position: "absolute",
      right: "15px",
      marginLeft: 0,
    },
    height: "55px",
    borderRadius: room.button?.borderRadius || "30px",
    color: room.button?.color || "white",
    backgroundColor:
      variant === "contained"
        ? `${room.button?.backgroundColor} !important`
        : "transparent !important",
    borderColor: room.button?.backgroundColor || "",
    "&:hover": {
      backgroundColor:
        variant === "contained"
          ? `${room.button?.backgroundColor} !important`
          : "transparent !important",
      borderColor: room.button?.backgroundColor || "",
    },
    fontFamily: room.font?.family,
  };

  const handleLinkOpen = async (link: any, item?: any) => {
    const type = item?.type || link.type;
    const value = item?.value || link.value;
    const data = item?.data || link.data;
    if (type === "link" && value) {
      if (!room.kioskMode) {
        window.open(item?.value || link.value, "_blank");
      }
    } else if (type === "order") {
      window.location.href = `/${room.id}/order`;
    } else if (type === "wifi" && data) {
      wifiDialog.open({ data: item || link });
    } else if (type === "text") {
      textDialog.open({ data: value });
    } else if (type === "blog") {
      blogDialog.open({ data: item || link });
    }
  };

  const handleLinkClick = async (link: any, item?: any) => {
    try {
      if (link.type === "group" && !item) {
        return;
      }
      handleLinkOpen(item || link);
      const device = isDesktop ? "Desktop" : isIOS ? "iOS" : "Android";

      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/links/${link.id}`
      );
      const params = new URLSearchParams({
        room: room.id,
        language: language.name,
        device,
        ...(item && { item: item.id }),
      });
      url.search = params.toString();
      await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error: any) {
      console.error('Link tap tracking error:', error);
    }
  };

  return (
    <>
      <Stack gap={2} mx={5}>
        {links.map((link) => (
          <Accordion
            key={link.id}
            disableGutters
            square
            elevation={0}
            expanded={
              ["link", "order", "wifi", "text", "blog"].includes(link.type)
                ? false
                : undefined
            }
            sx={{
              "&:before": { display: "none" },
              backgroundColor: "transparent",
              borderColor: "transparent",
              boxShadow: "none",
              padding: 0,
              margin: 0,
            }}
          >
            <AccordionSummary
              expandIcon={null}
              sx={{
                backgroundColor: "transparent",
                boxShadow: "none",
                padding: 0,
                margin: 0,
                height: "55px",
                minHeight: 0,
                "&.Mui-expanded": {
                  margin: 0,
                  minHeight: 0,
                },
              }}
            >
              <Button
                variant={variant}
                fullWidth
                startIcon={
                  link.imageType !== "none" &&
                  (link.imageType === "icon" ? (
                    <Box
                      style={{
                        height: 40,
                        width: 40,
                        borderRadius: "50%",
                        backgroundColor: "white",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          height: "100%",
                          fontWeight: 700,
                          color: room.button?.backgroundColor || "black",
                        }}
                      >
                        {getIconFallback(link)}
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      style={{
                        height: 40,
                        width: 40,
                        borderRadius: "50%",
                        backgroundColor: "white",
                        background: `url(${link.image || ""})`,
                        objectFit: "contain",
                        backgroundSize: "100% 100%",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  ))
                }
                endIcon={
                  !["link", "order", "wifi", "text", "blog"].includes(link.type) && (
                    <ExpandMore />
                  )
                }
                sx={{ ...buttonStyles, textTransform: "none" }}
                onClick={() => handleLinkClick(link)}
              >
                {link.title}
              </Button>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                backgroundColor: "transparent",
                boxShadow: "none",
                padding: 0,
                margin: 0,
                paddingTop: 2,
              }}
            >
              {link.type === "group" ? (
                <Stack gap={2} mr={2}>
                  {link.items.map((item) => {
                    return (
                      <Accordion
                        key={item.id}
                        disableGutters
                        square
                        elevation={0}
                        expanded={
                          ["link", "order", "wifi", "blog"].includes(item.type)
                            ? false
                            : undefined
                        }
                        sx={{
                          "&:before": { display: "none" },
                          backgroundColor: "transparent",
                          borderColor: "transparent",
                          boxShadow: "none",
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        <AccordionSummary
                          expandIcon={null}
                          sx={{
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            padding: 0,
                            margin: 0,
                            height: "55px",
                            minHeight: 0,
                            "&.Mui-expanded": {
                              margin: 0,
                              minHeight: 0,
                            },
                          }}
                        >
                          <Button
                            variant={variant}
                            fullWidth
                            endIcon={
                              !["link", "order", "wifi", "blog"].includes(item.type) && (
                                <ExpandMore />
                              )
                            }
                            sx={{
                              ...buttonStyles,
                              textTransform: "none",
                            }}
                            onClick={() => handleLinkClick(link, item)}
                          >
                            {item.title}
                          </Button>
                        </AccordionSummary>
                        <AccordionDetails
                          sx={{
                            backgroundColor: "transparent",
                            boxShadow: "none",
                            padding: 0,
                            margin: 0,
                            paddingTop: 2,
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            {item.value || "No additional details"}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  {link.value || "No additional details"}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
      {wifiDialog.isOpen && (
        <WifiDialog
          link={wifiDialog.content?.data}
          onClose={wifiDialog.close}
        />
      )}
      {textDialog.isOpen && (
        <TextDialog
          text={textDialog.content?.data}
          onClose={textDialog.close}
        />
      )}
      {blogDialog.isOpen && blogDialog.content?.data && (
        <BlogDrawer
          link={blogDialog.content?.data}
          initialSectionId={(blogDialog.content?.data as any)?.__targetSectionId}
          onShowOnMap={onShowOnMap}
          onClose={blogDialog.close}
        />
      )}
    </>
  );
};

export default LinksList;
