'use client'

// Third-party Imports
import { useRouter } from 'next/navigation'

import classnames from 'classnames'

// Component Imports
import { Button } from '@mui/material'

import { useSession } from 'next-auth/react'

import NavToggle from './NavToggle'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'
import OrderNotificationBell from '@components/layout/shared/OrderNotificationBell'
import RequestsNotificationBell from '@components/layout/shared/RequestsNotificationBell'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import HotelListDialog from '@/views/hotels/components/HotelListDialog'
import useDialog from '@/@core/hooks/useDialog'
import { useAuthUser } from '@/hooks/useAuthUser'
import type { IHotel } from '@/types'

const NavbarContent = () => {
  const storesDialog = useDialog()
  const router = useRouter()
  const authUser = useAuthUser()

  const { update } = useSession()

  const handleHotelSelect = (hotel: IHotel) => {
    update({ hotel })
    storesDialog.close()
    router.replace('/home')
  }

  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-[7px]'>
        <NavToggle />
      </div>
      <div className='flex items-center'>
        {/* <LanguageDropdown /> */}

        <Button
          variant='outlined'
          onClick={() => {
            storesDialog.open()
          }}
        >
          {authUser.hotel ? authUser.hotel.name : 'Select Hotel'}
        </Button>
        <OrderNotificationBell />
        <RequestsNotificationBell />
        <ModeDropdown />
        <UserDropdown />
      </div>
      <HotelListDialog open={storesDialog.isOpen} handleSelect={handleHotelSelect} />
    </div>
  )
}

export default NavbarContent
