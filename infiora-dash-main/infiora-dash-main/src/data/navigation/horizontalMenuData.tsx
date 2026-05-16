// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const horizontalMenuData = (dictionary: Awaited<ReturnType<typeof getDictionary>>): HorizontalMenuDataType[] => [
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
  }
]

export default horizontalMenuData
