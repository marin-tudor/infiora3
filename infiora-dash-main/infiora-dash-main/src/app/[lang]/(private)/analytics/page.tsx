import { redirect } from 'next/navigation'

export default async function AnalyticsRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params

  redirect(`/${lang}/insights?tab=revenue`)
}
