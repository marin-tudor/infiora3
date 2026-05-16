import Head from 'next/head';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AuthLayout } from '@/layouts/auth/layout';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomField from '@/components/ui/CustomField';
import { toast } from 'react-toastify';
import { useLoginUserMutation, useLogoutUserMutation } from '@/redux/api/authApi';

const sanitizeRedirectTarget = (value: string | null): string => {
  if (!value) {
    return '/';
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
};

const loginSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(8).max(32).required(),
});

export type LoginInput = yup.InferType<typeof loginSchema>;

const getLoginErrorMessage = (error: any): string => {
  if (error?.status === 'FETCH_ERROR') {
    return 'API server is not available. Start the backend on http://localhost:8080 and try again.';
  }

  if (error?.status === 'PARSING_ERROR') {
    const responseText = String(error?.data ?? '');

    if (responseText.trim().startsWith('<')) {
      return 'Login endpoint returned HTML instead of JSON. Check NEXT_PUBLIC_API_URL and ensure the backend is running on http://localhost:8080.';
    }

    return 'Login response could not be parsed. Check the API server configuration and try again.';
  }

  return error?.data?.message || error?.message || 'Login failed.';
};

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginUser] = useLoginUserMutation();
  const [logoutUser] = useLogoutUserMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await loginUser({
        email: data.email,
        password: data.password,
      }).unwrap();
      if (res.role === 'admin' || res.role === 'manager') {
        const redirectURL = sanitizeRedirectTarget(searchParams.get('redirectTo'));

        router.replace(redirectURL);
      } else {
        await logoutUser().unwrap().catch(() => undefined);
        toast.error('You are not authorized.');
      }
    } catch (error: any) {
      toast.error(getLoginErrorMessage(error));
    }
  };

  return (
    <>
      <Head>
        <title>Login | Infiora Admin</title>
      </Head>
      <Box
        sx={{
          backgroundColor: 'background.paper',
          flex: '1 1 auto',
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            maxWidth: 550,
            px: 3,
            py: '100px',
            width: '100%',
          }}
        >
          <div>
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Typography variant="h4">Login</Typography>
            </Stack>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <CustomField
                name="email"
                label="Email"
                control={control}
                errors={errors}
                autoComplete="off"
              />
              <CustomField
                name="password"
                label="Password"
                type="password"
                control={control}
                errors={errors}
                autoComplete="off"
              />
              <Button
                fullWidth
                size="large"
                sx={{ mt: 3 }}
                type="submit"
                variant="contained"
              >
                Continue
              </Button>
            </form>
          </div>
        </Box>
      </Box>
    </>
  );
};

LoginPage.getLayout = (page: any) => <AuthLayout>{page}</AuthLayout>;
LoginPage.authGuard = false;

export default LoginPage;
