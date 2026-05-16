// React imports
import React from 'react';

// MUI imports
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';

// Validation imports
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Other imports
import { toast } from 'react-toastify';

// Custom imports
import {
  numberRequired,
  numberValidation,
  stringMax50,
} from '@/utils/validationSchemas';
import { useCreateRoomMutation } from '@/redux/api/roomApi';
import CustomField from '@/components/ui/CustomField';
import Loader from '@/components/ui/Loader';

interface CreateRoomsDialogProps {
  hotel: string;
  onClose: any;
}

const schema = yup.object().shape({
  quantity: numberRequired,
  suffix: stringMax50,
  prefix: stringMax50,
  start: numberValidation,
});

export type FormData = yup.InferType<typeof schema>;

const CreateRoomsDialog: React.FC<CreateRoomsDialogProps> = ({
  hotel,
  onClose,
}) => {
  const [createRoom, { isLoading }] = useCreateRoomMutation();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await createRoom({ ...data, hotel }).unwrap();
      toast.success('Rooms created successfully.');
      handleCancel();
    } catch (error: any) {
      toast.error(error?.data?.message || error.message);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      fullWidth
      open={true}
      maxWidth="sm"
      scroll="paper"
      onClose={handleCancel}
    >
      <form
        noValidate
        autoComplete="off"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DialogContent>
          <IconButton
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              padding: 5,
            }}
            onClick={handleCancel}
          >
            <Close />
          </IconButton>
          <Stack gap={2}>
            <Typography variant="h5">Add Rooms</Typography>
            <Stack gap={0}>
              <CustomField
                name="quantity"
                label="Quantity"
                control={control}
                errors={errors}
              />
              <CustomField
                name="prefix"
                label="prefix"
                control={control}
                errors={errors}
              />
              <CustomField
                name="suffix"
                label="Suffix"
                control={control}
                errors={errors}
              />
              <CustomField
                name="start"
                type="number"
                label="Start"
                control={control}
                errors={errors}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            autoFocus
            disabled={isLoading}
          >
            {isLoading ? <Loader /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateRoomsDialog;
