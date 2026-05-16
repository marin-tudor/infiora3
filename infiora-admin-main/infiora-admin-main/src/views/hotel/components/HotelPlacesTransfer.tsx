import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, Upload } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { toast } from 'react-toastify';
import { useUpdateHotelMutation } from '@/redux/api/hotelApi';
import type {
  IHotel,
  IHotelMapSettings,
  IMapCustomPreset,
  IMapPoint,
} from '@/types';

const DEFAULT_LAT = 43.5081;
const DEFAULT_LNG = 16.4402;

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const normalizePoint = (point: Partial<IMapPoint>, index: number): IMapPoint => ({
  id: point.id || createId('marker'),
  title: point.title || point.address || `Place ${index + 1}`,
  description: point.description || '',
  image: point.image || '',
  address: point.address || '',
  lat: Number(point.lat) || DEFAULT_LAT,
  lng: Number(point.lng) || DEFAULT_LNG,
  color: point.color || '#0ea5e9',
  icon: point.icon || 'info',
  customPresetId: point.customPresetId || '',
  customIconClass: point.customIconClass || '',
  customIconImage: point.customIconImage || '',
  isActive: point.isActive !== false,
  sortOrder: point.sortOrder ?? index,
});

const normalizePreset = (
  preset: Partial<IMapCustomPreset>
): IMapCustomPreset => ({
  id: preset.id || createId('custom-icon'),
  name: preset.name || 'Custom icon',
  icon: preset.icon || 'TiStar',
  color: preset.color || '#0ea5e9',
  text: preset.text || '',
});

const geocodeLocation = async (query: string, context?: string) => {
  const search = context?.trim() ? `${query}, ${context}` : query;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
      search
    )}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Address lookup failed');

  const result = await response.json();

  return Array.isArray(result) && result.length > 0 ? result[0] : null;
};

type ParsedImport = {
  points: IMapPoint[];
  presets: IMapCustomPreset[];
  needsGeocode: boolean;
};

const HotelPlacesTransfer = ({ hotel }: { hotel: IHotel }) => {
  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [updateHotel] = useUpdateHotelMutation();

  const points = useMemo(
    () => (hotel.mapPoints || []).map((point, index) => normalizePoint(point, index)),
    [hotel.mapPoints]
  );

  const presets = useMemo(
    () => (hotel.map?.customPresets || []).map((preset) => normalizePreset(preset)),
    [hotel.map?.customPresets]
  );

  const mapSettings: IHotelMapSettings = {
    enabled: hotel.map?.enabled ?? false,
    defaultState: hotel.map?.defaultState || 'collapsed',
    centerAddress: hotel.map?.centerAddress || '',
    centerLat: hotel.map?.centerLat,
    centerLng: hotel.map?.centerLng,
    zoom: hotel.map?.zoom ?? 14,
    showHotelMarker: hotel.map?.showHotelMarker ?? true,
    customPresets: presets,
  };

  const parseImport = (): ParsedImport => {
    const trimmed = bulkText.trim();

    if (!trimmed) return { points: [], presets: [], needsGeocode: true };

    try {
      const parsed = JSON.parse(trimmed);
      const rawPoints = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.mapPoints)
        ? parsed.mapPoints
        : [];
      const rawPresets = Array.isArray(parsed?.map?.customPresets)
        ? parsed.map.customPresets
        : Array.isArray(parsed?.customPresets)
        ? parsed.customPresets
        : [];

      return {
        points: rawPoints.map((point: Partial<IMapPoint>, index: number) =>
          normalizePoint(
            {
              ...point,
              id: createId('marker'),
            },
            points.length + index
          )
        ),
        presets: rawPresets.map((preset: Partial<IMapCustomPreset>) =>
          normalizePreset(preset)
        ),
        needsGeocode: false,
      };
    } catch (error) {
      return {
        points: trimmed
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((name, index) =>
            normalizePoint(
              {
                id: createId('marker'),
                title: name,
                address: name,
                lat: Number(mapSettings.centerLat) || DEFAULT_LAT,
                lng: Number(mapSettings.centerLng) || DEFAULT_LNG,
              },
              points.length + index
            )
          ),
        presets: [],
        needsGeocode: true,
      };
    }
  };

  const handleExport = async () => {
    const payload = JSON.stringify(
      {
        sourceHotel: {
          id: hotel.id,
          name: hotel.name || '',
        },
        map: {
          customPresets: presets,
        },
        mapPoints: points,
      },
      null,
      2
    );

    try {
      await navigator.clipboard.writeText(payload);
      toast.success('Places copied. Open another hotel and paste them there.');
    } catch (error) {
      setBulkText(payload);
      toast.info('Clipboard failed, so the export JSON is in the text box.');
    }
  };

  const handleImport = async () => {
    const parsed = parseImport();

    if (parsed.points.length === 0) {
      toast.info('Paste exported JSON or one location per line first.');

      return;
    }

    setIsImporting(true);

    try {
      const nextPoints: IMapPoint[] = [];
      let failed = 0;

      for (const [index, point] of parsed.points.entries()) {
        if (!parsed.needsGeocode) {
          nextPoints.push(normalizePoint(point, points.length + nextPoints.length));
          continue;
        }

        try {
          const match = await geocodeLocation(
            point.address || point.title,
            mapSettings.centerAddress
          );

          if (!match) {
            failed += 1;
            nextPoints.push(
              normalizePoint(
                {
                  ...point,
                  lat: (Number(mapSettings.centerLat) || DEFAULT_LAT) + index * 0.00015,
                  lng: (Number(mapSettings.centerLng) || DEFAULT_LNG) + index * 0.00015,
                },
                points.length + nextPoints.length
              )
            );
            continue;
          }

          nextPoints.push(
            normalizePoint(
              {
                ...point,
                address: match.display_name || point.address || point.title,
                lat: Number(match.lat),
                lng: Number(match.lon),
              },
              points.length + nextPoints.length
            )
          );
        } catch (error) {
          failed += 1;
        }
      }

      await updateHotel({
        id: hotel.id,
        hotel: {
          map: {
            ...mapSettings,
            customPresets: [...presets, ...parsed.presets],
          },
          mapPoints: [...points, ...nextPoints].map((point, index) =>
            normalizePoint(point, index)
          ),
        } as any,
      }).unwrap();

      setBulkText('');
      toast.success(`Imported ${nextPoints.length} places.`);

      if (failed > 0) {
        toast.info(`${failed} locations were not found; they were added near the hotel center.`);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Places import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack gap={2}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
          >
            <Box>
              <Typography variant="h6">Super Admin Places Transfer</Typography>
              <Typography variant="body2" color="text.secondary">
                Export saved hotel places, then paste them into another hotel. You can also paste one place per line.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleExport}
              disabled={points.length === 0}
            >
              Export Places
            </Button>
          </Stack>

          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={`${points.length} saved places`} />
            <Chip label={`${presets.length} custom icon presets`} />
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={5}
            label="Paste exported JSON or one location per line"
            placeholder={'Konoba Mate\nBacvice Beach\nRiva Split'}
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
          />

          <Alert severity="info">
            JSON import keeps titles, descriptions, images, coordinates, icons and colors.
            Plain text import searches each line and adds new map points to this hotel.
          </Alert>

          <Divider />

          <Stack direction="row" justifyContent="flex-end">
            <LoadingButton
              variant="contained"
              startIcon={<Upload />}
              loading={isImporting}
              onClick={handleImport}
            >
              Import To This Hotel
            </LoadingButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default HotelPlacesTransfer;
