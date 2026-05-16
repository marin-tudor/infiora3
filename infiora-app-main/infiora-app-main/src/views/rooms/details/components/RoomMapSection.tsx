"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Box, Button, Card, CardContent, Checkbox, Chip, IconButton, ListItemText, Menu, MenuItem, Stack, Typography } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { IconPickerItem } from "react-icons-picker";

import type { ILink, IRoom, MapMarkerIcon } from "@/types";
import { buildRoomMapPoints, getDirectionsUrl, type RoomMapPoint } from "@/utils/mapUtils";

const SafeIconPickerItem =
  typeof IconPickerItem === "function" ? IconPickerItem : null;

const ICON_LABELS: Record<MapMarkerIcon, string> = {
  hotel: "Hotel",
  food: "Food",
  drink: "Drinks",
  beach: "Beach",
  pool: "Pool",
  spa: "Spa",
  taxi: "Taxi",
  parking: "Parking",
  activity: "Activities",
  shopping: "Shopping",
  info: "Info",
  viewpoint: "Viewpoints",
  transport: "Transport",
  coffee: "Coffee",
  custom: "Other",
};

interface RoomMapSectionProps {
  room: IRoom;
  links: ILink[];
  focusMarkerId?: string | null;
  onReadMore: (linkedLinkId: string, linkedSectionId: string) => void;
}

const RoomMapCanvas = dynamic(() => import("./RoomMapCanvas"), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        background:
          "linear-gradient(180deg, rgba(238,242,247,0.95) 0%, rgba(248,250,252,0.98) 100%)",
      }}
    />
  ),
});
const RoomMapSection: React.FC<RoomMapSectionProps> = ({
  room,
  links,
  focusMarkerId,
  onReadMore,
}) => {
  const defaultExpanded = room.hotel.map?.defaultState !== "collapsed";
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const sectionRef = React.useRef<HTMLDivElement | null>(null);
  const mapPoints = React.useMemo(() => buildRoomMapPoints(room, links), [room, links]);
  const [selectedPointId, setSelectedPointId] = React.useState<string | null>(null);
  const [activeCategories, setActiveCategories] = React.useState<MapMarkerIcon[]>([]);
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<HTMLElement | null>(null);
  const variant = room.button?.variant || "contained";

  // Collect unique categories from manual map points only
  const availableCategories = React.useMemo<MapMarkerIcon[]>(() => {
    const seen = new Set<MapMarkerIcon>();
    mapPoints.forEach((p) => {
      if (p.source === "manual" && p.icon) seen.add(p.icon);
    });
    return Array.from(seen);
  }, [mapPoints]);

  // Filtered points: always keep hotel marker, filter manual by active categories
  const visiblePoints = React.useMemo(() => {
    if (activeCategories.length === 0) return mapPoints;
    return mapPoints.filter((p) => p.source === "hotel" || activeCategories.includes(p.icon as MapMarkerIcon));
  }, [mapPoints, activeCategories]);

  const toggleCategory = React.useCallback((cat: MapMarkerIcon) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSelectedPointId(null);
  }, []);

  React.useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  React.useEffect(() => {
    setSelectedPointId(null);
  }, [room]);

  React.useEffect(() => {
    if (!focusMarkerId) return;
    setIsExpanded(true);
    setSelectedPointId(focusMarkerId);
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [focusMarkerId]);

  const selectedPoint = selectedPointId
    ? mapPoints.find((point) => point.markerId === selectedPointId) || null
    : null;
  const closeSelectedPoint = React.useCallback(() => {
    setSelectedPointId(null);
  }, []);
  const selectedPointDescription = React.useMemo(() => {
    if (!selectedPoint?.description) return "";
    if (selectedPoint.source === "hotel") return "";

    const normalizedDescription = selectedPoint.description.trim().toLowerCase();
    const normalizedAddress = selectedPoint.address?.trim().toLowerCase();

    if (normalizedAddress && normalizedDescription === normalizedAddress) {
      return "";
    }

    return selectedPoint.description;
  }, [selectedPoint]);

  if (!room.hotel.map?.enabled || mapPoints.filter((point) => point.source === "manual").length === 0) {
    return null;
  }

  if (!isExpanded) {
    return (
      <Stack mx={5}>
        <Button
          variant={variant}
          fullWidth
          startIcon={
            <Box
              style={{
                height: 40,
                width: 40,
                borderRadius: "50%",
                backgroundColor: "white",
              }}
            >
              {SafeIconPickerItem ? (
                <SafeIconPickerItem value="FaMapMarkedAlt" size={40} />
              ) : (
                <Typography variant="caption">Map</Typography>
              )}
            </Box>
          }
          sx={{
            ".MuiBox-root": {
              backgroundColor: "transparent !important",
            },
            "& .MuiButton-startIcon": {
              position: "absolute",
              left: "15px",
              marginRight: 0,
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
            textTransform: "none",
          }}
          onClick={() => setIsExpanded(true)}
        >
          Map
        </Button>
      </Stack>
    );
  }

  return (
    <Stack ref={sectionRef} gap={2} mx={{ xs: 2, sm: 3, md: 5 }} mt={{ xs: 2, md: 3 }}>
      <Card
        sx={{
          borderRadius: { xs: 3, md: 4 },
          overflow: "hidden",
          border: "1px solid rgba(15, 23, 42, 0.08)",
          boxShadow: {
            xs: "0 10px 28px rgba(15, 23, 42, 0.08)",
            md: "0 18px 45px rgba(15, 23, 42, 0.08)",
          },
          background:
            "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(255,255,255,1) 30%)",
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack gap={2}>
            <Stack gap={1}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, fontSize: { xs: "1.45rem", md: "1.7rem" } }}
              >
                Explore Nearby
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Discover nearby places highlighted for this stay.
              </Typography>
            </Stack>

            {availableCategories.length > 1 && (
              <Stack direction="row" alignItems="center" gap={1}>
                <Button
                  size="small"
                  variant={activeCategories.length > 0 ? "contained" : "outlined"}
                  color="primary"
                  endIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", px: 1.5 }}
                >
                  {activeCategories.length === 0
                    ? "All categories"
                    : activeCategories.length === 1
                    ? ICON_LABELS[activeCategories[0]]
                    : `${activeCategories.length} selected`}
                </Button>
                {activeCategories.length > 0 && (
                  <Chip
                    label="Clear"
                    size="small"
                    variant="outlined"
                    onClick={() => { setActiveCategories([]); setSelectedPointId(null); }}
                    sx={{ borderRadius: 2, fontSize: "0.75rem" }}
                  />
                )}
                <Menu
                  anchorEl={filterAnchorEl}
                  open={Boolean(filterAnchorEl)}
                  onClose={() => setFilterAnchorEl(null)}
                  PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
                >
                  <MenuItem
                    dense
                    onClick={() => { setActiveCategories([]); setSelectedPointId(null); }}
                  >
                    <Checkbox
                      checked={activeCategories.length === 0}
                      indeterminate={false}
                      size="small"
                      sx={{ p: 0.5 }}
                    />
                    <ListItemText primary="All" primaryTypographyProps={{ variant: "body2", fontWeight: activeCategories.length === 0 ? 700 : 400 }} />
                  </MenuItem>
                  {availableCategories.map((cat) => (
                    <MenuItem key={cat} dense onClick={() => toggleCategory(cat)}>
                      <Checkbox
                        checked={activeCategories.includes(cat)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                      <ListItemText primary={ICON_LABELS[cat]} primaryTypographyProps={{ variant: "body2", fontWeight: activeCategories.includes(cat) ? 700 : 400 }} />
                    </MenuItem>
                  ))}
                </Menu>
              </Stack>
            )}

            <Box
              sx={{
                position: "relative",
                height: { xs: 280, sm: 320, md: 360 },
                borderRadius: { xs: 3, md: 4 },
                overflow: "hidden",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background:
                  "linear-gradient(180deg, rgba(238,242,247,0.95) 0%, rgba(248,250,252,0.98) 100%)",
              }}
            >
              <RoomMapCanvas
                points={visiblePoints}
                selectedPointId={selectedPointId}
                onSelectPoint={setSelectedPointId}
              />

              {selectedPoint && (
                <Card
                  sx={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 12,
                    zIndex: 500,
                    borderRadius: 3,
                    boxShadow: "0 16px 32px rgba(15,23,42,0.18)",
                  }}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack gap={1}>
                      {selectedPoint.image && (
                        <Box
                          sx={{
                            position: "relative",
                            width: "100%",
                            height: 144,
                            borderRadius: 2,
                            overflow: "hidden",
                            backgroundColor: "rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <Box
                            component="img"
                            src={selectedPoint.image}
                            alt={selectedPoint.title}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </Box>
                      )}

                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box minWidth={0} flex={1}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {selectedPoint.title}
                          </Typography>
                          {selectedPointDescription && (
                            <Typography variant="body2" color="text.secondary">
                              {selectedPointDescription}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          aria-label="Close point details"
                          onClick={closeSelectedPoint}
                        >
                          x
                        </IconButton>
                      </Stack>

                      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                        {selectedPoint.source === "manual" &&
                          selectedPoint.linkedLinkId &&
                          selectedPoint.linkedSectionId && (
                            <Button
                              variant="contained"
                              onClick={() =>
                                onReadMore(
                                  selectedPoint.linkedLinkId!,
                                  selectedPoint.linkedSectionId!
                                )
                              }
                            >
                              Read more
                            </Button>
                          )}

                        <Button
                          variant="outlined"
                          onClick={() =>
                            window.open(
                              getDirectionsUrl(selectedPoint.lat, selectedPoint.lng),
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          Directions
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default RoomMapSection;
