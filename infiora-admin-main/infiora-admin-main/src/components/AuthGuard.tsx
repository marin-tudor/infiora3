import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch } from '@/redux/store';
import { logout as clearUser } from '@/redux/features/userSlice';
import { useLogoutUserMutation } from '@/redux/api/authApi';
import { userApi } from '@/redux/api/userApi';
import Loader from './ui/Loader';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutUser] = useLogoutUserMutation();
  const { data: user, isLoading, isError } = userApi.endpoints.getMe.useQuery(null);
  const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isError || !user) {
      dispatch(clearUser());
      router.replace('/login');
      return;
    }

    if (!isAuthorized) {
      logoutUser()
        .unwrap()
        .catch(() => undefined)
        .finally(() => {
          dispatch(clearUser());
          router.replace('/login');
        });
    }
  }, [dispatch, isAuthorized, isError, isLoading, logoutUser, router, user]);

  if (isLoading) return <Loader center />;
  if (isError || !user || !isAuthorized) return null;

  return <>{children}</>;
}
