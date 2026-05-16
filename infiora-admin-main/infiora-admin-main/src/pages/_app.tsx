import { CacheProvider } from '@emotion/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import 'simplebar-react/dist/simplebar.min.css';
import '../assets/styles/globals.css';
import { createEmotionCache } from '@/utils/create-emotion-cache';
import { useNProgress } from '@/hooks/use-nprogress';
import { createTheme } from '@/theme';
import AuthGuard from '@/components/AuthGuard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ReduxProvider from '@/redux/ReduxProvider';
import '@/configs/env';

const clientSideEmotionCache = createEmotionCache();

const Guard = ({ children, authGuard }: any) => {
  if (authGuard) {
    return <AuthGuard>{children}</AuthGuard>;
  } else {
    return <>{children}</>;
  }
};

const App = (props: any) => {
  const {
    Component,
    emotionCache = clientSideEmotionCache,
    pageProps,
  } = props;

  useNProgress();

  const getLayout = Component.getLayout ?? ((page: any) => page);

  const authGuard = Component.authGuard ?? true;

  const theme = createTheme();

  return (
    <ReduxProvider>
      <CacheProvider value={emotionCache}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Guard authGuard={authGuard}>
              {getLayout(<Component {...pageProps} />)}
            </Guard>
          </ThemeProvider>
        </LocalizationProvider>
        <ToastContainer position="bottom-left" />
      </CacheProvider>
    </ReduxProvider>
  );
};

export default App;
