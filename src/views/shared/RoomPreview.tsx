import React from 'react'

// MUI imports
import Image from 'next/image'

import { Box, Card, Typography, Stack, Avatar, Button, IconButton } from '@mui/material'

// Custom imports
import { SocialIcon } from 'react-social-icons'

import { IconPickerItem } from 'react-icons-picker'

import { Close } from '@mui/icons-material'

import type { ILink } from '@/types'
import { generateGradient, getButtonStyles, isNullOrEmpty } from '@/utils/miscUtils'
import { getHotelImageUrl } from '@/utils/imageUrlUtils'
import Links from './Links'
import '@fontsource/montserrat'
import FeedbackDrawer from './room/components/FeedbackDrawer'

interface RoomPreviewProps {
  room: any
  links?: ILink[]
  showFeedback?: boolean
  showNewsletter?: boolean
  showPopup?: boolean
}

interface PopupDialogProps {
  popup: any
}

const PopupDialog: React.FC<PopupDialogProps> = ({ popup }) => {
  const getBackgroundImage = () => {
    if (popup?.imageType !== 'image' && popup?.imageType !== 'url') return null
    if (!popup?.image) return null

    const imgSrc = popup.image instanceof File ? URL.createObjectURL(popup.image) : popup.image

    return `url(${imgSrc})`
  }

  return (
    <Stack
      sx={{
        position: 'absolute',
        ...(popup?.size === 'fullscreen'
          ? {
              top: 0,
              height: '100%',
              justifyContent: 'center'
            }
          : popup?.size === 'medium'
            ? {
                top: 0,
                height: '100%',
                ...(popup?.position === 'top' && { justifyContent: 'flex-start' }),
                ...(popup?.position === 'center' && { justifyContent: 'center' }),
                ...(popup?.position === 'bottom' && { justifyContent: 'flex-end' })
              }
            : {
                ...(popup?.position === 'top' && { top: 0 }),
                ...(popup?.position === 'center' && { top: '50%', transform: 'translateY(-50%)' }),
                ...(popup?.position === 'bottom' && { bottom: 0 })
              }),
        width: 250,
        alignItems: 'center'
      }}
    >
      <Stack
        component={Card}
        alignItems='center'
        justifyContent='flex-end'
        gap={2}
        sx={{
          background: getBackgroundImage(),
          backgroundColor: popup?.backgroundColor || 'black',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          width: popup?.size === 'fullscreen' ? '90%' : popup?.size === 'medium' ? '90%' : '70%',
          height: popup?.size === 'fullscreen' ? '95%' : popup?.size === 'medium' ? '50%' : 'auto',
          mx: 'auto',
          mb: popup?.position === 'bottom' && popup?.size !== 'fullscreen' && popup?.size !== 'medium' ? 3 : 0,
          mt: popup?.position === 'top' && popup?.size !== 'fullscreen' && popup?.size !== 'medium' ? 3 : 0,
          py: popup?.size === 'medium' || popup?.size === 'fullscreen' ? 3 : 2,
          px: 2,
          borderRadius: '16px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          position: 'relative',
          textAlign: 'center'
        }}
      >
        <IconButton size='small' sx={{ position: 'absolute', top: 0, right: 0 }}>
          <Close sx={{ color: popup?.fontColor || 'white' }} />
        </IconButton>
        {popup?.imageType === 'icon' && popup?.image && (
          <IconPickerItem value={popup.image} size={40} color={popup?.fontColor || 'white'} />
        )}
        <Typography variant='body1' sx={{ whiteSpace: 'pre-line', color: popup?.fontColor || 'white' }}>
          {popup.message}
        </Typography>
        {popup?.buttonText && (
          <Button
            variant='contained'
            sx={{
              background: 'white',
              '&:hover': {
                backgroundColor: 'white'
              },
              color: popup?.backgroundColor || 'black'
            }}
            size='small'
            href={popup?.link || '#'}
          >
            {popup.buttonText}
          </Button>
        )}
      </Stack>
    </Stack>
  )
}

interface NewsletterDialogProps {
  newsletter: any
}

const NewsletterDialog: React.FC<NewsletterDialogProps> = ({ newsletter }) => {
  return (
    <Stack sx={{ position: 'absolute', top: 200, width: 250, alignItems: 'center' }}>
      <Stack
        component={Card}
        alignItems='center'
        gap={2}
        sx={{
          background: newsletter?.color || 'black',
          width: '80%',
          mx: 'auto',
          mb: 3,
          p: 2,
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          position: 'relative',
          textAlign: 'center'
        }}
      >
        <IconButton size='small' sx={{ position: 'absolute', top: 0, right: 0 }}>
          <Close sx={{ color: 'white' }} />
        </IconButton>
        {newsletter?.message && (
          <Typography variant='body1' sx={{ mt: 3, whiteSpace: 'pre-line', color: 'white' }}>
            {newsletter.message}
          </Typography>
        )}
        <Typography
          variant='body1'
          sx={{
            mt: 3,
            whiteSpace: 'pre-line',
            color: 'grey',
            backgroundColor: 'white',
            padding: 2,
            borderRadius: 1,
            width: '100%',
            textAlign: 'left'
          }}
        >
          email@example.com
        </Typography>
        {newsletter?.buttonText && (
          <Button
            variant='contained'
            sx={{
              background: 'white',
              '&:hover': {
                backgroundColor: 'white'
              },
              color: newsletter?.color || 'black'
            }}
            size='small'
          >
            {newsletter.buttonText || 'Subscribe'}
          </Button>
        )}
      </Stack>
    </Stack>
  )
}

const getBgImageUrl = (bg: any): string | null => {
  if (bg?.type !== 'image' || !bg?.image) return null
  if (bg.image instanceof File) return URL.createObjectURL(bg.image)
  
return bg.image as string
}

const getBgSizeCss = (fit: string | undefined) => {
  if (fit === 'contain') return 'contain'
  if (fit === 'natural') return 'auto'
  
return 'cover'
}

const getBgRepeatCss = (fit: string | undefined) => {
  if (fit === 'repeat') return 'repeat'
  
return 'no-repeat'
}

const RoomPreview: React.FC<RoomPreviewProps> = ({ room, links, showNewsletter, showPopup }) => {
  const gradient = generateGradient(room.background?.color || '#ffffff', room.background?.direction)
  const bgImageUrl = getBgImageUrl(room.background)

  const features = room.hotel?.features || {}

  const visibleLinks = (links || [])
    .filter(l => l.isActive)
    .filter(l => features.ordersEnabled !== false || l.type !== 'order')
    .map(l =>
      l.type === 'group'
        ? {
            ...l,
            items: (l.items || []).filter((item: any) => features.ordersEnabled !== false || item.type !== 'order')
          }
        : l
    )

  return (
    <Box
      sx={{
        position: 'relative',
        margin: 'auto',
        '& .overlay': {
          position: 'absolute',
          width: 250,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '10px',
          zIndex: 10
        }
      }}
    >
      <Stack alignItems='center' gap={5} width={250}>
        <Box
          component={Card}
          sx={{
            position: 'relative',
            margin: 'auto',
            paddingTop: 2,
            paddingBottom: 30,
            height: '500px',
            width: 250,
            background: room.background?.type === 'gradient' ? gradient : room.background?.type === 'image' ? undefined : room.background?.color,
            backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
            backgroundSize: bgImageUrl
              ? room.background?.backgroundFit === 'repeat'
                ? `${room.background?.tileSize || 120}px auto`
                : getBgSizeCss(room.background?.backgroundFit)
              : undefined,
            backgroundRepeat: bgImageUrl ? getBgRepeatCss(room.background?.backgroundFit) : undefined,
            backgroundPosition: bgImageUrl ? room.background?.backgroundPosition || 'center center' : undefined,
            overflowY: 'auto',
            borderRadius: '30px',
            scrollbarWidth: 'none',
            '&::before': bgImageUrl && (room.background?.imageOpacity ?? 1) < 1
              ? {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: `rgba(0,0,0,${1 - (room.background?.imageOpacity ?? 1)})`,
                  pointerEvents: 'none',
                  zIndex: 0,
                }
              : undefined
          }}
        >
          <Stack gap={2} sx={{ position: 'relative', zIndex: 1 }}>
            <Stack textAlign='center' alignItems='center' marginX={5} gap={2}>
              <Avatar src={getHotelImageUrl(room.hotel)} sx={{ height: 80, width: 80 }} />
              <Stack textAlign='center' alignItems='center'>
                <Typography
                  style={{ lineBreak: 'anywhere' }}
                  fontFamily={room.font?.family}
                  color={room.font?.color}
                  variant='h6'
                >
                  {room.hotel.name}
                </Typography>
                {!isNullOrEmpty(room.hotel.description) && (
                  <Typography
                    style={{
                      fontSize: '10px',
                      whiteSpace: 'pre-line'
                    }}
                    variant='body1'
                    fontFamily={room.font?.family}
                    color={room.font?.color}
                  >
                    {room.hotel.description}
                  </Typography>
                )}
                <Typography
                  style={{
                    fontSize: '10px',
                    whiteSpace: 'pre-line'
                  }}
                  variant='body1'
                  color={room.font?.color}
                  fontFamily={room.font?.family}
                >
                  {room.description || ''}
                </Typography>
              </Stack>
              <Stack direction='row' gap={1}>
                {(room.hotel?.socialLinks ?? []).map((link: any) => (
                  <SocialIcon
                    key={link}
                    url={link}
                    target='_blank'
                    bgColor='transparent'
                    fgColor={room.font?.color || 'black'}
                    style={{
                      width: '25px',
                      height: '25px'
                    }}
                  />
                ))}
              </Stack>
            </Stack>
            <Links room={room} links={visibleLinks} />
            {room.newsletter?.isActive &&
              room.newsletter?.type === 'button' &&
              !isNullOrEmpty(room.newsletter?.mainButtonText) && (
                <Stack mx={5}>
                  <Button
                    variant={room.button?.variant || 'contained'}
                    fullWidth
                    sx={getButtonStyles(room)}
                    startIcon={
                      room?.newsletter?.imageType !== 'none' &&
                      (room?.newsletter?.imageType === 'icon' ? (
                        <IconPickerItem size={20} value={room?.newsletter?.image} />
                      ) : (
                        <Avatar
                          alt=''
                          style={{
                            height: 20,
                            width: 20
                          }}
                          src={room?.newsletter?.image || ''}
                        />
                      ))
                    }
                  >
                    {room.newsletter?.mainButtonText || ''}
                  </Button>
                </Stack>
              )}
            {room.survey?.isActive &&
              room.survey?.type === 'button' &&
              !isNullOrEmpty(room.survey?.mainButtonText) && (
                <Stack mx={5}>
                  <Button
                    variant={room.button?.variant || 'contained'}
                    fullWidth
                    sx={getButtonStyles(room)}
                    startIcon={
                      room?.survey?.imageType !== 'none' &&
                      (room?.survey?.imageType === 'icon' ? (
                        <IconPickerItem size={20} value={room?.survey?.image} />
                      ) : (
                        <Avatar
                          alt=''
                          style={{
                            height: 20,
                            width: 20
                          }}
                          src={room?.survey?.image || ''}
                        />
                      ))
                    }
                  >
                    {room.survey?.mainButtonText || ''}
                  </Button>
                </Stack>
              )}
            {features.housekeepingEnabled !== false && room.housekeeping?.isActive && (
                <Stack mx={5}>
                  <Button
                    variant={room.button?.variant || 'contained'}
                    fullWidth
                    sx={getButtonStyles(room)}
                    startIcon={room.housekeeping?.icon ? <IconPickerItem size={20} value={room.housekeeping.icon} /> : undefined}
                  >
                    {room.housekeeping?.mainButtonText || 'Housekeeping Request'}
                  </Button>
                </Stack>
              )}
            {features.maintenanceEnabled !== false && room.maintenance?.isActive && (
                <Stack mx={5}>
                  <Button
                    variant={room.button?.variant || 'contained'}
                    fullWidth
                    sx={getButtonStyles(room)}
                    startIcon={room.maintenance?.icon ? <IconPickerItem size={20} value={room.maintenance.icon} /> : undefined}
                  >
                    {room.maintenance?.mainButtonText || 'Report Maintenance Issue'}
                  </Button>
                </Stack>
              )}
            <Stack direction='row' alignItems='center' justifyContent='center'>
              <Typography>Powered by</Typography>
              <Image
                src='/images/logo.png'
                alt=''
                width={0}
                height={0}
                sizes='100vh'
                style={{
                  width: '100px',
                  height: 'auto'
                }}
              />
            </Stack>
          </Stack>
          {showPopup && room.popup?.isActive && <PopupDialog popup={room.popup} />}
          {showNewsletter && room?.newsletter?.isActive && <NewsletterDialog newsletter={room.newsletter} />}
          <FeedbackDrawer room={room} show={false} setShow={() => {}} />
        </Box>
      </Stack>
    </Box>
  )
}

export default RoomPreview
