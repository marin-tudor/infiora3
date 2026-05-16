import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function TabletLayout({ children }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background:
          'radial-gradient(circle at top, rgba(34,197,94,0.12), transparent 35%), linear-gradient(180deg, #0d1117 0%, #111827 45%, #0b1220 100%)'
      }}
    >
      {children}
    </div>
  )
}
