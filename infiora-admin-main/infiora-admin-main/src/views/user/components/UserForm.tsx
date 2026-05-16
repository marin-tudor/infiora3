import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Grid } from '@mui/material';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import {
  useCreateUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from '@/redux/api/userApi';
import { useAppSelector } from '@/redux/store';
import {
  emailValidation,
  passwordValidation,
  stringRequired,
  stringRequiredMax50,
} from '@/utils/validationSchemas';
import { LoadingButton } from '@mui/lab';
import { Save } from '@mui/icons-material';
import InputField from '@/components/common/InputField';
import { IUser } from '@/types';

const schema = yup.object().shape({
  name: stringRequiredMax50,
  email: emailValidation.concat(stringRequired),
  password: yup
    .string()
    .when('$isUpdate', (isUpdate) =>
      isUpdate[0]
        ? passwordValidation
        : passwordValidation.concat(stringRequired)
    ),
  role: stringRequired,
  managers: yup.array(),
});

export type FormData = yup.InferType<typeof schema>;

const UserForm = ({ user }: any) => {
  const router = useRouter();

  const { data } = useGetUsersQuery({
    role: 'manager,admin',
    limit: 100,
  });

  const [createUser, { isLoading: createLoading }] =
    useCreateUserMutation();
  const [updateUser, { isLoading: updateLoading }] =
    useUpdateUserMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'user',
      managers: user?.managers || [],
    },
    resolver: yupResolver(schema),
    context: { isUpdate: !!user },
  });
  const authUser = useAppSelector((state) => state.userState.user);
  const onSubmit = async (body: FormData) => {
    try {
      if (user) {
        await updateUser({
          id: user.id,
          user: body,
        }).unwrap();
        router.back();
      } else {
        const newUser = await createUser(body).unwrap();
        router.push(`/users/${newUser.id}`);
      }
      toast.success('User updated');
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
            name="email"
            label="Email"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="password"
            label="Password"
            type="password"
            control={control}
            errors={errors}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="role"
            label="Role"
            type="select"
            control={control}
            errors={errors}
            options={[
              { label: 'User', value: 'user' },
              { label: 'Admin', value: 'admin' },
              { label: 'Manager', value: 'manager' },
            ]}
            disabled={
              authUser?.email === (user?.email || '') ||
              authUser?.role === 'manager'
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <InputField
            name="managers"
            label="Managers"
            type="autocomplete"
            multiple
            control={control}
            errors={errors}
            options={
              data?.results?.map((u: IUser) => ({
                label: u.name,
                value: u.id,
              })) || []
            }
            disabled={user?.role !== 'user'}
          />
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

export default UserForm;
