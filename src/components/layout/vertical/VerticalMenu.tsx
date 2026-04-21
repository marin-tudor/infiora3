// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'
import Chip from '@mui/material/Chip'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import Swal from 'sweetalert2'

import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

import { useAuthUser } from '@/hooks/useAuthUser'
import { useUnfinishedOrdersCount } from '@/hooks/useUnfinishedOrdersCount'
import { useGetHousekeepingPendingCountQuery } from '@/redux/api/housekeepingApi'
import { useGetMaintenancePendingCountQuery } from '@/redux/api/maintenanceApi'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const MenuLabelWithCount = ({ label, count }: { label: string; count?: number }) => (
  <span className='flex items-center gap-2'>
    <span>{label}</span>
    {!!count && <Chip label={count} color='error' size='small' sx={{ height: 18, minWidth: 18, fontSize: 11 }} />}
  </span>
)

const VerticalMenu = ({ dictionary, scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const params = useParams()
  const authUser = useAuthUser()
  const router = useRouter()

  const hotelId = (authUser as any)?.hotel?.id

  const hotelFeatures = (authUser as any)?.hotel?.features

  const { data: housekeepingPending } = useGetHousekeepingPendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.housekeepingEnabled === false,
    pollingInterval: 30000
  })

  const { data: maintenancePending } = useGetMaintenancePendingCountQuery(hotelId, {
    skip: !hotelId || hotelFeatures?.maintenanceEnabled === false,
    pollingInterval: 30000
  })

  const { count: unfinishedOrdersCount } = useUnfinishedOrdersCount(hotelId)

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const { lang: locale } = params

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  const handleMenuClick = (path: string) => {
    if (authUser?.hotel === null) {
      Swal.fire({
        icon: 'error',
        title: dictionary.noHotelMessage
      })

      return
    } else if (authUser?.hotel?.isActive === false) {
      Swal.fire({
        icon: 'warning',
        title: dictionary.inActiveHotelMessage
      })

      return
    }

    router.push(path)
  }

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      {/* Incase you also want to scroll NavHeader to scroll with Vertical Menu, remove NavHeader from above and paste it below this comment */}
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 17 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-fill' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        <MenuItem icon={<i className='ri-home-smile-line' />} href={`/${locale}/home`}>
          {dictionary.home}
        </MenuItem>
        <MenuItem icon={<i className='ri-door-line' />} onClick={() => handleMenuClick(`/${locale}/rooms`)}>
          {dictionary.rooms}
        </MenuItem>
        <MenuItem icon={<i className='ri-layout-grid-line' />} onClick={() => handleMenuClick(`/${locale}/groups`)}>
          {dictionary.groups}
        </MenuItem>
        <MenuItem icon={<i className='ri-shopping-bag-3-line' />} onClick={() => handleMenuClick(`/${locale}/orders`)}>
          <MenuLabelWithCount label={dictionary.orders} count={unfinishedOrdersCount} />
        </MenuItem>
        <MenuItem icon={<i className='ri-group-line' />} onClick={() => handleMenuClick(`/${locale}/subscribers`)}>
          {dictionary.subscribers}
        </MenuItem>
        <MenuItem icon={<i className='ri-feedback-line' />} onClick={() => handleMenuClick(`/${locale}/feedbacks`)}>
          {dictionary.feedbacks}
        </MenuItem>
        <MenuItem icon={<i className='ri-service-line' />} onClick={() => handleMenuClick(`/${locale}/housekeeping`)}>
          <MenuLabelWithCount label='Housekeeping' count={housekeepingPending?.count} />
        </MenuItem>
        <MenuItem icon={<i className='ri-tools-line' />} onClick={() => handleMenuClick(`/${locale}/maintenance`)}>
          <MenuLabelWithCount label='Maintenance' count={maintenancePending?.count} />
        </MenuItem>
        <MenuItem icon={<i className='ri-line-chart-line' />} onClick={() => handleMenuClick(`/${locale}/insights`)}>
          {dictionary.analytics}
        </MenuItem>
        <MenuItem
          icon={<i className='ri-hotel-line' />}
          onClick={() => window.open('https://dash.eprijava.hr', '_blank')}
        >
          Guests Check In
        </MenuItem>
        <MenuItem icon={<i className='ri-customer-service-2-line' />} href={`/${locale}/support`}>
          {dictionary.support}
        </MenuItem>
        <MenuItem icon={<i className='ri-settings-2-line' />} href={`/${locale}/hotels/${authUser.hotel?.id}`}>
          {dictionary.hotelSettings}
        </MenuItem>
        <MenuItem icon={<i className='ri-settings-2-line' />} href={`/${locale}/settings`}>
          {dictionary.settings}
        </MenuItem>
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
