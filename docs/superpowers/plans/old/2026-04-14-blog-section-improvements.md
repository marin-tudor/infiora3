# Blog Section Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiple links per blog section, a smart URL input (auto mailto:/tel: prefix), raise image limit to 12, and add a fullscreen image lightbox in the guest view.

**Architecture:** Types updated in both projects first, then the new SmartUrlInput component, then the admin editor, then the guest drawer. Backward compat maintained via a migration in `withSectionClientIds` and a fallback render in the guest drawer.

**Tech Stack:** Next.js 14, TypeScript, MUI v5, React Hook Form, RTK Query

---

## File Map

| File | Action | Change |
|------|--------|--------|
| `infiora-dash-main/src/types/index.ts` | Modify | Add `links?` to `ISection` |
| `infiora-app-main/src/types/index.ts` | Modify | Add `links?` to `ISection` |
| `infiora-dash-main/src/components/common/SmartUrlInput.tsx` | Create | Smart URL input with web/email/phone toggle |
| `infiora-dash-main/src/views/links/components/BlogSectionsEditor.tsx` | Modify | maxImages 5→12, replace url/urlButtonText fields with links list |
| `infiora-dash-main/src/views/links/components/LinkForm.tsx` | Modify | Migrate old url/urlButtonText → links in `withSectionClientIds` |
| `infiora-app-main/src/views/rooms/details/components/links/BlogDrawer.tsx` | Modify | Render multiple links + fullscreen lightbox |

---

## Task 1: Add `links` field to `ISection` types in both projects

**Files:**
- Modify: `infiora-dash-main/src/types/index.ts` (around line 245)
- Modify: `infiora-app-main/src/types/index.ts` (around line 257)

- [ ] **Step 1: Update ISection in infiora-dash-main**

Open `infiora-dash-main/src/types/index.ts`. Find `ISection` (around line 245). Add the `links` field after `urlButtonText`:

```ts
export interface ISection {
  id: string
  title: string
  description?: string
  url?: string
  urlButtonText?: string
  links?: { url: string; urlButtonText: string }[]
  phone?: string
  address?: string
  images?: string[]
  video?: string
  items?: any
  mapEnabled?: boolean
  mapTitle?: string
  mapDescription?: string
  mapImage?: string
  mapLat?: number
  mapLng?: number
  mapColor?: string
  mapIcon?: MapMarkerIcon
  linkedMapPointId?: string
}
```

- [ ] **Step 2: Update ISection in infiora-app-main**

Open `infiora-app-main/src/types/index.ts`. Find `ISection` (around line 257). Add the `links` field after `urlButtonText`:

```ts
export interface ISection {
  id: string;
  title: string;
  description?: string;
  url?: string;
  urlButtonText?: string;
  links?: { url: string; urlButtonText: string }[];
  phone?: string;
  address?: string;
  images?: string[];
  video?: string;
  items?: any;
  mapEnabled?: boolean;
  mapTitle?: string;
  mapDescription?: string;
  mapImage?: string;
  mapLat?: number;
  mapLng?: number;
  mapColor?: string;
  mapIcon?: MapMarkerIcon;
  linkedMapPointId?: string;
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\Tudor\infiora"
git -C infiora-dash-main/infiora-dash-main add src/types/index.ts
git -C infiora-dash-main/infiora-dash-main commit -m "feat: add links[] field to ISection type"
git -C infiora-app-main/infiora-app-main add src/types/index.ts
git -C infiora-app-main/infiora-app-main commit -m "feat: add links[] field to ISection type"
```

---

## Task 2: Create SmartUrlInput component

**Files:**
- Create: `infiora-dash-main/src/components/common/SmartUrlInput.tsx`

- [ ] **Step 1: Create the component**

Create `infiora-dash-main/src/components/common/SmartUrlInput.tsx` with this full content:

```tsx
import React, { useEffect, useState } from 'react'

import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material'
import { Email, Phone } from '@mui/icons-material'

type UrlMode = 'web' | 'email' | 'phone'

const PREFIX: Record<UrlMode, string> = {
  web: '',
  email: 'mailto:',
  phone: 'tel:'
}

const PLACEHOLDER: Record<UrlMode, string> = {
  web: 'https://www.example.com',
  email: 'email@hotel.com',
  phone: '+385...'
}

function detectMode(value: string): UrlMode {
  if (value.startsWith('mailto:')) return 'email'
  if (value.startsWith('tel:')) return 'phone'
  return 'web'
}

function stripPrefix(value: string, mode: UrlMode): string {
  const prefix = PREFIX[mode]
  return prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value
}

interface SmartUrlInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
}

const SmartUrlInput: React.FC<SmartUrlInputProps> = ({ value, onChange, label = 'URL', disabled }) => {
  const [mode, setMode] = useState<UrlMode>(() => detectMode(value || ''))
  const [rawValue, setRawValue] = useState(() => stripPrefix(value || '', detectMode(value || '')))

  // Sync inbound value changes (e.g. form reset)
  useEffect(() => {
    const detectedMode = detectMode(value || '')
    setMode(detectedMode)
    setRawValue(stripPrefix(value || '', detectedMode))
  }, [value])

  const handleRawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setRawValue(raw)
    onChange(raw ? PREFIX[mode] + raw : '')
  }

  const switchMode = (next: UrlMode) => {
    const newMode = mode === next ? 'web' : next
    setMode(newMode)
    onChange(rawValue ? PREFIX[newMode] + rawValue : '')
  }

  return (
    <TextField
      fullWidth
      size='small'
      label={label}
      value={rawValue}
      onChange={handleRawChange}
      disabled={disabled}
      placeholder={PLACEHOLDER[mode]}
      InputProps={{
        endAdornment: (
          <InputAdornment position='end'>
            <Tooltip title='Email (mailto:)'>
              <IconButton
                size='small'
                onClick={() => switchMode('email')}
                color={mode === 'email' ? 'primary' : 'default'}
                disabled={disabled}
              >
                <Email fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Phone (tel:)'>
              <IconButton
                size='small'
                onClick={() => switchMode('phone')}
                color={mode === 'phone' ? 'primary' : 'default'}
                disabled={disabled}
              >
                <Phone fontSize='small' />
              </IconButton>
            </Tooltip>
          </InputAdornment>
        )
      }}
    />
  )
}

export default SmartUrlInput
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" add src/components/common/SmartUrlInput.tsx
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" commit -m "feat: add SmartUrlInput component with web/email/phone mode toggle"
```

---

## Task 3: Update BlogSectionsEditor — image limit + links list

**Files:**
- Modify: `infiora-dash-main/src/views/links/components/BlogSectionsEditor.tsx`

- [ ] **Step 1: Replace the full file content**

Replace the entire content of `infiora-dash-main/src/views/links/components/BlogSectionsEditor.tsx` with:

```tsx
import { Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material'
import { Add, ArrowDownward, ArrowUpward, Delete } from '@mui/icons-material'

import type { IMapPoint, ISection } from '@/types'
import InputField from '@/components/common/InputField'
import MultipleImagePicker from '@/components/widgets/MultipleImagePicker'
import RichTextEditor from '@/components/widgets/RichTextEditor'
import SmartUrlInput from '@/components/common/SmartUrlInput'

const createClientId = () => `client-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

interface BlogSectionsEditorProps {
  sections: ISection[]
  mapPoints: IMapPoint[]
  control: any
  errors: any
  dictionary: any
  onAdd: () => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: 'up' | 'down') => void
  onImagesChange: (index: number, images: string[]) => void
  setValue: any
}

const BlogSectionsEditor: React.FC<BlogSectionsEditorProps> = ({
  sections,
  mapPoints,
  control,
  errors,
  dictionary,
  onAdd,
  onRemove,
  onMove,
  onImagesChange,
  setValue
}) => {
  const addItem = (sectionIndex: number) => {
    const updatedSections = [...sections]
    const currentItems = updatedSections[sectionIndex].items || []

    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      items: [
        ...currentItems,
        {
          clientId: createClientId(),
          title: '',
          price: '',
          description: ''
        }
      ]
    }

    setValue('sections', updatedSections)
  }

  const removeItem = (sectionIndex: number, itemIndex: number) => {
    const updatedSections = [...sections]
    const items = [...(updatedSections[sectionIndex].items || [])]

    items.splice(itemIndex, 1)
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], items }
    setValue('sections', updatedSections)
  }

  const addLink = (sectionIndex: number) => {
    const updatedSections = [...sections]
    const currentLinks = updatedSections[sectionIndex].links || []

    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      links: [...currentLinks, { url: '', urlButtonText: '' }]
    }

    setValue('sections', updatedSections)
  }

  const removeLink = (sectionIndex: number, linkIndex: number) => {
    const updatedSections = [...sections]
    const links = [...(updatedSections[sectionIndex].links || [])]

    links.splice(linkIndex, 1)
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], links }
    setValue('sections', updatedSections)
  }

  const updateLink = (sectionIndex: number, linkIndex: number, field: 'url' | 'urlButtonText', value: string) => {
    const updatedSections = [...sections]
    const links = [...(updatedSections[sectionIndex].links || [])]

    links[linkIndex] = { ...links[linkIndex], [field]: value }
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], links }
    setValue('sections', updatedSections)
  }

  const mapPointOptions = mapPoints
    .map(point => {
      const pointId = point.id || (point as any)._id
      if (!pointId) return null
      return {
        label: point.title || point.address || pointId || 'Untitled point',
        value: pointId
      }
    })
    .filter(Boolean) as { label: string; value: string }[]

  return (
    <Stack gap={2}>
      <Stack direction='row' alignItems='center'>
        <Typography variant='h6'>{dictionary.sections}</Typography>
        <IconButton onClick={onAdd}>
          <Add />
        </IconButton>
      </Stack>

      {sections.map((section: ISection & { clientId?: string }, index) => (
        <Card key={section.clientId || `section-${index}`}>
          <Stack component={CardContent} gap={2}>
            <Stack direction='row' alignItems='center'>
              <Typography>Section {index + 1}</Typography>
              <IconButton disabled={index === 0} onClick={() => onMove(index, 'up')}>
                <ArrowUpward />
              </IconButton>
              <IconButton disabled={index === sections.length - 1} onClick={() => onMove(index, 'down')}>
                <ArrowDownward />
              </IconButton>
              <IconButton color='error' onClick={() => onRemove(index)}>
                <Delete />
              </IconButton>
            </Stack>

            <InputField name={`sections[${index}].title`} label={dictionary.title} control={control} errors={errors} />

            <RichTextEditor
              label='Description'
              value={section.description}
              onChange={value => setValue(`sections.${index}.description`, value)}
            />

            {/* Links */}
            <Stack gap={1}>
              <Stack direction='row' alignItems='center'>
                <Typography variant='subtitle2'>Links</Typography>
                <IconButton size='small' onClick={() => addLink(index)}>
                  <Add fontSize='small' />
                </IconButton>
              </Stack>

              {(section.links || []).map((link, linkIndex) => (
                <Card key={linkIndex} variant='outlined'>
                  <Stack component={CardContent} gap={1} sx={{ py: '8px !important' }}>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                        Link {linkIndex + 1}
                      </Typography>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => removeLink(index, linkIndex)}
                        sx={{ ml: 'auto' }}
                      >
                        <Delete fontSize='small' />
                      </IconButton>
                    </Stack>

                    <SmartUrlInput
                      label='URL'
                      value={link.url}
                      onChange={val => updateLink(index, linkIndex, 'url', val)}
                    />

                    <TextField
                      fullWidth
                      size='small'
                      label='Button text'
                      value={link.urlButtonText}
                      onChange={e => updateLink(index, linkIndex, 'urlButtonText', e.target.value)}
                      placeholder='e.g. See full menu'
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>

            <InputField name={`sections[${index}].phone`} label={dictionary.phone} control={control} errors={errors} />

            <InputField
              name={`sections[${index}].address`}
              label={dictionary.address}
              control={control}
              errors={errors}
            />

            <InputField name={`sections[${index}].video`} label={dictionary.video} control={control} errors={errors} />

            <MultipleImagePicker
              id={`sections[${index}].images`}
              label='Images'
              images={section.images || []}
              setImages={images => onImagesChange(index, images)}
              rectangle
              maxImages={12}
            />

            <Stack gap={2} sx={{ borderTop: theme => `1px solid ${theme.palette.divider}`, pt: 2 }}>
              <Typography variant='h6'>Map Settings</Typography>
              <InputField
                name={`sections[${index}].mapEnabled`}
                label='Show this section on map'
                type='switch'
                control={control}
                errors={errors}
              />

              {section.mapEnabled && (
                <>
                  {mapPointOptions.length === 0 && (
                    <Typography variant='body2' color='warning.main'>
                      Nema još spremljenih map pointova za ovaj hotel. Prvo spremi pointe u Hotel Settings pa se vrati ovdje.
                    </Typography>
                  )}
                  <InputField
                    name={`sections[${index}].linkedMapPointId`}
                    label='Linked map point'
                    type='select'
                    options={mapPointOptions}
                    control={control}
                    errors={errors}
                  />
                  <Typography variant='body2' color='text.secondary'>
                    Create and edit map points in Hotel Settings first, then link this section to one of those points.
                  </Typography>
                </>
              )}
            </Stack>

            <Stack direction='row' alignItems='center'>
              <Typography variant='h6'>{dictionary.items}</Typography>
              <IconButton onClick={() => addItem(index)}>
                <Add />
              </IconButton>
            </Stack>

            {section.items?.map((item: any, i: number) => (
              <Card key={item?.clientId || `section-${section.clientId || index}-item-${i}`}>
                <Stack component={CardContent} gap={2}>
                  <Stack direction='row' alignItems='center'>
                    <Typography>Item {i + 1}</Typography>
                    <IconButton color='error' onClick={() => removeItem(index, i)}>
                      <Delete />
                    </IconButton>
                  </Stack>

                  <InputField
                    name={`sections[${index}].items[${i}].title`}
                    label={dictionary.title}
                    control={control}
                    errors={errors}
                  />
                  <InputField
                    name={`sections[${index}].items[${i}].description`}
                    label={dictionary.description}
                    control={control}
                    errors={errors}
                  />
                  <InputField
                    name={`sections[${index}].items[${i}].price`}
                    label={dictionary.price}
                    control={control}
                    errors={errors}
                  />
                </Stack>
              </Card>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

export default BlogSectionsEditor
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" add src/views/links/components/BlogSectionsEditor.tsx
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" commit -m "feat: replace single url/urlButtonText with multiple links list; raise image limit to 12"
```

---

## Task 4: Update LinkForm — backward compat migration + preserve links on submit

**Files:**
- Modify: `infiora-dash-main/src/views/links/components/LinkForm.tsx` (lines 82–90 and 168–183)

- [ ] **Step 1: Update `withSectionClientIds` to migrate old url/urlButtonText**

Find the `withSectionClientIds` function (around line 82). Replace it with:

```ts
const withSectionClientIds = (sections: any[] = []) =>
  sections.map(section => {
    // Migrate legacy single url/urlButtonText → links array
    let links = section.links
    if ((!links || links.length === 0) && section.url) {
      links = [{ url: section.url, urlButtonText: section.urlButtonText ?? '' }]
    }

    return {
      ...section,
      links: links || [],
      clientId: section.clientId || createClientId(),
      items: (section.items || []).map((item: any) => ({
        ...item,
        clientId: item.clientId || createClientId()
      }))
    }
  })
```

- [ ] **Step 2: Preserve `links` in processedSections inside `onSubmit`**

Find the `processedSections` mapping inside `onSubmit` (around line 168). The current code strips `clientId` and some map fields. Ensure `links` is kept by making sure it is **not** explicitly removed. The current spread `...section` already keeps it. What you need to do is add `url: undefined` and `urlButtonText: undefined` to avoid re-sending the legacy fields alongside the new `links` array:

```ts
let processedSections = data.sections?.map((section: any) => ({
  ...section,
  url: undefined,
  urlButtonText: undefined,
  mapEnabled: Boolean(section.linkedMapPointId),
  mapTitle: undefined,
  mapDescription: undefined,
  mapImage: undefined,
  mapLat: undefined,
  mapLng: undefined,
  mapColor: undefined,
  mapIcon: undefined,
  clientId: undefined,
  items: (section.items || []).map((item: any) => ({
    ...item,
    clientId: undefined
  }))
}))
```

- [ ] **Step 3: Commit**

```bash
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" add src/views/links/components/LinkForm.tsx
git -C "C:\Users\Tudor\infiora\infiora-dash-main\infiora-dash-main" commit -m "feat: migrate legacy url/urlButtonText to links[] on load; strip legacy fields on save"
```

---

## Task 5: Update BlogDrawer — multiple links + fullscreen lightbox

**Files:**
- Modify: `infiora-app-main/src/views/rooms/details/components/links/BlogDrawer.tsx`

- [ ] **Step 1: Replace the full file content**

Replace the entire content of `infiora-app-main/src/views/rooms/details/components/links/BlogDrawer.tsx` with:

```tsx
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

const removeAsterisks = (str?: string) => str?.replace(/\*/g, "") ?? "";

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

  const openLightbox = (sectionId: string, index: number) => {
    setLightbox({ sectionId, index });
  };

  const closeLightbox = () => setLightbox(null);

  const lightboxNext = (imagesLength: number) => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev ? { ...prev, index: (prev.index + 1) % imagesLength } : null
    );
  };

  const lightboxPrev = (imagesLength: number) => {
    if (!lightbox) return;
    setLightbox((prev) =>
      prev
        ? { ...prev, index: (prev.index - 1 + imagesLength) % imagesLength }
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

  // Find lightbox section and its images
  const lightboxSection = lightbox
    ? link.sections?.find((s) => s.id === lightbox.sectionId)
    : null;
  const lightboxImages = lightboxSection?.images || [];

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
                              bottom: 8,
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
        maxWidth={false}
        PaperProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.95)",
            boxShadow: "none",
            width: "100vw",
            height: "100vh",
            maxWidth: "100vw",
            maxHeight: "100vh",
            m: 0,
            borderRadius: 0,
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
                  onClick={() => lightboxPrev(lightboxImages.length)}
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
                  onClick={() => lightboxNext(lightboxImages.length)}
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
```

- [ ] **Step 2: Commit**

```bash
git -C "C:\Users\Tudor\infiora\infiora-app-main\infiora-app-main" add src/views/rooms/details/components/links/BlogDrawer.tsx
git -C "C:\Users\Tudor\infiora\infiora-app-main\infiora-app-main" commit -m "feat: render multiple section links; add fullscreen image lightbox"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Image limit 5→12 ✓ (Task 3, `maxImages={12}`)
  - Multiple links per section ✓ (Tasks 1, 3, 4)
  - Smart URL input (web/email/phone) ✓ (Task 2, integrated in Task 3)
  - Fullscreen image lightbox ✓ (Task 5)
  - Backward compat for old url/urlButtonText ✓ (Task 4 migration + Task 5 fallback render)
- [x] **No placeholders** — all steps contain complete code
- [x] **Type consistency** — `links?: { url: string; urlButtonText: string }[]` used consistently across Tasks 1, 3, 4, 5
- [x] **`OpenInFull` icon** imported in Task 5
- [x] **`lightboxSection` / `lightboxImages`** defined before use
