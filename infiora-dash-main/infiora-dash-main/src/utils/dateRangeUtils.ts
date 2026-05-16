export type DatePreset = 'today' | 'yesterday' | '7days' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'custom'

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7days': 'Last 7 days',
  thisWeek: 'This week',
  lastMonth: 'Last month',
  thisMonth: 'This month',
  custom: 'Custom'
}

export function getDateRange(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1)

  switch (preset) {
    case 'today':
      return { startDate: todayStart.toISOString(), endDate: todayEnd.toISOString() }

    case 'yesterday': {
      const s = new Date(todayStart.getTime() - 86400000)
      const e = new Date(todayStart.getTime() - 1)

      return { startDate: s.toISOString(), endDate: e.toISOString() }
    }

    case '7days':
      return {
        startDate: new Date(todayStart.getTime() - 6 * 86400000).toISOString(),
        endDate: todayEnd.toISOString()
      }

    case 'thisWeek': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
      const s = new Date(todayStart.getTime() - dow * 86400000)

      return { startDate: s.toISOString(), endDate: todayEnd.toISOString() }
    }

    case 'lastMonth': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

      return { startDate: s.toISOString(), endDate: e.toISOString() }
    }

    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)

      return { startDate: s.toISOString(), endDate: todayEnd.toISOString() }
    }

    case 'custom':
      return {
        startDate: customStart ? new Date(customStart).toISOString() : undefined,
        endDate: customEnd ? new Date(new Date(customEnd).setHours(23, 59, 59, 999)).toISOString() : undefined
      }
    default:
      return {}
  }
}
