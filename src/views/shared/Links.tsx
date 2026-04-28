import React from 'react'

import { Accordion, AccordionDetails, AccordionSummary, Avatar, Button, Stack, Typography } from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { IconPickerItem } from 'react-icons-picker'

import type { ILink, IRoom } from '@/types'
import WifiDialog from './WifiDialog'
import useDialog from '@/@core/hooks/useDialog'
import { getButtonStyles } from '@/utils/miscUtils'

const Links = ({ room, links }: { room: IRoom; links: ILink[] }) => {
  const wifiDialog = useDialog<ILink>()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.infiora.hr').replace(/\/$/, '')

  const variant = room.button?.variant || 'contained'

  // Shared styles for buttons
  const buttonStyles = getButtonStyles(room)

  const handleLinkClick = async (link: any, item?: any) => {
    const type = item?.type || link.type
    const value = item?.value || link.value
    const data = item?.data || link.data
    const orderUrl = `${appUrl}/${room.id}/order`

    if (type === 'link' && value) {
      window?.open(item?.value || link.value, '_blank')
    } else if (type === 'order') {
      window?.open(orderUrl, '_blank')
    } else if (type === 'wifi' && data) {
      wifiDialog.open({ data: item || link })
    } else if (type === 'blog') {
    }
  }

  return (
    <>
      <Stack gap={2} mx={5}>
        {links.map(link => (
          <Accordion
            key={link.id}
            disableGutters
            square
            elevation={0}
            expanded={['link', 'order', 'wifi', 'blog'].includes(link.type) ? false : undefined}
            sx={{
              '&:before': { display: 'none' },
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              boxShadow: 'none',
              padding: 0,
              margin: 0
            }}
          >
            <AccordionSummary
              expandIcon={null}
              sx={{
                backgroundColor: 'transparent',
                boxShadow: 'none',
                padding: 0,
                margin: 0,
                height: '30px',
                minHeight: 0,
                '&.Mui-expanded': {
                  margin: 0,
                  minHeight: 0
                }
              }}
            >
              <Button
                variant={variant}
                fullWidth
                startIcon={
                  link.imageType !== 'none' &&
                  (link.imageType === 'icon' ? (
                    <IconPickerItem size={20} value={link.image} />
                  ) : (
                    <Avatar
                      alt=''
                      style={{
                        height: 20,
                        width: 20
                      }}
                      src={link.image || ''}
                    />
                  ))
                }
                endIcon={!['link', 'order', 'wifi', 'blog'].includes(link.type) && <ExpandMore />}
                sx={buttonStyles}
                onClick={() => handleLinkClick(link)}
              >
                {link.title}
              </Button>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                backgroundColor: 'transparent',
                boxShadow: 'none',
                padding: 0,
                margin: 0,
                paddingTop: 2
              }}
            >
              {link.type === 'group' ? (
                <Stack gap={2} mr={2}>
                  {link.items.map(item => {
                    return (
                      <Accordion
                        key={item.id}
                        disableGutters
                        square
                        elevation={0}
                        expanded={['link', 'order', 'wifi', 'blog'].includes(item.type) ? false : undefined}
                        sx={{
                          '&:before': { display: 'none' },
                          backgroundColor: 'transparent',
                          borderColor: 'transparent',
                          boxShadow: 'none',
                          padding: 0,
                          margin: 0
                        }}
                      >
                        <AccordionSummary
                          expandIcon={null}
                          sx={{
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            padding: 0,
                            margin: 0,
                            height: '30px',
                            minHeight: 0,
                            '&.Mui-expanded': {
                              margin: 0,
                              minHeight: 0
                            }
                          }}
                        >
                          <Button
                            variant={variant}
                            fullWidth
                            endIcon={!['link', 'order', 'wifi'].includes(item.type) && <ExpandMore />}
                            sx={buttonStyles}
                            onClick={() => handleLinkClick(link, item)}
                          >
                            {item.title}
                          </Button>
                        </AccordionSummary>
                        <AccordionDetails
                          sx={{
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            padding: 0,
                            margin: 0,
                            paddingTop: 2
                          }}
                        >
                          <Typography variant='body2' color='textSecondary'>
                            {item.value || 'No additional details'}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    )
                  })}
                </Stack>
              ) : (
                <Typography variant='body2' color='textSecondary'>
                  {link.value || 'No additional details'}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
      {wifiDialog.isOpen && <WifiDialog link={wifiDialog.content?.data} onClose={wifiDialog.close} />}
    </>
  )
}

export default Links
