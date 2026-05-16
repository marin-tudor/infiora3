import { useSearchParams } from 'next/navigation'

export const useSearchQuery = (params: string[]) => {
  const searchParams = useSearchParams()

  const result: { [key: string]: string | null } = {}

  params.forEach(param => {
    if (searchParams.get(param) && searchParams.get(param) !== '') result[param] = searchParams.get(param)
  })

  return result
}
