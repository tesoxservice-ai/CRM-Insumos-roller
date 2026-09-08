// app/layout.tsx
// Layout raíz de la aplicación. Define fuentes, metadata global y estilos base.

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CRM Insumos Roller',
    template: '%s | CRM Insumos Roller',
  },
  description: 'Sistema de gestión de clientes y oportunidades para Insumos Roller.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
