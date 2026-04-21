// React imports
import React, { useState } from "react";

// MUI imports
import {
  Drawer,
  IconButton,
  Typography,
  Stack,
  Box,
  Link,
  Button,
} from "@mui/material";

// Custom imports
import {
  Close,
  Phone,
  Language,
  LocationOn,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";

import ReactPlayer from "react-player";

import type { ILink } from "@/types";
import Image from "next/image";

interface BlogDrawerProps {
  link: ILink;
  onClose: () => void;
}

const removeAsterisks = (str?: string) => str?.replace(/\*/g, "") ?? "";

const BlogDrawer: React.FC<BlogDrawerProps> = ({ link, onClose }) => {
  const [imageIndexes, setImageIndexes] = useState<{ [key: string]: number }>(
    {}
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const nextImage = (sectionId: string, imagesLength: number) => {
    setImageIndexes((prev) => ({
      ...prev,
      [sectionId]: ((prev[sectionId] || 0) + 1) % imagesLength,
    }));
  };

  const prevImage = (sectionId: string, imagesLength: number) => {
    setImageIndexes((prev) => ({
      ...prev,
      [sectionId]: ((prev[sectionId] || 0) - 1 + imagesLength) % imagesLength,
    }));
  };

  const nextSection = () => {
    if (link.sections && currentSectionIndex < link.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const prevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={true}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: "70%", lg: "50%" },
        },
      }}
    >
      <Stack sx={{ p: 2, position: "relative", height: "100%" }}>
        {/* Fixed close button at top right */}
        <IconButton
          onClick={onClose}
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1,
            backgroundColor: "background.paper",
            boxShadow: 1,
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <Close />
        </IconButton>

        <Stack
          sx={{
            height: "100%",
            overflowY: "auto",
            pb: 2,
            px: 1,
          }}
          spacing={2}
        >
          <Typography variant="h5" fontWeight="bold" mb={2}>
            {removeAsterisks(link.title)}
          </Typography>

          {link.sections && link.sections.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Jump to section:
              </Typography>
              <Stack spacing={0.5}>
                {link.sections.map((section, index) => (
                  <Link
                    key={section.id}
                    component="button"
                    variant="body2"
                    onClick={() => scrollToSection(section.id)}
                    sx={{
                      textAlign: "left",
                      textDecoration: "none",
                      color: "primary.main",
                      cursor: "pointer",
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      "&:hover": {
                        backgroundColor: "action.hover",
                        textDecoration: "underline",
                      },
                    }}
                  >
                    {index + 1}. {removeAsterisks(section.title)}
                  </Link>
                ))}
              </Stack>
            </Box>
          )}

          <Stack>
            {link.sections && link.sections.length > 0 ? (
              link.sections.map((section) => {
                return (
                  <Box
                    key={section.id}
                    id={`section-${section.id}`}
                    sx={{ mb: 2 }}
                  >
                    <>
                      {section.video && (
                        <Box sx={{ mb: 2, height: 250 }}>
                          <ReactPlayer
                            src={section.video}
                            config={{
                              youtube: {
                                color: "white",
                              },
                            }}
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        </Box>
                      )}

                      {section.images && section.images.length > 0 && (
                        <Box sx={{ mb: 2, position: "relative" }}>
                          <Image
                            height={0}
                            width={0}
                            sizes="100vh"
                            style={{
                              height: 250,
                              objectFit: "cover",
                              borderRadius: 1,
                              width: "100%",
                            }}
                            src={section.images[imageIndexes[section.id] || 0]}
                            alt={`${section.title} image ${
                              (imageIndexes[section.id] || 0) + 1
                            }`}
                          />

                          {section.images.length > 1 && (
                            <>
                              <IconButton
                                size="small"
                                sx={{
                                  position: "absolute",
                                  left: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  },
                                }}
                                onClick={() =>
                                  prevImage(section.id, section.images!.length)
                                }
                              >
                                <ChevronLeft />
                              </IconButton>

                              <IconButton
                                size="small"
                                sx={{
                                  position: "absolute",
                                  right: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                                  color: "white",
                                  "&:hover": {
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  },
                                }}
                                onClick={() =>
                                  nextImage(section.id, section.images!.length)
                                }
                              >
                                <ChevronRight />
                              </IconButton>

                              <Box
                                sx={{
                                  position: "absolute",
                                  bottom: 8,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                                  borderRadius: 2,
                                  px: 1,
                                  py: 0.5,
                                }}
                              >
                                <Typography variant="caption" color="white">
                                  {(imageIndexes[section.id] || 0) + 1} /{" "}
                                  {section.images.length}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </Box>
                      )}

                      <Typography variant="h6" gutterBottom>
                        {removeAsterisks(section.title)}
                      </Typography>

                      {section.description && (
                        <Box
                          mb={2}
                          sx={{
                            "& p": { margin: 0 },
                            "& em": { fontStyle: "italic" },
                            color: "text.secondary",
                            fontSize: "0.875rem",
                            lineHeight: 1.43,
                          }}
                          dangerouslySetInnerHTML={{
                            __html: removeAsterisks(section.description),
                          }}
                        />
                      )}

                      {section.items && section.items.length > 0 && (
                        <Box mb={2}>
                          <Stack spacing={1}>
                            {section.items.map((item: any, i: number) => (
                              <Stack
                                key={i}
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                sx={{
                                  borderBottom: "1px dashed",
                                  borderColor: "divider",
                                  pb: 0.5,
                                }}
                              >
                                <Stack>
                                  <Typography variant="body2">
                                    {removeAsterisks(item.title)}
                                  </Typography>
                                  {item.description && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {removeAsterisks(item.description)}
                                    </Typography>
                                  )}
                                </Stack>

                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color="text.primary"
                                  sx={{ flexShrink: 0, ml: 2 }}
                                >
                                  {item.price}
                                </Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {section.address && (
                        <Link
                          href={`https://maps.google.com/?q=${encodeURIComponent(
                            section.address
                          )}`}
                          mb={2}
                          target="_blank"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            textDecoration: "none",
                            color: "text.primary",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          <LocationOn sx={{ mr: 0.5, fontSize: 16 }} />
                          <Typography variant="body2">
                            {removeAsterisks(section.address)}
                          </Typography>
                        </Link>
                      )}

                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        {section.url && (
                          <>
                            {section.urlButtonText ? (
                              <Button
                                component={Link}
                                href={section.url}
                                target="_blank"
                                variant="contained"
                                size="small"
                              >
                                {removeAsterisks(section.urlButtonText)}
                              </Button>
                            ) : (
                              <IconButton
                                component={Link}
                                href={section.url}
                                target="_blank"
                                color="primary"
                                size="small"
                              >
                                <Language />
                              </IconButton>
                            )}
                          </>
                        )}

                        {section.phone && (
                          <IconButton
                            component={Link}
                            href={`tel:${section.phone}`}
                            color="secondary"
                            size="small"
                          >
                            <Phone />
                          </IconButton>
                        )}
                      </Stack>
                    </>
                  </Box>
                );
              })
            ) : (
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
              >
                No sections available
              </Typography>
            )}
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export default BlogDrawer;
