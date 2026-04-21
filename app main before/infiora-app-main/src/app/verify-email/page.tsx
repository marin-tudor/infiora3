'use client';
import React, { useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Alert, AlertTitle } from '@mui/material';
import { Check } from '@mui/icons-material';

import Loader from '@/components/common/Loader';

const Page = () => {
  const hasFetched = useRef(false); // To prevent double fetch
  const searchParams = useSearchParams();

  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (hasFetched.current) return;

    const verifyEmail = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;

        const res = await fetch(
          `${baseUrl}/v1/auth/verify-email?token=${token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!res.ok) {
          throw new Error('Error verifying email');
        }
        setSuccess(true);
      } catch (error: any) {
        console.error('Error verifying email:', error);
        // router.replace('/not-found');
      }
    };

    verifyEmail();
    hasFetched.current = true;
  }, [token]);

  if (success) {
    return (
      <Alert icon={<Check fontSize="inherit" />} severity="success">
        <AlertTitle>Email Verified!</AlertTitle>
        Your email has been successfully verified. You can now use
        your account to log in.
      </Alert>
    );
  }

  return <Loader center />;
};

export default Page;
