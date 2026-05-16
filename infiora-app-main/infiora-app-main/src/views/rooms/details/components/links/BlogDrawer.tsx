// React imports
import React, { useState } from "react";

// MUI imports
import {
  Box,
  Button,
  Dialog,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";

// Icons
import {
  ChevronLeft,
  ChevronRight,
  Close,
  Language,
  LocationOn,
  OpenInFull,
  Phone,
} from "@mui/icons-material";

import ReactPlayer from "react-player";
import Image from "next/image";

import type { ILink } from "@/types";

interface BlogDrawerProps {
  link: ILink;
  initialSectionId?: string;
  onShowOnMap?: (markerId: string) => void;
  onClose: () => void;
}

interface LightboxState {
  sectionId: string;
  index: number;
}

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "U",
  "UL",
]);

const removeAsterisks = (str?: string) => str?.replace(/\*/g, "") ?? "";

const isSafeHref = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("/") ||
  href.startsWith("#");

const sanitizeHtml = (html?: string) => {
  const source = removeAsterisks(html);

  if (!source || typeof window === "undefined") {
    return source;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(source, "text/html");

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const element = node as HTMLElement;

    Array.from(element.childNodes).forEach(sanitizeNode);

    if (!ALLOWED_TAGS.has(element.tagName)) {
      const parent = element.parentNode;

      if (!parent) {
        return;
      }

      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }

      parent.removeChild(element);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();

      if (element.tagName === "A" && ["href", "target", "rel"].includes(name)) {
        return;
      }

      element.removeAttribute(attribute.name);
    });

    if (element.tagName === "A") {
      const href = element.getAttribute("href")?.trim() ?? "";

      if (!href || !isSafeHref(href)) {
        element.removeAttribute("href");
      }

      if (element.getAttribute("target") === "_blank") {
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("target");
        element.removeAttribute("rel");
      }
    }
  };

  Array.from(doc.body.childNodes).forEach(sanitizeNode);

  return doc.body.innerHTML;
};

const BlogDrawer: React.FC<BlogDrawerProps> = ({
  link,
  initialSectionId,
  onShowOnMap,
  onClose,
}) => {
  const [imageIndexes, setImageIndexes] = useState<{ [key: string]: number }>(
    {}
  );
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

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

  const lightboxSection = lightbox
    ? link.sections?.find((s) => s.id === lightbox.sectionId)
    : null;
  const lightboxImages = lightboxSection?.images || [];

  const openLightbox = (sectionId: string, index: number) => {
    setLightbox({ sectionId, index });
  };

  const closeLightbox = () => {
    if (lightbox) {
      setImageIndexes((prev) => ({ ...prev, [lightbox.sectionId]: lightbox.index }));
    }
    setLightbox(null);
  };

  const lightboxNext = () => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev ? { ...prev, index: (prev.index + 1) % lightboxImages.length } : null
    );
  };

  const lightboxPrev = () => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev
        ? { ...prev, index: (prev.index - 1 + lightboxImages.length) % lightboxImages.length }
        : null
    );
  };

  React.useEffect(() => {
    if (!initialSectionId) return;
    const index =
      link.sections?.findIndex(
        (section) => section.id === initialSectionId
      ) ?? -1;
    if (index >= 0) {
      window.setTimeout(() => scrollToSection(initialSectionId), 50);
    }
  }, [initialSectionId, link.sections]);

  return (
    <>
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
          {/* Fixed close button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 1,
              backgroundColor: "background.paper",
              boxShadow: 1,
              "&:hover": { backgroundColor: "action.hover" },
            }}
          >
            <Close />
          </IconButton>

          <Stack
            sx={{ height: "100%", overflowY: "auto", pb: 2, px: 1 }}
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
                  // Resolve links: prefer new links[], fall back to legacy url/urlButtonText
                  const sectionLinks =
                    section.links && section.links.length > 0
                      ? section.links
                      : section.url
                      ? [
                          {
                            url: section.url,
                            urlButtonText: section.urlButtonText,
                          },
                        ]
                      : [];

                  return (
                    <Box
                      key={section.id}
                      id={`section-${section.id}`}
                      sx={{ mb: 2 }}
                    >
                      {section.video && (
                        <Box sx={{ mb: 2, height: 250 }}>
                          <ReactPlayer
                            src={section.video}
                            config={{ youtube: { color: "white" } }}
                            style={{ width: "100%", height: "100%" }}
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
                            src={
                              section.images[imageIndexes[section.id] || 0]
                            }
                            alt={`${section.title} image ${
                              (imageIndexes[section.id] || 0) + 1
                            }`}
                          />

                          {/* Fullscreen expand button */}
                          <IconButton
                            size="small"
                            onClick={() =>
                              openLightbox(
                                section.id,
                                imageIndexes[section.id] || 0
                              )
                            }
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              backgroundColor: "rgba(0, 0, 0, 0.5)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.75)",
                              },
                            }}
                          >
                            <OpenInFull fontSize="small" />
                          </IconButton>

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
                                  prevImage(
                                    section.id,
                                    section.images!.length
                                  )
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
                                  nextImage(
                                    section.id,
                                    section.images!.length
                                  )
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
                            __html: sanitizeHtml(section.description),
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
                          rel="noopener noreferrer"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            textDecoration: "none",
                            color: "text.primary",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          <LocationOn sx={{ mr: 0.5, fontSize: 16 }} />
                          <Typography variant="body2">
                            {removeAsterisks(section.address)}
                          </Typography>
                        </Link>
                      )}

                      {/* Links (new array) or legacy single url */}
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        {sectionLinks.map((linkItem, li) => (
                          <React.Fragment key={li}>
                            {linkItem.urlButtonText ? (
                              <Button
                                component={Link}
                                href={linkItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="contained"
                                size="small"
                              >
                                {removeAsterisks(linkItem.urlButtonText)}
                              </Button>
                            ) : (
                              <IconButton
                                component={Link}
                                href={linkItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                color="primary"
                                size="small"
                              >
                                <Language />
                              </IconButton>
                            )}
                          </React.Fragment>
                        ))}

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

                        {section.linkedMapPointId && onShowOnMap && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              onShowOnMap(section.linkedMapPointId!);
                              onClose();
                            }}
                          >
                            Show me on map
                          </Button>
                        )}
                      </Stack>
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

      {/* Fullscreen lightbox */}
      <Dialog
        open={!!lightbox}
        onClose={closeLightbox}
        fullScreen
        sx={{ zIndex: (theme: any) => theme.zIndex.drawer + 100 }}
        PaperProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.95)",
            boxShadow: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        {lightbox && lightboxImages.length > 0 && (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Close */}
            <IconButton
              onClick={closeLightbox}
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 10,
                color: "white",
                backgroundColor: "rgba(255,255,255,0.15)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.25)" },
              }}
            >
              <Close />
            </IconButton>

            {/* Image */}
            <Box
              sx={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                position: "relative",
              }}
            >
              <img
                src={lightboxImages[lightbox.index]}
                alt={`Image ${lightbox.index + 1}`}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>

            {/* Prev / Next */}
            {lightboxImages.length > 1 && (
              <>
                <IconButton
                  onClick={() => lightboxPrev()}
                  sx={{
                    position: "absolute",
                    left: 16,
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.25)" },
                  }}
                >
                  <ChevronLeft />
                </IconButton>

                <IconButton
                  onClick={() => lightboxNext()}
                  sx={{
                    position: "absolute",
                    right: 16,
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.15)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.25)" },
                  }}
                >
                  <ChevronRight />
                </IconButton>

                {/* Counter */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                  }}
                >
                  <Typography variant="caption" color="white">
                    {lightbox.index + 1} / {lightboxImages.length}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
};

export default BlogDrawer;
