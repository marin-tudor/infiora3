// React imports
import * as React from 'react'

// Next.js imports
import { useRouter } from 'next/navigation'

// MUI imports
import { TabList, TabPanel, TabContext } from '@mui/lab'
import { Card, CardContent, Tab, useMediaQuery, useTheme } from '@mui/material'
import {
  DescriptionOutlined,
  FeedbackOutlined,
  TouchAppOutlined,
  MailOutlineOutlined,
  NotificationImportantOutlined,
  CleaningServicesOutlined
} from '@mui/icons-material'

// Other imports
import { useDictionary } from '@/contexts/DictionaryContext'
import type { ILink, IGroup } from '@/types'
import GroupDetailTab from './GroupDetailTab'
import LinksTab from '@/views/links/components/LinksTab'
import FeedbackTab from '@/views/shared/tabs/FeedbackTab'
import NewsletterTab from '@/views/shared/tabs/NewsletterTab'
import PopupTab from '@/views/shared/tabs/PopupTab'
import HousekeepingMaintenanceTab from '@/views/shared/tabs/HousekeepingMaintenanceTab'
import { useSearchQuery } from '@/@core/hooks/useSearchQuery'

interface EditGroupTabsProps {
  group: IGroup
  links: ILink[]
}

const EditGroupTabs: React.FC<EditGroupTabsProps> = props => {
  const dictionary = useDictionary()
  const theme = useTheme()
  const router = useRouter()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { tab } = useSearchQuery(['tab'])

  const activeTab = tab || 'detail'

  const handleChange = (event: React.SyntheticEvent, value: string) => {
    router.push(`?tab=${value}`, { scroll: false })
  }

  return (
    <Card>
      <CardContent sx={isSmallScreen ? {} : { flexGrow: 1, display: 'flex' }}>
        <TabContext value={activeTab}>
          <TabList
            orientation={isSmallScreen ? 'horizontal' : 'vertical'}
            variant='scrollable'
            onChange={handleChange}
            sx={{
              '.MuiTab-root': {
                justifyContent: 'flex-start',
                textAlign: 'left'
              },
              '.MuiTab-wrapper': {
                flexDirection: 'row'
              },
              minWidth: '220px'
            }}
          >
            <Tab icon={<DescriptionOutlined />} iconPosition='start' label={dictionary.detail} value='detail' />
            <Tab icon={<TouchAppOutlined />} iconPosition='start' label={dictionary.links} value='links' />
            <Tab icon={<FeedbackOutlined />} iconPosition='start' label={dictionary.feedback} value='feedback' />
            <Tab icon={<MailOutlineOutlined />} iconPosition='start' label={dictionary.newsletter} value='newsletter' />
            <Tab icon={<NotificationImportantOutlined />} iconPosition='start' label={dictionary.popup} value='popup' />
            <Tab icon={<CleaningServicesOutlined />} iconPosition='start' label='Services' value='services' />
          </TabList>
          <TabPanel value='detail' sx={{ flexGrow: 1 }}>
            <GroupDetailTab {...props} />
          </TabPanel>
          <TabPanel value='links' sx={{ flexGrow: 1 }}>
            <LinksTab {...props} />
          </TabPanel>
          <TabPanel value='feedback' sx={{ flexGrow: 1 }}>
            <FeedbackTab {...props} />
          </TabPanel>
          <TabPanel value='newsletter' sx={{ flexGrow: 1 }}>
            <NewsletterTab {...props} />
          </TabPanel>
          <TabPanel value='popup' sx={{ flexGrow: 1 }}>
            <PopupTab {...props} />
          </TabPanel>
          <TabPanel value='services' sx={{ flexGrow: 1 }}>
            <HousekeepingMaintenanceTab group={props.group} />
          </TabPanel>
        </TabContext>
      </CardContent>
    </Card>
  )
}

export default EditGroupTabs
