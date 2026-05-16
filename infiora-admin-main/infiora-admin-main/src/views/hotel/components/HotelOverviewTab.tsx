import { Typography, Stack, Avatar, Chip, Divider, Switch, FormControlLabel } from '@mui/material';
import React from 'react';
import { toast } from 'react-toastify';
import { getInitials } from '@/utils/get-initials';
import { Description, Link, Note } from '@mui/icons-material';
import HotelPlacesTransfer from './HotelPlacesTransfer';
import { useUpdateHotelJsonMutation } from '@/redux/api/hotelApi';

const FEATURE_FLAGS = [
  { key: 'ordersEnabled', label: 'Orders' },
  { key: 'housekeepingEnabled', label: 'Housekeeping' },
  { key: 'maintenanceEnabled', label: 'Maintenance' },
  { key: 'staffRbacEnabled', label: 'Staff RBAC' },
  { key: 'smartDispatchingEnabled', label: 'Smart Dispatching' },
  { key: 'bookableServicesEnabled', label: 'Bookable Services' },
];

const HotelOverviewTab = ({ hotel }: any) => {
  const [updateHotel] = useUpdateHotelJsonMutation();

  const updateFeatureFlag = async (flag: string, value: boolean) => {
    try {
      await updateHotel({ id: hotel.id, data: { features: { ...hotel.features, [flag]: value } } }).unwrap();
      toast.success(`${flag} updated`);
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  return (
    <Stack gap={4}>
      <Stack direction="row" gap={1} alignItems="center">
        <Avatar
          src={hotel?.image}
          sx={{
            height: 80,
            width: 80,
          }}
        >
          {getInitials(hotel?.name)}
        </Avatar>
        <Typography variant="h6">{hotel?.name}</Typography>
      </Stack>
      <Stack gap={2}>
        <Stack direction="row" gap={1}>
          <Link />
          <Stack direction="row" gap={1}>
            {hotel?.socialLinks.map((l: string) => (
              <Chip key={l} label={l} />
            ))}
          </Stack>
        </Stack>
        <Stack direction="row" gap={1}>
          <Description />
          <Typography variant="body1">
            {hotel?.description}
          </Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Note />
          <Typography variant="body1">{hotel?.note}</Typography>
        </Stack>
      </Stack>

      <Divider />

      <Stack gap={1}>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
          Feature Flags
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {FEATURE_FLAGS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={hotel?.features?.[key] === true}
                  onChange={(e) => updateFeatureFlag(key, e.target.checked)}
                  size="small"
                />
              }
              label={label}
            />
          ))}
        </Stack>
      </Stack>

      <HotelPlacesTransfer hotel={hotel} />
    </Stack>
  );
};

export default HotelOverviewTab;
