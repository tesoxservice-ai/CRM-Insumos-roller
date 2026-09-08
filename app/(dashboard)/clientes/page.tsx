// app/(dashboard)/clientes/page.tsx
// Página del listado de clientes. Server Component — renderiza ClientesView.

import type { Metadata } from 'next'
import ClientesView from '@/components/clientes/ClientesView'

export const metadata: Metadata = {
  title: 'Clientes',
}

export default function ClientesPage() {
  return <ClientesView />
}
