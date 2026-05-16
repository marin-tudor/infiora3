import { Metadata } from 'next';
import Image from 'next/image';

import { Box, Container, Stack, Typography } from '@mui/material';

export const metadata: Metadata = {
  title: '404 Not Found',
  description: '',
};

const Page = () => (
  <Container maxWidth="md">
    <Stack alignItems="center" height="100vh" justifyContent="center">
      <Box
        sx={{
          mb: 3,
          textAlign: 'center',
        }}
      >
        <Image
          alt="Under development"
          src="/images/errors/error-404.png"
          width={0}
          height={0}
          sizes="100vh"
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            width: 200,
          }}
        />
      </Box>
      <Typography align="center" sx={{ mb: 3 }} variant="h3">
        404 Page Not Found
      </Typography>
      <Typography
        align="center"
        color="text.secondary"
        variant="body1"
      >
        We&apos;re sorry, the page you&apos;re looking for cannot be
        found. Please connect a Infiora product to your profile and
        try again.
      </Typography>
    </Stack>
  </Container>
);

export default Page;
