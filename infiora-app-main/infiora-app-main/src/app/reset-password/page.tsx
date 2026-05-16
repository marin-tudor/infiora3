'use client';
import React, { useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  Alert,
  AlertTitle,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { Check } from '@mui/icons-material';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { toast } from 'react-toastify';

import InputField from '@/components/common/InputField';
import Loader from '@/components/common/Loader';
import {
  confirmPasswordValidation,
  passwordValidation,
  stringRequired,
} from '@/utils/validationSchemas';

const schema = yup.object().shape({
  password: passwordValidation.concat(stringRequired),
  confirmPassword: confirmPasswordValidation.concat(stringRequired),
});

export type FormData = yup.InferType<typeof schema>;

const Page = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/reset-password?token=${token}`;
      setLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: data.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }
      setSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert icon={<Check fontSize="inherit" />} severity="success">
        <AlertTitle>Password Updated!</AlertTitle>
        Your password has been changed successfully. Use your new
        password to log in.
      </Alert>
    );
  }

  return (
    <form
      noValidate
      autoComplete="off"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Stack
        sx={{
          width: { sm: '50%', md: '40%' },
          margin: 'auto',
          py: 5,
          px: 2,
        }}
        alignItems="start"
      >
        <Typography variant="h4" mb={3}>
          Reset Password
        </Typography>
        <InputField
          control={control}
          name="password"
          label="Password"
          type="password"
          errors={errors}
        />
        <InputField
          control={control}
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          errors={errors}
        />
        <Button variant="contained" type="submit">
          {loading ? <Loader /> : 'Reset'}
        </Button>
      </Stack>
    </form>
  );
};

export default Page;
