import React, { Fragment } from 'react'

import { useParams } from 'next/navigation'

import {
  Card,
  CardContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material'
import { InfoRounded } from '@mui/icons-material'

import { useDictionary } from '@/contexts/DictionaryContext'
import type { IInsights } from '@/types'

const TopRated = ({ insights }: { insights: IInsights }) => {
  const dictionary = useDictionary()
  const { lang: locale } = useParams()

  const topRooms = insights?.rooms
    ?.slice()
    ?.sort((a: any, b: any) => b.views - a.views)
    ?.slice(0, 3)

  const topLinks = insights?.links
    ?.slice()
    ?.sort((a: any, b: any) => (b.taps || 0) - (a.taps || 0))
    ?.slice(0, 3)

  const topGroupLinks = insights?.links
    ?.slice()
    ?.filter((l: any) => l.group)
    ?.sort((a: any, b: any) => (b.taps || 0) - (a.taps || 0))
    ?.slice(0, 3)

  const top = [
    {
      title: dictionary.pages.insights.topRooms.title,
      info: dictionary.pages.insights.topRooms.title,
      link: `/${locale}/insights/rooms`,
      data: topRooms.map((r: any) => ({
        title: `Room ${r.number}`,
        headline: `${dictionary.views}: ${r.views}`
      }))
    },
    {
      title: dictionary.pages.insights.topButtons.title,
      info: dictionary.pages.insights.topButtons.title,
      link: `/${locale}/insights/links`,
      data: topLinks.map((l: any) => ({
        title: `${l.title}`,
        headline: `${dictionary.taps}: ${l.taps}`
      }))
    },
    {
      title: dictionary.pages.insights.topGroupButtons.title,
      info: dictionary.pages.insights.topGroupButtons.title,
      link: `/${locale}/insights/links`,
      data: topGroupLinks.map((l: any) => ({
        title: `${l.title}`,
        headline: `Visits: ${l.taps}`
      }))
    }
  ]

  return (
    <Grid container spacing={2}>
      {top.map(t => (
        <Grid key={t.title} item xs={12} md={4}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ height: '100%' }}>
              <Stack gap={5}>
                <Stack direction='row' alignItems='center' justifyContent='space-between'>
                  <Stack direction='row' gap={1} alignItems='center'>
                    <Typography>{t.title}</Typography>
                    <Tooltip title={<span style={{ fontSize: '10px' }}>{t.info}</span>} arrow>
                      <InfoRounded fontSize='small' />
                    </Tooltip>
                  </Stack>
                  {/* <Button size='small' endIcon={<ChevronRight />} href={t.link}>
                    {dictionary.viewMore}
                  </Button> */}
                </Stack>
                <Stack gap={2}>
                  <List>
                    {t.data?.map((d: any, i: any) => {
                      return (
                        <Fragment key={i}>
                          <ListItem>
                            <ListItemText primary={d.title} secondary={d.headline} />
                          </ListItem>
                          {i < t.data.length - 1 && <Divider />}
                        </Fragment>
                      )
                    })}
                  </List>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default TopRated
