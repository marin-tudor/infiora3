import { redirect } from 'next/navigation'

export default async function ScheduledOrdersRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params

  redirect(`/${lang}/orders?tab=scheduled`)
}
