import { redirect, usePathname } from 'next/navigation';

const AuthRedirect = () => {
  const pathname = usePathname();

  const redirectUrl = `/login?redirectTo=${pathname}`;
  const login = `/login`;
  const homePage = '/';

  return redirect(
    pathname === login
      ? login
      : pathname === homePage
      ? login
      : redirectUrl
  );
};

export default AuthRedirect;
