// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const verticalMenuData = (dictionary: Awaited<ReturnType<typeof getDictionary>>): VerticalMenuDataType[] => [
  {
    label: dictionary.home,
    icon: 'ri-home-smile-line',
    href: '/home'
  },
  {
    label: dictionary.rooms,
    icon: 'ri-door-line',
    href: '/rooms'
  },
  {
    label: dictionary.analytics,
    icon: 'ri-line-chart-line',
    href: '/insights'
  },
]

export default verticalMenuData
