import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Grid } from '@mui/material';
import { toast } from 'react-toastify';
import Loader from '@/components/ui/Loader';
import { useRouter } from 'next/router';
import {
  useCreateRoomMutation,
  useUpdateRoomMutation,
} from '@/redux/api/roomApi';
import CustomField from '@/components/ui/CustomField';
import { IRoom } from '@/types';
import {
  stringMax255,
  stringRequiredMax50,
} from '@/utils/validationSchemas';

const schema = yup.object().shape({
  number: stringRequiredMax50,
  description: stringMax255,
});

export type FormData = yup.InferType<typeof schema>;

const RoomForm = ({
  room,
  hotel,
}: {
  hotel?: string;
  room?: IRoom;
}) => {
  const router = useRouter();

  const [createRoom, { isLoading: createLoading }] =
    useCreateRoomMutation();
  const [updateRoom, { isLoading: updateLoading }] =
    useUpdateRoomMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      number: room?.number || '',
      description: room?.description || '',
    },
    resolver: yupResolver(schema),
  });

  const onSubmit = async (body: FormData) => {
    try {
      if (room) {
        await updateRoom({
          id: room.id,
          room: body,
        }).unwrap();
      } else {
        await createRoom({ hotel, ...body }).unwrap();
      }
      toast.success('Room updated');
      router.back();
    } catch (error: any) {
      toast.error(error?.data?.message || error.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Grid sx={{ mt: 4 }} container spacing={1}>
        <Grid item xs={12} md={4}>
          <CustomField
            name="number"
            label="Number"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <CustomField
            name="description"
            label="Description"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            size="large"
            type="submit"
            variant="contained"
            disabled={createLoading || updateLoading}
          >
            {createLoading || updateLoading ? (
              <Loader />
            ) : room ? (
              'Update'
            ) : (
              'Add'
            )}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default RoomForm;
