import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Divider, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import {
  useCreateHotelMutation,
  useUpdateHotelMutation,
} from '@/redux/api/hotelApi';
import { IHotel } from '@/types';
import {
  stringMax255,
  stringRequiredMax50,
} from '@/utils/validationSchemas';
import InputField from '@/components/common/InputField';
import { LoadingButton } from '@mui/lab';
import { Save } from '@mui/icons-material';
import { useGetUsersQuery } from '@/redux/api/userApi';
import { useAppSelector } from '@/redux/store';

const schema = yup.object().shape({
  name: stringRequiredMax50,
  description: stringMax255,
  note: yup.string(),
  manager: yup.string(),
});

export type FormData = yup.InferType<typeof schema>;

const HotelForm = ({
  hotel,
  user,
}: {
  user?: string;
  hotel?: IHotel;
}) => {
  const router = useRouter();

  const authUser = useAppSelector((state) => state.userState.user);

  const { data } = useGetUsersQuery({
    role: 'manager',
    limit: 1000,
  });
  const [createHotel, { isLoading: createLoading }] =
    useCreateHotelMutation();
  const [updateHotel, { isLoading: updateLoading }] =
    useUpdateHotelMutation();

  const [features, setFeatures] = React.useState({
    ordersEnabled: hotel?.features?.ordersEnabled !== false,
    maintenanceEnabled: hotel?.features?.maintenanceEnabled !== false,
    housekeepingEnabled: hotel?.features?.housekeepingEnabled !== false,
    staffRbacEnabled: hotel?.features?.staffRbacEnabled === true,
    smartDispatchingEnabled: hotel?.features?.smartDispatchingEnabled === true,
    bookableServicesEnabled: hotel?.features?.bookableServicesEnabled === true,
  });
  const [stripePlatformFeePercent, setStripePlatformFeePercent] = React.useState<number | null>(
    hotel?.stripePlatformFeePercent ?? null
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: hotel?.name || '',
      description: hotel?.description || '',
      note: hotel?.note || '',
      manager: hotel?.manager || authUser?.id,
    },
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const body = { ...data, features, stripePlatformFeePercent };
      if (hotel) {
        await updateHotel({
          id: hotel.id,
          hotel: body,
        }).unwrap();
      } else {
        await createHotel({ user, ...body }).unwrap();
      }
      toast.success('Hotel saved!');
      router.back();
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Grid container spacing={1}>
        <Grid item xs={12} md={4}>
          <InputField
            name="name"
            label="Name"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="manager"
            label="Manager"
            control={control}
            errors={errors}
            type="select"
            options={data?.results?.map((u: any) => ({
              label: u.name,
              value: u.id,
            }))}
            disabled={authUser?.role !== 'admin'}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="description"
            label="Description"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="note"
            label="Note"
            control={control}
            errors={errors}
            rows={3}
            multiline
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Stripe platform fee %"
            type="number"
            value={stripePlatformFeePercent ?? ''}
            onChange={(e) => setStripePlatformFeePercent(e.target.value ? Number(e.target.value) : null)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText="Blank uses the global backend default"
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant='subtitle2' fontWeight={600} mb={2}>
            Feature Access
          </Typography>
          <Stack gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={features.ordersEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, ordersEnabled: e.target.checked }))}
                />
              }
              label='Orders (Room Service)'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.housekeepingEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, housekeepingEnabled: e.target.checked }))}
                />
              }
              label='Housekeeping'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.maintenanceEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, maintenanceEnabled: e.target.checked }))}
                />
              }
              label='Maintenance'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.staffRbacEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, staffRbacEnabled: e.target.checked }))}
                />
              }
              label='Staff RBAC'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.smartDispatchingEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, smartDispatchingEnabled: e.target.checked }))}
                />
              }
              label='Smart Dispatching'
            />
            <FormControlLabel
              control={
                <Switch
                  checked={features.bookableServicesEnabled}
                  onChange={(e) => setFeatures((f) => ({ ...f, bookableServicesEnabled: e.target.checked }))}
                />
              }
              label='Bookable Services'
            />
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <LoadingButton
            type="submit"
            variant="contained"
            disabled={createLoading || updateLoading}
            loading={createLoading || updateLoading}
            startIcon={<Save />}
          >
            Save
          </LoadingButton>
        </Grid>
      </Grid>
    </form>
  );
};

export default HotelForm;
