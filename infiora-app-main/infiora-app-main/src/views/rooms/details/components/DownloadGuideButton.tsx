'use client';
import React, { useState } from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import { DownloadForOffline } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { isDesktop, isIOS } from 'react-device-detect';
import type { ILink, IRoom, ILanguage } from '@/types';
import { getDownloadLabel } from '@/utils/pdfGenerator';

const DEFAULT_ACCENT = '#1976d2';

interface DownloadGuideButtonProps {
  room: IRoom;
  links: ILink[];
  language: ILanguage | undefined;
}

const DownloadGuideButton: React.FC<DownloadGuideButtonProps> = ({
  room,
  links,
  language,
}) => {
  const [loading, setLoading] = useState(false);

  if (!language) return null;

  const trackDownload = async () => {
    try {
      const device = isDesktop ? 'Desktop' : isIOS ? 'iOS' : 'Android';
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const url = new URL(
        baseUrl ? `${baseUrl}/v1/rooms/${room.id}` : `/v1/rooms/${room.id}`,
        origin
      );
      url.search = new URLSearchParams({
        action: 'tap',
        button: 'offlineGuide',
        buttonTitle: getDownloadLabel(language.code),
        language: language.name,
        device,
      }).toString();
      await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
    } catch {
      // non-critical — don't block PDF generation
    }
  };

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await trackDownload();
      const { generateGuidePDF } = await import('@/utils/pdfGenerator');
      await generateGuidePDF(room, links, language);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Could not generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box mx={5}>
      <Button
        variant="outlined"
        fullWidth
        disabled={loading}
        onClick={handleDownload}
        startIcon={
          loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <DownloadForOffline />
          )
        }
        sx={{
          height: '36px',
          borderRadius: room.button?.borderRadius ?? '30px',
          color: room.button?.backgroundColor ?? DEFAULT_ACCENT,
          borderColor: room.button?.backgroundColor ?? DEFAULT_ACCENT,
          fontFamily: room.font?.family ?? 'inherit',
          textTransform: 'none',
          '&:hover': {
            borderColor: room.button?.backgroundColor ?? DEFAULT_ACCENT,
            backgroundColor: 'transparent',
          },
          '&.Mui-disabled': {
            opacity: 0.6,
          },
        }}
      >
        {getDownloadLabel(language.code)}
      </Button>
    </Box>
  );
};

export default DownloadGuideButton;
