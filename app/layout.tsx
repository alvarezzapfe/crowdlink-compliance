import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crowdlink Compliance',
  description: 'Sistema de cumplimiento regulatorio PLD/FT — PorCuanto S.A. de C.V.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
